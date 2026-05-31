import { createClient } from '@/lib/supabase/server'

// Shopify App Credentials (Torpid OrderFlow from Dev Dashboard)
const SHOPIFY_CLIENT_ID = '1979387344cab58d17440c11cec400ce'
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || ''
const SHOP_DOMAIN = 'ycug09-uz.myshopify.com'
const SCOPES = 'read_products,read_orders'
const REDIRECT_URI = 'https://torpidorderflow.vercel.app/api/shopify/callback'

/**
 * Generate Shopify OAuth authorization URL
 */
export function getAuthorizationUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: redirectUri,
  })
  return `https://${SHOP_DOMAIN}/admin/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Store access token in database
 */
export async function storeAccessToken(accessToken: string, scope?: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('shopify_tokens')
    .upsert({
      shop_domain: SHOP_DOMAIN,
      access_token: accessToken,
      scope: scope || SCOPES,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'shop_domain',
    })

  if (error) {
    throw new Error(`Failed to store access token: ${error.message}`)
  }
}

/**
 * Get stored access token
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('shopify_tokens')
    .select('access_token')
    .eq('shop_domain', SHOP_DOMAIN)
    .single()

  if (error || !data) {
    return null
  }

  return data.access_token
}

/**
 * Check if Shopify is connected
 */
export async function isShopifyConnected(): Promise<boolean> {
  const token = await getAccessToken()
  return token !== null
}

/**
 * Fetch order by order number from Shopify
 */
export async function fetchOrderByNumber(orderNumber: string) {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('Shopify not connected. Please connect your store first.')
  }

  // Search for order by name (order number)
  const response = await fetch(
    `https://${SHOP_DOMAIN}/admin/api/2024-01/orders.json?name=${encodeURIComponent(orderNumber)}&status=any`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch order from Shopify')
  }

  const data = await response.json()
  
  if (!data.orders || data.orders.length === 0) {
    throw new Error(`Order ${orderNumber} not found`)
  }

  return data.orders[0]
}

/**
 * Fetch product metafields to get print file URL
 */
export async function fetchProductPrintFile(productId: string): Promise<string | null> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('Shopify not connected')
  }

  const response = await fetch(
    `https://${SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/metafields.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  
  // Look for print_file metafield in custom namespace
  const printFileMetafield = data.metafields?.find(
    (mf: { namespace: string; key: string }) => 
      mf.namespace === 'custom' && mf.key === 'print_file'
  )

  return printFileMetafield?.value || null
}

/**
 * Fetch order with print files for all line items
 */
export async function fetchOrderWithPrintFiles(orderNumber: string) {
  const order = await fetchOrderByNumber(orderNumber)
  
  // Fetch print files for each line item's product
  const lineItemsWithPrintFiles = await Promise.all(
    order.line_items.map(async (item: { product_id: string; title: string; variant_title: string; quantity: number; id: string }) => {
      const printFileUrl = item.product_id 
        ? await fetchProductPrintFile(String(item.product_id))
        : null
      
      return {
        id: item.id,
        product_id: item.product_id,
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        print_file_url: printFileUrl,
      }
    })
  )

  return {
    id: order.id,
    order_number: order.name,
    created_at: order.created_at,
    line_items: lineItemsWithPrintFiles,
  }
}
