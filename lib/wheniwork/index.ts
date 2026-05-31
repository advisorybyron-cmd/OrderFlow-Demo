import { 
  WhenIWorkUser, 
  WhenIWorkUsersResponse, 
  WhenIWorkTime, 
  WhenIWorkTimesResponse,
  WhenIWorkPosition,
  WhenIWorkPositionsResponse 
} from './types'

const WHENIWORK_LOGIN_URL = 'https://api.login.wheniwork.com'
const WHENIWORK_API_URL = 'https://api.wheniwork.com/2'

// Cache the token in memory (it's valid for 7 days)
let cachedToken: string | null = null
let cachedUserId: number | null = null

async function getAuthToken(): Promise<{ token: string; userId: number }> {
  // Return cached token if available
  if (cachedToken && cachedUserId) {
    return { token: cachedToken, userId: cachedUserId }
  }

  // Hardcoded fallbacks for v0 sandbox (env vars don't persist reliably)
  const FALLBACK_DEVELOPER_KEY = 'c0efb82d3ec8e5069cca3e534d01bb53c9065090'
  const FALLBACK_EMAIL = 'byron@threadpit.com'
  const FALLBACK_PASSWORD = 'Bb35864161!!'

  const developerKey = process.env.WHENIWORK_DEVELOPER_KEY || FALLBACK_DEVELOPER_KEY
  const email = process.env.WHENIWORK_EMAIL || FALLBACK_EMAIL
  const password = process.env.WHENIWORK_PASSWORD || FALLBACK_PASSWORD

  // Step 1: Login to get token
  const loginResponse = await fetch(`${WHENIWORK_LOGIN_URL}/login`, {
    method: 'POST',
    headers: {
      'W-Key': developerKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text()
    throw new Error(`When I Work login failed: ${loginResponse.status} - ${errorText}`)
  }

  const loginData = await loginResponse.json()
  const token = loginData.token

  if (!token) {
    throw new Error('No token returned from When I Work login')
  }

  // Step 2: Get user list to find the user ID for this account
  const userListResponse = await fetch(`${WHENIWORK_API_URL}/login?show_pending=true`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!userListResponse.ok) {
    const errorText = await userListResponse.text()
    throw new Error(`When I Work user list failed: ${userListResponse.status} - ${errorText}`)
  }

  const userListData = await userListResponse.json()
  
  // Get the first user ID (or the primary account)
  const userId = userListData.users?.[0]?.id || loginData.user?.id

  if (!userId) {
    throw new Error('Could not determine When I Work user ID')
  }

  // Cache the token and user ID
  cachedToken = token
  cachedUserId = userId

  return { token, userId }
}

async function whenIWorkFetch<T>(endpoint: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const { token, userId } = await getAuthToken()

  const response = await fetch(`${WHENIWORK_API_URL}${endpoint}`, {
    method: options?.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'W-UserId': userId.toString(),
      'Content-Type': 'application/json',
    },
    ...(options?.body && { body: JSON.stringify(options.body) }),
  })

  if (!response.ok) {
    // If unauthorized, clear cache and retry once
    if (response.status === 401) {
      cachedToken = null
      cachedUserId = null
      const { token: newToken, userId: newUserId } = await getAuthToken()
      
      const retryResponse = await fetch(`${WHENIWORK_API_URL}${endpoint}`, {
        method: options?.method || 'GET',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'W-UserId': newUserId.toString(),
          'Content-Type': 'application/json',
        },
        ...(options?.body && { body: JSON.stringify(options.body) }),
      })
      
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text()
        throw new Error(`When I Work API error: ${retryResponse.status} - ${errorText}`)
      }
      
      return retryResponse.json()
    }
    
    const errorText = await response.text()
    throw new Error(`When I Work API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function getActiveUsers(): Promise<WhenIWorkUser[]> {
  // include_non_active=false gets active users; include_hidden returns all roles
  const data = await whenIWorkFetch<WhenIWorkUsersResponse>('/users?include_avatars=true')
  
  // Filter to only active, non-deleted users
  // Include hidden users and all positions - everyone should be able to use this system
  return data.users.filter(user => 
    user.is_active && !user.is_deleted
  )
}

export async function getUserById(userId: number): Promise<WhenIWorkUser | null> {
  try {
    const data = await whenIWorkFetch<{ user: WhenIWorkUser }>(`/users/${userId}`)
    return data.user
  } catch {
    return null
  }
}

// Get all positions to find "Torpid Orderflow" position ID
export async function getPositions(): Promise<WhenIWorkPosition[]> {
  const data = await whenIWorkFetch<WhenIWorkPositionsResponse>('/positions')
  return data.positions.filter(p => !p.is_deleted)
}

// Get time entries (clock in/out records) for a date range
export async function getTimes(params: {
  startDate: string // YYYY-MM-DD format
  endDate: string   // YYYY-MM-DD format
  userId?: number
  positionId?: number
}): Promise<WhenIWorkTime[]> {
  let endpoint = `/times?start=${params.startDate}&end=${params.endDate}`
  
  if (params.userId) {
    endpoint += `&user_id=${params.userId}`
  }
  
  if (params.positionId) {
    endpoint += `&position_id=${params.positionId}`
  }
  
  const data = await whenIWorkFetch<WhenIWorkTimesResponse>(endpoint)
  return data.times || []
}

// Get hours worked on Press Line position for employees in a date range
export async function getPressLineHours(params: {
  startDate: string
  endDate: string
  employeeCodes?: string[] // Filter by specific employee codes
}): Promise<Map<string, { totalHours: number; dailyHours: Map<string, number> }>> {
  // First get all positions to find Press Line
  const positions = await getPositions()
  
  console.log('[v0] Available positions:', positions.map(p => ({ id: p.id, name: p.name })))
  
  // Look for "Press Line" position (exact match preferred, then partial)
  const pressLinePosition = positions.find(p => p.name === 'Press Line') || 
    positions.find(p => p.name.toLowerCase() === 'press line') ||
    positions.find(p => p.name.toLowerCase().includes('press line'))
  
  console.log('[v0] Found Press Line position:', pressLinePosition)
  
  if (!pressLinePosition) {
    console.log('[v0] No Press Line position found!')
    return new Map()
  }
  
  // Get all users to map user_id to employee_code
  const users = await getActiveUsers()
  const userIdToCode = new Map<number, string>()
  users.forEach(u => {
    if (u.employee_code) {
      userIdToCode.set(u.id, u.employee_code)
    }
  })
  
  // Get time entries - we pass position_id but WhenIWork may not filter properly
  // so we'll filter client-side as well
  const allTimes = await getTimes({
    startDate: params.startDate,
    endDate: params.endDate,
    positionId: pressLinePosition.id,
  })
  
  // Filter to only Press Line position entries (WhenIWork API may not respect position_id filter)
  const times = allTimes.filter(t => t.position_id === pressLinePosition.id)
  
  console.log('[v0] Times entries found (before filter):', allTimes.length)
  console.log('[v0] Times entries found (after filter for Press Line):', times.length)
  console.log('[v0] Filtered times data:', JSON.stringify(times.slice(0, 3)))
  
  // Group hours by employee code
  const result = new Map<string, { totalHours: number; dailyHours: Map<string, number> }>()
  
  for (const time of times) {
    const employeeCode = userIdToCode.get(time.user_id)
    if (!employeeCode) continue
    
    // Skip if we're filtering by specific employee codes and this isn't one of them
    if (params.employeeCodes && !params.employeeCodes.includes(employeeCode)) continue
    
    // Calculate hours for this entry
    let hours = 0
    if (time.length) {
      hours = time.length // time.length is already in hours
    } else if (time.start_time && time.end_time) {
      const start = new Date(time.start_time)
      const end = new Date(time.end_time)
      hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }
    
    // Get the date for daily breakdown - handle various date formats
    // WhenIWork may return dates like "Sun, May 11 2025 07:50:00 -0500" or ISO format
    let dateStr: string
    try {
      const startDate = new Date(time.start_time)
      // Format as YYYY-MM-DD to match the reports API expectation
      dateStr = startDate.toISOString().split('T')[0]
    } catch {
      // Fallback to extracting from string if parsing fails
      dateStr = time.start_time.split('T')[0]
    }
    
    console.log('[v0] Time entry date extraction:', { raw: time.start_time, extracted: dateStr, hours })
    
    // Add to result
    if (!result.has(employeeCode)) {
      result.set(employeeCode, { totalHours: 0, dailyHours: new Map() })
    }
    
    const entry = result.get(employeeCode)!
    entry.totalHours += hours
    entry.dailyHours.set(dateStr, (entry.dailyHours.get(dateStr) || 0) + hours)
  }
  
  console.log('[v0] Result for employees:', Array.from(result.entries()).map(([code, data]) => ({ code, totalHours: data.totalHours })))
  
  return result
}

// Clock out from an active time entry
export async function clockOut(timeId: number): Promise<void> {
  const now = new Date().toISOString()
  await whenIWorkFetch(`/times/${timeId}`, {
    method: 'PUT',
    body: { end_time: now },
  })
}

// Clock in to a position
export async function clockIn(userId: number, positionId: number): Promise<WhenIWorkTime> {
  const now = new Date().toISOString()
  const data = await whenIWorkFetch<{ time: WhenIWorkTime }>('/times', {
    method: 'POST',
    body: {
      user_id: userId,
      position_id: positionId,
      start_time: now,
    },
  })
  return data.time
}

// Get hours worked on Order Bundles position for employees in a date range
export async function getOrderBundlesHours(params: {
  startDate: string
  endDate: string
  employeeCodes?: string[] // Filter by specific employee codes
}): Promise<Map<string, { totalHours: number; dailyHours: Map<string, number> }>> {
  // First get all positions to find Order Bundles
  const positions = await getPositions()
  
  // Look for "Order Bundles" position (exact match preferred, then partial)
  const orderBundlesPosition = positions.find(p => p.name === 'Order Bundles') || 
    positions.find(p => p.name.toLowerCase() === 'order bundles') ||
    positions.find(p => p.name.toLowerCase().includes('order bundles') || p.name.toLowerCase().includes('bundle'))
  
  if (!orderBundlesPosition) {
    console.log('[v0] No Order Bundles position found!')
    return new Map()
  }
  
  // Get all users to map user_id to employee_code
  const users = await getActiveUsers()
  const userIdToCode = new Map<number, string>()
  users.forEach(u => {
    if (u.employee_code) {
      userIdToCode.set(u.id, u.employee_code)
    }
  })
  
  // Get time entries - we pass position_id but WhenIWork may not filter properly
  // so we'll filter client-side as well
  const allTimes = await getTimes({
    startDate: params.startDate,
    endDate: params.endDate,
    positionId: orderBundlesPosition.id,
  })
  
  // Filter to only Order Bundles position entries
  const times = allTimes.filter(t => t.position_id === orderBundlesPosition.id)
  
  // Group hours by employee code
  const result = new Map<string, { totalHours: number; dailyHours: Map<string, number> }>()
  
  for (const time of times) {
    const employeeCode = userIdToCode.get(time.user_id)
    if (!employeeCode) continue
    
    // Skip if we're filtering by specific employee codes and this isn't one of them
    if (params.employeeCodes && !params.employeeCodes.includes(employeeCode)) continue
    
    // Calculate hours for this entry
    let hours = 0
    if (time.length) {
      hours = time.length // time.length is already in hours
    } else if (time.start_time && time.end_time) {
      const start = new Date(time.start_time)
      const end = new Date(time.end_time)
      hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }
    
    // Get the date for daily breakdown
    let dateStr: string
    try {
      const startDate = new Date(time.start_time)
      dateStr = startDate.toISOString().split('T')[0]
    } catch {
      dateStr = time.start_time.split('T')[0]
    }
    
    // Add to result
    if (!result.has(employeeCode)) {
      result.set(employeeCode, { totalHours: 0, dailyHours: new Map() })
    }
    
    const entry = result.get(employeeCode)!
    entry.totalHours += hours
    entry.dailyHours.set(dateStr, (entry.dailyHours.get(dateStr) || 0) + hours)
  }
  
  return result
}
