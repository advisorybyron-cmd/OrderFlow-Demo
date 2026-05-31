'use client'

import { useEffect, useState, useCallback } from 'react'

interface Flamingo {
  id: number
  duration: number
  size: number
  yOffset: number
  startTime: number
}

export function RunningFlamingos() {
  const [flamingos, setFlamingos] = useState<Flamingo[]>([])

  const spawnFlamingos = useCallback(() => {
    // Spawn 1-3 flamingos
    const count = 1 + Math.floor(Math.random() * 3)
    const now = Date.now()
    
    const newFlock: Flamingo[] = Array.from({ length: count }, (_, i) => ({
      id: now + i,
      duration: 1.5 + Math.random() * 1, // Fast! 1.5-2.5 seconds to cross
      size: 60 + Math.random() * 20,
      yOffset: Math.random() * 60, // Random vertical position across screen
      startTime: now,
    }))
    
    setFlamingos(newFlock)
    
    // Clear flamingos after they've crossed the screen
    setTimeout(() => {
      setFlamingos([])
    }, 3000)
  }, [])

  useEffect(() => {
    // Initial spawn after a random delay (0-30 seconds for first appearance)
    const initialDelay = Math.random() * 30000
    const initialTimeout = setTimeout(() => {
      spawnFlamingos()
      startInterval()
    }, initialDelay)

    let intervalId: NodeJS.Timeout

    const startInterval = () => {
      // Schedule next spawn at random time within 5 minutes (30-300 seconds)
      const scheduleNext = () => {
        const delay = 30000 + Math.random() * 270000 // 30s to 5min
        intervalId = setTimeout(() => {
          spawnFlamingos()
          scheduleNext()
        }, delay)
      }
      scheduleNext()
    }

    return () => {
      clearTimeout(initialTimeout)
      if (intervalId) clearTimeout(intervalId)
    }
  }, [spawnFlamingos])

  if (flamingos.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {flamingos.map((flamingo, index) => (
        <div
          key={flamingo.id}
          className="absolute"
          style={{
            animation: `flamingo-dash ${flamingo.duration}s linear forwards`,
            animationDelay: `${index * 0.15}s`,
            bottom: `${100 + flamingo.yOffset}px`,
          }}
        >
          {/* Realistic Flamingo SVG */}
          <svg
            width={flamingo.size}
            height={flamingo.size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md"
          >
            {/* Body - main oval */}
            <ellipse cx="50" cy="55" rx="18" ry="12" fill="#E91E63" />
            <ellipse cx="50" cy="55" rx="16" ry="10" fill="#F48FB1" />
            <ellipse cx="52" cy="54" rx="12" ry="7" fill="#F8BBD9" />
            
            {/* Tail feathers */}
            <path d="M 32 55 Q 24 52, 20 55 Q 24 58, 32 55" fill="#C2185B" />
            <path d="M 32 57 Q 22 56, 18 60 Q 24 60, 32 57" fill="#E91E63" />
            <path d="M 32 53 Q 26 48, 22 50 Q 26 54, 32 53" fill="#AD1457" />
            
            {/* Long curved neck */}
            <path
              d="M 58 48 C 62 42, 68 35, 70 28 C 72 22, 70 16, 64 14 C 60 12, 56 14, 54 18"
              stroke="#E91E63"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 58 48 C 62 42, 68 35, 70 28 C 72 22, 70 16, 64 14 C 60 12, 56 14, 54 18"
              stroke="#F48FB1"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            
            {/* Head */}
            <ellipse cx="54" cy="16" rx="6" ry="5" fill="#E91E63" />
            <ellipse cx="54" cy="16" rx="5" ry="4" fill="#F48FB1" />
            
            {/* Beak - curved downward like real flamingo */}
            <path d="M 48 16 L 42 18 Q 40 19, 42 20 L 48 18 Z" fill="#FF9800" />
            <path d="M 42 18 L 48 17" stroke="#212121" strokeWidth="0.5" />
            <path d="M 44 18 Q 42 19, 44 20" fill="#212121" />
            
            {/* Eye */}
            <circle cx="52" cy="14" r="2" fill="white" />
            <circle cx="52" cy="14" r="1" fill="#212121" />
            <circle cx="51.5" cy="13.5" r="0.3" fill="white" />
            
            {/* Wing detail */}
            <ellipse 
              cx="52" 
              cy="54" 
              rx="10" 
              ry="6" 
              fill="#C2185B"
              className="animate-wing-fast"
            />
            <path d="M 45 52 Q 52 50, 60 54" stroke="#AD1457" strokeWidth="1" fill="none" />
            <path d="M 46 55 Q 52 53, 58 56" stroke="#AD1457" strokeWidth="0.5" fill="none" />
            
            {/* Legs - animated running fast */}
            <g className="animate-legs-fast">
              {/* Back leg */}
              <path
                d="M 44 65 L 40 78 L 38 85"
                stroke="#E91E63"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 38 85 L 34 86 M 38 85 L 40 87"
                stroke="#E91E63"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              
              {/* Front leg */}
              <path
                d="M 56 65 L 62 78 L 68 85"
                stroke="#E91E63"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 68 85 L 72 86 M 68 85 L 66 87"
                stroke="#E91E63"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
            
            {/* Knee joints */}
            <circle cx="40" cy="78" r="1.5" fill="#C2185B" />
            <circle cx="62" cy="78" r="1.5" fill="#C2185B" />
          </svg>
        </div>
      ))}

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes flamingo-dash {
          0% {
            left: -100px;
            transform: scaleX(1);
          }
          100% {
            left: calc(100% + 100px);
            transform: scaleX(1);
          }
        }
        
        :global(.animate-legs-fast) {
          animation: leg-run-fast 0.1s ease-in-out infinite;
          transform-origin: 50px 65px;
        }
        
        @keyframes leg-run-fast {
          0%, 100% {
            transform: rotate(-15deg);
          }
          50% {
            transform: rotate(15deg);
          }
        }
        
        :global(.animate-wing-fast) {
          animation: wing-flap-fast 0.15s ease-in-out infinite;
          transform-origin: 52px 54px;
        }
        
        @keyframes wing-flap-fast {
          0%, 100% {
            transform: scaleY(1) rotate(-3deg);
          }
          50% {
            transform: scaleY(0.85) rotate(3deg);
          }
        }
      `}</style>
    </div>
  )
}
