'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseClockStatusOptions {
  employeeCode: string | undefined | null
  positionName?: string // The position name for this room (for clock-in)
}

interface UseClockStatusReturn {
  isClockedIn: boolean
  currentPosition: string | null
  isLoading: boolean
  isClockingIn: boolean
  isClockingOut: boolean
  clockIn: () => Promise<void>
  clockOut: () => Promise<void>
  refetch: () => Promise<void>
}

export function useClockStatus({ employeeCode, positionName }: UseClockStatusOptions): UseClockStatusReturn {
  const [currentPosition, setCurrentPosition] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClockingIn, setIsClockingIn] = useState(false)
  const [isClockingOut, setIsClockingOut] = useState(false)

  const isClockedIn = !!currentPosition

  const fetchPosition = useCallback(async () => {
    if (!employeeCode) {
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/wheniwork/current-position?employeeCode=${encodeURIComponent(employeeCode)}`)
      const data = await res.json()

      if (res.ok && data.position?.name) {
        setCurrentPosition(data.position.name)
      } else {
        setCurrentPosition(null)
      }
    } catch (err) {
      console.error('Failed to fetch current position:', err)
      setCurrentPosition(null)
    } finally {
      setIsLoading(false)
    }
  }, [employeeCode])

  useEffect(() => {
    fetchPosition()
  }, [fetchPosition])

  const clockIn = useCallback(async () => {
    if (!employeeCode || !positionName) return

    setIsClockingIn(true)
    try {
      const res = await fetch('/api/wheniwork/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode,
          positionName,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setCurrentPosition(data.position.name)
      } else {
        console.error('Failed to clock in:', data.error)
        alert(`Failed to clock in: ${data.error}`)
      }
    } catch (err) {
      console.error('Error clocking in:', err)
      alert('An error occurred while clocking in')
    } finally {
      setIsClockingIn(false)
    }
  }, [employeeCode, positionName])

  const clockOut = useCallback(async () => {
    if (!employeeCode || !isClockedIn) return

    setIsClockingOut(true)
    try {
      const res = await fetch('/api/wheniwork/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setCurrentPosition(null)
      } else {
        console.error('Failed to clock out:', data.error)
        alert(`Failed to clock out: ${data.error}`)
      }
    } catch (err) {
      console.error('Error clocking out:', err)
      alert('An error occurred while clocking out')
    } finally {
      setIsClockingOut(false)
    }
  }, [employeeCode, isClockedIn])

  return {
    isClockedIn,
    currentPosition,
    isLoading,
    isClockingIn,
    isClockingOut,
    clockIn,
    clockOut,
    refetch: fetchPosition,
  }
}
