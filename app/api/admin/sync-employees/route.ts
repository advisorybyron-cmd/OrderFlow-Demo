import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveUsers } from '@/lib/wheniwork'

export async function POST() {
  try {
    // Fetch all active users from When I Work
    const wiwUsers = await getActiveUsers()
    
    if (wiwUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users found in When I Work',
        synced: 0
      })
    }

    const supabase = await createClient()
    
    // Prepare employee records matching the Production Tracker schema
    const employees = wiwUsers.map(user => ({
      employee_code: user.employee_code || `WIW${user.id}`,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || `${(user.employee_code || `WIW${user.id}`).toLowerCase()}@placeholder.local`,
      avatar_url: user.avatar?.url ? user.avatar.url.replace('%s', '256') : null, // Replace %s with size param
      wiw_user_id: user.id.toString(),
      is_active: true,
      updated_at: new Date().toISOString()
    }))

    // Upsert all employees (insert or update on conflict)
    const { data, error } = await supabase
      .from('employees')
      .upsert(employees, { 
        onConflict: 'employee_code',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('Supabase upsert error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    // Mark employees not in When I Work as inactive
    const activeEmployeeCodes = employees.map(e => e.employee_code)
    await supabase
      .from('employees')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .not('employee_code', 'in', `(${activeEmployeeCodes.join(',')})`)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${employees.length} employees from When I Work`,
      synced: employees.length,
      employees: employees.map(e => ({ code: e.employee_code, name: `${e.first_name} ${e.last_name}`.trim() }))
    })

  } catch (error) {
    console.error('Sync employees error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync employees' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return current sync status / last sync info
  try {
    const supabase = await createClient()
    
    const { data: employees, error } = await supabase
      .from('employees')
      .select('employee_code, name, is_active, updated_at')
      .order('name')

    if (error) throw error

    return NextResponse.json({
      totalEmployees: employees?.length || 0,
      activeEmployees: employees?.filter(e => e.is_active).length || 0,
      employees: employees || []
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get employees' },
      { status: 500 }
    )
  }
}
