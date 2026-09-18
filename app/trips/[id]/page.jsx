import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { mediaUrl } from '@/lib/media';
import TripSocial from '@/components/TripSocial';

export const revalidate = 60;

async function loadTrip(id) {
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('trips')
    .select('*, author:profiles(username,display_name)')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const trip = await loadTrip(params.id);
  if (!trip) return { title: 'Trip not found', robots: { index: false } };
  return {
    title: trip.title,
    description: trip.summary || `A trip report shared on Uvi by @${trip.author?.username || 'a traveller'}.`,
    openGraph: { title: trip.title, description: trip.summary || undefined }
  };
}

export default async function TripPage({ params }) {
  const sb = getServerSupabase();
  const trip = await loadTrip(params.id);
  if (!trip) notFound();

  const [{ data: waypoints }, { data: photos }] = await Promise.all([
    sb.from('trip_waypoints').select('*').eq('trip_id', trip.id).order('seq'),
    sb.from('media').select('id,storage_path,caption').eq('trip_id', trip.id).eq('status', 'active')
  ]);
  const coverPath = (photos || []).find((p) => p.id === trip.cover_media)?.storage_path;
  const gallery = (photos || []).filter((p) => p.id !== trip.cover_media);
  const bits = [trip.distance_km ? `${trip.distance_km.toLocaleString('en-AU')} km` : null,
    trip.days ? `${trip.days} days` : null].filter(Boolean);

  return (
    <div className="wrap page-wrap trip-detail">
      <Link href="/trips" className="back-home">&larr; All trips</Link>
      <h1>{trip.title}</h1>
      {trip.author && (
        <p className="trip-byline">
          by <Link href={`/u/${trip.author.username}`}>{trip.author.display_name || '@' + trip.author.username}</Link>
        </p>
      )}
      {bits.length > 0 && <div className="trip-stats">{bits.map((b) => <span key={b}>{b}</span>)}</div>}
      {coverPath && /* eslint-disable-next-line @next/next/no-img-element */ (
        <img className="trip-cover" src={mediaUrl(coverPath)} alt="" />
      )}
      {trip.summary && <p className="place-modal-desc">{trip.summary}</p>}
      {trip.body && <div className="trip-body">{trip.body}</div>}

      {waypoints && waypoints.length > 0 && (
        <>
          <h2 style={{ marginTop: '2rem', fontSize: '1.3rem' }}>Route</h2>
          <ol className="timeline">
            {waypoints.map((w) => (
              <li key={w.id}>
                <span className="day">{w.seq + 1}</span>
                <div>
                  <h4>{w.name || 'Waypoint'}</h4>
                  {w.note && <p>{w.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {gallery.length > 0 && (
        <div className="trip-gallery">
          {gallery.map((p) => /* eslint-disable-next-line @next/next/no-img-element */ (
            <img key={p.id} src={mediaUrl(p.storage_path)} alt={p.caption || ''} />
          ))}
        </div>
      )}

      <TripSocial tripId={trip.id} initialLikes={trip.like_count || 0} initialComments={trip.comment_count || 0} />
    </div>
  );
}
