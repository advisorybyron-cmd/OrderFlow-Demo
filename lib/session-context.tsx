'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Employee, WorkSession } from '@/lib/types'

const STORAGE_KEY = 'torpid-orderflow-session'
const SESSION_TIMEOUT_HOURS = (20 / 60) // Session expires after 20 minutes of inactivity

interface StoredSession {
  employee: Employee
  session: WorkSession
  lastActivity: number // timestamp
}

interface SessionContextType {
  employee: Employee | null
  session: WorkSession | null
  setEmployee: (employee: Employee | null) => void
  setSession: (session: WorkSession | null) => void
  clearSession: () => void
  isLoading: boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployeeState] = useState<Employee | null>(null)
  const [session, setSessionState] = useState<WorkSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data: StoredSession = JSON.parse(stored)
        const hoursSinceActivity = (Date.now() - data.lastActivity) / (1000 * 60 * 60)
        
        // Only restore if session hasn't expired
        if (hoursSinceActivity < SESSION_TIMEOUT_HOURS) {
          setEmployeeState(data.employee)
          setSessionState(data.session)
          // Update last activity
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...data,
            lastActivity: Date.now(),
          }))
        } else {
          // Session expired, clear it
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err)
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsLoading(false)
  }, [])

  // Update localStorage whenever session changes
  const setEmployee = useCallback((emp: Employee | null) => {
    setEmployeeState(emp)
  }, [])

  const setSession = useCallback((sess: WorkSession | null) => {
    setSessionState(sess)
  }, [])

  // Persist to localStorage when both employee and session are set
  useEffect(() => {
    if (employee && session) {
      const data: StoredSession = {
        employee,
        session,
        lastActivity: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [employee, session])

  // Update activity timestamp on user interactions
  useEffect(() => {
    if (!employee || !session) return

    const updateActivity = () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data: StoredSession = JSON.parse(stored)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...data,
          lastActivity: Date.now(),
        }))
      }
    }

    // Update on clicks and key presses
    window.addEventListener('click', updateActivity)
    window.addEventListener('keydown', updateActivity)

    return () => {
      window.removeEventListener('click', updateActivity)
      window.removeEventListener('keydown', updateActivity)
    }
  }, [employee, session])

  const clearSession = useCallback(() => {
    setEmployeeState(null)
    setSessionState(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <SessionContext.Provider
      value={{
        employee,
        session,
        setEmployee,
        setSession,
        clearSession,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
