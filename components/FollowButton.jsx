'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export default function FollowButton({ profileId }) {
  const { configured, user, openAuth } = useAuth() || {};
  const sb = getSupabase();
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sb || !user || user.id === profileId) { setReady(true); return; }
    let active = true;
    sb.from('follows').select('followee_id')
      .eq('follower_id', user.id).eq('followee_id', profileId).maybeSingle()
      .then(({ data }) => { if (active) { setFollowing(!!data); setReady(true); } });
    return () => { active = false; };
  }, [sb, user, profileId]);

  if (!configured || (user && user.id === profileId)) return null;

  async function toggle() {
    if (!user) { openAuth('signin'); return; }
    const next = !following;
    setFollowing(next);
    const res = next
      ? await sb.from('follows').insert({ follower_id: user.id, followee_id: profileId })
      : await sb.from('follows').delete().eq('follower_id', user.id).eq('followee_id', profileId);
    if (res.error) setFollowing(!next); // revert on failure
  }

  return (
    <button
      className={'btn btn-sm ' + (following ? 'btn-ghost' : 'btn-primary')}
      onClick={toggle}
      disabled={!!user && !ready}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
