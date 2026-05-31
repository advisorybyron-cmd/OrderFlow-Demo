'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import Link from 'next/link'
import { EmployeeHeader } from '@/components/employee-header'
import { RoomWorkstation } from '@/components/workstation/room-workstation'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { useClockStatus } from '@/hooks/use-clock-status'

export default function DtfRoomPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading } = useSession()

  // Clock status from WhenIWork
  const { isClockedIn, clockIn, clockOut } = useClockStatus({
    employeeCode: employee?.employee_code,
    positionName: 'DTF',
  })

  useEffect(() => {
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

  return (
    <main className="min-h-screen bg-muted/30 pb-24 flex flex-col">
      <EmployeeHeader
        name={employee.name}
        employeeCode={employee.employee_code}
        avatarUrl={employee.avatar_url}
        roomLabel="DTF Printer Room"
        onLogOut={handleEndShift}
        isClockedIn={isClockedIn}
        onClockIn={clockIn}
        onClockOut={clockOut}
        rightSlot={
          <Link href="/admin/shopify-connect">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Shopify Setup
            </Button>
          </Link>
        }
      />

      {/* Workstation */}
      <div className="flex-1 p-4">
        <RoomWorkstation
          location="DTF Room"
          employeeId={employee.id}
          sessionId={session.id}
        />
      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </main>
  )
}
