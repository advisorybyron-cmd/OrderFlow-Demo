import { NextResponse } from 'next/server'
import { isDemoMode, getDemoEmployeeByCode, createDemoSession } from '@/lib/demo'

export async function POST(request: Request) {
  try {
    const { employeeCode } = await request.json()

    console.log('[v0] Login attempt:', { employeeCode, isDemoMode })

    if (!employeeCode) {
      return NextResponse.json(
        { error: 'Employee code is required' },
        { status: 400 }
      )
    }

    // Demo mode: use fake employee data
    if (isDemoMode) {
      const demoEmployee = getDemoEmployeeByCode(employeeCode)
      console.log('[v0] Demo employee lookup:', { employeeCode, found: !!demoEmployee })
      
      if (!demoEmployee) {
        return NextResponse.json(
          { error: 'Employee not found. Try: JD001, SS002, MJ003, EW004, TB005, LD006, AM007, or RG008' },
          { status: 404 }
        )
      }
      
      const session = createDemoSession(demoEmployee.employee_code, 'unknown')
      return NextResponse.json({
        employee: {
          ...demoEmployee,
          name: demoEmployee.name,
        },
        session: {
          id: session.id,
          employee_id: demoEmployee.id,
          started_at: session.started_at,
          total_items: 0,
        },
      })
    }

    // Only import Supabase when not in demo mode
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Find employee by code
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', employeeCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Normalize to include a `name` field for frontend compatibility
    const normalizedEmployee = {
      ...employee,
      name: `${employee.first_name} ${employee.last_name}`.trim()
    }

    // End any existing active sessions for this employee (for multi-device takeover)
    await supabase
      .from('work_sessions')
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq('employee_id', employee.id)
      .is('ended_at', null)

    // Create a new work session
    const { data: session, error: sessionError } = await supabase
      .from('work_sessions')
      .insert({
        employee_id: employee.id,
        started_at: new Date().toISOString(),
        total_items: 0,
      })
      .select()
      .single()

    if (sessionError) {
      return NextResponse.json(
        { error: 'Failed to create work session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ employee: normalizedEmployee, session })
  } catch (error) {
    console.error('[v0] Login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
