'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Headset, Printer, Package, Flame, Truck, ArrowRight, Warehouse, Sparkles as SparklesIcon, Briefcase, HelpCircle, AlertTriangle } from 'lucide-react'
import { EmployeeHeader } from '@/components/employee-header'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { ClockConfirmation } from '@/components/clock-confirmation'

// Map station titles to WheniWork position names
const stations = [
  {
    title: 'Customer Service',
    positionNames: ['Customer Service'],
    href: '/customer-service',
    icon: Headset,
    accent: 'from-blue-500 to-blue-700',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/60',
    buttonColor: 'bg-blue-600 hover:bg-blue-500',
  },
  {
    title: 'DTF Printer',
    positionNames: ['DTF Room'],
    href: '/dtf-room',
    icon: Printer,
    accent: 'from-violet-500 to-violet-700',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
    borderHover: 'hover:border-violet-500/60',
    buttonColor: 'bg-violet-600 hover:bg-violet-500',
  },
  {
    title: 'Bundle Room',
    positionNames: ['Order Bundles'],
    href: '/bundle-room',
    icon: Package,
    accent: 'from-amber-500 to-amber-700',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    borderHover: 'hover:border-amber-500/60',
    buttonColor: 'bg-amber-600 hover:bg-amber-500',
  },
  {
    title: 'Heat Press',
    positionNames: ['Press Line'],
    href: '/heat-press',
    icon: Flame,
    accent: 'from-orange-500 to-red-600',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    borderHover: 'hover:border-orange-500/60',
    buttonColor: 'bg-orange-600 hover:bg-orange-500',
  },
  {
    title: 'Shipping',
    positionNames: ['Shipping'],
    href: '/shipping-room',
    icon: Truck,
    accent: 'from-emerald-500 to-emerald-700',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    borderHover: 'hover:border-emerald-500/60',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-500',
  },
  {
    title: 'Inventory',
    positionNames: ['Inventory'],
    href: '/inventory-management',
    icon: Warehouse,
    accent: 'from-cyan-500 to-cyan-700',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-500/60',
    buttonColor: 'bg-cyan-600 hover:bg-cyan-500',
  },
  {
    title: 'Janitorial',
    positionNames: ['Janitorial'],
    href: '/janitorial',
    icon: SparklesIcon,
    accent: 'from-pink-500 to-pink-700',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
    borderHover: 'hover:border-pink-500/60',
    buttonColor: 'bg-pink-600 hover:bg-pink-500',
  },
  {
    title: 'Management',
    positionNames: ['Management'],
    href: '/management',
    icon: Briefcase,
    accent: 'from-slate-500 to-slate-700',
    iconBg: 'bg-slate-500/20',
    iconColor: 'text-slate-400',
    borderHover: 'hover:border-slate-500/60',
    buttonColor: 'bg-slate-600 hover:bg-slate-500',
  },
  {
    title: 'MISC',
    positionNames: ['MISC'],
    href: '/misc',
    icon: HelpCircle,
    accent: 'from-gray-500 to-gray-700',
    iconBg: 'bg-gray-500/20',
    iconColor: 'text-gray-400',
    borderHover: 'hover:border-gray-500/60',
    buttonColor: 'bg-gray-600 hover:bg-gray-500',
  },
]

