#!/usr/bin/env node
/**
 * Regenerates the data-driven markup in index.html from the JSON in data/.
 * Content lives in JSON; the HTML stays static (good for SEO and no-JS
 * resilience). Run after editing any data file:
 *
 *   node build.js
 *
 * Sections are delimited in index.html by matching marker comments:
 *   <!-- BUILD:<name>:start --> ... <!-- BUILD:<name>:end -->
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const activities = read('data/activities.json');
const finder = read('data/finder.json');
const trips = read('data/trips.json');
const gear = read('data/gear.json');
const placeTypes = read('data/place-types.json');
const places = read('data/places.json');

/* ---- Activities grid ---- */
const activitiesHtml = activities.map((a) => `        <article class="activity-card reveal ${a.cardClass}">
          <span class="activity-icon" aria-hidden="true">${a.icon}</span>
          <h3>${esc(a.name)}</h3>
          <p class="activity-tagline">${esc(a.tagline)}</p>
          <p>${esc(a.description)}</p>
          <ul class="chip-row">${a.tags.map((t) => `<li class="chip">${esc(t)}</li>`).join('')}</ul>
        </article>`).join('\n\n');

/* ---- Finder grid ---- */
const finderHtml = finder.map((f) => `        <article class="finder-card reveal">
          <span class="finder-icon" aria-hidden="true">${f.icon}</span>
          <h3>${esc(f.name)}</h3>
          <p>${esc(f.desc)}</p>
        </article>`).join('\n\n');

/* ---- Trips: tabs + panels ---- */
const tripTabs = trips.map((t, i) =>
  `        <button class="trip-tab${i === 0 ? ' active' : ''}" data-target="${esc(t.id)}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}" aria-controls="${esc(t.id)}" id="tab-${esc(t.id)}">${esc(t.label)}</button>`
).join('\n');

const tripPanels = trips.map((t, i) => {
  const items = t.days.map((d) =>
    `            <li><span class="day">${esc(d.day)}</span><div><h4>${esc(d.title)}</h4><p>${esc(d.desc)}</p></div></li>`
  ).join('\n');
  return `        <div class="trip-panel${i === 0 ? ' active' : ''}" id="${esc(t.id)}" role="tabpanel" aria-labelledby="tab-${esc(t.id)}"${i === 0 ? '' : ' hidden'}>
          <p class="trip-meta">${esc(t.meta)}</p>
          <ol class="timeline">
${items}
          </ol>
        </div>`;
}).join('\n\n');

const tripsHtml = `      <div class="trip-tabs reveal" role="tablist" aria-label="Iconic Australian trips">
${tripTabs}
      </div>

      <div class="trip-panels">

${tripPanels}

      </div>`;

/* ---- Gear grid ---- */
const gearHtml = gear.map((g) => `        <article class="gear-card reveal">
          <span class="gear-icon" aria-hidden="true">${g.icon}</span>
          <h3>${esc(g.name)}</h3>
          <ul>${g.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
        </article>`).join('\n\n');

/* ---- Map finder: filter chips, state options, place list ---- */
const typeInPlaces = Object.keys(placeTypes).filter((k) => places.some((p) => p.type === k));

const filterChipsHtml = ['        <button class="chip-filter active" data-filter="all" aria-pressed="true">All</button>']
  .concat(typeInPlaces.map((k) => {
    const t = placeTypes[k];
    return `        <button class="chip-filter" data-filter="${esc(k)}" aria-pressed="false"><span class="chip-dot" style="background:${esc(t.color)}"></span>${t.icon} ${esc(t.label)}</button>`;
  })).join('\n');

const states = Array.from(new Set(places.map((p) => p.state))).sort();
const stateOptionsHtml = states.map((s) => `                <option value="${esc(s)}">${esc(s)}</option>`).join('\n');

const placeListHtml = places.map((p) => {
  const t = placeTypes[p.type] || { label: p.type, icon: '📍', color: '#e0743a' };
  return `        <button class="place-item" data-id="${esc(p.id)}" data-type="${esc(p.type)}" data-state="${esc(p.state)}">
          <span class="place-dot" style="background:${esc(t.color)}" aria-hidden="true"></span>
          <span class="place-text">
            <span class="place-name">${esc(p.name)}</span>
            <span class="place-meta">${t.icon} ${esc(t.label)} · ${esc(p.state)}</span>
            <span class="place-desc">${esc(p.desc)}</span>
          </span>
        </button>`;
}).join('\n\n');

/* ---- Inject ---- */
const between = (name, body) => {
  const re = new RegExp(`(<!-- BUILD:${name}:start -->)[\\s\\S]*?(<!-- BUILD:${name}:end -->)`);
  return (src) => {
    if (!re.test(src)) throw new Error(`Marker BUILD:${name} not found in index.html`);
    return src.replace(re, `$1\n\n${body}\n\n$2`);
  };
};

const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = between('activities', activitiesHtml)(html);
html = between('finder', finderHtml)(html);
html = between('trips', tripsHtml)(html);
html = between('gear', gearHtml)(html);
html = between('placefilters', filterChipsHtml)(html);
html = between('placestates', stateOptionsHtml)(html);
html = between('placelist', placeListHtml)(html);
fs.writeFileSync(indexPath, html);

console.log(`Built index.html: ${activities.length} activities, ${finder.length} finder cards, ${trips.length} trips, ${gear.length} gear categories, ${places.length} map places (${typeInPlaces.length} types, ${states.length} states).`);
