import { NextResponse } from 'next/server'
import { searchOrders } from '@/lib/shipstation'
import type { ShipStationOrder } from '@/lib/shipstation/types'
import { isDemoMode } from '@/lib/demo'

export async function GET() {
  try {
    // Demo mode: return fake metrics
    if (isDemoMode) {
      return NextResponse.json({
        outstandingOrders: 127,
        outstandingItems: 483,
        ageBuckets: {
          age0_1: 45,
          age2_3: 38,
          age4_7: 32,
          age8plus: 12,
        },
      })
    }

    const now = new Date()

    // Fetch first page to get total count and pages
    const firstPage = await searchOrders({
      orderStatus: 'awaiting_shipment',
      pageSize: 500,
      page: 1,
    })

    const totalOrders = firstPage.total
    const totalPages = firstPage.pages
    const allOrders: ShipStationOrder[] = [...firstPage.orders]

    // Fetch remaining pages in parallel (500 orders/page)
    if (totalPages > 1) {
      const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
      const remaining = await Promise.all(
        pageNums.map(page =>
          searchOrders({ orderStatus: 'awaiting_shipment', pageSize: 500, page })
        )
      )
      for (const res of remaining) {
        allOrders.push(...res.orders)
      }
    }

    // Total unshipped items across all orders
    const outstandingItems = allOrders.reduce(
      (sum, order) => sum + order.items.reduce((s, item) => s + (item.adjustment ? 0 : item.quantity), 0),
      0
    )

    // Age buckets — based on orderDate
    const ageBuckets = { age0_1: 0, age2_3: 0, age4_7: 0, age8plus: 0 }
    for (const order of allOrders) {
      const orderDate = new Date(order.orderDate)
      const ageDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      if (ageDays <= 1) ageBuckets.age0_1++
      else if (ageDays <= 3) ageBuckets.age2_3++
      else if (ageDays <= 7) ageBuckets.age4_7++
      else ageBuckets.age8plus++
    }

    return NextResponse.json({
      outstandingOrders: totalOrders,
      outstandingItems,
      ageBuckets,
    }, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
