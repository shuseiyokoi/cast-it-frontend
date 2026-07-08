import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase mode: episodes, activity, and auth go straight to the Supabase
// project (the anon key is public by design; row-level security guards the
// data). Takes precedence over the other API modes when configured.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const SUPABASE_MODE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase: SupabaseClient | null = SUPABASE_MODE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// Anonymous listening session, also used to personalize the feed before login.
const SESSION_KEY = 'castit.session'

export function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}
