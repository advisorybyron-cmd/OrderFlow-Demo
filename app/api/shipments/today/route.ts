import { NextResponse } from 'next/server'
import { format, startOfDay, subDays, startOfMonth, subMonths } from 'date-fns'
import { isDemoMode, getDemoShipments } from '@/lib/demo'

// Dynamic import to handle potential module issues
let zipcodes: typeof import('zipcodes') | null = null
try {
  zipcodes = require('zipcodes')
} catch {
  // zipcodes module not available, will fall back to country-level aggregation
}

// Canadian province centroids for postal code approximation
const canadianProvinceCentroids: Record<string, { lat: number; lon: number }> = {
  'AB': { lat: 54.8, lon: -114.0 }, // Alberta
  'BC': { lat: 53.7, lon: -127.6 }, // British Columbia
  'MB': { lat: 56.1, lon: -98.2 }, // Manitoba
  'NB': { lat: 46.6, lon: -66.5 }, // New Brunswick
  'NL': { lat: 53.1, lon: -57.7 }, // Newfoundland and Labrador
  'NS': { lat: 45.3, lon: -62.5 }, // Nova Scotia
  'NT': { lat: 62.4, lon: -114.4 }, // Northwest Territories
  'NU': { lat: 70.3, lon: -95.0 }, // Nunavut
  'ON': { lat: 51.3, lon: -85.3 }, // Ontario
  'PE': { lat: 46.2, lon: -63.1 }, // Prince Edward Island
  'QC': { lat: 52.9, lon: -73.5 }, // Quebec
  'SK': { lat: 56.1, lon: -106.3 }, // Saskatchewan
  'YT': { lat: 62.6, lon: -135.0 }, // Yukon
}

// Country centroids (including US/CA as fallback for unresolved postal codes)
function getCountryCentroid(countryCode: string): { lat: number; lon: number } | null {
  const centroids: Record<string, { lat: number; lon: number }> = {
    'US': { lat: 39.8283, lon: -98.5795 }, // United States (geographic center)
    'CA': { lat: 56.1304, lon: -106.3468 }, // Canada
    'GB': { lat: 55.3781, lon: -3.436 }, // United Kingdom
    'AU': { lat: -25.2744, lon: 133.7751 }, // Australia
    'DE': { lat: 51.1657, lon: 10.4515 }, // Germany
    'FR': { lat: 46.2276, lon: 2.2137 }, // France
    'JP': { lat: 36.2048, lon: 138.2529 }, // Japan
    'CN': { lat: 35.8617, lon: 104.1954 }, // China
    'IN': { lat: 20.5937, lon: 78.9629 }, // India
    'BR': { lat: -14.2350, lon: -51.9253 }, // Brazil
    'MX': { lat: 23.6345, lon: -102.5528 }, // Mexico
    'SE': { lat: 60.1282, lon: 18.6435 }, // Sweden
    'NL': { lat: 52.1326, lon: 5.2913 }, // Netherlands
    'ES': { lat: 40.4637, lon: -3.7492 }, // Spain
    'IT': { lat: 41.8719, lon: 12.5674 }, // Italy
    'KR': { lat: 35.9078, lon: 127.7669 }, // South Korea
    'SG': { lat: 1.3521, lon: 103.8198 }, // Singapore
    'HK': { lat: 22.3193, lon: 114.1694 }, // Hong Kong
    'TW': { lat: 23.6978, lon: 120.9605 }, // Taiwan
    'NZ': { lat: -40.9006, lon: 174.886 }, // New Zealand
    'IE': { lat: 53.1424, lon: -7.6921 }, // Ireland
    'CH': { lat: 46.8182, lon: 8.2275 }, // Switzerland
    'AT': { lat: 47.5162, lon: 14.5501 }, // Austria
    'BE': { lat: 50.5039, lon: 4.4699 }, // Belgium
    'PL': { lat: 51.9194, lon: 19.1451 }, // Poland
    'NO': { lat: 60.4720, lon: 8.4689 }, // Norway
    'DK': { lat: 56.2639, lon: 9.5018 }, // Denmark
    'FI': { lat: 61.9241, lon: 25.7482 }, // Finland
    'PT': { lat: 39.3999, lon: -8.2245 }, // Portugal
    'GR': { lat: 39.0742, lon: 21.8243 }, // Greece
    'IL': { lat: 31.0461, lon: 34.8516 }, // Israel
    'AE': { lat: 23.4241, lon: 53.8478 }, // UAE
    'SA': { lat: 23.8859, lon: 45.0792 }, // Saudi Arabia
    'ZA': { lat: -30.5595, lon: 22.9375 }, // South Africa
    'AR': { lat: -38.4161, lon: -63.6167 }, // Argentina
    'CL': { lat: -35.6751, lon: -71.543 }, // Chile
    'CO': { lat: 4.5709, lon: -74.2973 }, // Colombia
    'PH': { lat: 12.8797, lon: 121.774 }, // Philippines
    'MY': { lat: 4.2105, lon: 101.9758 }, // Malaysia
    'TH': { lat: 15.8700, lon: 100.9925 }, // Thailand
    'VN': { lat: 14.0583, lon: 108.2772 }, // Vietnam
    'ID': { lat: -0.7893, lon: 113.9213 }, // Indonesia
    'PK': { lat: 30.3753, lon: 69.3451 }, // Pakistan
    'PR': { lat: 18.2208, lon: -66.5901 }, // Puerto Rico
    'VI': { lat: 18.3358, lon: -64.8963 }, // US Virgin Islands
    'GU': { lat: 13.4443, lon: 144.7937 }, // Guam
  }
  
  return centroids[countryCode] || null
}

