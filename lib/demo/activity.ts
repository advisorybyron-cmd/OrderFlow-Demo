// Demo activity feed data
import { DEMO_EMPLOYEES } from './employees'
import { getDemoOrders } from './orders'

export interface DemoActivity {
  id: string
  order_number: string
  location: string
  previous_location?: string | null
  scanned_at: string
  employee?: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
    employee_code: string
  } | null
}

const LOCATIONS = [
  'Bundle Room',
  'Heat Press Room',
  'Left Heat Press Room',
  'DTF Room',
  'Shipped',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

let activityIdCounter = 1

export function generateDemoActivities(count: number = 20): DemoActivity[] {
  const activities: DemoActivity[] = []
  const orders = getDemoOrders()
  const now = Date.now()
  
  for (let i = 0; i < count; i++) {
    const order = randomItem(orders)
    const employee = randomItem(DEMO_EMPLOYEES)
    const location = randomItem(LOCATIONS)
    const previousLocation = Math.random() > 0.3 ? randomItem(LOCATIONS.filter(l => l !== location)) : null
    const minutesAgo = i * 2 + Math.floor(Math.random() * 5)
    
    activities.push({
      id: `demo-activity-${activityIdCounter++}`,
      order_number: order.orderNumber,
      location,
      previous_location: previousLocation,
      scanned_at: new Date(now - minutesAgo * 60 * 1000).toISOString(),
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        avatar_url: employee.avatar_url,
        employee_code: employee.employee_code,
      },
    })
  }
  
  return activities.sort((a, b) => 
    new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
  )
}

let _cachedActivities: DemoActivity[] | null = null

export function getDemoActivities(): DemoActivity[] {
  if (!_cachedActivities) {
    _cachedActivities = generateDemoActivities(30)
  }
  return _cachedActivities
}

export function addDemoActivity(activity: Omit<DemoActivity, 'id'>): DemoActivity {
  const newActivity: DemoActivity = {
    ...activity,
    id: `demo-activity-${activityIdCounter++}`,
  }
  
  if (!_cachedActivities) {
    _cachedActivities = generateDemoActivities(30)
  }
  _cachedActivities.unshift(newActivity)
  
  // Keep only the most recent 50 activities
  if (_cachedActivities.length > 50) {
    _cachedActivities = _cachedActivities.slice(0, 50)
  }
  
  return newActivity
}

// Demo shipment data for shipping room
export interface DemoShipment {
  orderNumber: string
  customer: string
  city: string
  state: string
  country: string
  shippedAt: string
  carrier: string
  trackingNumber: string
  lat: number
  lng: number
}

export function generateDemoShipments(count: number = 50): DemoShipment[] {
  const shipments: DemoShipment[] = []
  const orders = getDemoOrders()
  const now = Date.now()
  
  const US_LOCATIONS = [
    { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
    { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
    { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
    { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
    { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
    { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
    { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
    { city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
    { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
    { city: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
    { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
    { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
    { city: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
    { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
    { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
    { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
    { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
    { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
    { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
    { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  ]
  
  const CARRIERS = ['USPS', 'UPS', 'FedEx']
  
  for (let i = 0; i < count; i++) {
    const order = orders[i % orders.length]
    const location = randomItem(US_LOCATIONS)
    const hoursAgo = Math.floor(Math.random() * 24)
    
    shipments.push({
      orderNumber: order.orderNumber,
      customer: order.shipTo.name,
      city: location.city,
      state: location.state,
      country: 'US',
      shippedAt: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(),
      carrier: randomItem(CARRIERS),
      trackingNumber: `DEMO${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      lat: location.lat + (Math.random() - 0.5) * 0.5,
      lng: location.lng + (Math.random() - 0.5) * 0.5,
    })
  }
  
  return shipments
}

let _cachedShipments: DemoShipment[] | null = null

export function getDemoShipments(): DemoShipment[] {
  if (!_cachedShipments) {
    _cachedShipments = generateDemoShipments(50)
  }
  return _cachedShipments
}

// Demo metrics for footer
export interface DemoMetrics {
  todayShipped: number
  weekShipped: number
  ordersInProduction: number
  avgProcessingTime: string
}

export function getDemoMetrics(): DemoMetrics {
  return {
    todayShipped: Math.floor(Math.random() * 50) + 80,
    weekShipped: Math.floor(Math.random() * 200) + 400,
    ordersInProduction: Math.floor(Math.random() * 30) + 45,
    avgProcessingTime: `${Math.floor(Math.random() * 2) + 1}h ${Math.floor(Math.random() * 59)}m`,
  }
}

// Demo report data
export interface DemoReportData {
  employee: {
    id: string
    name: string
    employee_code: string
    avatar_url: string | null
  }
  totalItems: number
  totalHours: number
  prevWeekTotal: number
  dailyStats: {
    date: string
    dayName: string
    items: number
    hours: number
  }[]
}

export function generateDemoReportData(): DemoReportData[] {
  return DEMO_EMPLOYEES.slice(0, 6).map(emp => {
    const totalItems = Math.floor(Math.random() * 200) + 100
    const totalHours = Math.floor(Math.random() * 30) + 20
    
    return {
      employee: {
        id: emp.id,
        name: emp.name,
        employee_code: emp.employee_code,
        avatar_url: emp.avatar_url,
      },
      totalItems,
      totalHours,
      prevWeekTotal: Math.floor(totalItems * (0.8 + Math.random() * 0.4)),
      dailyStats: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dayName,
        items: dayName === 'Sun' ? 0 : Math.floor(Math.random() * 40) + 10,
        hours: dayName === 'Sun' ? 0 : Math.floor(Math.random() * 6) + 4,
      })),
    }
  })
}
