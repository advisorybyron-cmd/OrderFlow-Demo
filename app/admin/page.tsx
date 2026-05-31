'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PasswordGate } from '@/components/password-gate'
import { 
  Loader2, 
  RefreshCw, 
  Users, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  Ship
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LiveActivityFeed } from '@/components/live-activity-feed'

interface SyncResult {
  success: boolean
  message?: string
  error?: string
  synced?: number
  employees?: Array<{ code: string; name: string }>
}

export default function AdminPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/admin/sync-employees', {
        method: 'POST',
      })

      const data = await response.json()
      setSyncResult(data)
    } catch (error) {
      setSyncResult({
        success: false,
        error: 'Failed to connect to server',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <PasswordGate>
    <main className="min-h-screen p-4 md:p-8 pb-24 bg-muted/30">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              Employee Management
            </CardTitle>
            <CardDescription>
              Sync employees from When I Work to enable badge scanning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">When I Work Sync</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This will pull all active employees from When I Work and add them to Torpid OrderFlow. Employees are matched by their Employee ID field.
              </p>
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full sm:w-auto"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing Employees...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync from When I Work
                  </>
                )}
              </Button>
            </div>

            {syncResult && (
              <Alert variant={syncResult.success ? 'default' : 'destructive'}>
                <div className="flex items-start gap-2">
                  {syncResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      {syncResult.success 
                        ? syncResult.message 
                        : (typeof syncResult.error === 'string' 
                            ? syncResult.error 
                            : syncResult.error?.message || 'An error occurred')}
                    </AlertDescription>
                    
                    {syncResult.employees && syncResult.employees.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">
                          Synced {syncResult.synced} employees:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {syncResult.employees.map((emp) => (
                            <div 
                              key={emp.code}
                              className="flex items-center gap-2 p-2 bg-background rounded border"
                            >
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                {emp.code}
                              </span>
                              <span className="truncate">{emp.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ShipStation User Mapping Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="w-6 h-6" />
              ShipStation User Mapping
            </CardTitle>
            <CardDescription>
              Link ShipStation users to employees for shipper avatars on shipped orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Map ShipStation users to WhenIWork employees so their avatar appears on &quot;Shipped&quot; order notifications in the activity tracker.
            </p>
            <Link href="/admin/shipstation-users">
              <Button variant="outline">
                <Ship className="mr-2 h-4 w-4" />
                Manage User Mappings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </main>
    </PasswordGate>
  )
}
