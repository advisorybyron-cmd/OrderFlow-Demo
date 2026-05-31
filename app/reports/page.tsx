'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format, parseISO, subWeeks, addWeeks } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PasswordGate } from '@/components/password-gate'
import { PressEmployeeReport } from '@/components/press-employee-report'
import { BundleEmployeeReport } from '@/components/bundle-employee-report'
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Clock, 
  Zap,
  Users,
  Download
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface DailyStat {
  date: string
  dayName: string
  dayDate: string
  totalItems: number
  hoursWorked: number
  shirtsPerMinute: number
}

interface ReportData {
  weekStart: string
  weekEnd: string
  dailyStats: DailyStat[]
  summary: {
    totalItems: number
    totalHours: number
    avgShirtsPerMinute: number
    prevWeekTotal: number
    changePercent: number
  }
  employees: Array<{
    id: string
    name: string
    employee_code: string
    avatar_url: string | null
  }>
}

export default function ReportsPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [weekStart, setWeekStart] = useState<string>(() => {
    const today = new Date()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - today.getDay())
    return format(sunday, 'yyyy-MM-dd')
  })

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedEmployee !== 'all') params.set('employeeId', selectedEmployee)
    params.set('weekStart', weekStart)
    return params.toString()
  }, [selectedEmployee, weekStart])

  const { data, isLoading, error } = useSWR<ReportData>(
    `/api/reports?${queryParams}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const handlePreviousWeek = () => {
    setWeekStart(format(subWeeks(parseISO(weekStart), 1), 'yyyy-MM-dd'))
  }

  const handleNextWeek = () => {
    setWeekStart(format(addWeeks(parseISO(weekStart), 1), 'yyyy-MM-dd'))
  }

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Date', 'Day', 'Items', 'Hours', 'Items/Minute']
    const rows = data.dailyStats.map(d => [
      d.date,
      d.dayName,
      d.totalItems,
      d.hoursWorked,
      d.shirtsPerMinute
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `productivity-report-${weekStart}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const weekLabel = data 
    ? `${format(parseISO(data.weekStart), 'MMM d')} - ${format(parseISO(data.weekEnd), 'MMM d, yyyy')}`
    : 'Loading...'

  return (
    <PasswordGate>
    <main className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Productivity Reports</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Employee:</span>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {data?.employees?.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[180px] text-center">
                  {weekLabel}
                </span>
                <Button variant="outline" size="icon" onClick={handleNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{data?.summary.totalItems ?? '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hours Worked</p>
                  <p className="text-2xl font-bold">{data?.summary.totalHours ?? '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Items/Min</p>
                  <p className="text-2xl font-bold">{data?.summary.avgShirtsPerMinute ?? '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  (data?.summary.changePercent ?? 0) >= 0 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {(data?.summary.changePercent ?? 0) >= 0 
                    ? <TrendingUp className="h-5 w-5" />
                    : <TrendingDown className="h-5 w-5" />
                  }
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">vs Last Week</p>
                  <p className="text-2xl font-bold">
                    {data?.summary.changePercent !== undefined 
                      ? `${data.summary.changePercent >= 0 ? '+' : ''}${data.summary.changePercent}%`
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Output</CardTitle>
              <CardDescription>Items completed per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="dayName" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="totalItems" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Efficiency Trend</CardTitle>
              <CardDescription>Items per minute over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="dayName" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="shirtsPerMinute" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Breakdown</CardTitle>
            <CardDescription>Detailed stats for each day of the week</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Items/Min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">
                      Failed to load data
                    </TableCell>
                  </TableRow>
                ) : data?.dailyStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.dailyStats.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.dayName}</TableCell>
                      <TableCell>{day.dayDate}</TableCell>
                      <TableCell className="text-right">
                        {day.totalItems > 0 ? (
                          <Badge variant="secondary">{day.totalItems}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.hoursWorked > 0 ? day.hoursWorked.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.shirtsPerMinute > 0 ? (
                          <span className="font-medium">{day.shirtsPerMinute.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Summary Row */}
            {data && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                <span className="font-medium">Week Total</span>
                <div className="flex items-center gap-8">
                  <span>
                    <span className="text-muted-foreground mr-2">Items:</span>
                    <span className="font-bold">{data.summary.totalItems}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground mr-2">Hours:</span>
                    <span className="font-bold">{data.summary.totalHours.toFixed(1)}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground mr-2">Avg/Min:</span>
                    <span className="font-bold">{data.summary.avgShirtsPerMinute.toFixed(2)}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground mr-2">Prev Week:</span>
                    <span className="font-medium">{data.summary.prevWeekTotal}</span>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Press Employee Report */}
        <Card>
          <CardContent className="p-6">
            <PressEmployeeReport />
          </CardContent>
        </Card>

        {/* Bundle Room Employee Report */}
        <Card>
          <CardContent className="p-6">
            <BundleEmployeeReport />
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </main>
    </PasswordGate>
  )
}
