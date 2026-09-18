import { createClient } from '@supabase/supabase-js';

/**
 * Server Supabase client using the anon key (no user cookies) for public,
 * SSR reads — RLS exposes only approved/public rows. Returns null when env
 * vars aren't set so pages can render a placeholder instead of crashing.
 */
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
