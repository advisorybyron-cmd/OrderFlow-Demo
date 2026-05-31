import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { sessionId, employeeId, orderNumber, itemIndex, itemName, itemSku, quantity } = await request.json()

    if (!sessionId || !employeeId || !orderNumber || itemIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Record the item scan
    const { data: scan, error } = await supabase
      .from('item_scans')
      .insert({
        work_session_id: sessionId,
        employee_id: employeeId,
        order_number: orderNumber,
        item_index: itemIndex,
        item_name: itemName || null,
        item_sku: itemSku || null,
        quantity: quantity || 1,
        scanned_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Scan error:', error)
      return NextResponse.json(
        { error: 'Failed to record scan' },
        { status: 500 }
      )
    }

    // Get updated session stats
    const { count } = await supabase
      .from('item_scans')
      .select('*', { count: 'exact', head: true })
      .eq('work_session_id', sessionId)

    return NextResponse.json({ scan, totalItems: count })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
