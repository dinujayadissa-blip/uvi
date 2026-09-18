import Link from 'next/link';

export default function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero-inner">
        <p className="eyebrow">Australia&apos;s outdoor adventure hub</p>
        <h1>Camp. Drive. Explore.<br /><span className="accent">All in one place.</span></h1>
        <p className="hero-lead">
          Camping, 4WD, caravanning, fishing and road trips — Uvi brings the whole
          Australian outdoor lifestyle together, so you can discover, plan, travel,
          explore and connect without juggling a dozen apps.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="#explore">Start exploring</Link>
          <Link className="btn btn-ghost" href="#plan">Plan a trip</Link>
        </div>
        <ul className="journey" aria-label="How Uvi works">
          <li>Discover</li><li>Plan</li><li>Travel</li><li>Explore</li><li>Share</li><li>Connect</li>
        </ul>
      </div>
    </section>
  );
}
