import { NextResponse } from 'next/server'
import { isDemoMode, getDemoClockStatus } from '@/lib/demo'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeCode = searchParams.get('employeeCode')

    console.log('[v0] current-position API called with employeeCode:', employeeCode, 'isDemoMode:', isDemoMode)

    if (!employeeCode) {
      return NextResponse.json(
        { error: 'Employee code is required' },
        { status: 400 }
      )
    }

    // Demo mode: return fake clock status
    if (isDemoMode) {
      const clockStatus = getDemoClockStatus(employeeCode)
      console.log('[v0] Demo clock status:', clockStatus)
      if (!clockStatus) {
        return NextResponse.json({ position: null })
      }
      return NextResponse.json({
        position: {
          id: 99999,
          name: clockStatus.position,
          color: '#4CAF50',
        },
      })
    }

    // Only import WheniWork when not in demo mode
    const { getTimes, getPositions, getActiveUsers } = await import('@/lib/wheniwork')

    // Get all users to find the one with this employee code
    const users = await getActiveUsers()
    console.log('[v0] Found users count:', users.length)
    console.log('[v0] User codes:', users.map(u => u.employee_code).join(', '))
    
    const user = users.find(u => u.employee_code === employeeCode)
    console.log('[v0] Found user:', user ? { id: user.id, name: user.first_name, code: user.employee_code } : 'NOT FOUND')

    if (!user) {
      return NextResponse.json(
        { error: 'Employee not found in WheniWork', position: null },
        { status: 200 }
      )
    }

    // Get today's date for time query - use a wider range to handle timezone issues
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const startDate = yesterday.toISOString().split('T')[0]
    const endDate = tomorrow.toISOString().split('T')[0]
    console.log('[v0] Fetching times for date range:', startDate, 'to', endDate, 'user:', user.id)

    // Get time entries for this user
    const times = await getTimes({
      startDate,
      endDate,
      userId: user.id,
    })
    console.log('[v0] Times entries found:', times.length)
    console.log('[v0] Raw times data:', JSON.stringify(times))

    // Find active clock-in - check for various falsy end_time values
    // WheniWork may return null, undefined, empty string, or omit the field entirely
    const activeClockin = times.find(t => {
      const endTime = t.end_time
      const isActive = endTime === null || endTime === undefined || endTime === '' || !endTime
      console.log('[v0] Time entry', t.id, '- end_time:', JSON.stringify(endTime), 'isActive:', isActive)
      return isActive
    })
    console.log('[v0] Active clock-in found:', activeClockin ? JSON.stringify(activeClockin) : 'NONE')

    if (!activeClockin) {
      console.log('[v0] No active clock-in found')
      return NextResponse.json({ position: null, debug: 'no_active_clockin' })
    }
    
    if (activeClockin.position_id === undefined || activeClockin.position_id === null) {
      console.log('[v0] Active clock-in has no position_id')
      return NextResponse.json({ position: null, debug: 'no_position_id' })
    }

    // Get all positions to find the name
    const positions = await getPositions()
    console.log('[v0] Positions:', positions.map(p => ({ id: p.id, name: p.name })))
    
    const position = positions.find(p => p.id === activeClockin.position_id)
    console.log('[v0] Matched position:', position ? position.name : 'NOT FOUND')

    return NextResponse.json({
      position: position ? {
        id: position.id,
        name: position.name,
        color: position.color,
      } : null,
    })
  } catch (error) {
    console.error('Failed to get current position:', error)
    return NextResponse.json(
      { error: 'Failed to fetch position data', position: null },
      { status: 200 }
    )
  }
}
