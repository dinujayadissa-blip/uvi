import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/images/icon.svg" alt="" width="28" height="28" />
          <span className="brand-name">Uvi</span>
          <p>Australia&apos;s outdoor adventure hub.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/#explore">Explore</Link>
          <Link href="/#finder">Find</Link>
          <Link href="/#plan">Plan</Link>
          <Link href="/trips">Trips</Link>
          <Link href="/#gear">Gear</Link>
          <Link href="/#community">Join</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
      <div className="wrap footer-legal">
        <p>&copy; {year} Uvi. Made for Australian adventurers. Always travel safely and respect the land.</p>
      </div>
    </footer>
  );
}
