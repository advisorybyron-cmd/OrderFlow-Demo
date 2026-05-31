'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, FileBarChart, ArrowRight, Key } from 'lucide-react'
import { EmployeeHeader } from '@/components/employee-header'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { useClockStatus } from '@/hooks/use-clock-status'

export default function ManagementPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading } = useSession()
  const [hasManagementAccess, setHasManagementAccess] = useState<boolean | null>(null)

  // Clock status from WhenIWork
  const { isClockedIn, clockIn, clockOut } = useClockStatus({
    employeeCode: employee?.employee_code,
    positionName: 'Management',
  })

  useEffect(() => {
    if (!isLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, isLoading])

  // Check if employee has management access
  useEffect(() => {
    if (!employee?.employee_code) return

    const checkManagementAccess = async () => {
      try {
        const res = await fetch(`/api/wheniwork/check-management?employeeCode=${encodeURIComponent(employee.employee_code)}`)
        const data = await res.json()
        if (res.ok) {
          setHasManagementAccess(data.hasManagementAccess)
          // Redirect if no access
          if (!data.hasManagementAccess) {
            router.push('/select-room')
          }
        } else {
          router.push('/select-room')
        }
      } catch (err) {
        console.error('Failed to check management access:', err)
        router.push('/select-room')
      }
    }

    checkManagementAccess()
  }, [employee?.employee_code, router])

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

  if (isLoading || !employee || !session || hasManagementAccess === null) {
    return null
  }

  // Extra safety check - redirect if somehow got here without access
  if (hasManagementAccess === false) {
    return null
  }

  const initials = employee.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <EmployeeHeader
        name={employee.name}
        employeeCode={employee.employee_code}
        avatarUrl={employee.avatar_url}
        roomLabel="Management"
        onLogOut={handleLogOut}
        isClockedIn={isClockedIn}
        onClockIn={clockIn}
        onClockOut={clockOut}
        rightSlot={
          <Button variant="outline" onClick={() => router.push('/admin')} className="gap-2">
            <Settings className="h-4 w-4" />
            Admin
          </Button>
        }
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto mt-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-foreground mb-6">Management Tools</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manager Reports Card */}
            <button
              onClick={() => router.push('/reports')}
              className="group relative bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-indigo-100 hover:border-indigo-300 hover:scale-[1.02]"
            >
              <div className="w-14 h-14 rounded-xl bg-indigo-500 flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                <FileBarChart className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Manager Reports</h3>
              <p className="text-sm text-slate-600 mb-4">
                View employee hours, productivity metrics, and performance reports.
              </p>
              <div className="flex items-center text-indigo-600 text-sm font-medium group-hover:text-indigo-700">
                View Reports
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Password Manager Card */}
            <button
              onClick={() => router.push('/management/passwords')}
              className="group relative bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-amber-100 hover:border-amber-300 hover:scale-[1.02]"
            >
              <div className="w-14 h-14 rounded-xl bg-amber-500 flex items-center justify-center mb-4 group-hover:bg-amber-600 transition-colors">
                <Key className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Password Manager</h3>
              <p className="text-sm text-slate-600 mb-4">
                Change passwords for protected pages in the system.
              </p>
              <div className="flex items-center text-amber-600 text-sm font-medium group-hover:text-amber-700">
                Manage Passwords
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Live Activity Panel - Right sidebar */}
        <div className="lg:col-span-1">
          <LiveActivityFeed maxItems={10} pollInterval={5000} />
        </div>
      </div>
    </main>
  )
}
