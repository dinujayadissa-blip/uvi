import { createClient } from '@supabase/supabase-js';

/**
 * Server Supabase client using the anon key (no user cookies) for public,
 * SSR reads — RLS exposes only approved/public rows. Returns null when env
 * vars are missing or invalid so pages render a placeholder instead of
 * crashing the build/request.
 */
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https?:\/\//.test(url)) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch {
    return null;
  }
}
