'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmployeeHeader } from '@/components/employee-header'
import { RoomWorkstation } from '@/components/workstation/room-workstation'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { useClockStatus } from '@/hooks/use-clock-status'

export default function WorkstationPage() {
  const router = useRouter()
  const { employee, session, clearSession } = useSession()

  // Clock status from WhenIWork
  const { isClockedIn, clockIn, clockOut } = useClockStatus({
    employeeCode: employee?.employee_code,
    positionName: 'Workstation',
  })

  // Redirect if not logged in
  useEffect(() => {
    if (!employee || !session) {
      router.push('/')
    }
  }, [employee, session, router])

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

  if (!employee || !session) {
    return null
  }

  return (
    <main className="min-h-screen bg-muted/30 pb-24 flex flex-col">
      <EmployeeHeader
        name={employee.name}
        employeeCode={employee.employee_code}
        avatarUrl={employee.avatar_url}
        roomLabel="Workstation"
        onLogOut={handleEndShift}
        isClockedIn={isClockedIn}
        onClockIn={clockIn}
        onClockOut={clockOut}
      />

      {/* Room Tabs */}
      <div className="flex-1 p-4">
      <Tabs defaultValue="press-room">
        <TabsList className="w-full max-w-sm mx-auto flex mb-2">
          <TabsTrigger value="press-room" className="flex-1">
            Heat Press Room
          </TabsTrigger>
          <TabsTrigger value="bundle-room" className="flex-1">
            Bundle Room
          </TabsTrigger>
        </TabsList>

        <TabsContent value="press-room">
          <RoomWorkstation
            location="Heat Press Room"
            employeeId={employee.id}
            sessionId={session.id}
          />
        </TabsContent>

        <TabsContent value="bundle-room">
          <RoomWorkstation
            location="Bundling Room"
            employeeId={employee.id}
            sessionId={session.id}
          />
        </TabsContent>
      </Tabs>

      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </main>
  )
}
