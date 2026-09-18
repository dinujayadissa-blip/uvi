/**
 * Uvi front-end configuration (Stage 1: static site + Supabase JS client).
 *
 * Fill these in from your Supabase project → Settings → API.
 * The anon (public) key is SAFE to expose in client code — row-level security
 * in the database is what protects your data. Never put the service-role key here.
 *
 * Until real values are set, account features stay hidden and the site works
 * exactly as a static site (the email signup falls back to a local message).
 */
window.UVI_CONFIG = {
  supabaseUrl: 'YOUR_SUPABASE_URL',        // e.g. https://abcd1234.supabase.co
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};
