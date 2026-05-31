import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // Hardcoded fallbacks for v0 sandbox (env vars don't persist reliably)
  const FALLBACK_URL = 'https://kwkegurnemljlhpdsqvx.supabase.co'
  const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a2VndXJuZW1samxocGRzcXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDM5MDQsImV4cCI6MjA5MjYxOTkwNH0.g0GQCkjZgho6lZ1Kh1HvUB-3xJlGL4pkDNb6zOcIaZ4'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || FALLBACK_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || FALLBACK_KEY

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
          }
        },
      },
    },
  )
}
