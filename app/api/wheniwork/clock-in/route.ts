import { NextResponse } from 'next/server'
import { isDemoMode, setDemoClockIn } from '@/lib/demo'

export async function POST(request: Request) {
  try {
    const { employeeCode, positionName } = await request.json()

    if (!employeeCode || !positionName) {
      return NextResponse.json(
        { error: 'Employee code and position name are required' },
        { status: 400 }
      )
    }

    // Demo mode: fake clock in
    if (isDemoMode) {
      setDemoClockIn(employeeCode, positionName)
      return NextResponse.json({
        success: true,
        message: `Successfully clocked in to ${positionName}`,
        position: {
          id: 99999,
          name: positionName,
        },
      })
    }

    // Only import when not in demo mode
    const { getActiveUsers, getPositions, clockIn } = await import('@/lib/wheniwork')
    const { createClient } = await import('@/lib/supabase/server')

    // Get the user from WheniWork
    const users = await getActiveUsers()
    const user = users.find(u => u.employee_code === employeeCode)

    if (!user) {
      return NextResponse.json(
        { error: 'Employee not found in WheniWork' },
        { status: 404 }
      )
    }

    // Get positions to find the position ID
    const positions = await getPositions()
    const position = positions.find(
      p => p.name.toLowerCase() === positionName.toLowerCase()
    )

    if (!position) {
      return NextResponse.json(
        { error: `Position "${positionName}" not found in WheniWork` },
        { status: 404 }
      )
    }

    // Clock in to the position
    try {
      await clockIn(user.id, position.id)
    } catch (err) {
      console.error('Failed to clock in:', err)
      return NextResponse.json(
        { error: 'Failed to clock in to position' },
        { status: 500 }
      )
    }

    // Record the clock in activity
    try {
      const supabase = await createClient()
      const employeeName = `${user.first_name} ${user.last_name}`.trim()
      
      await supabase.from('employee_activity').insert({
        employee_name: employeeName,
        employee_code: employeeCode,
        event_type: 'clock_in',
        position_name: position.name,
      })
    } catch (err) {
      // Non-fatal - don't fail the whole operation if activity logging fails
      console.error('Failed to log employee activity:', err)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully clocked in to ${position.name}`,
      position: {
        id: position.id,
        name: position.name,
      },
    })
  } catch (error) {
    console.error('Error clocking in:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
