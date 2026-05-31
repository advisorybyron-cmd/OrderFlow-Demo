'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, RefreshCw, Ship, User, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Employee {
  id: string
  first_name: string
  last_name: string
  employee_code: string
  avatar_url: string | null
}

interface ShipStationUserMapping {
  id: string
  shipstation_user_id: string
  shipstation_user_name: string | null
  employee_id: string | null
  employees: Employee | null
}

export default function ShipStationUsersPage() {
  const [mappings, setMappings] = useState<ShipStationUserMapping[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchEmployees()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/shipstation/users')
      if (res.ok) {
        const data = await res.json()
        setMappings(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch mappings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/employees?active=true')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  async function syncUsers() {
    setSyncing(true)
    try {
      const res = await fetch('/api/shipstation/users')
      if (res.ok) {
        const data = await res.json()
        setMappings(data.users || [])
      }
    } catch (error) {
      console.error('Failed to sync users:', error)
    } finally {
      setSyncing(false)
    }
  }

  async function updateMapping(shipstationUserId: string, employeeId: string | null) {
    setSaving(shipstationUserId)
    try {
      const res = await fetch('/api/shipstation/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipstation_user_id: shipstationUserId,
          employee_id: employeeId === 'none' ? null : employeeId,
        }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to update mapping:', error)
    } finally {
      setSaving(null)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">ShipStation User Mapping</h1>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-green-600" />
              <CardTitle>Map ShipStation Users to Employees</CardTitle>
            </div>
            <Button onClick={syncUsers} disabled={syncing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Users'}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Link ShipStation users to WhenIWork employees so their avatar appears on shipped order notifications.
            </p>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : mappings.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No ShipStation users found. Click &quot;Sync Users&quot; to fetch them.
              </div>
            ) : (
              <div className="space-y-3">
                {mappings.map((mapping) => (
                  <div
                    key={mapping.shipstation_user_id}
                    className="flex items-center gap-4 p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {mapping.shipstation_user_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {mapping.shipstation_user_id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mapping.employees && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                          {mapping.employees.avatar_url ? (
                            <div className="relative h-6 w-6 rounded-full overflow-hidden">
                              <Image
                                src={mapping.employees.avatar_url}
                                alt={mapping.employees.first_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm text-green-700 dark:text-green-300">
                            {mapping.employees.first_name} {mapping.employees.last_name}
                          </span>
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      )}

                      <Select
                        value={mapping.employee_id || 'none'}
                        onValueChange={(value) => updateMapping(mapping.shipstation_user_id, value)}
                        disabled={saving === mapping.shipstation_user_id}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select employee..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No mapping</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name} ({emp.employee_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
