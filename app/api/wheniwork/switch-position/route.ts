import { NextResponse } from 'next/server'
import { getActiveUsers, getTimes, getPositions, clockOut, clockIn } from '@/lib/wheniwork'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { employeeCode, newPositionName } = await request.json()

    if (!employeeCode || !newPositionName) {
      return NextResponse.json(
        { error: 'Employee code and new position name are required' },
        { status: 400 }
      )
    }

    // Get the user from WheniWork
    const users = await getActiveUsers()
    const user = users.find(u => u.employee_code === employeeCode)

    if (!user) {
      return NextResponse.json(
        { error: 'Employee not found in WheniWork' },
        { status: 404 }
      )
    }

    // Get positions to find the new position ID
    const positions = await getPositions()
    const newPosition = positions.find(
      p => p.name.toLowerCase() === newPositionName.toLowerCase()
    )

    if (!newPosition) {
      return NextResponse.json(
        { error: `Position "${newPositionName}" not found in WheniWork` },
        { status: 404 }
      )
    }

    // Get current time entries to find active clock-in
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const times = await getTimes({
      startDate: yesterday.toISOString().split('T')[0],
      endDate: tomorrow.toISOString().split('T')[0],
      userId: user.id,
    })

    // Find active clock-in
    const activeClockin = times.find(t => !t.end_time || t.end_time === '' || t.end_time === null)

    // Clock out of current position if there's an active clock-in
    if (activeClockin) {
      try {
        await clockOut(activeClockin.id)
      } catch (err) {
        console.error('Failed to clock out:', err)
        return NextResponse.json(
          { error: 'Failed to clock out of current position' },
          { status: 500 }
        )
      }
    }

    // Clock in to new position
    try {
      await clockIn(user.id, newPosition.id)
    } catch (err) {
      console.error('Failed to clock in:', err)
      return NextResponse.json(
        { error: 'Failed to clock in to new position' },
        { status: 500 }
      )
    }

    // Get the previous position name for the activity log
    let previousPositionName: string | null = null
    if (activeClockin?.position_id) {
      const prevPosition = positions.find(p => p.id === activeClockin.position_id)
      previousPositionName = prevPosition?.name || null
    }

    // Record the position switch in the employee activity table
    try {
      const supabase = await createClient()
      const employeeName = `${user.first_name} ${user.last_name}`.trim()
      
      await supabase.from('employee_activity').insert({
        employee_name: employeeName,
        employee_code: employeeCode,
        event_type: 'position_switch',
        position_name: newPosition.name,
        previous_position: previousPositionName,
      })
    } catch (err) {
      // Non-fatal - don't fail the whole operation if activity logging fails
      console.error('Failed to log employee activity:', err)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully switched to ${newPosition.name}`,
      newPosition: {
        id: newPosition.id,
        name: newPosition.name,
      },
    })
  } catch (error) {
    console.error('Error switching position:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
