'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Package, X, CheckCircle2, Printer } from 'lucide-react'
import type { ShipStationOrder } from '@/lib/shipstation/types'

interface DTFStation {
  id: string
  name: string
  url: string
  is_active: boolean
  display_order: number
}

interface DTFPrintGalleryProps {
  order: ShipStationOrder
  onClose: () => void
}

export function DTFPrintGallery({ order, onClose }: DTFPrintGalleryProps) {
  const [isSending, setIsSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stations, setStations] = useState<DTFStation[]>([])
  const [selectedStation, setSelectedStation] = useState<DTFStation | null>(null)
  const [isLoadingStations, setIsLoadingStations] = useState(true)

  const items = order.items

  // Fetch available stations on mount
  useEffect(() => {
    async function fetchStations() {
      try {
        const response = await fetch('/api/dtf/stations')
        const data = await response.json()
        if (data.stations && data.stations.length > 0) {
          setStations(data.stations)
          // Auto-select first station
          setSelectedStation(data.stations[0])
        }
      } catch (err) {
        console.error('Failed to fetch stations:', err)
      } finally {
        setIsLoadingStations(false)
      }
    }
    fetchStations()
  }, [])

  const handleSendToNeoStampa = async () => {
    if (!selectedStation) {
      setErrorMessage('Please select a printer station')
      setSendStatus('error')
      return
    }

    setIsSending(true)
    setSendStatus('idle')
    setErrorMessage(null)

    // Get print file URLs from the order items
    const itemsWithImages = items.filter((item) => item.imageUrl)

    if (itemsWithImages.length === 0) {
      setErrorMessage('No print files found for this order')
      setSendStatus('error')
      setIsSending(false)
      return
    }

    try {
      // Collect all files first, then send as one batch job
      const formData = new FormData()
      formData.append('order_number', String(order.orderNumber))
      formData.append('customer_name', order.shipTo?.name || 'Unknown')
      formData.append('station_url', selectedStation.url)
      
      let fileCount = 0
      for (const item of itemsWithImages) {
        // Fetch the image from our API (which proxies Google Drive)
        const imageResponse = await fetch(item.imageUrl as string)
        if (!imageResponse.ok) {
          console.error(`[v0] Failed to fetch image for ${item.name}`)
          continue
        }
        
        const imageBlob = await imageResponse.blob()
        const filename = `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
        
        // Append each file with index
        formData.append(`file_${fileCount}`, imageBlob, filename)
        formData.append(`title_${fileCount}`, item.name)
        fileCount++
      }
      
      formData.append('file_count', String(fileCount))
      
      // First try direct connection (works if on same network with HTTP)
      // If that fails, we show an error with instructions
      console.log(`[v0] Sending ${fileCount} files as batch to ${selectedStation.url}`)
      
      try {
        const printResponse = await fetch(`${selectedStation.url}/receive-print-batch`, {
          method: 'POST',
          body: formData,
        })
        
        if (printResponse.ok) {
          setSendStatus('success')
          return
        }
      } catch (directError) {
        console.log('[v0] Direct connection failed, this is expected from HTTPS pages')
      }
      
      // If we get here, direct connection failed
      // This happens when accessing from HTTPS (mixed content blocked)
      setErrorMessage('Browser security blocked the request. Open this page using HTTP instead of HTTPS, or access from a computer on the same network.')
      setSendStatus('error')
    } catch (err) {
      console.error('[v0] Failed to send files to NeoStampa:', err)
      setErrorMessage('Connection error. Make sure the print server is running and you are on the same network.')
      setSendStatus('error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Order Header - compact with Complete button */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-3 shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Order</p>
            <p className="text-xl font-mono font-bold">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{order.shipTo?.name || order.customerUsername}</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 h-8 px-4 text-xs font-semibold"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Order
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Print Files Gallery and Send Button in a row */}
      <div className="flex gap-3 items-start flex-1 min-h-0 pb-32">
        {/* Print Files - horizontal scroll */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-40 border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div className="relative aspect-square bg-muted flex items-center justify-center">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-contain p-1"
                    sizes="160px"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Package className="h-8 w-8" />
                    <p className="text-xs">No image</p>
                  </div>
                )}
              </div>
              
              {/* Item Info */}
              <div className="p-2 border-t">
                <p className="font-medium text-xs line-clamp-1 leading-tight">
                  {item.name}
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  Qty: {item.quantity}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Send to NeoStampa Button - always visible on right */}
        <div className="flex-shrink-0 w-72 bg-card border rounded-lg p-4 flex flex-col justify-center gap-3">
          {sendStatus === 'success' ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-semibold text-green-600">Sent to {selectedStation?.name}!</p>
              <div className="flex flex-col gap-2 w-full">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close Order
                </Button>
                <Button size="sm" onClick={() => setSendStatus('idle')}>
                  Send Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Station Selector */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Printer className="h-3 w-3" />
                  Select Printer Station
                </p>
                {isLoadingStations ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : stations.length === 0 ? (
                  <p className="text-xs text-red-500">No stations configured</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {stations.map((station) => (
                      <button
                        key={station.id}
                        onClick={() => setSelectedStation(station)}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                          selectedStation?.id === station.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {station.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {errorMessage && (
                <p className="text-red-500 text-xs text-center">{errorMessage}</p>
              )}
              
              <Button
                size="lg"
                className="w-full h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleSendToNeoStampa}
                disabled={isSending || !selectedStation}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Send to NeoStampa
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
