'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

export default function AuthProvider({ children }) {
  const sb = getSupabase();
  const configured = !!sb;

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [profileOpen, setProfileOpen] = useState(false);

  const loadProfile = useCallback(
    async (uid) => {
      if (!sb || !uid) return null;
      const { data } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
      return data;
    },
    [sb]
  );

  useEffect(() => {
    if (!sb) return;
    let active = true;
    sb.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user || null;
      if (!active) return;
      setUser(u);
      if (u) {
        const p = await loadProfile(u.id);
        if (!active) return;
        setProfile(p);
        if (!p) setProfileOpen(true);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        const p = await loadProfile(u.id);
        setProfile(p);
        if (!p) setProfileOpen(true);
      } else {
        setProfile(null);
      }
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [sb, loadProfile]);

  const openAuth = useCallback((mode = 'signin') => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);
  const openProfileEdit = useCallback(() => setProfileOpen(true), []);
  const signOut = useCallback(() => sb && sb.auth.signOut(), [sb]);

  const value = { configured, user, profile, openAuth, openProfileEdit, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {configured && authOpen && (
        <AuthModal
          sb={sb}
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
      {configured && profileOpen && (
        <ProfileModal
          sb={sb}
          profile={profile}
          onSaved={(p) => { setProfile(p); setProfileOpen(false); }}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

/* ---------------- Auth modal ---------------- */
function AuthModal({ sb, mode, setMode, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!email || password.length < 8) {
      setMsg({ kind: 'error', text: 'Enter an email and a password of at least 8 characters.' });
      return;
    }
    setBusy(true);
    setMsg({ kind: '', text: mode === 'signup' ? 'Creating your account…' : 'Signing you in…' });
    const res =
      mode === 'signup'
        ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: origin } })
        : await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) { setMsg({ kind: 'error', text: res.error.message }); return; }
    if (mode === 'signup' && res.data.user && !res.data.session) {
      setMsg({ kind: 'ok', text: 'Check your email to confirm your account, then sign in.' });
    } else {
      onClose();
    }
  }

  async function google() {
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin } });
  }
  async function forgot() {
    if (!email) { setMsg({ kind: 'error', text: 'Enter your email above first, then tap reset.' }); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: origin });
    setMsg(error ? { kind: 'error', text: error.message } : { kind: 'ok', text: 'Password reset link sent — check your email.' });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <h2 id="auth-title">{mode === 'signup' ? 'Create your Uvi account' : 'Welcome back'}</h2>
        <div className="auth-tabs" role="tablist">
          <button className={'auth-tab' + (mode === 'signin' ? ' active' : '')} onClick={() => setMode('signin')} role="tab" aria-selected={mode === 'signin'}>Sign in</button>
          <button className={'auth-tab' + (mode === 'signup' ? ' active' : '')} onClick={() => setMode('signup')} role="tab" aria-selected={mode === 'signup'}>Create account</button>
        </div>
        <button type="button" className="btn btn-google" onClick={google}><span aria-hidden="true">G</span> Continue with Google</button>
        <div className="auth-divider"><span>or with email</span></div>
        <form onSubmit={submit} noValidate>
          <label>Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>Password
            <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <button type="button" className="btn-link" onClick={forgot}>Forgot password?</button>
        {msg && <p className="auth-msg" style={{ color: msg.kind === 'error' ? '#f2c14e' : msg.kind === 'ok' ? '#6fbf9a' : undefined }}>{msg.text}</p>}
      </div>
    </div>
  );
}

/* ---------------- Profile / onboarding modal ---------------- */
function ProfileModal({ sb, profile, onSaved, onClose }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [display, setDisplay] = useState(profile?.display_name || '');
  const [homeState, setHomeState] = useState(profile?.home_state || '');
  const [rig, setRig] = useState(profile?.rig || '');
  const [msg, setMsg] = useState(null);
  const isEdit = !!profile;

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    const { data: u } = await sb.auth.getUser();
    const user = u?.user;
    if (!user) { setMsg({ kind: 'error', text: 'Please sign in again.' }); return; }
    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      setMsg({ kind: 'error', text: 'Username: 3–20 lowercase letters, numbers or underscores.' });
      return;
    }
    if (!display.trim()) { setMsg({ kind: 'error', text: 'Please enter a display name.' }); return; }
    const row = { id: user.id, username: uname, display_name: display.trim(), home_state: homeState || null, rig: rig.trim() || null };
    setMsg({ kind: '', text: 'Saving…' });
    const { error } = await sb.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) {
      setMsg({ kind: 'error', text: error.code === '23505' ? 'That username is taken — try another.' : error.message });
      return;
    }
    onSaved(row);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <h2 id="profile-title">{isEdit ? 'Edit your profile' : 'Set up your profile'}</h2>
        <form onSubmit={submit} noValidate>
          <label>Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} pattern="[a-z0-9_]{3,20}" required placeholder="e.g. redcentre_rig" />
          </label>
          <label>Display name
            <input value={display} onChange={(e) => setDisplay(e.target.value)} required placeholder="e.g. Jo from the Kimberley" />
          </label>
          <label>Home state
            <select value={homeState} onChange={(e) => setHomeState(e.target.value)}>
              <option value="">Prefer not to say</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Your rig (optional)
            <input value={rig} onChange={(e) => setRig(e.target.value)} placeholder="e.g. 79 Series + off-road van" />
          </label>
          <button type="submit" className="btn btn-primary">Save profile</button>
        </form>
        {msg && <p className="auth-msg" style={{ color: msg.kind === 'error' ? '#f2c14e' : msg.kind === 'ok' ? '#6fbf9a' : undefined }}>{msg.text}</p>}
      </div>
    </div>
  );
}
