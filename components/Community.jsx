'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

const TAGS = ['🗺️ Trip routes', '📍 Hidden spots', '📸 Photos', '⭐ Reviews', '⚠️ Track warnings', '🚙 Vehicle builds', '🍳 Camp recipes', '🎣 Catches'];

export default function Community() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setMsg({ err: true, text: 'Please enter a valid email address.' });
      return;
    }
    const success = "You're on the list — we'll be in touch as Uvi launches.";
    const sb = getSupabase();
    if (sb) {
      setMsg({ text: 'Adding you…' });
      const { error } = await sb.from('email_subscribers').insert({ email: value, source: 'notify_me' });
      if (error && error.code !== '23505') { setMsg({ err: true, text: 'Something went wrong — please try again.' }); return; }
      setMsg({ text: success });
      setEmail('');
    } else {
      setMsg({ text: success });
      setEmail('');
    }
  }

  return (
    <section className="section section-cta" id="community">
      <div className="wrap community-inner reveal">
        <h2>Join the community</h2>
        <p>
          Share trip routes, photos and reviews, swap track warnings and road updates,
          and organise group trips with travellers who get it. We&apos;re building the
          social side of Uvi now — be first in.
        </p>
        <form className="signup" onSubmit={submit} noValidate>
          <label className="sr-only" htmlFor="signup-email">Email address</label>
          <input type="email" id="signup-email" placeholder="you@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn btn-primary">Notify me</button>
        </form>
        <p className="signup-msg" style={{ color: msg?.err ? '#f2c14e' : undefined }}>{msg?.text || ''}</p>
        <ul className="community-tags" aria-label="What the community shares">
          {TAGS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </section>
  );
}
