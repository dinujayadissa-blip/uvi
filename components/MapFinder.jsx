'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import placeTypes from '@/data/place-types.json';
import staticPlaces from '@/data/places.json';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';

function loadLeaflet() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    if (window.L) return resolve(window.L);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    let s = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (!s) {
      s = document.createElement('script');
      s.src = LEAFLET_JS;
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener('load', () => resolve(window.L));
    s.addEventListener('error', () => resolve(null));
    if (window.L) resolve(window.L);
  });
}

const norm = (p) => ({
  id: p.id, name: p.name, type: p.type, state: p.state,
  lat: p.lat, lng: p.lng, desc: p.desc || p.description || '',
  rating_avg: p.rating_avg, rating_count: p.rating_count
});

export default function MapFinder() {
  const [places, setPlaces] = useState(staticPlaces.map(norm));
  const [activeType, setActiveType] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [detail, setDetail] = useState(null);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const groupRef = useRef(null);
  const markersRef = useRef({});

  const typeKeys = useMemo(
    () => Object.keys(placeTypes).filter((k) => places.some((p) => p.type === k)),
    [places]
  );
  const states = useMemo(
    () => Array.from(new Set(places.map((p) => p.state))).sort(),
    [places]
  );
  const filtered = useMemo(
    () => places.filter((p) =>
      (activeType === 'all' || p.type === activeType) &&
      (stateFilter === 'all' || p.state === stateFilter)),
    [places, activeType, stateFilter]
  );

  // Load live data (approved places) when Supabase is configured.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    sb.from('places')
      .select('id,name,type,state,lat,lng,description,rating_avg,rating_count')
      .eq('status', 'approved')
      .then(({ data, error }) => {
        if (!active || error || !data || !data.length) return;
        setPlaces(data.map(norm));
      });
    return () => { active = false; };
  }, []);

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !L || !mapDivRef.current || mapRef.current) return;
      const map = L.map(mapDivRef.current, { scrollWheelZoom: false }).setView([-25.5, 134.0], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      map.on('focus', () => map.scrollWheelZoom.enable());
      map.on('blur', () => map.scrollWheelZoom.disable());
      map.on('popupopen', (e) => {
        const btn = e.popup.getElement()?.querySelector('.popup-details');
        if (btn) btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-place-id');
          const p = places.find((x) => x.id === id);
          if (p) setDetail(p);
        });
      });
      mapRef.current = map;
      groupRef.current = L.featureGroup().addTo(map);
      setTimeout(() => map.invalidateSize(), 200);
      redrawMarkers();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers whenever the filtered set changes.
  useEffect(() => { redrawMarkers(); /* eslint-disable-next-line */ }, [filtered]);

  function redrawMarkers() {
    const L = typeof window !== 'undefined' ? window.L : null;
    const map = mapRef.current, group = groupRef.current;
    if (!L || !map || !group) return;
    group.clearLayers();
    markersRef.current = {};
    filtered.forEach((p) => {
      const t = placeTypes[p.type] || {};
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 8, color: '#0f1c1a', weight: 2, fillColor: t.color || '#e0743a', fillOpacity: 0.95
      });
      const label = t.label || p.type;
      m.bindPopup(
        `<strong>${esc(p.name)}</strong><br><span class="popup-meta">${esc(label)} · ${esc(p.state)}</span><br>${esc(p.desc)}<br><button type="button" class="popup-details" data-place-id="${esc(p.id)}">Details &amp; reviews</button>`
      );
      m.addTo(group);
      markersRef.current[p.id] = m;
    });
    if (group.getLayers().length) {
      try { map.fitBounds(group.getBounds().pad(0.25)); } catch { /* single point */ }
    }
  }

  function viewOnMap(p) {
    const map = mapRef.current, m = markersRef.current[p.id];
    setDetail(null);
    if (map && m) {
      map.setView([p.lat, p.lng], 8, { animate: true });
      m.openPopup();
      mapDivRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function nearMe(e) {
    const btn = e.currentTarget;
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;
    btn.disabled = true; btn.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        map.setView(ll, 7);
        window.L.circleMarker(ll, { radius: 9, color: '#fff', weight: 3, fillColor: '#f2c14e', fillOpacity: 1 })
          .addTo(map).bindPopup('You are here').openPopup();
        btn.disabled = false; btn.textContent = '📍 Near me';
      },
      () => { btn.disabled = false; btn.textContent = '📍 Near me'; },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <div className="map-finder reveal" id="map-finder">
      <div className="map-finder-head">
        <h3>Explore the map</h3>
        <p>Filter the spots that matter on the road. Tap a marker or a card for details.</p>
      </div>
      <div className="map-toolbar">
        <div className="filter-chips" role="group" aria-label="Filter places by type">
          <button className={'chip-filter' + (activeType === 'all' ? ' active' : '')} aria-pressed={activeType === 'all'} onClick={() => setActiveType('all')}>All</button>
          {typeKeys.map((k) => {
            const t = placeTypes[k];
            return (
              <button key={k} className={'chip-filter' + (activeType === k ? ' active' : '')} aria-pressed={activeType === k} onClick={() => setActiveType(k)}>
                <span className="chip-dot" style={{ background: t.color }} />{t.icon} {t.label}
              </button>
            );
          })}
        </div>
        <div className="map-controls">
          <label className="sr-only" htmlFor="state-filter">Filter by state or territory</label>
          <select id="state-filter" className="state-select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="all">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={nearMe}>📍 Near me</button>
        </div>
      </div>
      <div className="map-layout">
        <div id="map" className="map" ref={mapDivRef} aria-label="Interactive map of adventure locations" />
        <div className="place-list" aria-label="Locations list">
          {filtered.map((p) => {
            const t = placeTypes[p.type] || {};
            return (
              <button key={p.id} className="place-item" onClick={() => setDetail(p)}>
                <span className="place-dot" style={{ background: t.color || '#e0743a' }} aria-hidden="true" />
                <span className="place-text">
                  <span className="place-name">
                    {p.name}
                    {p.rating_count ? <span className="place-rating">★ {Number(p.rating_avg).toFixed(1)}</span> : null}
                  </span>
                  <span className="place-meta">{t.icon ? t.icon + ' ' : ''}{t.label || p.type} · {p.state}</span>
                  <span className="place-desc">{p.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="map-count" aria-live="polite">{filtered.length} location{filtered.length === 1 ? '' : 's'} shown</p>
      <p className="map-attribution">
        Community-verified listings and live conditions are growing — <a href="#community">join the list</a> for early access.
      </p>

      {detail && <PlaceDetail place={detail} onClose={() => setDetail(null)} onViewMap={viewOnMap} hasMarker={!!markersRef.current[detail.id]} />}
    </div>
  );
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function stars(n) { let s = ''; for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s; }

function PlaceDetail({ place, onClose, onViewMap, hasMarker }) {
  const auth = useAuth();
  const user = auth?.user;
  const configured = auth?.configured;
  const sb = getSupabase();
  const t = placeTypes[place.type] || {};

  const [reviews, setReviews] = useState(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [showBookmark, setShowBookmark] = useState(false);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  useEffect(() => {
    if (!configured || !sb) { setReviews([]); return; }
    let active = true;
    sb.from('reviews')
      .select('rating,body,visited_on,created_at,profiles(username,display_name)')
      .eq('place_id', place.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (active) setReviews(data || []); });
    if (user) {
      setShowBookmark(true);
      sb.from('bookmarks').select('place_id').eq('place_id', place.id)
        .then(({ data }) => { if (active) setBookmarked(!!(data && data.length)); });
    }
    return () => { active = false; };
  }, [configured, sb, place.id, user]);

  async function submitReview(e) {
    e.preventDefault();
    if (!rating) { setMsg({ err: true, text: 'Pick a star rating first.' }); return; }
    setMsg({ text: 'Posting…' });
    const { error } = await sb.from('reviews').upsert(
      { place_id: place.id, user_id: user.id, rating, body: body.trim() || null },
      { onConflict: 'place_id,user_id' }
    );
    if (error) { setMsg({ err: true, text: error.message }); return; }
    setMsg({ ok: true, text: 'Thanks — your review is posted.' });
    setBody(''); setRating(0);
    const { data } = await sb.from('reviews')
      .select('rating,body,visited_on,created_at,profiles(username,display_name)')
      .eq('place_id', place.id).order('created_at', { ascending: false });
    setReviews(data || []);
  }

  async function toggleBookmark() {
    const next = !bookmarked;
    const res = next
      ? await sb.from('bookmarks').upsert({ user_id: user.id, place_id: place.id }, { onConflict: 'user_id,place_id' })
      : await sb.from('bookmarks').delete().eq('user_id', user.id).eq('place_id', place.id);
    if (!res.error) setBookmarked(next);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="place-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <span className="place-badge">{t.icon ? t.icon + ' ' : ''}{t.label || place.type}</span>
        <h2 id="place-modal-title">{place.name}</h2>
        <p className="place-modal-meta">
          {place.state}
          {place.rating_count ? ` · ★ ${Number(place.rating_avg).toFixed(1)} (${place.rating_count})` : ''}
        </p>
        <p className="place-modal-desc">{place.desc}</p>
        <div className="place-modal-actions">
          {hasMarker && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewMap(place)}>View on map</button>}
          {showBookmark && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={toggleBookmark}>
              {bookmarked ? '★ Saved' : '☆ Save'}
            </button>
          )}
        </div>

        <div className="reviews-block">
          <h3>Reviews {reviews && reviews.length ? <span id="reviews-summary">({reviews.length})</span> : null}</h3>
          {!configured && <p className="reviews-empty">Community reviews arrive once accounts go live.</p>}
          {configured && reviews === null && <p className="reviews-empty">Loading reviews…</p>}
          {configured && reviews && reviews.length === 0 && <p className="reviews-empty">No reviews yet — be the first.</p>}
          {configured && reviews && reviews.length > 0 && (
            <div id="reviews-list">
              {reviews.map((r, i) => (
                <div className="review" key={i}>
                  <div className="review-head">
                    <span className="review-stars">{stars(r.rating)}</span>
                    <span className="review-who">{r.profiles ? (r.profiles.display_name || '@' + r.profiles.username) : 'Traveller'}</span>
                  </div>
                  {r.body && <p>{r.body}</p>}
                </div>
              ))}
            </div>
          )}
          {configured && user && (
            <form onSubmit={submitReview}>
              <div className="review-rating">
                <span className="review-rating-label">Your rating</span>
                <div className="stars" role="group" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button type="button" key={v} className={'star' + (v <= rating ? ' on' : '')} aria-label={`${v} ${v === 1 ? 'star' : 'stars'}`} onClick={() => setRating(v)}>
                      {v <= rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
              <textarea id="review-body" rows={3} maxLength={2000} placeholder="How was it? Access, facilities, tips…" value={body} onChange={(e) => setBody(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm">Post review</button>
            </form>
          )}
          {configured && !user && <p className="reviews-empty">Sign in to leave a review.</p>}
          {msg && <p className="auth-msg" style={{ color: msg.err ? '#f2c14e' : msg.ok ? '#6fbf9a' : undefined }}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}
