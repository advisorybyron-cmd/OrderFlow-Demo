import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: stations, error } = await supabase
      .from('dtf_stations')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[v0] Error fetching DTF stations:', error)
      return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 })
    }

    return NextResponse.json({ stations })
  } catch (error) {
    console.error('[v0] Error in DTF stations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
