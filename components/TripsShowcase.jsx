'use client';
import { useState } from 'react';
import trips from '@/data/trips.json';

export default function TripsShowcase() {
  const [active, setActive] = useState(trips[0]?.id);

  function onKey(e, i) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' ? (i + 1) % trips.length : (i - 1 + trips.length) % trips.length;
    setActive(trips[next].id);
    document.getElementById(`tab-${trips[next].id}`)?.focus();
  }

  return (
    <section className="section section-alt" id="trips">
      <div className="wrap">
        <header className="section-head reveal">
          <h2>Iconic Australian trips</h2>
          <p>Big-ticket routes to inspire your next escape — tap a trip for the stages.</p>
        </header>
        <div className="trip-tabs reveal" role="tablist" aria-label="Iconic Australian trips">
          {trips.map((t, i) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={'trip-tab' + (active === t.id ? ' active' : '')}
              role="tab"
              aria-selected={active === t.id}
              aria-controls={t.id}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="trip-panels">
          {trips.map((t) => (
            <div
              key={t.id}
              className={'trip-panel' + (active === t.id ? ' active' : '')}
              id={t.id}
              role="tabpanel"
              aria-labelledby={`tab-${t.id}`}
              hidden={active !== t.id}
            >
              <p className="trip-meta">{t.meta}</p>
              <ol className="timeline">
                {t.days.map((d, i) => (
                  <li key={i}>
                    <span className="day">{d.day}</span>
                    <div><h4>{d.title}</h4><p>{d.desc}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
