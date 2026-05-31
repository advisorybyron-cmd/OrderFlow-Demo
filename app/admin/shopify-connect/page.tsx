'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import Link from 'next/link'

const SHOPIFY_CLIENT_ID = '1979387344cab58d17440c11cec400ce'
const SHOP_DOMAIN = 'ycug09-uz.myshopify.com'
const SCOPES = 'read_products,read_orders'
const REDIRECT_URI = 'https://torpidorderflow.vercel.app/api/shopify/callback'

function ShopifyConnectContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'connected' | 'not_connected' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)
  const success = searchParams.get('success') === 'true'

  useEffect(() => {
    checkConnection()
  }, [success])

  async function checkConnection() {
    try {
      const response = await fetch('/api/shopify/status')
      const data = await response.json()
      setStatus(data.connected ? 'connected' : 'not_connected')
    } catch {
      setStatus('error')
      setError('Failed to check connection status')
    }
  }

  function handleConnect() {
    const state = crypto.randomUUID()
    sessionStorage.setItem('shopify_oauth_state', state)
    const authUrl = `https://${SHOP_DOMAIN}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <Link href="/dtf-room" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to DTF Room
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Connect Shopify</CardTitle>
            <CardDescription>
              Connect your Shopify store to enable the DTF Printer system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'checking' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Checking connection...</span>
              </div>
            )}

            {status === 'connected' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Shopify is connected!</span>
                </div>
                {success && (
                  <p className="text-sm text-muted-foreground">
                    Successfully connected to your Shopify store.
                  </p>
                )}
                <Link href="/dtf-room">
                  <Button className="w-full">Go to DTF Printer Room</Button>
                </Link>
              </div>
            )}

            {status === 'not_connected' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click below to authorize the app to access your Shopify store. This will allow fetching order details and print files.
                </p>
                <Button onClick={handleConnect} className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Connect to Shopify
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Store: {SHOP_DOMAIN}
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error || 'Connection error'}</span>
                </div>
                <Button onClick={checkConnection} variant="outline" className="w-full">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Ticker Footer */}
      <LiveActivityFeed variant="ticker" maxItems={10} />
    </div>
  )
}

export default function ShopifyConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ShopifyConnectContent />
    </Suspense>
  )
}
