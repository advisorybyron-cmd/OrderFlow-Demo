'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/passwords/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey: 'main_app', password }),
      })

      const data = await res.json()

      if (data.valid) {
        localStorage.setItem('torpid_auth', 'verified')
        window.location.href = '/'
      } else {
        setError('Incorrect password')
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to verify password:', err)
      setError('Failed to verify password')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm px-4">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Torpid OrderFlow</h1>
            <p className="text-muted-foreground">Enter the password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              autoComplete="off"
            />

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Checking...' : 'Enter'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
