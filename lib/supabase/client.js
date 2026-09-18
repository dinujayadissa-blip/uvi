'use client';
import { createClient } from '@supabase/supabase-js';

let _client = null;

/**
 * Browser Supabase client (singleton) for auth + user actions.
 * Returns null when env vars aren't set, so the UI can degrade gracefully.
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_client) _client = createClient(url, key);
  return _client;
}

export const isConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
