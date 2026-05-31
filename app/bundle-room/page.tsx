'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScanBarcode, Loader2 } from 'lucide-react'
import { EmployeeHeader } from '@/components/employee-header'
import { OrderGallery } from '@/components/workstation/order-gallery'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { useClockStatus } from '@/hooks/use-clock-status'
import type { ShipStationOrder } from '@/lib/shipstation/types'

export default function BundleRoomPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading: sessionLoading } = useSession()
  const [orderNumber, setOrderNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentOrder, setCurrentOrder] = useState<ShipStationOrder | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clock status from WhenIWork
  const { isClockedIn, clockIn, clockOut } = useClockStatus({
    employeeCode: employee?.employee_code,
    positionName: 'Bundle Room',
  })

  useEffect(() => {
    if (!sessionLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, sessionLoading])

  useEffect(() => {
    if (!currentOrder) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [currentOrder])

  const handleScanOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shipstation/orders/${encodeURIComponent(orderNumber.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Order not found'
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      if (!data.order || !Array.isArray(data.order.items)) {
        setError('Invalid order data received')
        setIsLoading(false)
        return
      }

      // Record order location
      try {
        await fetch('/api/order-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: String(data.order.orderNumber),
            location: 'Bundle Room',
            employeeId: employee?.id || null,
          }),
        })
      } catch {
        // Non-fatal error
      }

      setCurrentOrder(data.order)
      setOrderNumber('')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemComplete = useCallback(async (itemIndex: number, item: ShipStationOrder['items'][0]) => {
    if (!session || !employee || !currentOrder) return
    try {
      await fetch('/api/sessions/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          employeeId: employee.id,
          orderNumber: currentOrder.orderNumber,
          itemIndex,
          itemName: item.name,
          itemSku: item.sku,
          quantity: item.quantity,
        }),
      })
    } catch {
      // non-fatal
    }
  }, [session, employee, currentOrder])

  const handleOrderComplete = useCallback(() => {
    setCurrentOrder(null)
  }, [])

  const handleEndShift = async () => {
    if (!session) return
    try {
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
    } catch {
      // non-fatal
    }
    clearSession()
    router.push('/')
  }

  if (sessionLoading || !employee || !session) return null

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
        roomLabel="Bundle Room"
        onLogOut={handleEndShift}
        isClockedIn={isClockedIn}
        onClockIn={clockIn}
        onClockOut={clockOut}
      />

      {/* Content area fills remaining height - must use min-h-0 for flex child scrolling */}
      <div className="flex-1 min-h-0 overflow-hidden p-2">
        {!currentOrder ? (
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <ScanBarcode className="w-6 h-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Scan Order</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScanOrder} className="space-y-3">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan or enter order number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="text-center text-lg h-11 font-mono"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  className="w-full h-10"
                  disabled={isLoading || !orderNumber.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load Order'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <OrderGallery
            order={currentOrder}
            onItemComplete={handleItemComplete}
            onOrderComplete={handleOrderComplete}
          />
        )}
      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </main>
  )
}
