'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'

const IDLE_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes

// Events that count as activity
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']

export function SessionTakeoverModal() {
  const { employee, session, clearSession } = useSession()
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogOut = useCallback(async () => {
    if (session) {
      try {
        await fetch('/api/sessions/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        })
      } catch {
        // Best-effort end session
      }
    }
    clearSession()
    router.push('/')
  }, [session, clearSession, router])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      handleLogOut()
    }, IDLE_TIMEOUT_MS)
  }, [handleLogOut])

  useEffect(() => {
    if (!employee || !session) return

    // Start the timer
    resetTimer()

    // Reset on any activity
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [employee, session, resetTimer])

  // This component renders nothing — it just manages the idle timer
  return null
}
