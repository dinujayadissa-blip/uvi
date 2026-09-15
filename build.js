#!/usr/bin/env node
/**
 * Regenerates the destinations and itineraries markup in index.html from the
 * JSON in data/. Content lives in JSON; the HTML stays static (good for SEO
 * and no-JS resilience). Run after editing the data files:
 *
 *   node build.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const destinations = JSON.parse(fs.readFileSync(path.join(root, 'data/destinations.json'), 'utf8'));
const itineraries = JSON.parse(fs.readFileSync(path.join(root, 'data/itineraries.json'), 'utf8'));

const destHtml = destinations.map((d) => `        <article class="dest-card reveal ${d.cardClass}">
          <div class="dest-media"><span class="dest-icon">${d.icon}</span></div>
          <div class="dest-body">
            <span class="dest-tag">${esc(d.region)}</span>
            <h3>${esc(d.name)}</h3>
            <p>${esc(d.description)}</p>
          </div>
        </article>`).join('\n\n');

const tabsHtml = itineraries.map((it, i) =>
  `        <button class="itin-tab${i === 0 ? ' active' : ''}" data-target="${it.id}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}">${esc(it.label)}</button>`
).join('\n');

const panelsHtml = itineraries.map((it, i) => {
  const items = it.days.map((d) =>
    `            <li><span class="day">${d.day}</span><div><h4>${esc(d.title)}</h4><p>${esc(d.desc)}</p></div></li>`
  ).join('\n');
  return `        <div class="itin-panel${i === 0 ? ' active' : ''}" id="${it.id}">
          <ol class="timeline">
${items}
          </ol>
        </div>`;
}).join('\n\n');

const itinHtml = `      <div class="itin-tabs reveal" role="tablist">
${tabsHtml}
      </div>

      <div class="itin-panels">

${panelsHtml}

      </div>`;

const between = (name, body) => {
  const re = new RegExp(`(<!-- BUILD:${name}:start -->)[\\s\\S]*?(<!-- BUILD:${name}:end -->)`);
  return (src) => {
    if (!re.test(src)) throw new Error(`Marker BUILD:${name} not found in index.html`);
    return src.replace(re, `$1\n\n${body}\n\n$2`);
  };
};

const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = between('destinations', destHtml)(html);
html = between('itineraries', itinHtml)(html);
fs.writeFileSync(indexPath, html);

console.log(`Built index.html from ${destinations.length} destinations and ${itineraries.length} itineraries.`);