export default function SelectRoomPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading } = useSession()
  const [currentPosition, setCurrentPosition] = useState<string | null>(null)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [pendingStation, setPendingStation] = useState<typeof stations[0] | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [isClockInMode, setIsClockInMode] = useState(false)
  const [isClockingIn, setIsClockingIn] = useState(false)
  const [isClockingOut, setIsClockingOut] = useState(false)
  const [showClockConfirmation, setShowClockConfirmation] = useState(false)
  const [clockConfirmationType, setClockConfirmationType] = useState<'clock-in' | 'clock-out'>('clock-in')
  const [clockedInPositionName, setClockedInPositionName] = useState<string | null>(null)
  const [hasManagementAccess, setHasManagementAccess] = useState(false)
  const [showNotClockedInDialog, setShowNotClockedInDialog] = useState(false)
  
  // Employee is clocked in if they have a current position
  const isClockedIn = !!currentPosition

  useEffect(() => {
    if (!isLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, isLoading])

  // Fetch current clocked-in position from WheniWork
  useEffect(() => {
    console.log('[v0] Employee data:', employee)
    console.log('[v0] Employee code:', employee?.employee_code)
    
    if (!employee?.employee_code) {
      console.log('[v0] No employee code, skipping position fetch')
      return
    }

    const fetchPosition = async () => {
      try {
        console.log('[v0] Fetching position for:', employee.employee_code)
        const res = await fetch(`/api/wheniwork/current-position?employeeCode=${encodeURIComponent(employee.employee_code)}`)
        const data = await res.json()
        console.log('[v0] Position API response:', JSON.stringify(data, null, 2))
        console.log('[v0] res.ok:', res.ok)
        console.log('[v0] data.position:', data.position)
        console.log('[v0] data.position?.name:', data.position?.name)
        
        if (res.ok && data.position?.name) {
          console.log('[v0] Setting current position to:', data.position.name)
          setCurrentPosition(data.position.name)
        } else {
          console.log('[v0] No position found. res.ok=', res.ok, 'position=', data.position)
        }
      } catch (err) {
        console.error('[v0] Failed to fetch current position:', err)
      }
    }

    fetchPosition()
  }, [employee?.employee_code])

  // Check if employee has management access
  useEffect(() => {
    if (!employee?.employee_code) return

    const checkManagementAccess = async () => {
      try {
        const res = await fetch(`/api/wheniwork/check-management?employeeCode=${encodeURIComponent(employee.employee_code)}`)
        const data = await res.json()
        if (res.ok) {
          setHasManagementAccess(data.hasManagementAccess)
        }
      } catch (err) {
        console.error('Failed to check management access:', err)
      }
    }

    checkManagementAccess()
  }, [employee?.employee_code])

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

  const handleClockOut = async () => {
    if (!employee?.employee_code || !isClockedIn) return

    setIsClockingOut(true)
    try {
      const res = await fetch('/api/wheniwork/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: employee.employee_code }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setCurrentPosition(null)
        setClockConfirmationType('clock-out')
        setShowClockConfirmation(true)
      } else {
        console.error('Failed to clock out:', data.error)
        alert(`Failed to clock out: ${data.error}`)
      }
    } catch (err) {
      console.error('Error clocking out:', err)
      alert('An error occurred while clocking out')
    } finally {
      setIsClockingOut(false)
    }
  }

  const handleClockInClick = () => {
    // Enter clock-in mode - user will select a position
    setIsClockInMode(true)
  }

  const handleClockInToPosition = async (station: typeof stations[0]) => {
    if (!employee?.employee_code) return

    setIsClockingIn(true)
    try {
      const positionName = station.positionNames[0]
      const res = await fetch('/api/wheniwork/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: employee.employee_code,
          positionName,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setCurrentPosition(data.position.name)
        setIsClockInMode(false)
        setClockedInPositionName(station.title)
        setClockConfirmationType('clock-in')
        setShowClockConfirmation(true)
      } else {
        console.error('Failed to clock in:', data.error)
        alert(`Failed to clock in: ${data.error}`)
      }
    } catch (err) {
      console.error('Error clocking in:', err)
      alert('An error occurred while clocking in')
    } finally {
      setIsClockingIn(false)
    }
  }

  const handleCancelClockIn = () => {
    setIsClockInMode(false)
  }

  const handleStationClick = (station: typeof stations[0]) => {
    // If in clock-in mode, clock into this position instead of navigating
    if (isClockInMode) {
      handleClockInToPosition(station)
      return
    }

    // Check if this station matches the current position
    const isCurrentPosition = currentPosition && station.positionNames.some(
      name => currentPosition.toLowerCase() === name.toLowerCase()
    )

    if (!currentPosition) {
      // Not clocked in — prompt to clock in to this station
      setPendingStation(station)
      setShowNotClockedInDialog(true)
    } else if (isCurrentPosition) {
      // Already clocked into this position, go directly
      router.push(station.href)
    } else {
      // Clocked into a different position — show switch dialog
      setPendingStation(station)
      setShowSwitchDialog(true)
    }
  }

  const handleClockInAndEnter = async () => {
    if (!pendingStation) return
    setShowNotClockedInDialog(false)
    await handleClockInToPosition(pendingStation)
    router.push(pendingStation.href)
  }

  const handleEnterWithoutClockin = () => {
    if (!pendingStation) return
    setShowNotClockedInDialog(false)
    router.push(pendingStation.href)
    setPendingStation(null)
  }

  const handleSwitchPosition = async () => {
    if (!pendingStation || !employee?.employee_code) return

    setIsSwitching(true)
    try {
      // Use the first position name as the WheniWork position to clock into
      const newPositionName = pendingStation.positionNames[0]
      
      const res = await fetch('/api/wheniwork/switch-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: employee.employee_code,
          newPositionName,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Update local state and navigate
        setCurrentPosition(data.newPosition.name)
        setShowSwitchDialog(false)
        router.push(pendingStation.href)
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Unknown error'
        console.error('Failed to switch position:', errorMsg)
        alert(`Failed to switch position: ${errorMsg}`)
      }
    } catch (err) {
      console.error('Error switching position:', err)
      alert('An error occurred while switching positions')
    } finally {
      setIsSwitching(false)
    }
  }

  const handleCancelSwitch = () => {
    // Navigate to the station without switching clock position
    if (pendingStation) {
      router.push(pendingStation.href)
    }
    setShowSwitchDialog(false)
    setPendingStation(null)
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
        roomLabel="Select Room"
        onLogOut={handleEndShift}
        isClockedIn={isClockedIn}
        onClockOut={isClockedIn ? handleClockOut : undefined}
        onClockIn={!isClockedIn ? handleClockInClick : undefined}
      />

      <div className="flex-1 p-4 pb-36">
      {/* Title */}
      <div className="text-center mb-10">
        {isClockInMode ? (
          <>
            <h2 className="text-3xl font-black text-green-600 tracking-tight">Clock In to Position</h2>
            <p className="text-sm text-muted-foreground mt-1">Select a position to clock into</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelClockIn}
              className="mt-3"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-black text-foreground tracking-tight">Select Station</h2>
            <p className="text-sm text-muted-foreground mt-1">Where are you working today?</p>
          </>
        )}
      </div>

      {/* Station Cards */}
      <div className={`grid grid-cols-3 md:grid-cols-5 gap-4 max-w-6xl mx-auto ${isClockInMode ? 'animate-pulse-subtle' : ''}`}>
        {stations
          .filter(station => {
            // Hide Management room for non-management employees
            if (station.title === 'Management' && !hasManagementAccess) {
              return false
            }
            return true
          })
          .map((station) => {
          const Icon = station.icon
          // Check if this station matches the employee's current clocked-in position (exact match only)
          const isCurrentPosition = currentPosition && station.positionNames.some(
            name => currentPosition.toLowerCase() === name.toLowerCase()
          )
          
          return (
            <button
              key={station.href}
              onClick={() => handleStationClick(station)}
              disabled={isClockingIn}
              className={`group relative flex flex-col items-center text-center p-6 rounded-2xl bg-card border transition-all duration-200 hover:scale-105 hover:shadow-2xl cursor-pointer ${
                isClockInMode
                  ? 'border-green-400 hover:border-green-500 hover:shadow-green-500/30 ring-2 ring-green-400/50'
                  : isCurrentPosition 
                    ? 'border-green-400 animate-position-glow shadow-lg shadow-green-500/30' 
                    : `border-border ${station.borderHover}`
              }`}
            >
              {/* Clock In Mode Badge */}
              {isClockInMode && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {isClockingIn ? 'CLOCKING IN...' : 'TAP TO CLOCK IN'}
                </div>
              )}

              {/* Clocked In Badge */}
              {isCurrentPosition && !isClockInMode && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                  CLOCKED IN!
                </div>
              )}

              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${station.iconBg} flex items-center justify-center mb-4 ${isCurrentPosition || isClockInMode ? 'mt-2' : ''}`}>
                <Icon className={`w-8 h-8 ${isClockInMode ? 'text-green-500' : station.iconColor}`} strokeWidth={1.5} />
              </div>

              {/* Title */}
              <h3 className={`font-bold text-sm leading-tight mb-5 ${isClockInMode ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                {station.title}
              </h3>

              {/* Button */}
              <div className={`w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-white text-xs font-semibold transition-colors ${
                isClockInMode 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : station.buttonColor
              }`}>
                {isClockInMode ? (
                  <>
                    Clock In
                    <span>✓</span>
                  </>
                ) : (
                  <>
                    Go
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>

      </div>

      {/* Position Switch Confirmation Dialog */}
      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-amber-500/20">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <DialogTitle className="text-xl font-bold">Switch Position?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-base pt-2">
              You are currently clocked into{' '}
              <span className="font-bold text-amber-500">{currentPosition}</span>.
              <br /><br />
              Would you like to clock out of <span className="font-semibold text-amber-500">{currentPosition}</span> and 
              clock into <span className="font-semibold text-green-500">{pendingStation?.title}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6 sm:justify-center">
            <Button
              variant="outline"
              onClick={handleCancelSwitch}
              disabled={isSwitching}
              className="flex-1"
            >
              No, Stay Here
            </Button>
            <Button
              onClick={handleSwitchPosition}
              disabled={isSwitching}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              {isSwitching ? 'Switching...' : 'Yes, Switch Position'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Clocked In Dialog */}
      <Dialog open={showNotClockedInDialog} onOpenChange={setShowNotClockedInDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-amber-500/20">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <DialogTitle className="text-xl font-bold">Not Clocked In</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-base pt-2">
              You are entering the{' '}
              <span className="font-bold text-foreground">{pendingStation?.title}</span>{' '}
              room but you are not clocked in. Would you like to clock into{' '}
              <span className="font-bold text-green-500">{pendingStation?.title}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6 sm:justify-center">
            <Button
              variant="outline"
              onClick={handleEnterWithoutClockin}
              disabled={isClockingIn}
              className="flex-1"
            >
              No, Stay Clocked Out
            </Button>
            <Button
              onClick={handleClockInAndEnter}
              disabled={isClockingIn}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              {isClockingIn ? 'Clocking In...' : `Yes, Clock into ${pendingStation?.title}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />

      {/* Clock Confirmation Overlay */}
      <ClockConfirmation
        show={showClockConfirmation}
        type={clockConfirmationType}
        positionName={clockedInPositionName || undefined}
        onClose={() => setShowClockConfirmation(false)}
      />
    </main>
  )
}
