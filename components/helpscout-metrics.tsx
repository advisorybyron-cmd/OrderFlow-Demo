'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react'
import { format, parse } from 'date-fns'

interface DailyStat {
  date: string
  new: number
  closed: number
}

interface HelpScoutMetrics {
  activeConversations: number
  pendingConversations: number
  newConversations7d: number
  closedConversations7d: number
  dailyStats: DailyStat[]
  lastUpdated: string
}

export function HelpScoutMetrics() {
  const [metrics, setMetrics] = useState<HelpScoutMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/helpscout/metrics')
        const data = await res.json()
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to fetch metrics')
        }
        setMetrics(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Help Scout Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading metrics...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || !metrics) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Help Scout Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'Unable to load metrics'}</p>
        </CardContent>
      </Card>
    )
  }

  const getNetChange = (stat: DailyStat) => {
    const net = stat.new - stat.closed
    return {
      value: net,
      color: net > 0 ? 'text-cyan-400' : net < 0 ? 'text-green-400' : 'text-gray-400',
    }
  }

  const lastUpdatedTime = format(new Date(metrics.lastUpdated), 'h:mm:ss a')

  return (
    <Card className="bg-gradient-to-br from-slate-950 to-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-cyan-400 text-2xl font-bold">HELP SCOUT SUPPORT</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Active Conversations</p>
            <p className="text-3xl font-bold text-orange-400">{metrics.activeConversations}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Pending Conversations</p>
            <p className="text-3xl font-bold text-yellow-400">{metrics.pendingConversations}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">New (7 Days)</p>
            <p className="text-3xl font-bold text-white">{metrics.newConversations7d}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Closed (7 Days)</p>
            <p className="text-3xl font-bold text-green-400">{metrics.closedConversations7d}</p>
          </div>
        </div>

        {/* Daily Stats Table */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Daily Conversation Stats</h3>
          <p className="text-xs text-slate-500 mb-3">New and closed conversations per day (newest first)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-400 font-medium">Date</th>
                  <th className="text-center px-3 py-2 text-slate-400 font-medium">New</th>
                  <th className="text-center px-3 py-2 text-slate-400 font-medium">Closed</th>
                  <th className="text-center px-3 py-2 text-slate-400 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {metrics.dailyStats.map((stat) => {
                  const netChange = getNetChange(stat)
                  const dateObj = parse(stat.date, 'yyyy-MM-dd', new Date())
                  const displayDate = format(dateObj, 'MM/dd')

                  return (
                    <tr key={stat.date} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="px-3 py-2 text-slate-300">{displayDate}</td>
                      <td className="text-center px-3 py-2 text-white">{stat.new}</td>
                      <td className="text-center px-3 py-2 text-white">{stat.closed}</td>
                      <td className={`text-center px-3 py-2 font-semibold ${netChange.color}`}>
                        {netChange.value > 0 ? '+' : ''}{netChange.value}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Last Updated */}
        <p className="text-xs text-slate-500 text-center">Help Scout updated: {lastUpdatedTime}</p>
      </CardContent>
    </Card>
  )
}
