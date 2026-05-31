import { NextResponse } from 'next/server'
import { getOrderByNumber } from '@/lib/shipstation'
import { isDemoMode, getDemoOrderByNumber } from '@/lib/demo'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params

    // Demo mode: return fake order data
    if (isDemoMode) {
      const demoOrder = getDemoOrderByNumber(orderNumber)
      if (!demoOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      return NextResponse.json({ order: demoOrder })
    }

    const order = await getOrderByNumber(orderNumber)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('[v0] ShipStation order fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
