import type { ShipStationOrder, ShipStationOrdersResponse } from './types'

const SHIPSTATION_API_URL = 'https://ssapi.shipstation.com'

function getAuthHeader(): string {
  const apiKey = process.env.SHIPSTATION_API_KEY
  const apiSecret = process.env.SHIPSTATION_API_SECRET
  
  if (!apiKey || !apiSecret) {
    throw new Error('ShipStation API credentials not configured')
  }
  
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`
}

async function shipstationFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${SHIPSTATION_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ShipStation API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

// Only search orders from 2026 onwards to avoid duplicate order numbers from previous years
const MIN_ORDER_DATE = '2026-01-01'

export async function getOrderByNumber(orderNumber: string): Promise<ShipStationOrder | null> {
  // Filter by createDateStart to only get 2026+ orders
  const data = await shipstationFetch<ShipStationOrdersResponse>(
    `/orders?orderNumber=${encodeURIComponent(orderNumber)}&createDateStart=${MIN_ORDER_DATE}`
  )
  
  if (data.orders.length === 0) {
    return null
  }
  
  // If multiple orders match (shouldn't happen with date filter), return the most recent
  if (data.orders.length > 1) {
    data.orders.sort((a, b) => 
      new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
    )
  }

  const order = data.orders[0]

  // Sort items by lineItemKey ascending — ShipStation stores the Shopify line item ID
  // in lineItemKey, and Shopify assigns them in the same order as the order sheet/packing slip.
  if (order.items) {
    order.items = order.items.slice().sort((a, b) => {
      const aKey = a.lineItemKey ? Number(a.lineItemKey) : Infinity
      const bKey = b.lineItemKey ? Number(b.lineItemKey) : Infinity
      return aKey - bKey
    })
  }

  return order
}

export async function getOrderById(orderId: number): Promise<ShipStationOrder> {
  return shipstationFetch<ShipStationOrder>(`/orders/${orderId}`)
}

export async function searchOrders(params: {
  orderNumber?: string
  orderStatus?: string
  createDateStart?: string
  createDateEnd?: string
  shipDateStart?: string
  shipDateEnd?: string
  page?: number
  pageSize?: number
}): Promise<ShipStationOrdersResponse> {
  const searchParams = new URLSearchParams()
  
  if (params.orderNumber) searchParams.set('orderNumber', params.orderNumber)
  if (params.orderStatus) searchParams.set('orderStatus', params.orderStatus)
  // Use ship date if provided, otherwise fall back to create date
  if (params.shipDateStart) {
    searchParams.set('shipDateStart', params.shipDateStart)
    if (params.shipDateEnd) searchParams.set('shipDateEnd', params.shipDateEnd)
  } else {
    // Default to 2026+ orders if no start date specified
    searchParams.set('createDateStart', params.createDateStart || MIN_ORDER_DATE)
    if (params.createDateEnd) searchParams.set('createDateEnd', params.createDateEnd)
  }
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  
  return shipstationFetch<ShipStationOrdersResponse>(`/orders?${searchParams.toString()}`)
}

// Shipment type from /shipments endpoint
export interface ShipStationShipment {
  shipmentId: number
  orderId: number
  orderKey: string
  orderNumber: string
  shipDate: string
  shipTo: {
    name: string
    company: string | null
    street1: string
    street2: string | null
    street3: string | null
    city: string
    state: string
    postalCode: string
    country: string
    phone: string | null
  }
  trackingNumber: string
  carrierCode: string
}

export interface ShipStationShipmentsResponse {
  shipments: ShipStationShipment[]
  total: number
  page: number
  pages: number
}

// Use /shipments endpoint for date-filtered shipment queries
export async function listShipments(params: {
  shipDateStart: string
  shipDateEnd: string
  page?: number
  pageSize?: number
}): Promise<ShipStationShipmentsResponse> {
  const searchParams = new URLSearchParams()
  
  searchParams.set('shipDateStart', params.shipDateStart)
  searchParams.set('shipDateEnd', params.shipDateEnd)
  searchParams.set('sortBy', 'ShipDate')
  searchParams.set('sortDir', 'DESC')
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  
  return shipstationFetch<ShipStationShipmentsResponse>(`/shipments?${searchParams.toString()}`)
}
