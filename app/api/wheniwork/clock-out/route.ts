import { NextResponse } from 'next/server'
import { getActiveUsers, getTimes, getPositions, clockOut } from '@/lib/wheniwork'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode, setDemoClockOut, getDemoClockStatus } from '@/lib/demo'

export async function POST(request: Request) {
  try {
    const { employeeCode } = await request.json()

    if (!employeeCode) {
      return NextResponse.json(
        { error: 'Employee code is required' },
        { status: 400 }
      )
    }

    // Demo mode: fake clock out
    if (isDemoMode) {
      const previousStatus = getDemoClockStatus(employeeCode)
      setDemoClockOut(employeeCode)
      return NextResponse.json({
        success: true,
        message: 'Successfully clocked out',
        previousPosition: previousStatus?.position || null,
      })
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

    // Find active clock-in (no end time)
    const activeClockin = times.find(t => !t.end_time || t.end_time === '' || t.end_time === null)

    if (!activeClockin) {
      return NextResponse.json(
        { error: 'No active clock-in found' },
        { status: 400 }
      )
    }

    // Get position name for activity logging
    const positions = await getPositions()
    const position = positions.find(p => p.id === activeClockin.position_id)

    // Clock out
    try {
      await clockOut(activeClockin.id)
    } catch (err) {
      console.error('Failed to clock out:', err)
      return NextResponse.json(
        { error: 'Failed to clock out' },
        { status: 500 }
      )
    }

    // Record the clock out activity
    try {
      const supabase = await createClient()
      const employeeName = `${user.first_name} ${user.last_name}`.trim()
      
      await supabase.from('employee_activity').insert({
        employee_name: employeeName,
        employee_code: employeeCode,
        event_type: 'clock_out',
        position_name: position?.name || 'Unknown',
      })
    } catch (err) {
      // Non-fatal - don't fail the whole operation if activity logging fails
      console.error('Failed to log employee activity:', err)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully clocked out',
      previousPosition: position?.name || null,
    })
  } catch (error) {
    console.error('Error clocking out:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
