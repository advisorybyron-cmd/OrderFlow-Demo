'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import { EmployeeHeader } from '@/components/employee-header'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { useClockStatus } from '@/hooks/use-clock-status'

export default function JanitorialPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading } = useSession()

  // Clock status from WhenIWork
  const { isClockedIn, clockIn, clockOut } = useClockStatus({
    employeeCode: employee?.employee_code,
    positionName: 'Janitorial',
  })

  useEffect(() => {
    if (!isLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, isLoading])

  const handleLogOut = async () => {
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
    <main className="min-h-screen bg-background flex flex-col pb-24">
      <EmployeeHeader
        name={employee.name}
        employeeCode={employee.employee_code}
        avatarUrl={employee.avatar_url}
        roomLabel="Janitorial"
        onLogOut={handleLogOut}
        isClockedIn={isClockedIn}
        onClockIn={clockIn}
        onClockOut={clockOut}
      />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto mt-20">
        <Card className="border-pink-200 bg-pink-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-pink-600" />
            </div>
            <CardTitle className="text-2xl text-pink-800">Janitorial</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              This room is under construction. Functions will be added soon.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </main>
  )
}
