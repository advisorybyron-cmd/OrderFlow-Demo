'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Package, X } from 'lucide-react'

import type { ShipStationOrder } from '@/lib/shipstation/types'

interface HeatPressGridProps {
  order: ShipStationOrder
  onItemComplete: (itemIndex: number, item: ShipStationOrder['items'][0]) => void
  onOrderComplete: () => void
}

// Confetti particle component
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6']
  const color = colors[index % colors.length]
  const left = `${(index * 7.3 + 3) % 100}%`
  const delay = `${(index * 0.11) % 1.5}s`
  const duration = `${2.2 + (index % 3) * 0.5}s`
  const size = index % 3 === 0 ? 10 : index % 3 === 1 ? 8 : 12

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: index % 2 === 0 ? '50%' : '2px',
        animation: `confettiFall ${duration} ${delay} ease-in forwards`,
        transform: `rotate(${index * 37}deg)`,
      }}
    />
  )
}

function CelebrationOverlay({ orderNumber, onDone }: { orderNumber: string; onDone: () => void }) {
  const [count, setCount] = useState(3)

  useEffect(() => {
    const tick = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(tick)
          setTimeout(onDone, 400)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes clap {
          0%, 100% { transform: rotate(-15deg) scale(1); }
          50%       { transform: rotate(15deg) scale(1.2); }
        }
        @keyframes pulse-glow {
          0%, 100% { text-shadow: 0 0 20px #22c55e, 0 0 40px #22c55e; }
          50%       { text-shadow: 0 0 40px #22c55e, 0 0 80px #22c55e, 0 0 120px #22c55e; }
        }
      `}</style>

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-6 text-center px-8" style={{ animation: 'popIn 0.5s ease-out forwards' }}>
        <div className="flex items-center gap-4">
          <span style={{ fontSize: 80, display: 'inline-block', animation: 'clap 0.4s ease-in-out infinite' }}>
            👏
          </span>
          <span style={{ fontSize: 80, display: 'inline-block', animation: 'clap 0.4s ease-in-out infinite 0.2s' }}>
            👏
          </span>
          <span style={{ fontSize: 80, display: 'inline-block', animation: 'clap 0.4s ease-in-out infinite 0.1s' }}>
            👏
          </span>
        </div>

        <div>
          <p className="text-green-400 text-2xl font-bold tracking-widest uppercase mb-2" style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }}>
            Order Complete!
          </p>
          <p className="text-white text-5xl font-black">
            Great Work!
          </p>
          <p className="text-zinc-400 text-lg mt-2 font-mono">
            #{orderNumber}
          </p>
        </div>

        <div className="flex items-center gap-3 text-5xl">
          <span>⭐</span>
          <span>🏆</span>
          <span>⭐</span>
        </div>

        <p className="text-zinc-500 text-sm mt-2">
          Returning in <span className="text-white font-bold">{count}</span>...
        </p>
      </div>
    </div>
  )
}

export function HeatPressGrid({ order, onItemComplete, onOrderComplete }: HeatPressGridProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  const items = order.items
  const totalItems = items.length

  // Calculate order age and urgency zone
  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date()
  const now = new Date()
  const ageInDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

  const getUrgencyZone = () => {
    if (ageInDays >= 8) return 'red'
    if (ageInDays >= 4) return 'orange'
    if (ageInDays >= 2) return 'yellow'
    return 'green'
  }

  const urgencyZone = getUrgencyZone()
  const shouldFlash = urgencyZone === 'red' || urgencyZone === 'orange'

  const zoneStyles: Record<string, string> = {
    green: 'bg-green-100 border-green-300',
    yellow: 'bg-yellow-100 border-yellow-300',
    orange: 'bg-orange-200 border-orange-400',
    red: 'bg-red-200 border-red-400',
  }

  const handleFinishOrder = useCallback(() => {
    items.forEach((item, index) => onItemComplete(index, item))
    setShowCelebration(true)
  }, [items, onItemComplete])

  return (
    <>
      {showCelebration && (
        <CelebrationOverlay
          orderNumber={order.orderNumber}
          onDone={onOrderComplete}
        />
      )}
      {shouldFlash && (
        <style>{`
          @keyframes urgentFlash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .urgent-flash { animation: urgentFlash 3s ease-in-out infinite; }
        `}</style>
      )}
      <div className="h-full flex flex-col overflow-hidden">
        {/* Compact order bar - matches Bundle Room style */}
        <div className={`flex items-center justify-between border rounded px-3 py-1.5 shrink-0 ${zoneStyles[urgencyZone]} ${shouldFlash ? 'urgent-flash' : ''}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Order</span>
              <span className="text-base font-mono font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Customer</span>
              <span className="text-sm font-medium">{order.shipTo?.name || order.customerUsername}</span>
            </div>
            <span className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            {order.shipTo && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Ship to</span>
                <span className="text-sm font-medium">
                  {[order.shipTo.city, order.shipTo.state, order.shipTo.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button
              onClick={handleFinishOrder}
              size="sm"
              className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
              Complete
            </Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={onOrderComplete}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Scrollable Products Gallery */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 pb-32">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-1">
            {items.map((item, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative bg-muted h-40 flex items-center justify-center">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                      Qty: {item.quantity || 1}
                    </Badge>
                  </div>
                  <div className="p-3">
                    {(() => {
                      // Parse product name that includes details like "So Much Worse - Men's T-Shirt / Charcoal Heather / L"
                      const fullName = item.name
                      const parts = fullName.split(' - ')
                      const productName = parts[0] // "So Much Worse"
                      const details = parts.length > 1 ? parts[1] : '' // "Men's T-Shirt / Charcoal Heather / L"
                      
                      return (
                        <>
                          <h4 className="font-bold text-sm leading-tight mb-2">{productName}</h4>
                          {details ? (
                            <p className="text-xs text-muted-foreground font-medium">
                              {details.split(' / ').join(' · ')}
                            </p>
                          ) : item.options && item.options.length > 0 ? (
                            <p className="text-xs text-muted-foreground font-medium">
                              {item.options.map(opt => opt.value).join(' · ')}
                            </p>
                          ) : (
                            item.sku && (
                              <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                            )
                          )}
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
