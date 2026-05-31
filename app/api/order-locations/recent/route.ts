import { NextResponse } from 'next/server'
import { isDemoMode, getDemoActivities } from '@/lib/demo'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Demo mode: return fake activity data
    if (isDemoMode) {
      const activities = getDemoActivities()
      const paginatedActivities = activities.slice(offset, offset + limit)
      return NextResponse.json({
        locations: paginatedActivities.map(a => ({
          order_number: a.order_number,
          location: a.location,
          previous_location: a.previous_location,
          scanned_at: a.scanned_at,
          employees: a.employee ? [a.employee] : [],
          shipper_employee: a.location === 'Shipped' ? a.employee : null,
        })),
        total: activities.length,
      })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get the most recent order location scans, joining employee data
    const { data: locations, error } = await supabase
      .from('order_locations')
      .select(`
        order_number, 
        location, 
        scanned_at,
        scanned_by_employee_id,
        shipped_by_name,
        employees (
          id,
          first_name,
          last_name,
          avatar_url,
          employee_code
        )
      `)
      .order('scanned_at', { ascending: false })
      .range(offset, offset + limit + 30) // Fetch extra for building context

    if (error) {
      console.error('Failed to fetch recent activity:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recent activity' },
        { status: 500 }
      )
    }

    // Fetch all active employees for shipped-by name matching
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, avatar_url, employee_code')
      .eq('is_active', true)

    // Build a name-matching function: normalize "First Last" -> lowercase, handle partial matches
    type EmployeeInfo = {
      id: string
      first_name: string
      last_name: string
      avatar_url: string | null
      employee_code: string | null
    }

    function matchEmployeeByName(shipperName: string | null, employees: EmployeeInfo[]): EmployeeInfo | null {
      if (!shipperName || !employees.length) return null
      const normalized = shipperName.toLowerCase().replace(/[^a-z\s]/g, '').trim()
      // Try full name match first
      const fullMatch = employees.find(e => {
        const full = `${e.first_name} ${e.last_name}`.toLowerCase()
        return full === normalized || full.includes(normalized) || normalized.includes(full)
      })
      if (fullMatch) return fullMatch
      // Try first name only
      const firstOnly = employees.find(e =>
        e.first_name.toLowerCase() === normalized.split(' ')[0]
      )
      return firstOnly || null
    }

    // For each unique order in the requested batch, gather all employees who have ever scanned it
    const batchLocations = (locations || []).slice(0, limit)
    const uniqueOrderNumbers = [...new Set(batchLocations.map(l => l.order_number).filter(Boolean))]

    // Fetch all scans for those order numbers to build the employee roster per order
    const { data: allOrderScans } = await supabase
      .from('order_locations')
      .select(`
        order_number,
        scanned_at,
        employees (
          id,
          first_name,
          last_name,
          avatar_url,
          employee_code
        )
      `)
      .in('order_number', uniqueOrderNumbers)
      .not('scanned_by_employee_id', 'is', null)
      .order('scanned_at', { ascending: true })

    // Build a map of order_number -> unique employees (deduplicated by id)
    const orderEmployeeMap = new Map<string, EmployeeInfo[]>()
    for (const scan of (allOrderScans || [])) {
      const emp = scan.employees as unknown as EmployeeInfo | null
      if (!emp || !scan.order_number) continue
      const existing = orderEmployeeMap.get(scan.order_number) || []
      if (!existing.find(e => e.id === emp.id)) {
        existing.push(emp)
      }
      orderEmployeeMap.set(scan.order_number, existing)
    }

    // Fetch ShipStation user mappings for shipped orders
    const shippedByUserIds = [...new Set(
      batchLocations
        .filter(l => l.location === 'Shipped' && (l as any).shipped_by_name)
        .map(l => (l as any).shipped_by_name)
    )]
    
    const shipperMappingMap = new Map<string, EmployeeInfo>()
    if (shippedByUserIds.length > 0) {
      const { data: mappings } = await supabase
        .from('shipstation_user_mapping')
        .select(`
          shipstation_user_id,
          employee_id,
          employees (
            id,
            first_name,
            last_name,
            avatar_url,
            employee_code
          )
        `)
        .in('shipstation_user_id', shippedByUserIds)
      
      for (const mapping of (mappings || [])) {
        if (mapping.employees) {
          const emp = mapping.employees as any
          shipperMappingMap.set(mapping.shipstation_user_id, {
            id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            avatar_url: emp.avatar_url,
            employee_code: emp.employee_code,
          })
        }
      }
    }

    // Add previous location for each order by looking at older scans
    const locationsWithPrevious = batchLocations.map((loc) => {
      const previousScan = locations?.find(
        (older) =>
          older.order_number === loc.order_number &&
          new Date(older.scanned_at) < new Date(loc.scanned_at)
      )
      
      const employees = orderEmployeeMap.get(loc.order_number || '') || []

      // For Shipped cards, look up the shipper via the mapping table
      let shipperEmployee: EmployeeInfo | null = null
      if (loc.location === 'Shipped' && (loc as any).shipped_by_name) {
        // First try the mapping table (ShipStation userId -> employee)
        shipperEmployee = shipperMappingMap.get((loc as any).shipped_by_name) || null
        // Fallback: try name matching (for legacy data with actual names)
        if (!shipperEmployee) {
          shipperEmployee = matchEmployeeByName((loc as any).shipped_by_name, allEmployees || [])
        }
      }

      // Build avatar list: scanned employees + shipper (deduplicated)
      const avatarList = [...employees]
      if (shipperEmployee && !avatarList.find(e => e.id === shipperEmployee!.id)) {
        avatarList.push(shipperEmployee)
      }

      return {
        order_number: loc.order_number,
        location: loc.location,
        scanned_at: loc.scanned_at,
        previous_location: previousScan?.location || null,
        activity_type: 'order' as const,
        shipped_by_name: (loc as any).shipped_by_name || null,
        shipper_employee: shipperEmployee ? {
          id: shipperEmployee.id,
          name: `${shipperEmployee.first_name} ${shipperEmployee.last_name}`.trim(),
          avatar_url: shipperEmployee.avatar_url,
          employee_code: shipperEmployee.employee_code,
        } : null,
        employee_avatars: avatarList.map(e => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`.trim(),
          avatar_url: e.avatar_url,
          employee_code: e.employee_code,
        })),
      }
    })

    // Fetch employee activity events only for initial load (offset 0)
    let employeeEvents: Array<{
      activity_type: 'employee'
      employee_name: string
      employee_code: string
      event_type: string
      position_name: string
      previous_position: string | null
      scanned_at: string
      employee_avatar_url: string | null
    }> = []
    
    if (offset === 0) {
      const { data: employeeActivity, error: employeeError } = await supabase
        .from('employee_activity')
        .select(`
          id, 
          employee_name, 
          employee_code, 
          event_type, 
          position_name, 
          previous_position, 
          created_at,
          employee_id
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (employeeError) {
        console.error('Failed to fetch employee activity:', employeeError)
      }

      // For employee events, fetch the avatar separately using employee_code
      const employeeCodes = [...new Set((employeeActivity || []).map(e => e.employee_code).filter(Boolean))]
      const employeeAvatarMap = new Map<string, string | null>()
      if (employeeCodes.length > 0) {
        const { data: empAvatars } = await supabase
          .from('employees')
          .select('employee_code, avatar_url')
          .in('employee_code', employeeCodes)
        for (const emp of (empAvatars || [])) {
          employeeAvatarMap.set(emp.employee_code, emp.avatar_url)
        }
      }

      // Transform employee activity
      employeeEvents = (employeeActivity || []).map((event) => ({
        activity_type: 'employee' as const,
        employee_name: event.employee_name,
        employee_code: event.employee_code,
        event_type: event.event_type,
        position_name: event.position_name,
        previous_position: event.previous_position,
        scanned_at: event.created_at,
        employee_avatar_url: employeeAvatarMap.get(event.employee_code) || null,
      }))
    }

    // Merge and sort all activities by timestamp
    const allActivity = [...locationsWithPrevious, ...employeeEvents]
      .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
      .slice(0, limit)

    // Check if there's more data available
    const hasMore = (locations?.length || 0) > limit

    return NextResponse.json({ locations: allActivity, hasMore, offset, limit })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
