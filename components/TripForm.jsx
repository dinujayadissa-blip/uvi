'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import PhotoUpload from '@/components/PhotoUpload';

function slugify(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'trip';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function TripForm() {
  const router = useRouter();
  const sb = getSupabase();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [distance, setDistance] = useState('');
  const [days, setDays] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [cover, setCover] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [waypoints, setWaypoints] = useState([{ name: '', lat: '', lng: '' }]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  function setWp(i, key, val) {
    setWaypoints((prev) => prev.map((w, idx) => (idx === i ? { ...w, [key]: val } : w)));
  }
  function addWp() { setWaypoints((prev) => [...prev, { name: '', lat: '', lng: '' }]); }
  function removeWp(i) { setWaypoints((prev) => prev.filter((_, idx) => idx !== i)); }

  async function submit(e) {
    e.preventDefault();
    if (!sb) return;
    if (title.trim().length < 3) { setMsg({ err: true, text: 'Give your trip a title (3+ characters).' }); return; }
    setBusy(true); setMsg({ text: 'Publishing…' });
    try {
      const { data: u } = await sb.auth.getUser();
      const user = u?.user;
      if (!user) { setMsg({ err: true, text: 'Please sign in.' }); setBusy(false); return; }

      const { data: trip, error } = await sb.from('trips').insert({
        user_id: user.id,
        title: title.trim(),
        slug: slugify(title),
        summary: summary.trim() || null,
        body: body.trim() || null,
        distance_km: distance ? parseInt(distance, 10) : null,
        days: days ? parseInt(days, 10) : null,
        cover_media: cover?.id || null,
        is_public: isPublic
      }).select('id').single();
      if (error) throw error;

      // Attach uploaded media to the trip
      const mediaIds = [...(cover ? [cover.id] : []), ...photos.map((p) => p.id)];
      if (mediaIds.length) {
        await sb.from('media').update({ trip_id: trip.id }).in('id', mediaIds);
      }

      // Waypoints
      const wps = waypoints
        .map((w, i) => ({ trip_id: trip.id, seq: i, name: w.name.trim() || null,
          lat: w.lat ? parseFloat(w.lat) : null, lng: w.lng ? parseFloat(w.lng) : null }))
        .filter((w) => w.name || w.lat || w.lng);
      if (wps.length) await sb.from('trip_waypoints').insert(wps);

      router.push(`/trips/${trip.id}`);
    } catch (e2) {
      setMsg({ err: true, text: e2.message || 'Something went wrong.' });
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <label className="field">Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Two weeks up the Gibb River Road" required />
      </label>
      <label className="field">Summary
        <input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} placeholder="One line that sums up the trip" />
      </label>
      <div className="field-row">
        <label className="field">Distance (km)
          <input type="number" min="0" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </label>
        <label className="field">Days
          <input type="number" min="0" value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
      </div>
      <label className="field">Story
        <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} placeholder="Tell the story — route, camps, tracks, tips…" />
      </label>

      <div className="field">
        <span>Cover photo</span>
        <PhotoUpload label={cover ? 'Change cover photo' : 'Upload cover photo'} onUploaded={setCover} />
      </div>

      <div className="field">
        <span>More photos</span>
        <PhotoUpload label="Add a photo" onUploaded={(m) => setPhotos((p) => [...p, m])} />
        {photos.length > 0 && <p className="tool-note">{photos.length} photo{photos.length === 1 ? '' : 's'} added.</p>}
      </div>

      <div className="field">
        <span>Waypoints (optional)</span>
        {waypoints.map((w, i) => (
          <div className="waypoint-row" key={i}>
            <input placeholder="Name" value={w.name} onChange={(e) => setWp(i, 'name', e.target.value)} />
            <input placeholder="Lat" value={w.lat} onChange={(e) => setWp(i, 'lat', e.target.value)} style={{ maxWidth: 90 }} />
            <input placeholder="Lng" value={w.lng} onChange={(e) => setWp(i, 'lng', e.target.value)} style={{ maxWidth: 90 }} />
            <button type="button" className="btn-link" onClick={() => removeWp(i)} aria-label="Remove waypoint">✕</button>
          </div>
        ))}
        <button type="button" className="btn-link" onClick={addWp}>+ Add waypoint</button>
      </div>

      <label className="tool-check" style={{ margin: '0.5rem 0 1rem' }}>
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Publish publicly
      </label>

      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish trip'}</button>
      {msg && <p className="auth-msg" style={{ color: msg.err ? '#f2c14e' : undefined }}>{msg.text}</p>}
    </form>
  );
}
