'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export default function TripSocial({ tripId, initialLikes = 0, initialComments = 0 }) {
  const { configured, user, openAuth } = useAuth() || {};
  const sb = getSupabase();

  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sb) return;
    let active = true;
    sb.from('comments')
      .select('id,body,created_at, author:profiles(username,display_name)')
      .eq('target_type', 'trip').eq('target_id', tripId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (active) setComments(data || []); });
    if (user) {
      sb.from('likes').select('target_id')
        .eq('user_id', user.id).eq('target_type', 'trip').eq('target_id', tripId).maybeSingle()
        .then(({ data }) => { if (active) setLiked(!!data); });
    }
    return () => { active = false; };
  }, [sb, tripId, user]);

  if (!configured) {
    return <p className="reviews-empty" style={{ marginTop: '2rem' }}>Likes and comments arrive once accounts go live.</p>;
  }

  async function toggleLike() {
    if (!user) { openAuth('signin'); return; }
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const res = next
      ? await sb.from('likes').insert({ user_id: user.id, target_type: 'trip', target_id: tripId })
      : await sb.from('likes').delete().eq('user_id', user.id).eq('target_type', 'trip').eq('target_id', tripId);
    if (res.error) { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!user) { openAuth('signin'); return; }
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await sb.from('comments')
      .insert({ target_type: 'trip', target_id: tripId, user_id: user.id, body: text })
      .select('id,body,created_at, author:profiles(username,display_name)').single();
    setBusy(false);
    if (!error && data) { setComments((c) => [...(c || []), data]); setBody(''); }
  }

  return (
    <div className="trip-social">
      <div className="social-bar">
        <button className={'like-btn' + (liked ? ' on' : '')} onClick={toggleLike} aria-pressed={liked}>
          {liked ? '♥' : '♡'} <span>{likes}</span>
        </button>
        <span className="social-count">💬 {comments ? comments.length : initialComments}</span>
      </div>

      <div className="reviews-block">
        <h3>Comments</h3>
        {comments === null && <p className="reviews-empty">Loading…</p>}
        {comments && comments.length === 0 && <p className="reviews-empty">No comments yet — start the conversation.</p>}
        {comments && comments.length > 0 && (
          <div>
            {comments.map((c) => (
              <div className="review" key={c.id}>
                <div className="review-head">
                  <span className="review-who">
                    {c.author ? <Link href={`/u/${c.author.username}`}>{c.author.display_name || '@' + c.author.username}</Link> : 'Traveller'}
                  </span>
                </div>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        )}
        {user ? (
          <form onSubmit={addComment} style={{ marginTop: '1rem' }}>
            <textarea rows={3} maxLength={2000} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Posting…' : 'Post comment'}</button>
          </form>
        ) : (
          <p className="reviews-empty"><button className="btn-link" onClick={() => openAuth('signin')}>Sign in</button> to like or comment.</p>
        )}
      </div>
    </div>
  );
}
