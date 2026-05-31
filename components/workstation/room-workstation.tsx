'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ScanBarcode } from 'lucide-react'
import { OrderFlipbook } from '@/components/workstation/order-flipbook'
import { DTFPrintGallery } from '@/components/workstation/dtf-print-gallery'
import { HeatPressGrid } from '@/components/workstation/heat-press-grid'
import type { ShipStationOrder } from '@/lib/shipstation/types'

interface RoomWorkstationProps {
  location: string
  employeeId?: string
  sessionId?: string
  employeeName?: string
}

export function RoomWorkstation({ location, employeeId, sessionId }: RoomWorkstationProps) {
  const [orderNumber, setOrderNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentOrder, setCurrentOrder] = useState<ShipStationOrder | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDTFRoom = location === 'DTF Room'
  const isHeatPressRoom = location === 'Heat Press Room'

  // Auto-focus input when no order is loaded
  useEffect(() => {
    if (!currentOrder) {
      inputRef.current?.focus()
    }
  }, [currentOrder])

  const handleScanOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = isDTFRoom
        ? `/api/orders/${encodeURIComponent(orderNumber.trim())}?location=${encodeURIComponent(location)}`
        : `/api/shipstation/orders/${encodeURIComponent(orderNumber.trim())}`

      const response = await fetch(apiUrl)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Order not found')
        setIsLoading(false)
        return
      }

      let transformedOrder: ShipStationOrder
      let orderData: any

      console.log('[v0] API response data:', data)

      if (isDTFRoom) {
        // Shopify order — transform line_items to ShipStation format
        orderData = data.order
        if (!orderData || !orderData.line_items) {
          setError('Invalid order data from Shopify')
          setIsLoading(false)
          return
        }
        
        // Get customer name from Shopify order - prioritize shipping address
        const customerName = orderData.shipping_address?.name 
          || (orderData.customer ? `${orderData.customer.first_name || ''} ${orderData.customer.last_name || ''}`.trim() : '')
          || 'Unknown'
        
        transformedOrder = {
          ...orderData,
          orderNumber: String(orderData.order_number || orderData.name || ''),
          shipTo: {
            name: customerName,
          },
          items: orderData.line_items.map((item: any) => ({
            orderItemId: item.id,
            lineItemKey: item.id,
            quantity: item.quantity,
            name: item.title,
            productName: item.title,
            sku: item.sku || '',
            imageUrl: item.product_image || null,
            warehouseLocation: '',
            weight: 0,
            customization: null,
          })),
        }
      } else {
        // ShipStation order — already in the correct format with imageUrl
        try {
          orderData = data.order
          console.log('[v0] ShipStation order data:', orderData)
          console.log('[v0] ShipStation order items:', orderData?.items)
          
          if (!orderData) {
            setError('No order data received from ShipStation')
            setIsLoading(false)
            return
          }
          
          if (!Array.isArray(orderData.items)) {
            console.error('[v0] Items is not an array:', typeof orderData.items)
            setError(`Invalid order format: items is ${typeof orderData.items}`)
            setIsLoading(false)
            return
          }
          
          transformedOrder = orderData
        } catch (err) {
          console.error('[v0] Error processing ShipStation order:', err)
          setError(`Failed to process order: ${err instanceof Error ? err.message : 'Unknown error'}`)
          setIsLoading(false)
          return
        }
      }
      
      console.log('[v0] Transformed order:', transformedOrder)

      setCurrentOrder(transformedOrder)

      // Ensure the order has items before proceeding
      if (!transformedOrder?.items || transformedOrder.items.length === 0) {
        setError('Order has no items')
        setIsLoading(false)
        return
      }

      // Record order location for all rooms
      try {
        const recordedOrderNumber = isDTFRoom 
          ? orderData?.order_number 
          : transformedOrder.orderNumber
        
        console.log('[v0] Recording location:', { recordedOrderNumber, location, employeeId })
        
        if (recordedOrderNumber) {
          const locationRes = await fetch('/api/order-locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: String(recordedOrderNumber),
              location,
              employeeId: employeeId || null,
            }),
          })
          const locationData = await locationRes.json()
          console.log('[v0] Location recorded:', locationData)
        } else {
          console.log('[v0] No order number found for location tracking')
        }
      } catch (err) {
        console.error('[v0] Failed to record order location:', err)
      }

      setOrderNumber('')
    } catch (err) {
      console.error('[v0] Order fetch error:', err)
      setError(err instanceof Error ? err.message : 'Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemComplete = useCallback(async (itemIndex: number, item: ShipStationOrder['items'][0]) => {
    if (!sessionId || !employeeId || !currentOrder) return

    try {
      await fetch('/api/sessions/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          employeeId,
          orderNumber: currentOrder.orderNumber,
          itemIndex,
          itemName: item.name,
          itemSku: item.sku,
          quantity: item.quantity,
        }),
      })
    } catch (err) {
      console.error('Failed to record item:', err)
    }
  }, [sessionId, employeeId, currentOrder])

  const handleOrderComplete = useCallback(async () => {
    // For Heat Press Room, post a "Left Heat Press Room" activity event
    if (isHeatPressRoom && currentOrder) {
      try {
        await fetch('/api/order-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: currentOrder.orderNumber,
            location: 'Left Heat Press Room',
            employeeId: employeeId || null,
          }),
        })
      } catch (err) {
        console.error('Failed to record heat press departure:', err)
      }
    }
    setCurrentOrder(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [isHeatPressRoom, currentOrder, employeeId])

  if (currentOrder) {
    // DTF Room uses the gallery view with manual Send to NeoStampa
    if (isDTFRoom) {
      return (
        <DTFPrintGallery
          order={currentOrder}
          onClose={handleOrderComplete}
        />
      )
    }

    // Heat Press Room uses grid view with click-to-expand
    if (isHeatPressRoom) {
      return (
        <div className="h-full flex flex-col">
          <HeatPressGrid
            order={currentOrder}
            onItemComplete={handleItemComplete}
            onOrderComplete={handleOrderComplete}
          />
        </div>
      )
    }
    
    // Other rooms use the flipbook view
    return (
      <OrderFlipbook
        order={currentOrder}
        onItemComplete={handleItemComplete}
        onOrderComplete={handleOrderComplete}
      />
    )
  }

  return (
    <Card className="max-w-xl mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ScanBarcode className="w-8 h-8 text-muted-foreground" />
        </div>
        <CardTitle>Scan Order</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleScanOrder} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Input
            ref={inputRef}
            type="text"
            placeholder="Scan or enter order number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="text-center text-xl h-14 font-mono"
            disabled={isLoading}
            autoComplete="off"
          />

          <Button
            type="submit"
            className="w-full h-12"
            disabled={isLoading || !orderNumber.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading Order...
              </>
            ) : (
              'Load Order'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
