'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ScanBarcode } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

// Number of t-shirt emojis to distribute around the border
const TSHIRT_COUNT = 16

// Pre-computed positions evenly spaced around the border (0-100% of perimeter)
function getBorderPositions(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const pct = i / count  // 0..1 around the perimeter
    // Perimeter: top(0-25%), right(25-50%), bottom(50-75%), left(75-100%)
    if (pct < 0.25) {
      // top edge: left -> right
      return { top: '-18px', left: `${(pct / 0.25) * 100}%`, transform: 'translateX(-50%)' }
    } else if (pct < 0.5) {
      // right edge: top -> bottom
      return { right: '-18px', top: `${((pct - 0.25) / 0.25) * 100}%`, transform: 'translateY(-50%)' }
    } else if (pct < 0.75) {
      // bottom edge: right -> left
      return { bottom: '-18px', right: `${((pct - 0.5) / 0.25) * 100}%`, transform: 'translateX(50%)' }
    } else {
      // left edge: bottom -> top
      return { left: '-18px', bottom: `${((pct - 0.75) / 0.25) * 100}%`, transform: 'translateY(50%)' }
    }
  })
}

const positions = getBorderPositions(TSHIRT_COUNT)

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { setEmployee, setSession } = useSession()

  // Animate t-shirts by cycling the offset
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 120)
    return () => clearInterval(id)
  }, [])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employeeCode.trim()) {
      setError('Please enter your employee code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/employees/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: employeeCode.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Login failed'
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      setEmployee(data.employee)
      setSession(data.session)
      router.push('/select-room')
    } catch (err) {
      setError('Connection error. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard>
    <main className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-md">
        {/* Animated t-shirt emojis around the border */}
        {positions.map((pos, i) => {
          const offset = (i + tick) % TSHIRT_COUNT
          const opacity = 0.35 + (offset / TSHIRT_COUNT) * 0.65
          const scale = 0.7 + (offset / TSHIRT_COUNT) * 0.5
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                fontSize: '20px',
                opacity,
                transform: `${pos.transform ?? ''} scale(${scale})`,
                transition: 'opacity 0.12s, transform 0.12s',
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 10,
                ...pos,
              }}
            >
              👕
            </span>
          )
        })}

      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <ScanBarcode className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Torpid Orderflow</CardTitle>
            <CardDescription className="text-base mt-2">
              Scan your employee badge or enter your code to begin
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Employee Code"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                className="text-center text-2xl h-14 font-mono tracking-wider"
                disabled={isLoading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
      </div>
    </main>
    </AuthGuard>
  )
}
