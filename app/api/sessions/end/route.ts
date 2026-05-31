import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Demo mode: just return success
    if (isDemoMode) {
      return NextResponse.json({
        session: {
          id: sessionId,
          ended_at: new Date().toISOString(),
          total_items: Math.floor(Math.random() * 50) + 10,
        }
      })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get total items for this session
    const { count } = await supabase
      .from('item_scans')
      .select('*', { count: 'exact', head: true })
      .eq('work_session_id', sessionId)

    // End the session
    const { data: session, error } = await supabase
      .from('work_sessions')
      .update({
        ended_at: new Date().toISOString(),
        total_items: count || 0,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('End session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
