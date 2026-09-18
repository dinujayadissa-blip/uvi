'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/media';

const MAX_DIM = 2000;

/**
 * Resizes + re-encodes an image to JPEG on a canvas (which also strips EXIF,
 * including GPS), uploads it to the 'photos' bucket, records a media row, and
 * calls onUploaded({ id, storage_path }).
 */
export default function PhotoUpload({ onUploaded, label = 'Add a photo' }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState(null);
  const sb = getSupabase();

  async function processFile(file) {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return { blob, width, height };
  }

  async function onChange(e) {
    const file = e.target.files?.[0];
    if (!file || !sb) return;
    setErr(null); setBusy(true);
    try {
      const { data: u } = await sb.auth.getUser();
      const user = u?.user;
      if (!user) { setErr('Please sign in.'); setBusy(false); return; }
      const { blob, width, height } = await processFile(file);
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const up = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      const { data: row, error } = await sb.from('media')
        .insert({ owner_id: user.id, storage_path: path, width, height })
        .select('id,storage_path').single();
      if (error) throw error;
      setPreview(mediaUrl(row.storage_path));
      onUploaded && onUploaded(row);
    } catch (e2) {
      setErr(e2.message || 'Upload failed.');
    }
    setBusy(false);
  }

  return (
    <div className="photo-upload">
      <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
        {busy ? 'Uploading…' : label}
        <input type="file" accept="image/*" hidden onChange={onChange} disabled={busy} />
      </label>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" style={{ marginTop: '0.6rem', borderRadius: 10, maxHeight: 160 }} />
      )}
      {err && <p className="auth-msg" style={{ color: '#f2c14e' }}>{err}</p>}
    </div>
  );
}
