import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PrintFileRequest {
  print_file_urls: string[]
  order_number: number | string
  item_titles: string[]
  station_url?: string  // Optional: specific station URL to send to
}

export async function POST(request: NextRequest) {
  try {
    const body: PrintFileRequest = await request.json()
    const { print_file_urls, order_number, item_titles, station_url } = body

    if (!print_file_urls || print_file_urls.length === 0) {
      return NextResponse.json({ error: 'No print files provided' }, { status: 400 })
    }

    // Use provided station_url or fall back to environment variable
    const localPrintServiceUrl = station_url || process.env.LOCAL_PRINT_SERVICE_URL

    if (!localPrintServiceUrl) {
      return NextResponse.json(
        { error: 'No printer station selected and LOCAL_PRINT_SERVICE_URL not configured.' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const results: Array<{
      filename: string
      status: string
      error?: string
    }> = []

    // Download each file and send to local print server
    for (let i = 0; i < print_file_urls.length; i++) {
      try {
        let fileUrl = print_file_urls[i]
        const itemTitle = item_titles[i] || `item_${i + 1}`

        // Shopify file metafields store JSON like {"url":"https://cdn.shopify.com/..."}
        if (fileUrl && fileUrl.startsWith('{')) {
          try {
            const parsed = JSON.parse(fileUrl)
            fileUrl = parsed.url || parsed.src || fileUrl
          } catch {
            // not JSON, use as-is
          }
        }

        console.log('[v0] Downloading print file from:', fileUrl)

        // Download file from URL
        const fileResponse = await fetch(fileUrl)
        console.log('[v0] Download response status:', fileResponse.status, fileResponse.statusText)
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file (${fileResponse.status}): ${fileResponse.statusText} — URL: ${fileUrl}`)
        }

        const buffer = await fileResponse.arrayBuffer()

        // Create filename
        const sanitizedTitle = itemTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)
        const filename = `${order_number}_${i + 1}_${sanitizedTitle}.png`

        // Send to local print server
        console.log('[v0] Sending to local print server:', localPrintServiceUrl)
        const formData = new FormData()
        formData.append('file', new Blob([buffer], { type: 'image/png' }), filename)
        formData.append('filename', filename)
        formData.append('order_number', String(order_number))
        formData.append('item_title', itemTitle)

        const sendResponse = await fetch(`${localPrintServiceUrl}/receive-print-file`, {
          method: 'POST',
          body: formData,
        })

        console.log('[v0] Local server response status:', sendResponse.status)
        const sendData = await sendResponse.json()
        console.log('[v0] Local server response:', sendData)

        if (!sendResponse.ok) {
          throw new Error(`Local server error: ${sendData.message || sendResponse.statusText}`)
        }

        // Record in database
        await supabase.from('dtf_print_jobs').insert({
          order_number: String(order_number),
          product_title: itemTitle,
          print_file_url: fileUrl,
          status: 'sent_to_printer',
        })

        results.push({
          filename,
          status: 'sent',
        })

        console.log(`[v0] ✓ File ${filename} sent successfully`)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[v0] Failed to send file ${i + 1}:`, errMsg)
        results.push({
          filename: `file_${i + 1}`,
          status: 'error',
          error: errMsg,
        })
      }
    }

    const successCount = results.filter((r) => r.status === 'sent').length

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount}/${print_file_urls.length} files sent to printer`,
      results,
    })
  } catch (error) {
    console.error('[v0] Error processing print files:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process files' },
      { status: 500 }
    )
  }
}
