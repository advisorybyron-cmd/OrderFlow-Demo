'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { EmployeeHeader } from '@/components/employee-header'
import { RoomWorkstation } from '@/components/workstation/room-workstation'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { useClockStatus } from '@/hooks/use-clock-status'

export default function HeatPressPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading } = useSession()

  // Clock status from WhenIWork
  const { isClockedIn, clockIn, clockOut } = useClockStatus({
    employeeCode: employee?.employee_code,
    positionName: 'Heat Press',
  })

  useEffect(() => {
    // Wait for session to load before checking
    if (!isLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, isLoading])

  const handleEndShift = async () => {
    if (!session) return

    try {
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
    } catch (err) {
      console.error('Failed to end session:', err)
    }

    clearSession()
    router.push('/')
  }

  if (isLoading || !employee || !session) {
    return null
  }

  const initials = employee.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-muted/30">
      <EmployeeHeader
        name={employee.name}
        employeeCode={employee.employee_code}
        avatarUrl={employee.avatar_url}
        roomLabel="Heat Press Room"
        onLogOut={handleEndShift}
        isClockedIn={isClockedIn}
        onClockIn={clockIn}
        onClockOut={clockOut}
      />

      {/* Content area fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden p-2">
        <RoomWorkstation
          location="Heat Press Room"
          employeeId={employee.id}
          sessionId={session.id}
        />
      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </main>
  )
}
