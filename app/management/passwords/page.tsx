'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Home, LogOut, ArrowLeft, Key, Eye, EyeOff, Check, Loader2, Lock } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

interface PagePassword {
  id: string
  page_key: string
  page_name: string
  description: string | null
  updated_at: string
}

export default function PasswordManagerPage() {
  const router = useRouter()
  const { employee, session, clearSession, isLoading } = useSession()
  const [pages, setPages] = useState<PagePassword[]>([])
  const [loadingPages, setLoadingPages] = useState(true)
  const [editingPage, setEditingPage] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!isLoading && (!employee || !session)) {
      router.push('/')
    }
  }, [employee, session, router, isLoading])

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/passwords')
      if (res.ok) {
        const data = await res.json()
        setPages(data.pages || [])
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err)
    } finally {
      setLoadingPages(false)
    }
  }

  const handleLogOut = async () => {
    if (!session) return

    try {
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
    } catch (err) {
      console.error('Failed to end session:', err)
    }

    clearSession()
    router.push('/')
  }

  const handleUpdatePassword = async (pageKey: string) => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'Password must be at least 4 characters' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey, newPassword }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully!' })
        setEditingPage(null)
        setNewPassword('')
        setConfirmPassword('')
        fetchPages() // Refresh to get updated timestamp
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to update password' })
      }
    } catch (err) {
      console.error('Failed to update password:', err)
      setMessage({ type: 'error', text: 'Failed to update password' })
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (pageKey: string) => {
    setEditingPage(pageKey)
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setMessage(null)
  }

  const cancelEditing = () => {
    setEditingPage(null)
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setMessage(null)
  }

  if (isLoading || !employee || !session) {
    return null
  }

  const initials = employee.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <main className="min-h-screen bg-background p-4">
      {/* Theme Toggle - Fixed to top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 border-2 border-slate-200">
            <AvatarImage src={employee.avatar_url || undefined} alt={employee.name} />
            <AvatarFallback className="bg-slate-100 text-slate-700 font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold text-foreground">{employee.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">{employee.employee_code}</p>
            <p className="text-xs text-slate-600">Management</p>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <Button variant="outline" size="sm" onClick={handleLogOut} className="h-7 text-xs px-2">
              <LogOut className="h-3 w-3 mr-1" />
              Log Out of Torpid Orderflow
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/management')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Management
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/select-room')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Switch Room
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto mt-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Key className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Password Manager</h2>
            <p className="text-sm text-muted-foreground">Manage passwords for protected pages</p>
          </div>
        </div>

        {message && (
          <Alert className={`mb-4 ${message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {loadingPages ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <Card key={page.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{page.page_name}</CardTitle>
                        <CardDescription>{page.description}</CardDescription>
                      </div>
                    </div>
                    {editingPage !== page.page_key && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(page.page_key)}
                      >
                        Change Password
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {editingPage === page.page_key && (
                  <CardContent className="border-t bg-slate-50 dark:bg-slate-900/50 pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">New Password</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Confirm Password</label>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleUpdatePassword(page.page_key)}
                          disabled={saving || !newPassword || !confirmPassword}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Save Password
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}

                <div className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-xs text-muted-foreground">
                  Last updated: {new Date(page.updated_at).toLocaleString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
