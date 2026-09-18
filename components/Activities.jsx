import activities from '@/data/activities.json';

export default function Activities() {
  return (
    <section className="section" id="explore">
      <div className="wrap">
        <header className="section-head reveal">
          <h2>Explore by activity</h2>
          <p>Whatever gets you outdoors, it lives here. Pick your kind of adventure.</p>
        </header>
        <div className="activity-grid">
          {activities.map((a) => (
            <article key={a.id} className={`activity-card reveal ${a.cardClass}`}>
              <span className="activity-icon" aria-hidden="true">{a.icon}</span>
              <h3>{a.name}</h3>
              <p className="activity-tagline">{a.tagline}</p>
              <p>{a.description}</p>
              <ul className="chip-row">
                {a.tags.map((t) => <li key={t} className="chip">{t}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
