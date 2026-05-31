'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2, ExternalLink, ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LiveActivityFeed } from '@/components/live-activity-feed'
import Link from 'next/link'

const SHOP_DOMAIN = 'ycug09-uz.myshopify.com'
const CLIENT_ID = '1979387344cab58d17440c11cec400ce'
const SCOPES = 'read_orders,read_products'

export default function ShopifyConnectPage() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'not_connected' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    try {
      const res = await fetch('/api/shopify/status')
      if (res.ok) {
        setStatus('connected')
      } else {
        setStatus('not_connected')
      }
    } catch (err) {
      setStatus('error')
      setError('Failed to check connection status')
    }
  }

  function handleConnect() {
    const redirectUri = `${window.location.origin}/api/shopify/callback`
    const authUrl = `https://${SHOP_DOMAIN}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-md mx-auto space-y-6 mt-20">
        <Link href="/dtf-room">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to DTF Room
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Connect Shopify Store</CardTitle>
            <CardDescription>Authorize the DTF Printer system to access your Shopify orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'checking' && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Checking connection...</span>
              </div>
            )}

            {status === 'connected' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Connected to Shopify</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your store is authorized. You can now scan orders in the DTF Printer room.
                </p>
                <Link href="/dtf-room">
                  <Button className="w-full">Back to DTF Room</Button>
                </Link>
              </div>
            )}

            {status === 'not_connected' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click below to authorize the Torpid OrderFlow app to access your Shopify store. You'll be redirected to Shopify to approve.
                </p>
                <Button onClick={handleConnect} className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Connect to Shopify
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Connection Error</span>
                </div>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button onClick={() => checkConnection()} variant="outline" className="w-full">
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