function getDateRange(range: string): { start: string; end: string; label: string } {
  const now = new Date()
  const todayEnd = format(now, 'yyyy-MM-dd')

  switch (range) {
    case 'today':
      return {
        start: format(startOfDay(now), 'yyyy-MM-dd'),
        end: todayEnd,
        label: 'Today',
      }
    case 'yesterday': {
      const yesterday = subDays(now, 1)
      const y = format(yesterday, 'yyyy-MM-dd')
      return { start: y, end: y, label: 'Yesterday' }
    }
    case '7days':
      return {
        start: format(subDays(now, 6), 'yyyy-MM-dd'),
        end: todayEnd,
        label: 'Last 7 Days',
      }
    case '30days':
      return {
        start: format(subDays(now, 29), 'yyyy-MM-dd'),
        end: todayEnd,
        label: 'Last 30 Days',
      }
    case 'this_month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: todayEnd,
        label: 'This Month',
      }
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(startOfDay(startOfMonth(now)), 'yyyy-MM-dd'),
        label: 'Last Month',
      }
    }
    case '90days':
      return {
        start: format(subDays(now, 89), 'yyyy-MM-dd'),
        end: todayEnd,
        label: 'Last 90 Days',
      }
    default:
      return {
        start: format(startOfDay(now), 'yyyy-MM-dd'),
        end: todayEnd,
        label: 'Today',
      }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'today'
    const { start, end, label } = getDateRange(range)

    // Demo mode: return fake shipment data
    if (isDemoMode) {
      const demoShipments = getDemoShipments()
      const markers = demoShipments.map(s => ({
        orderNumber: s.orderNumber,
        country: s.country,
        state: s.state,
        city: s.city,
        postalCode: '12345',
        lat: s.lat,
        lon: s.lng,
      }))
      return NextResponse.json({
        totalShipments: markers.length,
        markers,
        dateRange: { start, end, label },
      })
    }

    const { listShipments } = await import('@/lib/shipstation')

    const allShipments: Array<{
      orderNumber: string
      country: string
      state: string
      city: string
      postalCode: string
      lat?: number
      lon?: number
    }> = []

    let page = 1
    let hasMore = true
    let totalPagesReturned = 0

    while (hasMore) {
      const response = await listShipments({
        shipDateStart: start,
        shipDateEnd: end,
        page,
        pageSize: 100,
      })



      for (const shipment of response.shipments) {
        if (shipment.shipTo) {
          const country = shipment.shipTo.country || 'US'
          const entry = {
            orderNumber: shipment.orderNumber,
            country,
            state: shipment.shipTo.state || '',
            city: shipment.shipTo.city || '',
            postalCode: shipment.shipTo.postalCode || '',
            lat: undefined as number | undefined,
            lon: undefined as number | undefined,
          }

          // 1. Try US zip code lookup
          if (country === 'US' && entry.postalCode && zipcodes) {
            try {
              // Clean postal code - take first 5 digits only
              const cleanZip = entry.postalCode.replace(/[^0-9]/g, '').slice(0, 5)
              const zipInfo = zipcodes.lookup(cleanZip)
              if (zipInfo) {
                entry.lat = zipInfo.latitude
                entry.lon = zipInfo.longitude
              }
            } catch { /* fall through to fallback */ }
          }

          // 2. Try Canadian province centroid
          if (!entry.lat && country === 'CA' && entry.state) {
            const centroid = canadianProvinceCentroids[entry.state.toUpperCase()]
            if (centroid) {
              entry.lat = centroid.lat
              entry.lon = centroid.lon
            }
          }

          // 3. Fall back to country centroid for anything still missing coordinates
          if (!entry.lat) {
            const center = getCountryCentroid(country)
            if (center) {
              // Add significant jitter to spread dots across the country
              // Different jitter amounts based on country size
              const jitterLat = country === 'US' ? 8 : country === 'CA' ? 10 : country === 'AU' ? 8 : 4
              const jitterLon = country === 'US' ? 20 : country === 'CA' ? 25 : country === 'AU' ? 15 : 6
              entry.lat = center.lat + (Math.random() - 0.5) * jitterLat
              entry.lon = center.lon + (Math.random() - 0.5) * jitterLon
            }
          }

          allShipments.push(entry)
        }
      }

      // Check if there are more pages
      hasMore = page < response.pages && response.shipments.length > 0
      totalPagesReturned++
      page++
      if (page > 20) break // Limit to 2000 shipments max
    }

    // Only include shipments that have coordinates (everything should by now via fallback)
    const markers = allShipments.filter(s => s.lat != null && s.lon != null)

    return NextResponse.json({
      totalShipments: allShipments.length,
      markers,
      dateRange: { start, end, label },
    })
  } catch (error) {
    console.error('Failed to fetch shipments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shipment data' },
      { status: 500 }
    )
  }
}
