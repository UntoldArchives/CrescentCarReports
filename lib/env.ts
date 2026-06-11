/**
 * Demo / preview mode.
 *
 * When there is no Supabase URL configured (or guest mode is explicitly on),
 * the app runs in a self-contained preview mode: auth is skipped and sample
 * reports are served from memory, so the UI is fully browsable without a
 * backend. Adding real Supabase env vars switches everything back to the live
 * database automatically.
 *
 * NEXT_PUBLIC_ vars are inlined at build time, so this resolves correctly on
 * both the server and the client.
 */
export const IS_DEMO =
  process.env.NEXT_PUBLIC_ENABLE_GUEST_MODE === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL
