'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Check, Package, X } from 'lucide-react'
import type { ShipStationOrder } from '@/lib/shipstation/types'

interface OrderFlipbookProps {
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
        {/* Clapping hands */}
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

        {/* Main message */}
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

        {/* Trophy + star row */}
        <div className="flex items-center gap-3 text-5xl">
          <span>⭐</span>
          <span>🏆</span>
          <span>⭐</span>
        </div>

        {/* Countdown */}
        <p className="text-zinc-500 text-sm mt-2">
          Returning in <span className="text-white font-bold">{count}</span>...
        </p>
      </div>
    </div>
  )
}

export function OrderFlipbook({ order, onItemComplete, onOrderComplete }: OrderFlipbookProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set())
  const [showCelebration, setShowCelebration] = useState(false)

  const items = order.items
  const currentItem = items[currentIndex]
  const totalItems = items.length
  const allCompleted = completedItems.size === totalItems

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(totalItems - 1, prev + 1))
  }, [totalItems])

  const handleMarkComplete = useCallback(() => {
    if (!completedItems.has(currentIndex)) {
      setCompletedItems((prev) => new Set(prev).add(currentIndex))
      onItemComplete(currentIndex, currentItem)
    }
    
    // Auto-advance to next incomplete item
    if (currentIndex < totalItems - 1) {
      const nextIncomplete = items.findIndex((_, i) => i > currentIndex && !completedItems.has(i))
      if (nextIncomplete !== -1) {
        setCurrentIndex(nextIncomplete)
      } else {
        setCurrentIndex(currentIndex + 1)
      }
    }
  }, [currentIndex, currentItem, completedItems, totalItems, items, onItemComplete])

  const handleToggleComplete = useCallback(() => {
    const newCompleted = new Set(completedItems)
    if (newCompleted.has(currentIndex)) {
      newCompleted.delete(currentIndex)
    } else {
      newCompleted.add(currentIndex)
      onItemComplete(currentIndex, currentItem!)
    }
    setCompletedItems(newCompleted)
  }, [currentIndex, completedItems, currentItem, onItemComplete])

  const handleFinishOrder = useCallback(() => {
    setShowCelebration(true)
  }, [])

  // Get item options (size, color, etc.)
  const itemOptions = currentItem?.options || []

  return (
    <>
    {showCelebration && (
      <CelebrationOverlay
        orderNumber={order.orderNumber}
        onDone={onOrderComplete}
      />
    )}
    <div className="max-w-4xl mx-auto">
      {/* Order Header - Compact */}
      <Card className="mb-2">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Order Number</p>
            <p className="text-lg font-mono font-bold">{order.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium text-sm">{order.shipTo?.name || order.customerUsername}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={allCompleted ? 'default' : 'secondary'}>
              {completedItems.size} / {totalItems} items
            </Badge>
            <Button variant="ghost" size="sm" onClick={onOrderComplete}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Item Display - Compact */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/50 py-2 px-4">
          <CardTitle className="text-base">
            Item {currentIndex + 1} of {totalItems}
          </CardTitle>
          <div className="flex items-center gap-2">
            {completedItems.has(currentIndex) && (
              <Badge className="bg-green-600">Completed</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image Section - Constrained height */}
            <div className="relative bg-muted h-[280px] flex items-center justify-center">
              {currentItem?.imageUrl ? (
                <Image
                  src={currentItem.imageUrl}
                  alt={currentItem.name}
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Package className="h-12 w-12" />
                  <p className="text-sm">No image available</p>
                </div>
              )}
            </div>

            {/* Details Section - Compact */}
            <div className="p-4 flex flex-col justify-between h-[280px]">
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold leading-tight line-clamp-2">{currentItem?.name}</h3>
                  {currentItem?.sku && (
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      SKU: {currentItem.sku}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Quantity:</span>
                  <Badge variant="outline" className="text-base px-2 py-0.5">
                    {currentItem?.quantity || 1}
                  </Badge>
                </div>

                {itemOptions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Options:</p>
                    <div className="flex flex-wrap gap-1">
                      {itemOptions.map((option, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {option.name}: {option.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-auto">
                {completedItems.has(currentIndex) ? (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base gap-2"
                    onClick={handleToggleComplete}
                  >
                    <Check className="h-4 w-4" />
                    Completed
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-12 text-base gap-2 bg-green-600 hover:bg-green-700"
                    onClick={handleMarkComplete}
                  >
                    <Check className="h-4 w-4" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation - Compact */}
      <div className="flex items-center justify-between mt-2">
        <Button
          variant="outline"
          size="default"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {/* Item Checkboxes with Product Previews */}
        <div className="flex gap-1.5 overflow-x-auto max-w-[50%] py-1">
          {items.map((item, index) => (
            <div key={index} className="relative group flex-shrink-0">
              <button
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to item ${index + 1}`}
                className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all relative overflow-hidden ${
                  completedItems.has(index)
                    ? 'border-green-500 bg-green-500'
                    : index === currentIndex
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/30 bg-muted'
                }`}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : null}
                {completedItems.has(index) && (
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white relative z-10" />
                )}
              </button>
              
              {/* Hover Tooltip with larger preview */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex bg-black rounded-lg shadow-lg z-50">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={100}
                    height={100}
                    className="rounded-lg"
                  />
                )}
              </div>
              
              {/* Tooltip text */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-14 hidden group-hover:block bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                {item.name}
              </div>
            </div>
          ))}
        </div>

        {currentIndex === totalItems - 1 && allCompleted ? (
          <Button
            size="default"
            onClick={handleFinishOrder}
            className="gap-1"
          >
            Finish Order
            <Check className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="default"
            onClick={handleNext}
            disabled={currentIndex === totalItems - 1}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
    </>
  )
}
