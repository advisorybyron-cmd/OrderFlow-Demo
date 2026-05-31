import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client for server-side API routes
// Uses service role key which bypasses RLS
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kwkegurnemljlhpdsqvx.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('[v0] Admin client: URL =', supabaseUrl ? 'set' : 'not set', ', Key =', supabaseServiceKey ? 'set' : 'NOT SET')

  if (!supabaseServiceKey) {
    console.error('[v0] SUPABASE_SERVICE_ROLE_KEY is not set. Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
