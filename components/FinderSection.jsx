import finder from '@/data/finder.json';
import MapFinder from '@/components/MapFinder';

export default function FinderSection() {
  return (
    <section className="section section-alt" id="finder">
      <div className="wrap">
        <header className="section-head reveal">
          <h2>Find anything on the road</h2>
          <p>The essentials every traveller searches for — mapped and reviewed by the community.</p>
        </header>
        <div className="finder-grid">
          {finder.map((f) => (
            <article key={f.name} className="finder-card reveal">
              <span className="finder-icon" aria-hidden="true">{f.icon}</span>
              <h3>{f.name}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
        <MapFinder />
      </div>
    </section>
  );
}
