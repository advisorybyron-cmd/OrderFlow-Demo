import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

const SHOP_DOMAIN = 'ycug09-uz.myshopify.com'
const NEOSTAMPA_FOLDER = '\\\\LAPTOP-ASK7RFP2\\Users\\Myles - 6DS Inc\\Desktop\\PrintQueue'

/**
 * Process an order: fetch print files from Shopify and send to NeoStampa
 */
export async function POST(request: NextRequest) {
  try {
    const { orderNumber } = await request.json()

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number required' }, { status: 400 })
    }

    // Get Shopify access token from database
    const supabase = await createClient()
    const { data: tokenData, error: tokenError } = await supabase
      .from('shopify_tokens')
      .select('access_token')
      .eq('shop_domain', SHOP_DOMAIN)
      .single()

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json({ error: 'Shopify not connected. Please authorize first.' }, { status: 401 })
    }

    // Fetch order from Shopify
    const orderResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2024-01/orders.json?status=any&limit=1&name=${orderNumber}`, {
      headers: {
        'X-Shopify-Access-Token': tokenData.access_token,
      },
    })

    if (!orderResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch order from Shopify' }, { status: 500 })
    }

    const orderData = await orderResponse.json()
    const orders = orderData.orders || []

    if (orders.length === 0) {
      return NextResponse.json({ error: `Order ${orderNumber} not found` }, { status: 404 })
    }

    const order = orders[0]
    const printFiles: { filename: string; url: string }[] = []

    // Extract print files from line items
    for (const lineItem of order.line_items) {
      const productId = lineItem.product_id

      // Fetch product with metafields
      const productResponse = await fetch(
        `https://${SHOP_DOMAIN}/admin/api/2024-01/products/${productId}.json?fields=id,title,metafields`,
        {
          headers: {
            'X-Shopify-Access-Token': tokenData.access_token,
          },
        }
      )

      if (productResponse.ok) {
        const productData = await productResponse.json()
        const product = productData.product

        // Find print_file metafield
        const printFileMetafield = product.metafields?.find(
          (mf: any) => mf.namespace === 'custom' && mf.key === 'print_file'
        )

        if (printFileMetafield?.value) {
          printFiles.push({
            filename: `${order.order_number}_${lineItem.id}_${product.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
            url: printFileMetafield.value,
          })
        }
      }
    }

    if (printFiles.length === 0) {
      return NextResponse.json({ error: 'No print files found for this order' }, { status: 404 })
    }

    // Send files to NeoStampa
    const sentFiles: string[] = []
    const failedFiles: string[] = []

    for (const file of printFiles) {
      try {
        // Download the file from Shopify URL
        const fileResponse = await fetch(file.url)
        if (!fileResponse.ok) throw new Error(`Failed to download ${file.filename}`)

        const buffer = await fileResponse.arrayBuffer()

        // Save to NeoStampa folder
        const filePath = path.join(NEOSTAMPA_FOLDER, file.filename)
        fs.writeFileSync(filePath, Buffer.from(buffer))

        sentFiles.push(file.filename)

        // Record in database
        await supabase.from('dtf_print_jobs').insert({
          order_number: String(order.order_number),
          shopify_order_id: String(order.id),
          product_title: file.filename,
          print_file_url: file.url,
          status: 'sent',
          sent_to_printer_at: new Date().toISOString(),
        })
      } catch (err) {
        failedFiles.push(file.filename)
        console.error(`[v0] Failed to send file ${file.filename}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      order_number: order.order_number,
      sent_files: sentFiles,
      failed_files: failedFiles,
      message: `Sent ${sentFiles.length} print files to NeoStampa`,
    })
  } catch (error) {
    console.error('[v0] DTF process order error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process order' },
      { status: 500 }
    )
  }
}
