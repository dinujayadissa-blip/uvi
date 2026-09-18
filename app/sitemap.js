import { getServerSupabase } from '@/lib/supabase/server';

const BASE = 'https://uvi-uvi1.vercel.app';

export default async function sitemap() {
  const routes = [
    { url: `${BASE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/trips`, changeFrequency: 'daily', priority: 0.8 }
  ];
  const sb = getServerSupabase();
  if (sb) {
    try {
      const { data } = await sb.from('trips').select('id,updated_at').eq('is_public', true).limit(1000);
      (data || []).forEach((t) =>
        routes.push({ url: `${BASE}/trips/${t.id}`, lastModified: t.updated_at, priority: 0.6 }));
    } catch { /* sitemap falls back to static routes */ }
  }
  return routes;
}
