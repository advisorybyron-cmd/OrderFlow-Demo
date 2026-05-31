import { NextResponse } from 'next/server'
import { isShopifyConnected } from '@/lib/shopify'

export async function GET() {
  try {
    const connected = await isShopifyConnected()
    return NextResponse.json({ connected })
  } catch (error) {
    console.error('Error checking Shopify status:', error)
    return NextResponse.json({ connected: false })
  }
}
