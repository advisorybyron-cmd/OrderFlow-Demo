import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTimes, getPositions, getActiveUsers } from '@/lib/wheniwork'

// Sync recent WhenIWork time entries to our employee_activity table
// This captures clock-ins/outs done directly on WhenIWork website
export async function POST() {
  try {
    const supabase = await createClient()

    // Get today and yesterday to check recent activity
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const startDate = yesterday.toISOString().split('T')[0]
    const endDate = today.toISOString().split('T')[0]

    // Fetch data from WhenIWork
    const [times, positions, users] = await Promise.all([
      getTimes({ startDate, endDate }),
      getPositions(),
      getActiveUsers(),
    ])

    // Create lookup maps
    const positionMap = new Map(positions.map(p => [p.id, p.name]))
    const userMap = new Map(users.map(u => [u.id, u]))

    let syncedClockIns = 0
    let syncedClockOuts = 0
    let skipped = 0

    for (const time of times) {
      const user = userMap.get(time.user_id)
      if (!user || !user.employee_code) {
        skipped++
        continue
      }

      const positionName = positionMap.get(time.position_id) || 'Unknown'

      // Check for clock-in event
      if (time.start_time) {
        const clockInTime = new Date(time.start_time).toISOString()
        
        // Check if this clock-in already exists in our database
        const { data: existingClockIn } = await supabase
          .from('employee_activity')
          .select('id')
          .eq('employee_code', user.employee_code)
          .eq('event_type', 'clock_in')
          .gte('scanned_at', new Date(new Date(clockInTime).getTime() - 60000).toISOString()) // Within 1 minute
          .lte('scanned_at', new Date(new Date(clockInTime).getTime() + 60000).toISOString())
          .limit(1)

        if (!existingClockIn || existingClockIn.length === 0) {
          // Record the clock-in
          await supabase.from('employee_activity').insert({
            employee_code: user.employee_code,
            employee_name: `${user.first_name} ${user.last_name}`,
            position_name: positionName,
            event_type: 'clock_in',
            scanned_at: clockInTime,
            wheniwork_time_id: time.id,
          })
          syncedClockIns++
        }
      }

      // Check for clock-out event (time entry has end_time)
      if (time.end_time) {
        const clockOutTime = new Date(time.end_time).toISOString()
        
        // Check if this clock-out already exists in our database
        const { data: existingClockOut } = await supabase
          .from('employee_activity')
          .select('id')
          .eq('employee_code', user.employee_code)
          .eq('event_type', 'clock_out')
          .gte('scanned_at', new Date(new Date(clockOutTime).getTime() - 60000).toISOString())
          .lte('scanned_at', new Date(new Date(clockOutTime).getTime() + 60000).toISOString())
          .limit(1)

        if (!existingClockOut || existingClockOut.length === 0) {
          // Record the clock-out
          await supabase.from('employee_activity').insert({
            employee_code: user.employee_code,
            employee_name: `${user.first_name} ${user.last_name}`,
            position_name: positionName,
            previous_position: positionName, // They were in this position before clocking out
            event_type: 'clock_out',
            scanned_at: clockOutTime,
            wheniwork_time_id: time.id,
          })
          syncedClockOuts++
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: {
        clockIns: syncedClockIns,
        clockOuts: syncedClockOuts,
      },
      skipped,
      totalTimeEntries: times.length,
    })
  } catch (error) {
    console.error('Error syncing WhenIWork activity:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync activity' },
      { status: 500 }
    )
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const supabase = await createClient()

    // Get the most recent synced activity
    const { data: recentActivity } = await supabase
      .from('employee_activity')
      .select('scanned_at, event_type, employee_name')
      .order('scanned_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      recentActivity,
    })
  } catch (error) {
    console.error('Error checking sync status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check sync status' },
      { status: 500 }
    )
  }
}
