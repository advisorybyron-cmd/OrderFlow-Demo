import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode, DEMO_EMPLOYEES } from '@/lib/demo'

export async function GET() {
  try {
    // Demo mode: return fake employees
    if (isDemoMode) {
      const normalized = DEMO_EMPLOYEES.map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        employee_code: e.employee_code,
        avatar_url: e.avatar_url,
        name: e.name,
      }))
      return NextResponse.json({ employees: normalized })
    }

    const supabase = await createClient()

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, avatar_url')
      .eq('is_active', true)
      .order('first_name')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    // Normalize to include a `name` field for frontend compatibility
    const normalized = employees?.map(e => ({
      ...e,
      name: `${e.first_name} ${e.last_name}`.trim()
    }))

    return NextResponse.json({ employees: normalized })
  } catch (error) {
    console.error('Employees error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create employee (for initial setup or When I Work sync)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeCode, firstName, lastName, name, avatarUrl, wiwUserId } = body

    if (!employeeCode || (!name && !firstName)) {
      return NextResponse.json(
        { error: 'Employee code and name are required' },
        { status: 400 }
      )
    }

    // Support both `name` and `firstName`/`lastName` formats
    const first = firstName || name?.split(' ')[0] || ''
    const last = lastName || name?.split(' ').slice(1).join(' ') || ''

    const supabase = await createClient()

    const { data: employee, error } = await supabase
      .from('employees')
      .upsert({
        employee_code: employeeCode.toUpperCase(),
        first_name: first,
        last_name: last,
        email: `${employeeCode.toLowerCase()}@placeholder.local`,
        avatar_url: avatarUrl || null,
        wiw_user_id: wiwUserId || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'employee_code',
      })
      .select()
      .single()

    if (error) {
      console.error('Create employee error:', error)
      return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
