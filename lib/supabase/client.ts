import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client. Uses the anon key and cookie-based sessions managed
 * by @supabase/ssr — auth tokens are never hand-rolled into localStorage.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
