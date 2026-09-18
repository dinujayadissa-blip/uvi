'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function Header() {
  const { configured, user, profile, openAuth, openProfileEdit, signOut } = useAuth() || {};
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = (profile?.display_name || 'U').charAt(0).toUpperCase();

  return (
    <header className="site-header" id="top">
      <div className="wrap header-inner">
        <Link className="brand" href="/#top" aria-label="Uvi home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/images/icon.svg" alt="" width="28" height="28" />
          <span className="brand-name">Uvi</span>
        </Link>
        <div className="header-right">
          <nav className="nav" aria-label="Primary">
            <button
              className="nav-toggle"
              aria-expanded={navOpen}
              aria-controls="nav-menu"
              aria-label="Open menu"
              onClick={() => setNavOpen((v) => !v)}
            >
              <span></span><span></span><span></span>
            </button>
            <ul className={'nav-menu' + (navOpen ? ' open' : '')} id="nav-menu" onClick={() => setNavOpen(false)}>
              <li><Link href="/#explore">Explore</Link></li>
              <li><Link href="/#finder">Find</Link></li>
              <li><Link href="/#plan">Plan</Link></li>
              <li><Link href="/trips">Trips</Link></li>
              <li><Link href="/#gear">Gear</Link></li>
              <li><Link href="/#community" className="nav-cta">Join</Link></li>
            </ul>
          </nav>

          {configured && (
            <div className="account">
              {!user && (
                <button className="btn btn-ghost btn-sm" onClick={() => openAuth('signin')}>Sign in</button>
              )}
              {user && (
                <div className="account-menu">
                  <button className="account-trigger" aria-haspopup="true" aria-label="Account menu" onClick={() => setMenuOpen((v) => !v)}>
                    <span className="avatar">{initial}</span>
                  </button>
                  {menuOpen && (
                    <div className="account-dropdown" role="menu">
                      <p className="account-name">
                        {profile ? `${profile.display_name} · @${profile.username}` : 'Finish your profile'}
                      </p>
                      <Link className="account-action" href="/trips/new" role="menuitem" onClick={() => setMenuOpen(false)}>Share a trip</Link>
                      {profile && (
                        <Link className="account-action" href={`/u/${profile.username}`} role="menuitem" onClick={() => setMenuOpen(false)}>My profile</Link>
                      )}
                      <button className="account-action" role="menuitem" onClick={() => { setMenuOpen(false); openProfileEdit(); }}>Edit profile</button>
                      <button className="account-action" role="menuitem" onClick={() => { setMenuOpen(false); signOut(); }}>Sign out</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
