import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { sessionId, employeeId } = await request.json()

    if (!sessionId || !employeeId) {
      return NextResponse.json(
        { error: 'Session ID and Employee ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if this session still exists and is active (not ended)
    const { data: session, error } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('employee_id', employeeId)
      .single()

    if (error || !session) {
      return NextResponse.json({
        valid: false,
        reason: 'session_not_found',
      })
    }

    // If session has ended_at, it means the employee logged in elsewhere
    if (session.ended_at) {
      return NextResponse.json({
        valid: false,
        reason: 'session_ended',
      })
    }

    // Check if there's a newer active session for this employee
    const { data: newerSessions } = await supabase
      .from('work_sessions')
      .select('id, started_at')
      .eq('employee_id', employeeId)
      .is('ended_at', null)
      .gt('started_at', session.started_at)
      .order('started_at', { ascending: false })
      .limit(1)

    if (newerSessions && newerSessions.length > 0) {
      return NextResponse.json({
        valid: false,
        reason: 'newer_session_exists',
        newSessionId: newerSessions[0].id,
      })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Session validate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
