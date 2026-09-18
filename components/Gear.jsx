import gear from '@/data/gear.json';

export default function Gear() {
  return (
    <section className="section" id="gear">
      <div className="wrap">
        <header className="section-head reveal">
          <h2>Gear guide</h2>
          <p>The kit that makes the lifestyle work — from off-grid power to recovery.</p>
        </header>
        <div className="gear-grid">
          {gear.map((g) => (
            <article key={g.id} className="gear-card reveal">
              <span className="gear-icon" aria-hidden="true">{g.icon}</span>
              <h3>{g.name}</h3>
              <ul>{g.items.map((it) => <li key={it}>{it}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
