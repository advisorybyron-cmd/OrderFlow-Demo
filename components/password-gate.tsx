'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Loader2 } from 'lucide-react'

const STORAGE_KEY = 'ppp_admin_auth'

interface PasswordGateProps {
  children: React.ReactNode
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    // Check if already authenticated in this session
    const storedAuth = sessionStorage.getItem(STORAGE_KEY)
    if (storedAuth === 'true') {
      setIsAuthenticated(true)
    }
    setIsChecking(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsVerifying(true)

    try {
      const res = await fetch('/api/passwords/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey: 'admin_reports', password }),
      })

      const data = await res.json()

      if (data.valid) {
        sessionStorage.setItem(STORAGE_KEY, 'true')
        setIsAuthenticated(true)
      } else {
        setError('Incorrect password')
        setPassword('')
      }
    } catch (err) {
      console.error('Failed to verify password:', err)
      setError('Failed to verify password')
    } finally {
      setIsVerifying(false)
    }
  }

  if (isChecking) {
    return null
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl">Management Access</CardTitle>
            <CardDescription>
              Enter the password to continue
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center"
              autoFocus
            />

            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Unlock'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
