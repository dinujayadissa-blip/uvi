'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

function text(n) {
  const who = n.actor ? (n.actor.display_name || '@' + n.actor.username) : 'Someone';
  if (n.type === 'follow') return `${who} started following you`;
  if (n.type === 'like') return `${who} liked your trip`;
  if (n.type === 'comment') return `${who} commented: ${n.payload?.excerpt || ''}`;
  return who;
}
function href(n) {
  if (n.type === 'follow' && n.actor) return `/u/${n.actor.username}`;
  if (n.target_type === 'trip' && n.target_id) return `/trips/${n.target_id}`;
  return '#';
}

export default function NotificationsBell() {
  const { user } = useAuth() || {};
  const sb = getSupabase();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!sb || !user) return;
    const { data } = await sb
      .from('notifications')
      .select('id,type,target_type,target_id,payload,read_at,created_at, actor:profiles!notifications_actor_id_fkey(username,display_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setItems(data || []);
  }, [sb, user]);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread && sb && user) {
      await sb.from('notifications').update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id).is('read_at', null);
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    }
  }

  if (!user) return null;

  return (
    <div className="notif">
      <button className="notif-trigger" aria-label="Notifications" onClick={toggle}>
        🔔{unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown" role="menu">
          <p className="account-name">Notifications</p>
          {items.length === 0 && <p className="reviews-empty" style={{ padding: '0.5rem 0.6rem' }}>Nothing yet.</p>}
          {items.map((n) => (
            <Link key={n.id} href={href(n)} className="notif-item" role="menuitem" onClick={() => setOpen(false)}>
              {text(n)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
