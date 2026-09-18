'use client';
import { useEffect, useState } from 'react';

const CHECKLIST = [
  'Recovery boards & straps', 'Air compressor & gauge', 'First aid kit',
  'Drinking water (min. 4 L/person/day)', 'UHF radio', 'Offline maps / GPS',
  'Fuel — full + jerry cans', 'Fridge / esky & food', 'Tent or swag & bedding',
  'Head torch & spare batteries', 'Fire kit (check bans first)', 'Rubbish bags — pack it out'
];
const STORE_KEY = 'uvi.checklist.v1';

export default function PlanTools() {
  // Fuel calculator
  const [dist, setDist] = useState('');
  const [econ, setEcon] = useState('');
  const [price, setPrice] = useState('');
  const [ret, setRet] = useState(false);

  const d = parseFloat(dist), e = parseFloat(econ), p = parseFloat(price);
  const valid = d > 0 && e > 0 && p > 0;
  const distance = valid ? (ret ? d * 2 : d) : 0;
  const litres = valid ? (distance * e) / 100 : 0;
  const cost = litres * p;
  const money = (n) => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Checklist (localStorage)
  const [checked, setChecked] = useState({});
  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch { /* ignore */ }
  }, []);
  function toggle(item) {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }
  function reset() {
    setChecked({});
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  }
  const done = CHECKLIST.filter((i) => checked[i]).length;

  return (
    <section className="section" id="plan">
      <div className="wrap">
        <header className="section-head reveal">
          <h2>Plan your trip</h2>
          <p>Free tools that work right here in your browser — no sign-up, nothing to install.</p>
        </header>
        <div className="plan-grid">
          <div className="tool-card reveal">
            <h3>⛽ Fuel cost calculator</h3>
            <p className="tool-sub">Estimate what the drive will cost in fuel.</p>
            <div className="tool-form">
              <label>Distance (km)
                <input type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 1200" value={dist} onChange={(ev) => setDist(ev.target.value)} />
              </label>
              <label>Fuel use (L/100km)
                <input type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 12.5" value={econ} onChange={(ev) => setEcon(ev.target.value)} />
              </label>
              <label>Fuel price ($/L)
                <input type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 2.05" value={price} onChange={(ev) => setPrice(ev.target.value)} />
              </label>
              <label className="tool-check">
                <input type="checkbox" checked={ret} onChange={(ev) => setRet(ev.target.checked)} />
                Return trip (double distance)
              </label>
            </div>
            <div className="tool-result" aria-live="polite">
              <span className="result-label">Estimated fuel cost</span>
              <strong className="result-value">{money(cost)}</strong>
              <span className="result-detail">
                {valid
                  ? `${Math.round(distance).toLocaleString('en-AU')} km · ${litres.toLocaleString('en-AU', { maximumFractionDigits: 1 })} L of fuel`
                  : 'Enter your trip details above.'}
              </span>
            </div>
          </div>

          <div className="tool-card reveal">
            <h3>✅ Trip packing checklist</h3>
            <p className="tool-sub">Tick as you pack — it saves in your browser.</p>
            <div className="checklist" role="group" aria-label="Packing checklist">
              {CHECKLIST.map((item, i) => (
                <label className="check-item" key={i}>
                  <input type="checkbox" checked={!!checked[item]} onChange={() => toggle(item)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <div className="checklist-foot">
              <span aria-live="polite">{done} of {CHECKLIST.length} packed</span>
              <button type="button" className="btn-link" onClick={reset}>Reset</button>
            </div>
          </div>

          <div className="tool-card reveal">
            <h3>🧭 Check before you go</h3>
            <p className="tool-sub">Official sources for a safe, legal trip.</p>
            <ul className="check-list">
              <li><span aria-hidden="true">🌦️</span> Weather &amp; warnings — <a href="https://www.bom.gov.au/" target="_blank" rel="noopener">Bureau of Meteorology</a></li>
              <li><span aria-hidden="true">🔥</span> Fire bans &amp; restrictions — check your state fire service</li>
              <li><span aria-hidden="true">🚧</span> Road &amp; track closures — check your state roads authority</li>
              <li><span aria-hidden="true">🌳</span> National park alerts &amp; bookings — state park websites</li>
              <li><span aria-hidden="true">📋</span> Permits for remote crossings (e.g. desert parks)</li>
            </ul>
            <p className="tool-note">Always confirm conditions with the relevant local authority before you travel.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
