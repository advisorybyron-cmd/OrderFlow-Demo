import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isDemoMode, DEMO_PASSWORD } from '@/lib/demo'

// POST - Verify a password for a specific page
export async function POST(request: Request) {
  try {
    const { pageKey, password } = await request.json()

    if (!pageKey || !password) {
      return NextResponse.json({ error: 'Page key and password are required' }, { status: 400 })
    }

    // Demo mode: accept demo password for all pages
    if (isDemoMode) {
      const isValid = password === DEMO_PASSWORD
      return NextResponse.json({ valid: isValid })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('page_passwords')
      .select('password_hash')
      .eq('page_key', pageKey)
      .single()

    if (error || !data) {
      console.error('Failed to fetch password:', error)
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const isValid = password === data.password_hash

    return NextResponse.json({ valid: isValid })
  } catch (err) {
    console.error('Error verifying password:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
