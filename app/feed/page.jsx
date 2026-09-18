'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/media';
import { useAuth } from '@/components/AuthProvider';

export default function FeedPage() {
  const { configured, user, openAuth } = useAuth() || {};
  const sb = getSupabase();
  const [trips, setTrips] = useState(null);

  useEffect(() => {
    if (!sb || !user) { setTrips([]); return; }
    let active = true;
    (async () => {
      const { data: fol } = await sb.from('follows').select('followee_id').eq('follower_id', user.id);
      const ids = (fol || []).map((f) => f.followee_id).concat(user.id);
      const { data } = await sb
        .from('trips')
        .select('id,title,summary,distance_km,days,cover_media,like_count,comment_count, author:profiles(username,display_name)')
        .in('user_id', ids).eq('is_public', true)
        .order('created_at', { ascending: false }).limit(50);
      const rows = data || [];
      const coverIds = rows.filter((t) => t.cover_media).map((t) => t.cover_media);
      const covers = {};
      if (coverIds.length) {
        const { data: m } = await sb.from('media').select('id,storage_path').in('id', coverIds);
        (m || []).forEach((x) => { covers[x.id] = x.storage_path; });
      }
      if (active) setTrips(rows.map((t) => ({ ...t, cover: t.cover_media ? mediaUrl(covers[t.cover_media]) : null })));
    })();
    return () => { active = false; };
  }, [sb, user]);

  return (
    <div className="wrap page-wrap">
      <div className="page-head">
        <div>
          <h1>Your feed</h1>
          <p>The latest trips from travellers you follow.</p>
        </div>
        <Link className="btn btn-primary btn-sm" href="/trips/new">Share a trip</Link>
      </div>

      {!configured && <p className="gate">Accounts aren&apos;t connected yet.</p>}
      {configured && !user && (
        <div className="gate">
          <p>Sign in to see trips from people you follow.</p>
          <button className="btn btn-primary" onClick={() => openAuth('signin')}>Sign in</button>
        </div>
      )}
      {configured && user && trips === null && <p className="empty-state">Loading your feed…</p>}
      {configured && user && trips && trips.length === 0 && (
        <p className="empty-state">Your feed is empty. <Link href="/trips">Discover trips</Link> and follow travellers to fill it.</p>
      )}
      {configured && user && trips && trips.length > 0 && (
        <div className="trip-grid">
          {trips.map((t) => (
            <Link className="trip-card" href={`/trips/${t.id}`} key={t.id}>
              {t.cover
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="trip-card-cover" src={t.cover} alt="" />
                : <div className="trip-card-cover placeholder" aria-hidden="true">🗺️</div>}
              <div className="trip-card-body">
                <h3>{t.title}</h3>
                {t.summary && <p>{t.summary}</p>}
                <p className="trip-card-meta">
                  {t.author ? `@${t.author.username}` : ''} · ♥ {t.like_count || 0} · 💬 {t.comment_count || 0}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
