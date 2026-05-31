import { NextResponse } from 'next/server'
import { isDemoMode, addDemoActivity, getDemoActivities, getDemoEmployeeById } from '@/lib/demo'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderNumber, location, employeeId, notes } = body

    if (!orderNumber || !location) {
      return NextResponse.json(
        { error: 'Order number and location are required' },
        { status: 400 }
      )
    }

    // Demo mode: add to in-memory activity log
    if (isDemoMode) {
      const employee = employeeId ? getDemoEmployeeById(employeeId) : null
      const activity = addDemoActivity({
        order_number: orderNumber,
        location,
        previous_location: null,
        scanned_at: new Date().toISOString(),
        employee: employee ? {
          id: employee.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          avatar_url: employee.avatar_url,
          employee_code: employee.employee_code,
        } : null,
      })
      return NextResponse.json({ success: true, data: activity })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Insert into order_locations (for this app)
    const { data, error } = await supabase
      .from('order_locations')
      .insert({
        order_number: orderNumber,
        location,
        scanned_by_employee_id: employeeId || null,
        notes: notes || null,
        scanned_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to record order location:', error)
      return NextResponse.json(
        { error: 'Failed to record location' },
        { status: 500 }
      )
    }

    // Also insert into scan_history (for Production Tracker compatibility)
    const { error: scanHistoryError } = await supabase
      .from('scan_history')
      .insert({
        order_number: orderNumber,
        room: location,
        scanned_at: new Date().toISOString(),
      })

    if (scanHistoryError) {
      console.error('Failed to record to scan_history:', scanHistoryError)
      // Don't fail the request - the primary insert succeeded
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Order location error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get current location for an order
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('orderNumber')

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      )
    }

    // Demo mode: find location in demo activities
    if (isDemoMode) {
      const activities = getDemoActivities()
      const activity = activities.find(a => a.order_number === orderNumber)
      return NextResponse.json({ 
        location: activity ? {
          order_number: activity.order_number,
          location: activity.location,
          scanned_at: activity.scanned_at,
        } : null 
      })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get the most recent location for this order
    const { data, error } = await supabase
      .from('order_locations')
      .select('*')
      .eq('order_number', orderNumber)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get order location:', error)
      return NextResponse.json(
        { error: 'Failed to get location' },
        { status: 500 }
      )
    }

    return NextResponse.json({ location: data || null })
  } catch (error) {
    console.error('Order location error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
