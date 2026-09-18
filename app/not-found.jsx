import Link from 'next/link';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="wrap nf-wrap">
      <div className="nf-emoji" aria-hidden="true">🧭</div>
      <p className="nf-code">Error 404</p>
      <h1>Looks like you&apos;ve wandered off the track</h1>
      <p>This page isn&apos;t on the map — but there&apos;s a whole continent of adventure waiting back at base camp.</p>
      <Link href="/" className="btn btn-primary">Back to the homepage</Link>
    </div>
  );
}
