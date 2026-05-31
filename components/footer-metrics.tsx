'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface FooterMetrics {
  outstandingOrders: number
  outstandingItems: number
  ageBuckets: {
    age0_1: number
    age2_3: number
    age4_7: number
    age8plus: number
  }
}

function TickerItem({
  label,
  value,
  valueColor,
  labelColor = 'text-white/40',
}: {
  label: string
  value: string
  valueColor: string
  labelColor?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-2 shrink-0">
      <span className={`text-[9px] font-bold uppercase tracking-widest leading-tight text-center ${labelColor}`}>
        {label}
      </span>
      <span className={`text-3xl font-black leading-tight tabular-nums mt-1 ${valueColor}`}>
        {value}
      </span>
    </div>
  )
}

export function FooterMetrics() {
  const pathname = usePathname()
  const [metrics, setMetrics] = useState<FooterMetrics | null>(null)

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/metrics/footer')
      if (res.ok) setMetrics(await res.json())
    } catch {
      // silently fail — footer is non-critical
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (pathname === '/') return null
  if (!metrics) return null

  const { outstandingOrders, outstandingItems, ageBuckets } = metrics

  const items = [
    { label: 'Unshipped Orders!', value: outstandingOrders.toLocaleString(), valueColor: 'text-white' },
    { label: 'Unshipped Items!',  value: outstandingItems.toLocaleString(),  valueColor: 'text-white' },
    { label: '8+ Days Old',       value: ageBuckets.age8plus.toLocaleString(), valueColor: 'text-red-500',    labelColor: 'text-red-500/70' },
    { label: '4-7 Days Old',      value: ageBuckets.age4_7.toLocaleString(),   valueColor: 'text-orange-400', labelColor: 'text-orange-400/70' },
    { label: '2-3 Days Old',      value: ageBuckets.age2_3.toLocaleString(),   valueColor: 'text-yellow-400', labelColor: 'text-yellow-400/70' },
    { label: '0-1 Days Old',      value: ageBuckets.age0_1.toLocaleString(),   valueColor: 'text-green-400',  labelColor: 'text-green-400/70' },
  ]

  // Duplicate items so the loop scrolls seamlessly
  const looped = [...items, ...items]

  return (
    <>
      {/* Keyframe injected once */}
      <style>{`
        @keyframes scroll-down {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .ticker-scroll {
          animation: scroll-down 18s linear infinite;
        }
      `}</style>

      <aside className="fixed right-0 top-0 bottom-24 z-40 w-28 bg-black border-l border-white/10 overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 z-10 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 z-10 bg-gradient-to-t from-black to-transparent" />

        {/* Scrolling track */}
        <div className="ticker-scroll flex flex-col divide-y divide-white/10">
          {looped.map((item, idx) => (
            <TickerItem
              key={idx}
              label={item.label}
              value={item.value}
              valueColor={item.valueColor}
              labelColor={item.labelColor}
            />
          ))}
        </div>
      </aside>
    </>
  )
}
