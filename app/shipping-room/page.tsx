'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, MapPin, Package, RefreshCw, AlertCircle } from 'lucide-react'
import { EmployeeHeader } from '@/components/employee-header'
import { RunningFlamingos } from '@/components/running-flamingos'
import { InteractiveShipmentMap } from '@/components/interactive-shipment-map'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { useClockStatus } from '@/hooks/use-clock-status'

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: '90days', label: 'Last 90 Days' },
]

interface ShipmentMarker {
  lat: number
  lon: number
  orderNumber: string
  city: string
  postalCode: string
  country: string
  state: string
}

interface ShipmentData {
  totalShipments: number
  markers: ShipmentMarker[]
  dateRange: { start: string; end: string; label: string }
}

export default function ShippingRoomPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading: sessionLoading } = useSession()
  const [selectedRange, setSelectedRange] = useState('today')
  const [data, setData] = useState<ShipmentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clock status from WhenIWork
  const { isClockedIn, clockIn, clockOut } = useClockStatus({
    employeeCode: employee?.employee_code,
    positionName: 'Shipping',
  })

  useEffect(() => {
    if (!sessionLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, sessionLoading])

  const fetchShipments = useCallback(async (range: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/shipments/today?range=${range}`)
      if (!res.ok) throw new Error('Failed to fetch shipments')
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShipments(selectedRange)
  }, [selectedRange, fetchShipments])



  const handleEndShift = () => {
    clearSession()
    router.push('/')
  }

  if (sessionLoading || !employee || !session) return null

  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <EmployeeHeader
        name={employee.name}
        employeeCode={employee.employee_code}
        avatarUrl={employee.avatar_url}
        roomLabel="Shipping Room"
        onLogOut={handleEndShift}
        isClockedIn={isClockedIn}
        onClockIn={clockIn}
        onClockOut={clockOut}
      />

      {/* Main Content - pb-24 to account for fixed ticker footer */}
      <main className="flex-1 p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Title + Stats + Controls row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Shipment Map</h1>
              </div>
              {data && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="font-semibold text-foreground">{data.totalShipments}</span>
                    <span>orders</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="font-semibold text-foreground">{data.markers.length}</span>
                    <span>locations</span>
                  </div>
                </div>
              )}
            </div>

            {/* Date range selector + refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5 overflow-x-auto">
                {DATE_RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRange(r.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedRange === r.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchShipments(selectedRange)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Map and Stats Grid */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Map Card */}
            <Card className="lg:col-span-2 overflow-hidden bg-muted/50">
              <div className="w-full h-[400px] relative">
                <InteractiveShipmentMap 
                  markers={data?.markers ?? []} 
                  loading={loading} 
                />
              </div>
            </Card>

            {/* Legend & Stats Sidebar */}
            <div className="space-y-4">
              {/* Legend */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm">Legend</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500 border border-white shadow-sm" />
                    <span>Shipment<br/>(1 dot = 1 order)</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Click a dot for details. Use scroll or pinch to zoom.
                </p>
              </Card>

              {/* Stats */}
              {data && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 text-sm">Time Period</h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">{data.dateRange.label}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] leading-tight">
                        {data.dateRange.start} to {data.dateRange.end}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="font-semibold text-sm">{data.totalShipments}</div>
                      <div className="text-muted-foreground text-[10px]">orders shipped</div>
                    </div>
                  </div>
                </Card>
              )}

            </div>
          </div>

          {/* Legend & Stats */}
          <div className="grid md:grid-cols-2 gap-4 hidden">
            {/* Legend */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Map Legend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 border border-white" />
                  <span>US/Canada Postal Code (Individual)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 border border-white" />
                  <span>Country Destination (Aggregated)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Marker size indicates volume. Hover over markers for details.
                </p>
              </div>
            </Card>

            {/* Stats */}
            {data && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Time Period</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{data.dateRange.label}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {data.dateRange.start} to {data.dateRange.end}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="font-semibold">{data.totalShipments} total orders shipped</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Fun flamingo animation */}
      <RunningFlamingos />

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </div>
  )
}
