import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ShipStation webhook payload for SHIP_NOTIFY
interface ShipStationWebhookPayload {
  resource_url: string
  resource_type: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: ShipStationWebhookPayload = await request.json()
    
    console.log('[ShipStation Webhook] Received:', payload)

    // ShipStation sends a resource_url that we need to fetch
    if (payload.resource_type === 'SHIP_NOTIFY' && payload.resource_url) {
      // Fetch the shipment details from ShipStation
      const shipStationApiKey = process.env.SHIPSTATION_API_KEY
      const shipStationApiSecret = process.env.SHIPSTATION_API_SECRET

      if (!shipStationApiKey || !shipStationApiSecret) {
        console.error('[ShipStation Webhook] Missing API credentials')
        return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
      }

      const auth = Buffer.from(`${shipStationApiKey}:${shipStationApiSecret}`).toString('base64')

      const shipmentResponse = await fetch(payload.resource_url, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      })

      if (!shipmentResponse.ok) {
        console.error('[ShipStation Webhook] Failed to fetch shipment:', shipmentResponse.status)
        return NextResponse.json({ error: 'Failed to fetch shipment details' }, { status: 500 })
      }

      const shipmentData = await shipmentResponse.json()
      console.log('[ShipStation Webhook] Shipment data:', JSON.stringify(shipmentData, null, 2))

      // ShipStation returns an array of shipments
      const shipments = shipmentData.shipments || [shipmentData]

      const supabase = await createClient()

      for (const shipment of shipments) {
        const orderNumber = shipment.orderNumber
        const trackingNumber = shipment.trackingNumber
        const carrierCode = shipment.carrierCode
        // ShipStation provides the user who created the label via userName or userId
        const shipperName: string | null = shipment.userName || shipment.userId || null

        if (orderNumber) {
          // Record the shipped location
          await supabase.from('order_locations').insert({
            order_number: String(orderNumber),
            location: 'Shipped',
            notes: trackingNumber ? `Tracking: ${trackingNumber} (${carrierCode || 'Unknown carrier'})` : null,
            shipped_by_name: shipperName,
          })

          console.log(`[ShipStation Webhook] Order ${orderNumber} marked as Shipped by ${shipperName || 'unknown'}`)
        }
      }

      return NextResponse.json({ success: true, processed: shipments.length })
    }

    // Return success for other webhook types we don't handle
    return NextResponse.json({ success: true, message: 'Webhook received but not processed' })
  } catch (error) {
    console.error('[ShipStation Webhook] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// ShipStation may send GET requests to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'ShipStation webhook endpoint ready' })
}
