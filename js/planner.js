/* ============================================================
   Trip Planner — client-side itinerary generator
   ------------------------------------------------------------
   No backend. Reads the inline dataset from the <script
   id="plannerData"> block, scores destinations against the
   traveller's choices, allocates days into a day-by-day route,
   and estimates a budget. Everything runs in the browser.
   ============================================================ */
(function () {
  'use strict';

  const dataEl = document.getElementById('plannerData');
  const form = document.getElementById('plannerForm');
  if (!dataEl || !form) return; // planner not on this page

  let SPOTS = [];
  try {
    SPOTS = JSON.parse(dataEl.textContent);
  } catch (err) {
    return; // malformed data — leave the static content in place
  }

  /* ---- Reference tables ---- */
  const SEASONS = {
    any:    { label: 'flexible dates', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    summer: { label: 'summer (Dec–Feb)', months: [12, 1, 2] },
    autumn: { label: 'autumn (Mar–May)', months: [3, 4, 5] },
    winter: { label: 'winter (Jun–Aug)', months: [6, 7, 8] },
    spring: { label: 'spring (Sep–Nov)', months: [9, 10, 11] }
  };
  const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const STYLE = {
    budget:  { label: 'Budget',    mult: 0.55 },
    mid:     { label: 'Mid-range', mult: 1.0 },
    luxury:  { label: 'Luxury',    mult: 2.1 }
  };
  const LENGTH_DAYS = { '1 week': 7, '2 weeks': 14, '3+ weeks': 21 };

  /* ---- Helpers ---- */
  const fmtMoney = (n) =>
    '$' + Math.round(n / 10) * 10 + ' AUD';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  function selectedInterests() {
    return Array.from(form.querySelectorAll('input[name="interest"]:checked'))
      .map((el) => el.value);
  }

  // How well a spot fits the chosen season (0 = off-season, 1 = in-season).
  function seasonFit(spot, seasonMonths) {
    const hits = spot.months.filter((m) => seasonMonths.includes(m)).length;
    if (!spot.months.length) return 0.5;
    return hits / spot.months.length;
  }

  function scoreSpot(spot, interests, region, seasonMonths) {
    let score = 0;
    const matched = spot.interests.filter((i) => interests.includes(i));
    score += matched.length * 3;
    if (interests.length === 0) score += 1; // no filter → keep everything in play
    if (region && region !== 'any') {
      if (spot.region === region) score += 4;
      else score -= 3;
    }
    score += seasonFit(spot, seasonMonths) * 3;
    return { score, matched };
  }

  // Distribute `total` days across the chosen stops, honouring each
  // stop's typical stay and giving extra nights to the best-ranked spots.
  function allocateDays(stops, total) {
    const alloc = stops.map((s) => Math.max(1, s.stay || 2));
    let sum = alloc.reduce((a, b) => a + b, 0);

    // Trim from the lowest-ranked stops if we've over-committed.
    let i = alloc.length - 1;
    while (sum > total && alloc.length) {
      if (alloc[i] > 1) { alloc[i]--; sum--; }
      i = i > 0 ? i - 1 : alloc.length - 1;
      if (alloc.every((d) => d === 1) && sum > total) break;
    }
    // Add spare nights to the best-ranked stops.
    let j = 0;
    while (sum < total) { alloc[j % alloc.length]++; sum++; j++; }
    return alloc;
  }

  function buildTimeline(stops, alloc) {
    const items = [];
    let cursor = 1;
    stops.forEach((s, idx) => {
      const days = alloc[idx];
      const end = cursor + days - 1;
      const range = days === 1 ? `Day ${cursor}` : `Day ${cursor}–${end}`;
      items.push({ range, spot: s, nights: days });
      cursor = end + 1;
    });
    return items;
  }

  function commonMonths(stops) {
    // Months that suit the *most* stops on the route.
    const tally = {};
    stops.forEach((s) => s.months.forEach((m) => { tally[m] = (tally[m] || 0) + 1; }));
    const max = Math.max(0, ...Object.values(tally));
    return Object.keys(tally)
      .filter((m) => tally[m] === max)
      .map(Number)
      .sort((a, b) => a - b);
  }

  function monthsPhrase(months) {
    if (!months.length) return 'any time of year';
    const names = months.map((m) => MONTH_NAMES[m]);
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  }

  /* ---- Main generator ---- */
  function generate() {
    const interests = selectedInterests();
    const region = $('#planRegion', form).value;
    const length = $('#planLength', form).value;
    const seasonKey = $('#planSeason', form).value;
    const styleKey = $('#planBudget', form).value;
    const travellers = Math.max(1, parseInt($('#planTravellers', form).value, 10) || 1);

    const season = SEASONS[seasonKey] || SEASONS.any;
    const style = STYLE[styleKey] || STYLE.mid;
    const totalDays = LENGTH_DAYS[length] || 14;

    // Score & rank.
    const ranked = SPOTS
      .map((spot) => {
        const { score, matched } = scoreSpot(spot, interests, region, season.months);
        return Object.assign({}, spot, { _score: score, _matched: matched });
      })
      .filter((s) => s._score > -2)
      .sort((a, b) => b._score - a._score);

    // How many stops make sense for the length (roughly one every ~3.5 days).
    const targetStops = Math.min(
      ranked.length,
      Math.max(2, Math.round(totalDays / 3.5))
    );
    const stops = ranked.slice(0, targetStops);

    if (!stops.length) {
      renderEmpty();
      return;
    }

    const alloc = allocateDays(stops, totalDays);
    const timeline = buildTimeline(stops, alloc);

    // Budget.
    let landCost = 0;
    timeline.forEach((t) => {
      landCost += t.nights * t.spot.perDay * style.mult;
    });
    const internal = Math.max(0, stops.length - 1) * 190; // domestic hops
    const perPerson = landCost + internal;
    const totalCost = perPerson * travellers;

    // Timing advice.
    const best = commonMonths(stops);

    render({
      interests, region, length, season, style, travellers,
      totalDays, timeline, perPerson, totalCost, internal, best
    });
  }

  /* ---- Rendering ---- */
  const resultEl = document.getElementById('planResult');

  function renderEmpty() {
    resultEl.hidden = false;
    resultEl.innerHTML =
      '<p class="plan-empty">No matching regions — try widening your interests or region.</p>';
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function render(r) {
    const interestLabel = r.interests.length
      ? r.interests.map(titleCase).join(', ')
      : 'a bit of everything';

    const stopsHtml = r.timeline.map((t) => {
      const s = t.spot;
      const tags = s.interests.slice(0, 3)
        .map((i) => `<span class="plan-chip-sm">${titleCase(i)}</span>`).join('');
      const highs = (s.highlights || []).slice(0, 3)
        .map((h) => `<li>${escapeHtml(h)}</li>`).join('');
      return `
        <li class="plan-stop">
          <span class="plan-stop-day">${t.range}</span>
          <div class="plan-stop-body">
            <div class="plan-stop-head">
              <span class="plan-stop-icon" aria-hidden="true">${s.icon}</span>
              <div>
                <h4>${escapeHtml(s.name)}</h4>
                <span class="plan-stop-region">${escapeHtml(s.region)} · ${t.nights} night${t.nights > 1 ? 's' : ''}</span>
              </div>
            </div>
            <p>${escapeHtml(s.blurb)}</p>
            ${highs ? `<ul class="plan-highlights">${highs}</ul>` : ''}
            <div class="plan-chip-row">${tags}</div>
          </div>
        </li>`;
    }).join('');

    const seasonNote = r.season === SEASONS.any || (r.season && r.season.label === 'flexible dates')
      ? `For this route, the sweet spot is around <strong>${monthsPhrase(r.best)}</strong>, when the weather suits the most stops.`
      : `You picked <strong>${r.season.label}</strong>. Across this route the strongest weather window is <strong>${monthsPhrase(r.best)}</strong> — a close match.`;

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="plan-result-head">
        <span class="eyebrow">Your draft plan</span>
        <h3>${r.totalDays} days · ${r.timeline.length} stops · ${escapeHtml(interestLabel)}</h3>
        <p class="plan-result-sub">A suggested route for ${r.travellers} traveller${r.travellers > 1 ? 's' : ''}, ${r.style.label.toLowerCase()} style. Everything here is a starting point — drag the days around to suit you.</p>
      </div>

      <ol class="plan-timeline">${stopsHtml}</ol>

      <div class="plan-summary">
        <div class="plan-summary-card">
          <span class="plan-summary-icon" aria-hidden="true">🗓️</span>
          <h4>When to go</h4>
          <p>${seasonNote}</p>
        </div>
        <div class="plan-summary-card plan-budget">
          <span class="plan-summary-icon" aria-hidden="true">💰</span>
          <h4>Rough budget</h4>
          <p class="plan-budget-total">${fmtMoney(r.totalCost)}</p>
          <p class="plan-budget-note">
            ≈ ${fmtMoney(r.perPerson)} per person · ${r.style.label.toLowerCase()} ·
            includes ~${fmtMoney(r.internal)} of internal flights. On-the-ground costs
            only — international airfares not included.
          </p>
        </div>
      </div>

      <div class="plan-actions">
        <button type="button" class="btn btn-primary" id="planToContact">Get this itinerary emailed to me</button>
        <button type="button" class="btn btn-ghost" id="planReset">Start over</button>
      </div>
      <p class="plan-disclaimer">Demo tool — estimates are ballpark figures to help you plan, not quotes. Always check current conditions, opening times and travel advice before you book.</p>
    `;

    // Wire result buttons.
    const toContact = document.getElementById('planToContact');
    if (toContact) {
      toContact.addEventListener('click', () => {
        const msg = document.getElementById('cfMessage');
        if (msg) {
          msg.value =
            `${r.totalDays}-day trip for ${r.travellers} (${r.style.label} style): ` +
            r.timeline.map((t) => t.spot.name).join(' → ') + '.';
        }
        const contact = document.getElementById('contact');
        if (contact) contact.scrollIntoView({ behavior: 'smooth' });
        if (msg) setTimeout(() => msg.focus(), 500);
      });
    }
    const reset = document.getElementById('planReset');
    if (reset) {
      reset.addEventListener('click', () => {
        resultEl.hidden = true;
        resultEl.innerHTML = '';
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function titleCase(s) {
    return String(s).replace(/(^|[-\s])\w/g, (c) => c.toUpperCase()).replace(/-/g, ' ');
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---- Events ---- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generate();
  });

  // Let the hero search jump here and pre-seed the length + season.
  window.__seedPlanner = function (opts) {
    if (opts && opts.length) {
      const sel = $('#planLength', form);
      if (sel) sel.value = opts.length;
    }
  };
})();
