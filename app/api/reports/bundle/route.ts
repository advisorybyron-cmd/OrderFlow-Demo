import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfWeek, endOfWeek, format, eachDayOfInterval, parseISO, subWeeks } from 'date-fns'
import { getOrderBundlesHours } from '@/lib/wheniwork'
import { isDemoMode, generateDemoReportData, DEMO_EMPLOYEES } from '@/lib/demo'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const weekStart = searchParams.get('weekStart')

    // Demo mode: return fake report data
    if (isDemoMode) {
      const demoReports = generateDemoReportData()
      
      // Return employee list for dropdown
      if (!employeeId || employeeId === 'all') {
        return NextResponse.json({
          employees: DEMO_EMPLOYEES.slice(0, 6).map(e => ({
            id: e.id,
            name: e.name,
            employee_code: e.employee_code,
          })),
          data: demoReports,
          summary: {
            totalItems: demoReports.reduce((sum, r) => sum + r.totalItems, 0),
            totalHours: demoReports.reduce((sum, r) => sum + r.totalHours, 0),
            prevWeekTotal: demoReports.reduce((sum, r) => sum + r.prevWeekTotal, 0),
          },
          dailyStats: demoReports[0]?.dailyStats || [],
        })
      }
      
      // Return single employee data
      const employeeReport = demoReports.find(r => r.employee.id === employeeId)
      if (employeeReport) {
        return NextResponse.json({
          employees: DEMO_EMPLOYEES.slice(0, 6).map(e => ({
            id: e.id,
            name: e.name,
            employee_code: e.employee_code,
          })),
          data: [employeeReport],
          summary: {
            totalItems: employeeReport.totalItems,
            totalHours: employeeReport.totalHours,
            prevWeekTotal: employeeReport.prevWeekTotal,
          },
          dailyStats: employeeReport.dailyStats,
        })
      }
    }
    
    const supabase = await createClient()

    // Calculate date range
    const startDate = weekStart 
      ? startOfWeek(parseISO(weekStart), { weekStartsOn: 0 })
      : startOfWeek(new Date(), { weekStartsOn: 0 })
    const endDate = endOfWeek(startDate, { weekStartsOn: 0 })
    
    // Previous week for comparison
    const prevWeekStart = subWeeks(startDate, 1)
    const prevWeekEnd = subWeeks(endDate, 1)

    // Build base query for item scans - filter by location = "Bundle Room"
    let query = supabase
      .from('item_scans')
      .select(`
        *,
        employees (id, first_name, last_name, employee_code, avatar_url),
        work_sessions (id, started_at, ended_at, location)
      `)
      .gte('scanned_at', format(startDate, 'yyyy-MM-dd'))
      .lte('scanned_at', format(endDate, 'yyyy-MM-dd\'T\'23:59:59'))

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data: scans, error } = await query.order('scanned_at', { ascending: true })

    if (error) {
      console.error('Bundle reports query error:', error)
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }

    // Filter scans to only Bundle Room location
    const bundleScans = scans?.filter(s => 
      s.work_sessions?.location === 'Bundle Room'
    ) || []

    // Get previous week scans for comparison
    let prevQuery = supabase
      .from('item_scans')
      .select(`
        employee_id, 
        quantity,
        work_sessions (location)
      `)
      .gte('scanned_at', format(prevWeekStart, 'yyyy-MM-dd'))
      .lte('scanned_at', format(prevWeekEnd, 'yyyy-MM-dd\'T\'23:59:59'))

    if (employeeId) {
      prevQuery = prevQuery.eq('employee_id', employeeId)
    }

    const { data: prevScans } = await prevQuery

    // Filter previous scans to Bundle Room
    const prevBundleScans = prevScans?.filter(s => 
      (s.work_sessions as { location?: string } | null)?.location === 'Bundle Room'
    ) || []

    // Get employee codes for When I Work lookup
    let employeeCodes: string[] | undefined
    if (employeeId) {
      const { data: emp } = await supabase
        .from('employees')
        .select('employee_code')
        .eq('id', employeeId)
        .single()
      if (emp?.employee_code) {
        employeeCodes = [emp.employee_code]
      }
    }

    // Get hours worked from When I Work (Order Bundles position clock in/out data)
    let wiwHoursData: Map<string, { totalHours: number; dailyHours: Map<string, number> }>
    try {
      wiwHoursData = await getOrderBundlesHours({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        employeeCodes,
      })
    } catch (error) {
      console.error('Failed to fetch When I Work hours:', error)
      wiwHoursData = new Map()
    }

    // Get employee code to ID mapping for scans
    const employeeCodeToId = new Map<string, string>()
    const { data: allEmps } = await supabase
      .from('employees')
      .select('id, employee_code')
      .eq('is_active', true)
    allEmps?.forEach(emp => {
      if (emp.employee_code) {
        employeeCodeToId.set(emp.employee_code, emp.id)
      }
    })

    // Process data by day
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const dailyStats = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayScans = bundleScans.filter(s => s.scanned_at.startsWith(dayStr))
      
      // Calculate hours worked from When I Work data
      let hoursWorked = 0
      if (employeeId) {
        // Single employee - find their code and get hours
        const empCode = employeeCodes?.[0]
        if (empCode && wiwHoursData.has(empCode)) {
          hoursWorked = wiwHoursData.get(empCode)!.dailyHours.get(dayStr) || 0
        }
      } else {
        // All employees - sum all hours for this day
        for (const [, data] of wiwHoursData) {
          hoursWorked += data.dailyHours.get(dayStr) || 0
        }
      }

      const totalItems = dayScans.reduce((sum, s) => sum + (s.quantity || 1), 0)

      return {
        date: dayStr,
        dayName: format(day, 'EEE'),
        dayDate: format(day, 'M/d'),
        totalItems,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        bundlesPerHour: hoursWorked > 0 ? Math.round((totalItems / hoursWorked) * 100) / 100 : 0,
      }
    })

    // Calculate totals - use When I Work total hours for accuracy
    const totalItems = dailyStats.reduce((sum, d) => sum + d.totalItems, 0)
    let totalHours = 0
    if (employeeId && employeeCodes?.[0]) {
      totalHours = wiwHoursData.get(employeeCodes[0])?.totalHours || 0
    } else {
      for (const [, data] of wiwHoursData) {
        totalHours += data.totalHours
      }
    }
    const avgBundlesPerHour = totalHours > 0 ? Math.round((totalItems / totalHours) * 100) / 100 : 0
    const prevWeekTotal = prevBundleScans.reduce((sum, s) => sum + (s.quantity || 1), 0)

    // Get all employees if no filter
    let employees: Array<{ id: string; name: string; employee_code: string; avatar_url: string | null }> = []
    if (!employeeId) {
      const { data: emps } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, avatar_url')
        .eq('is_active', true)
        .order('first_name')
      employees = (emps || []).map(emp => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`.trim(),
        employee_code: emp.employee_code,
        avatar_url: emp.avatar_url
      }))
    }

    return NextResponse.json({
      weekStart: format(startDate, 'yyyy-MM-dd'),
      weekEnd: format(endDate, 'yyyy-MM-dd'),
      dailyStats,
      summary: {
        totalItems,
        totalHours: Math.round(totalHours * 100) / 100,
        avgBundlesPerHour,
        prevWeekTotal,
        changePercent: prevWeekTotal > 0 
          ? Math.round(((totalItems - prevWeekTotal) / prevWeekTotal) * 100) 
          : 0,
      },
      employees,
    })
  } catch (error) {
    console.error('Bundle reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
