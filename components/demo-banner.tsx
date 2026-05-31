'use client'

import { isDemoMode } from '@/lib/demo/config'

export function DemoBanner() {
  if (!isDemoMode) return null

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
      Demo Mode - Using sample data. Password: <code className="bg-amber-600/30 px-1.5 py-0.5 rounded">demo2024</code>
      {' '} | Employee codes: JD001, SS002, MJ003, EW004, TB005, LD006, AM007, RG008
    </div>
  )
}
