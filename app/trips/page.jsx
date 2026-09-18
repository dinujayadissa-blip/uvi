import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { mediaUrl } from '@/lib/media';

export const metadata = {
  title: 'Trips',
  description: 'Community trip reports and routes from across Australia — camps, tracks and road trips.'
};
// Render per-request so the build never depends on the DB being reachable.
export const dynamic = 'force-dynamic';

export default async function TripsPage() {
  const sb = getServerSupabase();
  let trips = [];
  const covers = {};
  if (sb) {
    try {
      const { data } = await sb
        .from('trips')
        .select('id,title,summary,distance_km,days,cover_media, author:profiles(username,display_name)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);
      trips = data || [];
      const ids = trips.filter((t) => t.cover_media).map((t) => t.cover_media);
      if (ids.length) {
        const { data: m } = await sb.from('media').select('id,storage_path').in('id', ids);
        (m || []).forEach((x) => { covers[x.id] = x.storage_path; });
      }
    } catch {
      trips = [];
    }
  }

  return (
    <div className="wrap page-wrap">
      <div className="page-head">
        <div>
          <h1>Trips</h1>
          <p>Real routes and stories shared by the Uvi community.</p>
        </div>
        <Link className="btn btn-primary btn-sm" href="/trips/new">Share a trip</Link>
      </div>

      {trips.length === 0 ? (
        <p className="empty-state">
          No public trips yet. {sb ? 'Be the first to ' : 'Once the backend is connected you can '}
          <Link href="/trips/new">share one</Link>.
        </p>
      ) : (
        <div className="trip-grid">
          {trips.map((t) => {
            const cover = t.cover_media ? mediaUrl(covers[t.cover_media]) : null;
            const bits = [t.distance_km ? `${t.distance_km.toLocaleString('en-AU')} km` : null,
              t.days ? `${t.days} days` : null].filter(Boolean).join(' · ');
            return (
              <Link className="trip-card" href={`/trips/${t.id}`} key={t.id}>
                {cover
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="trip-card-cover" src={cover} alt="" />
                  : <div className="trip-card-cover placeholder" aria-hidden="true">🗺️</div>}
                <div className="trip-card-body">
                  <h3>{t.title}</h3>
                  {t.summary && <p>{t.summary}</p>}
                  <p className="trip-card-meta">
                    {t.author ? `@${t.author.username}` : ''}{bits ? ` · ${bits}` : ''}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
