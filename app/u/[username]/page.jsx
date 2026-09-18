import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { mediaUrl } from '@/lib/media';
import FollowButton from '@/components/FollowButton';

export const revalidate = 60;

async function loadProfile(username) {
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('username', username).maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const profile = await loadProfile(params.username);
  if (!profile) return { title: 'Profile not found', robots: { index: false } };
  return {
    title: `${profile.display_name} (@${profile.username})`,
    description: profile.bio || `${profile.display_name}'s adventures on Uvi.`
  };
}

export default async function ProfilePage({ params }) {
  const sb = getServerSupabase();
  const profile = await loadProfile(params.username);
  if (!profile) notFound();

  const [{ count: followers }, { count: following }] = await Promise.all([
    sb.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', profile.id),
    sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id)
  ]);

  const { data: trips } = await sb
    .from('trips')
    .select('id,title,summary,distance_km,days,cover_media')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
  const covers = {};
  const ids = (trips || []).filter((t) => t.cover_media).map((t) => t.cover_media);
  if (ids.length) {
    const { data: m } = await sb.from('media').select('id,storage_path').in('id', ids);
    (m || []).forEach((x) => { covers[x.id] = x.storage_path; });
  }

  return (
    <div className="wrap page-wrap">
      <div className="page-head">
        <div>
          <h1>{profile.display_name}</h1>
          <p>@{profile.username}{profile.home_state ? ` · ${profile.home_state}` : ''}{profile.rig ? ` · ${profile.rig}` : ''}</p>
          <p className="trip-card-meta">{followers || 0} followers · {following || 0} following</p>
          {profile.bio && <p style={{ marginTop: '0.5rem' }}>{profile.bio}</p>}
        </div>
        <FollowButton profileId={profile.id} />
      </div>

      <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Trips</h2>
      {(trips || []).length === 0 ? (
        <p className="empty-state">No public trips yet.</p>
      ) : (
        <div className="trip-grid">
          {trips.map((t) => {
            const cover = t.cover_media ? mediaUrl(covers[t.cover_media]) : null;
            return (
              <Link className="trip-card" href={`/trips/${t.id}`} key={t.id}>
                {cover
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="trip-card-cover" src={cover} alt="" />
                  : <div className="trip-card-cover placeholder" aria-hidden="true">🗺️</div>}
                <div className="trip-card-body">
                  <h3>{t.title}</h3>
                  {t.summary && <p>{t.summary}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
