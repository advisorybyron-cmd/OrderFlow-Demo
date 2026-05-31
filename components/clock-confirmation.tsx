'use client'

import { useEffect } from 'react'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClockConfirmationProps {
  show: boolean
  type: 'clock-in' | 'clock-out'
  positionName?: string
  onClose: () => void
}

export function ClockConfirmation({ show, type, positionName, onClose }: ClockConfirmationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  const isClockIn = type === 'clock-in'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-3xl shadow-2xl transform animate-in zoom-in-95 duration-300",
          isClockIn ? "bg-green-600" : "bg-red-600"
        )}
      >
        {/* Pulsing background circle */}
        <div className={cn(
          "absolute inset-0 rounded-3xl animate-pulse opacity-30",
          isClockIn ? "bg-green-400" : "bg-red-400"
        )} />
        
        {/* Icon */}
        <div className="relative mb-4">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center",
            isClockIn ? "bg-green-500" : "bg-red-500"
          )}>
            {isClockIn ? (
              <CheckCircle2 className="w-16 h-16 text-white animate-in zoom-in duration-500" />
            ) : (
              <Clock className="w-16 h-16 text-white animate-in zoom-in duration-500" />
            )}
          </div>
        </div>

        {/* Text */}
        <h2 className="relative text-3xl font-bold text-white mb-2">
          {isClockIn ? 'Clocked In!' : 'Clocked Out!'}
        </h2>
        
        {positionName && isClockIn && (
          <p className="relative text-xl text-white/90 mb-2">
            {positionName}
          </p>
        )}
        
        <p className="relative text-white/80 text-sm">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>

        {/* Close hint */}
        <p className="relative mt-4 text-white/60 text-xs">
          Auto-closing in 3 seconds...
        </p>
      </div>
    </div>
  )
}
