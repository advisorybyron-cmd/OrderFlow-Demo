import { NextResponse } from 'next/server'

async function getAccessToken(): Promise<string> {
  const clientId = process.env.HELPSCOUT_APP_ID?.trim()
  const clientSecret = process.env.HELPSCOUT_APP_SECRET?.trim()

  console.log('[v0] HelpScout - ID length:', clientId?.length, 'Secret length:', clientSecret?.length)
  console.log('[v0] HelpScout - ID first 8 chars:', clientId?.substring(0, 8))
  console.log('[v0] HelpScout - Secret first 8 chars:', clientSecret?.substring(0, 8))

  if (!clientId || !clientSecret) {
    throw new Error('Missing Help Scout credentials')
  }

  const response = await fetch('https://api.helpscout.net/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Help Scout auth failed: ${response.status} - ${text}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function GET() {
  try {
    const token = await getAccessToken()

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startDate = sevenDaysAgo.toISOString().split('T')[0]
    const endDate = now.toISOString().split('T')[0]

    // Fetch conversation counts
    const [activeRes, pendingRes, newRes, closedRes] = await Promise.all([
      fetch('https://api.helpscout.net/v2/conversations?status=active&page=1&pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('https://api.helpscout.net/v2/conversations?status=pending&page=1&pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(
        `https://api.helpscout.net/v2/conversations?createdAt[gte]=${startDate}T00:00:00Z&createdAt[lte]=${endDate}T23:59:59Z&page=1&pageSize=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetch(
        `https://api.helpscout.net/v2/conversations?status=closed&closedAt[gte]=${startDate}T00:00:00Z&closedAt[lte]=${endDate}T23:59:59Z&page=1&pageSize=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ])

    const activeData = await activeRes.json()
    const pendingData = await pendingRes.json()
    const newData = await newRes.json()
    const closedData = await closedRes.json()

    const activeCount = activeData.page?.total || 0
    const pendingCount = pendingData.page?.total || 0
    const newCount = newData.page?.total || 0
    const closedCount = closedData.page?.total || 0

    // Fetch daily stats
    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const [dayNewRes, dayClosedRes] = await Promise.all([
        fetch(
          `https://api.helpscout.net/v2/conversations?createdAt[gte]=${dayStart.toISOString()}&createdAt[lte]=${dayEnd.toISOString()}&page=1&pageSize=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `https://api.helpscout.net/v2/conversations?status=closed&closedAt[gte]=${dayStart.toISOString()}&closedAt[lte]=${dayEnd.toISOString()}&page=1&pageSize=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ])

      const dayNewData = await dayNewRes.json()
      const dayClosedData = await dayClosedRes.json()

      const newDaily = dayNewData.page?.total || 0
      const closedDaily = dayClosedData.page?.total || 0

      dailyStats.push({
        date: dateStr,
        new: newDaily,
        closed: closedDaily,
        net: newDaily - closedDaily,
      })
    }

    return NextResponse.json({
      active: activeCount,
      pending: pendingCount,
      new: newCount,
      closed: closedCount,
      dailyStats,
      updatedAt: new Date().toLocaleTimeString(),
    })
  } catch (error) {
    console.error('[HelpScout API]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
