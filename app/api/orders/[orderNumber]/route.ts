import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findDesignImages } from '@/lib/google-drive'

const SHOP_DOMAIN = 'ycug09-uz.myshopify.com'

// Resolve Shopify GID to actual file URL using GraphQL
async function resolveShopifyGid(gid: string, accessToken: string): Promise<string | null> {
  const query = `
    query GetMediaImage($id: ID!) {
      node(id: $id) {
        ... on MediaImage {
          image {
            url
            originalSrc
          }
        }
      }
    }
  `

  try {
    const response = await fetch(`https://${SHOP_DOMAIN}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: gid },
      }),
    })

    if (!response.ok) {
      console.error('[v0] GraphQL error:', response.statusText)
      return null
    }

    const data = await response.json()
    console.log('[v0] GraphQL response:', JSON.stringify(data, null, 2))
    
    const imageUrl = data?.data?.node?.image?.url || data?.data?.node?.image?.originalSrc
    return imageUrl || null
  } catch (error) {
    console.error('[v0] Failed to resolve GID:', error)
    return null
  }
}

interface LineItem {
  id: string
  title: string
  quantity: number
  variant_title: string | null
  product_id: string
}

interface OrderResponse {
  order_number: number
  line_items: (LineItem & { print_file_url: string | null })[]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location') || 'unknown'
    const shouldFetchShopifyImages = location === 'DTF Room'

    // Get Shopify access token from database
    const supabase = await createClient()
    const { data: tokenData, error: tokenError } = await supabase
      .from('shopify_tokens')
      .select('access_token')
      .eq('shop_domain', SHOP_DOMAIN)
      .single()

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json(
        { error: 'Shopify not connected. Please authorize first.' },
        { status: 401 }
      )
    }

    const accessToken = tokenData.access_token

    // Fetch order by order number - try multiple search formats
    // Shopify order names can be #8547 or just 8547, so we try both formats
    const searchFormats = [
      `name:#${orderNumber}`,  // Try with # prefix first
      `name:${orderNumber}`,   // Try without prefix
      `order_number:${orderNumber}`, // Try by order_number field
    ]
    
    let order = null
    
    for (const searchQuery of searchFormats) {
      console.log(`[v0] Trying Shopify search: ${searchQuery}`)
      
      const ordersResponse = await fetch(
        `https://${SHOP_DOMAIN}/admin/api/2024-04/orders.json?query=${encodeURIComponent(searchQuery)}&status=any`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!ordersResponse.ok) {
        console.error(`[v0] Shopify API error: ${ordersResponse.statusText}`)
        continue
      }

      const { orders } = await ordersResponse.json()
      console.log(`[v0] Search "${searchQuery}" returned ${orders?.length || 0} orders`)
      
      if (orders && orders.length > 0) {
        // Find exact match - order_number should match the searched number
        order = orders.find((o: any) => 
          String(o.order_number) === String(orderNumber) ||
          o.name === `#${orderNumber}` ||
          o.name === orderNumber
        ) || orders[0]
        
        if (order) {
          console.log(`[v0] Found order: name=${order.name}, order_number=${order.order_number}`)
          break
        }
      }
    }
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    // Get product names for Google Drive image matching (DTF Room only)
    const productNames = order.line_items.map((item: any) => item.title)
    let driveImages = new Map<string, string>()
    
    if (shouldFetchShopifyImages) {
      try {
        driveImages = await findDesignImages(productNames)
        console.log(`[v0] Found ${driveImages.size} matching Drive images for ${productNames.length} products`)
      } catch (error) {
        console.error('[v0] Failed to fetch Drive images:', error)
      }
    }

    const lineItemsWithPrintFiles = await Promise.all(
      order.line_items.map(async (item: any, index: number) => {
        // Log the first item to see what fields are available
        if (index === 0) {
          console.log('[v0] Sample line item keys:', Object.keys(item))
          console.log('[v0] Sample line item:', JSON.stringify(item, null, 2).substring(0, 500))
        }
        // Fetch metafields directly from the metafields endpoint
        const metafieldsResponse = await fetch(
          `https://${SHOP_DOMAIN}/admin/api/2024-04/products/${item.product_id}/metafields.json`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        )

        let printFileUrl = null
        if (metafieldsResponse.ok) {
          const { metafields } = await metafieldsResponse.json()

          console.log(`[v0] Product ${item.product_id} metafields:`, metafields?.map((mf: any) => ({
            namespace: mf.namespace,
            key: mf.key,
            value: mf.value,
            type: mf.type,
          })))

          // Find the print file metafield - try all common keys
          const printFileMetafield = metafields?.find(
            (mf: any) =>
              (mf.key === 'print_file' || mf.key === 'print_files' || mf.key === 'printfile') &&
              (mf.namespace === 'custom' || mf.namespace === 'global')
          ) || metafields?.find(
            (mf: any) => mf.key?.toLowerCase().includes('print')
          )

          if (printFileMetafield) {
            let rawValue = printFileMetafield.value
            
            // For file type metafields, value may be a JSON object with a 'url' key
            if (typeof rawValue === 'string' && rawValue.startsWith('{')) {
              try {
                const parsed = JSON.parse(rawValue)
                rawValue = parsed.url || parsed.src || rawValue
              } catch {
                // not JSON, use as-is
              }
            }
            
            // If it's a Shopify GID, resolve it to the actual URL
            if (typeof rawValue === 'string' && rawValue.startsWith('gid://shopify/')) {
              console.log(`[v0] Resolving GID: ${rawValue}`)
              printFileUrl = await resolveShopifyGid(rawValue, accessToken)
            } else {
              printFileUrl = rawValue
            }
            
            console.log(`[v0] Final print file URL:`, printFileUrl)
          } else {
            console.log(`[v0] No print file metafield found for product ${item.product_id}`)
          }
        }

        // For DTF Room: Use Google Drive images (fuzzy matched by product name)
        // For other rooms: Fall back to line item image or null
        let productImage: string | null = null

        if (shouldFetchShopifyImages) {
          // Try to get image from Google Drive
          productImage = driveImages.get(item.title) || null
          console.log(`[v0] Product "${item.title}" Drive image:`, productImage ? 'found' : 'not found')
        }

        // Fallback to line item image if available
        if (!productImage && item.image?.src) {
          productImage = item.image.src
        }

        return {
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          variant_title: item.variant_title,
          product_id: item.product_id,
          print_file_url: printFileUrl,
          product_image: productImage,
        }
      })
    )

    const response: OrderResponse = {
      order_number: order.order_number,
      shipping_address: order.shipping_address,
      line_items: lineItemsWithPrintFiles,
    }

    return NextResponse.json({ order: response })
  } catch (error) {
    console.error('[v0] Error fetching order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
