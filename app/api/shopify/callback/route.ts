import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, storeAccessToken } from '@/lib/shopify'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle error from Shopify
  if (error) {
    return NextResponse.redirect(
      new URL(`/dtf-room?shopify_error=${encodeURIComponent(error)}`, request.url)
    )
  }

  // Validate code exists
  if (!code) {
    return NextResponse.redirect(
      new URL('/dtf-room?shopify_error=missing_code', request.url)
    )
  }

  try {
    // Exchange authorization code for access token
    const accessToken = await exchangeCodeForToken(code)
    
    // Store the token in database
    await storeAccessToken(accessToken)
    
    // Redirect back to Shopify connect page with success
    return NextResponse.redirect(
      new URL('/admin/shopify-connect?success=true', 'https://torpidorderflow.vercel.app')
    )
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/admin/shopify-connect?error=${encodeURIComponent('Failed to connect')}`, 'https://torpidorderflow.vercel.app')
    )
  }
}
