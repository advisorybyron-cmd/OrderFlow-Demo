import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get('orderNumber')

  if (!orderNumber) {
    return NextResponse.json(
      { error: 'Order number is required' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // Query order_locations table with employee join
    const { data: history, error } = await supabase
      .from('order_locations')
      .select(`
        id,
        order_number,
        location,
        scanned_at,
        scanned_by_employee_id,
        notes,
        employees:scanned_by_employee_id (
          first_name,
          last_name
        )
      `)
      .eq('order_number', orderNumber)
      .order('scanned_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch order history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch order history' },
        { status: 500 }
      )
    }

    // Also check scan_history for additional records
    const { data: scanHistory } = await supabase
      .from('scan_history')
      .select('*')
      .eq('order_number', orderNumber)
      .order('scanned_at', { ascending: false })

    // Merge records, deduplicating by timestamp proximity
    const allHistory = [...(history || [])]

    if (scanHistory) {
      for (const scan of scanHistory) {
        const exists = allHistory.some(h =>
          Math.abs(new Date(h.scanned_at).getTime() - new Date(scan.scanned_at).getTime()) < 1000
        )
        if (!exists) {
          allHistory.push({
            id: scan.id,
            order_number: scan.order_number,
            location: scan.room,
            scanned_at: scan.scanned_at,
            scanned_by_employee_id: null,
            notes: null,
            employees: null,
          })
        }
      }
    }

    // Sort descending
    allHistory.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())

    // Normalize employees -> employee for frontend
    const transformed = allHistory.map(h => ({
      ...h,
      employee: h.employees,
      employees: undefined,
    }))

    return NextResponse.json({ history: transformed })
  } catch (error) {
    console.error('Error fetching order history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
