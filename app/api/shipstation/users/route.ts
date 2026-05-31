import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY || ''
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET || ''

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Fetch users from ShipStation
    const auth = Buffer.from(`${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`).toString('base64')
    const response = await fetch('https://ssapi.shipstation.com/users', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: `ShipStation API error: ${text}` }, { status: response.status })
    }

    const users = await response.json()
    
    // Upsert users into the mapping table
    for (const user of users) {
      await supabase
        .from('shipstation_user_mapping')
        .upsert({
          shipstation_user_id: user.userId,
          shipstation_user_name: user.userName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        }, {
          onConflict: 'shipstation_user_id',
        })
    }

    // Fetch the current mappings with employee info
    const { data: mappings, error } = await supabase
      .from('shipstation_user_mapping')
      .select(`
        id,
        shipstation_user_id,
        shipstation_user_name,
        employee_id,
        employees (
          id,
          first_name,
          last_name,
          employee_code,
          avatar_url
        )
      `)
      .order('shipstation_user_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: mappings, synced: users.length })
  } catch (error) {
    console.error('Failed to sync ShipStation users:', error)
    return NextResponse.json({ error: 'Failed to sync ShipStation users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { shipstation_user_id, employee_id } = body

    if (!shipstation_user_id) {
      return NextResponse.json({ error: 'shipstation_user_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('shipstation_user_mapping')
      .update({ employee_id: employee_id || null })
      .eq('shipstation_user_id', shipstation_user_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update mapping:', error)
    return NextResponse.json({ error: 'Failed to update mapping' }, { status: 500 })
  }
}
