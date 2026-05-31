import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'

// GET - List all page passwords (without revealing actual passwords)
export async function GET() {
  try {
    // Demo mode: return empty list
    if (isDemoMode) {
      return NextResponse.json({ pages: [] })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('page_passwords')
      .select('id, page_key, page_name, description, updated_at')
      .order('page_name')

    if (error) {
      console.error('Failed to fetch passwords:', error)
      return NextResponse.json({ error: 'Failed to fetch passwords' }, { status: 500 })
    }

    return NextResponse.json({ pages: data })
  } catch (err) {
    console.error('Error fetching passwords:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update a page password
export async function POST(request: Request) {
  try {
    // Demo mode: don't allow password changes
    if (isDemoMode) {
      return NextResponse.json({ error: 'Cannot change passwords in demo mode' }, { status: 403 })
    }

    const { pageKey, newPassword } = await request.json()

    if (!pageKey || !newPassword) {
      return NextResponse.json({ error: 'Page key and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { error } = await supabase
      .from('page_passwords')
      .update({ password_hash: newPassword })
      .eq('page_key', pageKey)

    if (error) {
      console.error('Failed to update password:', error)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error('Error updating password:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
