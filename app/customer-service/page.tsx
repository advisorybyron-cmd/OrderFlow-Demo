'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Package, MapPin, Clock, Timer, Headset, Printer, Flame, Truck, Warehouse, Sparkles, Briefcase, HelpCircle, Check } from 'lucide-react'
import { EmployeeHeader } from '@/components/employee-header'
import { format } from 'date-fns'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { HelpScoutMetrics } from '@/components/helpscout-metrics'
import { ClockConfirmation } from '@/components/clock-confirmation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Positions for clock-in modal
const positions = [
  { title: 'Customer Service', positionName: 'Customer Service', icon: Headset, color: 'bg-blue-600 hover:bg-blue-500' },
  { title: 'DTF Printer', positionName: 'DTF Room', icon: Printer, color: 'bg-violet-600 hover:bg-violet-500' },
  { title: 'Bundle Room', positionName: 'Order Bundles', icon: Package, color: 'bg-amber-600 hover:bg-amber-500' },
  { title: 'Heat Press', positionName: 'Press Line', icon: Flame, color: 'bg-orange-600 hover:bg-orange-500' },
  { title: 'Shipping', positionName: 'Shipping', icon: Truck, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { title: 'Inventory', positionName: 'Inventory', icon: Warehouse, color: 'bg-cyan-600 hover:bg-cyan-500' },
  { title: 'Janitorial', positionName: 'Janitorial', icon: Sparkles, color: 'bg-pink-600 hover:bg-pink-500' },
  { title: 'Management', positionName: 'Management', icon: Briefcase, color: 'bg-slate-600 hover:bg-slate-500' },
  { title: 'MISC', positionName: 'MISC', icon: HelpCircle, color: 'bg-gray-600 hover:bg-gray-500' },
]

interface LocationHistory {
  id: string
  order_number: string
  location: string
  scanned_at: string
  scanned_by_employee_id: string | null
  notes: string | null
  employee?: {
    first_name: string
    last_name: string
  }
}



export default function CustomerServicePage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading } = useSession()
  const [orderNumber, setOrderNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchedOrder, setSearchedOrder] = useState<string | null>(null)
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [isClockLoading, setIsClockLoading] = useState(false)
  const [showClockInModal, setShowClockInModal] = useState(false)
  const [clockingInPosition, setClockingInPosition] = useState<string | null>(null)
  const [showClockConfirmation, setShowClockConfirmation] = useState(false)
  const [clockConfirmationType, setClockConfirmationType] = useState<'clock-in' | 'clock-out'>('clock-in')
  const [clockedInPositionName, setClockedInPositionName] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, isLoading])

  // Check if employee is currently clocked in
  useEffect(() => {
    if (!employee?.employee_code) return
    const checkClockStatus = async () => {
      try {
        const res = await fetch(`/api/wheniwork/current-position?employeeCode=${employee.employee_code}`)
        const data = await res.json()
        setIsClockedIn(data.position !== null)
      } catch {
        setIsClockedIn(false)
      }
    }
    checkClockStatus()
  }, [employee])



  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchedOrder(orderNumber.trim())

    try {
      const res = await fetch(`/api/order-locations/history?orderNumber=${encodeURIComponent(orderNumber.trim())}`)
      if (!res.ok) {
        throw new Error('Failed to fetch order history')
      }
      const data = await res.json()
      setLocationHistory(data.history || [])
    } catch {
      setError('Failed to look up order. Please try again.')
      setLocationHistory([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleEndShift = async () => {
    if (session?.id) {
      try {
        await fetch('/api/sessions/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        })
      } catch {
        // Continue with logout even if API fails
      }
    }
    clearSession()
    router.push('/')
  }

  const handleClockIn = async (positionName: string) => {
    if (!employee?.employee_code) return
    setClockingInPosition(positionName)
    try {
      const res = await fetch('/api/wheniwork/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: employee.employee_code, positionName }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIsClockedIn(true)
        setShowClockInModal(false)
        // Find position title from positions array
        const posTitle = positions.find(p => p.positionName === positionName)?.title || positionName
        setClockedInPositionName(posTitle)
        setClockConfirmationType('clock-in')
        setShowClockConfirmation(true)
      }
    } catch {
      // silently fail
    } finally {
      setClockingInPosition(null)
    }
  }

  const handleClockInClick = () => {
    setShowClockInModal(true)
  }

  const handleClockOut = async () => {
    if (!employee?.employee_code) return
    setIsClockLoading(true)
    try {
      const res = await fetch('/api/wheniwork/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: employee.employee_code }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIsClockedIn(false)
        setClockConfirmationType('clock-out')
        setShowClockConfirmation(true)
      }
    } catch {
      // silently fail
    } finally {
      setIsClockLoading(false)
    }
  }

  if (isLoading || !employee || !session) {
    return null
  }

  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-muted/30">
      <EmployeeHeader
        name={`${employee.first_name} ${employee.last_name}`}
        employeeCode={employee.employee_code}
        avatarUrl={employee.avatar_url}
        roomLabel="Customer Service"
        onLogOut={handleEndShift}
        isClockedIn={isClockedIn}
        onClockOut={isClockedIn ? handleClockOut : undefined}
        onClockIn={!isClockedIn ? handleClockInClick : undefined}
      />

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Help Scout Metrics */}
          <HelpScoutMetrics />

          <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Lookup - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  <CardTitle>Order Lookup</CardTitle>
                </div>
                <CardDescription>Search for an order to see its location history</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    placeholder="Enter order number..."
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </form>

                {error && (
                  <p className="text-destructive text-sm mt-4">{error}</p>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchedOrder && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <CardTitle>Order {searchedOrder}</CardTitle>
                    </div>
                    {locationHistory.length > 0 && (
                      <Badge variant="secondary">
                        {locationHistory.length} location{locationHistory.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {locationHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No location history found for this order</p>
                      <p className="text-sm mt-1">The order may not have been scanned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Current Location */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-700 font-medium mb-1">Current Location</p>
                        <p className="text-xl font-bold text-green-800">{locationHistory[0].location}</p>
                        <p className="text-sm text-green-600 mt-1">
                          {format(new Date(locationHistory[0].scanned_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>

                      {/* History Timeline */}
                      {locationHistory.length > 1 && (
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Location History
                          </h4>
                          <div className="space-y-3">
                            {locationHistory.map((loc, index) => (
                              <div
                                key={loc.id}
                                className={`flex items-start gap-3 ${index === 0 ? 'opacity-50' : ''}`}
                              >
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  {index < locationHistory.length - 1 && (
                                    <div className="w-0.5 h-8 bg-gray-200" />
                                  )}
                                </div>
                                <div className="flex-1 pb-2">
                                  <p className="font-medium">{loc.location}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(loc.scanned_at), 'MMM d, yyyy h:mm a')}
                                  </p>
                                  {loc.employee && (
                                    <p className="text-xs text-muted-foreground">
                                      by {loc.employee.first_name} {loc.employee.last_name}
                                    </p>
                                  )}
                                  {loc.notes && (
                                    <p className="text-xs text-muted-foreground italic mt-1">{loc.notes}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Live Activity Panel - Right sidebar */}
          <div className="lg:col-span-1">
            <LiveActivityFeed maxItems={20} pollInterval={5000} enableInfiniteScroll />
          </div>
          </div>
        </div>
      </main>

      {/* Clock In Position Modal */}
      <Dialog open={showClockInModal} onOpenChange={setShowClockInModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-600">Clock In to Position</DialogTitle>
            <DialogDescription>Select a position to clock into</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {positions.map((position) => {
              const Icon = position.icon
              const isClockingThis = clockingInPosition === position.positionName
              return (
                <button
                  key={position.positionName}
                  onClick={() => handleClockIn(position.positionName)}
                  disabled={!!clockingInPosition}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-green-300 hover:border-green-500 hover:shadow-lg transition-all bg-card"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium mb-2">{position.title}</span>
                  <div className={`w-full py-1.5 px-3 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 ${position.color}`}>
                    {isClockingThis ? 'Clocking In...' : (
                      <>Clock In <Check className="w-3 h-3" /></>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clock Confirmation Overlay */}
      <ClockConfirmation
        show={showClockConfirmation}
        type={clockConfirmationType}
        positionName={clockedInPositionName || undefined}
        onClose={() => setShowClockConfirmation(false)}
      />
    </div>
  )
}
