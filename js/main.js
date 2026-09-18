/* ==========================================================================
   Uvi — interactions
   ========================================================================== */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---- Current year ---- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Trip tabs ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.trip-tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.trip-panel'));
  function activateTab(tab) {
    var targetId = tab.getAttribute('data-target');
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panels.forEach(function (p) {
      var on = p.id === targetId;
      p.classList.toggle('active', on);
      if (on) { p.removeAttribute('hidden'); } else { p.setAttribute('hidden', ''); }
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { activateTab(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      activateTab(tabs[next]);
    });
  });

  /* ---- Fuel cost calculator ---- */
  var fuelForm = document.getElementById('fuel-form');
  if (fuelForm) {
    var distEl = document.getElementById('fuel-distance');
    var econEl = document.getElementById('fuel-economy');
    var priceEl = document.getElementById('fuel-price');
    var returnEl = document.getElementById('fuel-return');
    var costEl = document.getElementById('fuel-cost');
    var detailEl = document.getElementById('fuel-detail');

    var money = function (n) {
      return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    function calcFuel() {
      var dist = parseFloat(distEl.value);
      var econ = parseFloat(econEl.value);
      var price = parseFloat(priceEl.value);
      if (!(dist > 0) || !(econ > 0) || !(price > 0)) {
        costEl.textContent = '$0.00';
        detailEl.textContent = 'Enter your trip details above.';
        return;
      }
      if (returnEl.checked) dist *= 2;
      var litres = (dist * econ) / 100;
      var cost = litres * price;
      costEl.textContent = money(cost);
      detailEl.textContent = Math.round(dist).toLocaleString('en-AU') + ' km · ' +
        litres.toLocaleString('en-AU', { maximumFractionDigits: 1 }) + ' L of fuel';
    }
    fuelForm.addEventListener('input', calcFuel);
  }

  /* ---- Packing checklist (persisted in localStorage) ---- */
  var checklistEl = document.getElementById('checklist');
  if (checklistEl) {
    var STORE_KEY = 'uvi.checklist.v1';
    var defaultItems = [
      'Recovery boards & straps', 'Air compressor & gauge', 'First aid kit',
      'Drinking water (min. 4 L/person/day)', 'UHF radio', 'Offline maps / GPS',
      'Fuel — full + jerry cans', 'Fridge / esky & food', 'Tent or swag & bedding',
      'Head torch & spare batteries', 'Fire kit (check bans first)', 'Rubbish bags — pack it out'
    ];

    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { saved = {}; }

    var progressEl = document.getElementById('checklist-progress');
    var resetBtn = document.getElementById('checklist-reset');

    function persist() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ }
    }
    function updateProgress() {
      var boxes = checklistEl.querySelectorAll('input[type="checkbox"]');
      var done = 0;
      boxes.forEach(function (b) { if (b.checked) done++; });
      if (progressEl) progressEl.textContent = done + ' of ' + boxes.length + ' packed';
    }
    function render() {
      checklistEl.innerHTML = '';
      defaultItems.forEach(function (label, i) {
        var id = 'chk-' + i;
        var lbl = document.createElement('label');
        lbl.className = 'check-item';
        lbl.setAttribute('for', id);

        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.checked = !!saved[label];
        input.addEventListener('change', function () {
          saved[label] = input.checked;
          persist();
          updateProgress();
        });

        var span = document.createElement('span');
        span.textContent = label;

        lbl.appendChild(input);
        lbl.appendChild(span);
        checklistEl.appendChild(lbl);
      });
      updateProgress();
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        saved = {};
        persist();
        render();
      });
    }
    render();
  }

  /* ---- Community signup ---- */
  var signupForm = document.getElementById('signup-form');
  if (signupForm) {
    var emailEl = document.getElementById('signup-email');
    var msgEl = document.getElementById('signup-msg');
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = (emailEl.value || '').trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        msgEl.style.color = '';
        msgEl.textContent = 'Please enter a valid email address.';
        emailEl.focus();
        return;
      }
      var success = "You're on the list — we'll be in touch as Uvi launches.";
      if (typeof window.uviSaveSubscriber === 'function') {
        msgEl.style.color = '';
        msgEl.textContent = 'Adding you…';
        window.uviSaveSubscriber(value).then(function () {
          msgEl.textContent = success;
          signupForm.reset();
        }).catch(function () {
          msgEl.style.color = '#f2c14e';
          msgEl.textContent = 'Something went wrong — please try again.';
        });
      } else {
        msgEl.textContent = success;
        signupForm.reset();
      }
    });
  }

  /* ======================================================================
     Interactive map finder (data-driven: live places when Supabase is
     configured, otherwise the curated static data/places.json)
     ====================================================================== */
  var placeList = document.getElementById('place-list');
  if (placeList) {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip-filter'));
    var stateSel = document.getElementById('state-filter');
    var countEl = document.getElementById('map-count');
    var activeType = 'all';
    var listItems = [];
    var map = null, group = null, markers = {}, placesById = {}, types = {};
    var configured = !!(window.uviPlaces && typeof window.uviPlaces.fetch === 'function');

    /* ---- filtering (works with or without the map) ---- */
    function matches(el) {
      var okType = activeType === 'all' || el.getAttribute('data-type') === activeType;
      var okState = !stateSel || stateSel.value === 'all' || el.getAttribute('data-state') === stateSel.value;
      return okType && okState;
    }
    function applyFilter() {
      var shown = 0;
      listItems.forEach(function (el) {
        var on = matches(el);
        el.hidden = !on;
        if (on) shown++;
        if (map) {
          var m = markers[el.getAttribute('data-id')];
          if (m) {
            if (on && !group.hasLayer(m)) group.addLayer(m);
            else if (!on && group.hasLayer(m)) group.removeLayer(m);
          }
        }
      });
      if (countEl) countEl.textContent = shown + ' location' + (shown === 1 ? '' : 's') + ' shown';
      if (map && group.getLayers().length) {
        try { map.fitBounds(group.getBounds().pad(0.25)); } catch (e) { /* single point */ }
      }
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeType = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('active', on);
          c.setAttribute('aria-pressed', String(on));
        });
        applyFilter();
      });
    });
    if (stateSel) stateSel.addEventListener('change', applyFilter);

    /* ---- render list from data (replaces the static fallback) ---- */
    function ratingBadge(p) {
      return p.rating_count
        ? ' <span class="place-rating">★ ' + Number(p.rating_avg).toFixed(1) + '</span>'
        : '';
    }
    function renderList(rows) {
      placeList.innerHTML = rows.map(function (p) {
        var t = types[p.type] || {};
        return '<button class="place-item" data-id="' + escapeHtml(p.id) +
          '" data-type="' + escapeHtml(p.type) + '" data-state="' + escapeHtml(p.state) + '">' +
          '<span class="place-dot" style="background:' + (t.color || '#e0743a') + '" aria-hidden="true"></span>' +
          '<span class="place-text">' +
          '<span class="place-name">' + escapeHtml(p.name) + ratingBadge(p) + '</span>' +
          '<span class="place-meta">' + (t.icon ? escapeHtml(t.icon) + ' ' : '') +
          escapeHtml(t.label || p.type) + ' · ' + escapeHtml(p.state) + '</span>' +
          '<span class="place-desc">' + escapeHtml(p.desc || '') + '</span>' +
          '</span></button>';
      }).join('');
      listItems = Array.prototype.slice.call(placeList.querySelectorAll('.place-item'));
      listItems.forEach(function (el) {
        el.addEventListener('click', function () { openPlaceDetail(el.getAttribute('data-id')); });
      });
    }

    /* ---- data loading ---- */
    function loadStatic() {
      return fetch('/data/places.json').then(function (r) { return r.json(); })
        .then(function (rows) { return { rows: rows, live: false }; });
    }
    function loadData() {
      if (configured) {
        return window.uviPlaces.fetch().then(function (rows) {
          return (rows && rows.length) ? { rows: rows, live: true } : loadStatic();
        }).catch(loadStatic);
      }
      return loadStatic();
    }

    /* ---- map ---- */
    var mapEl = document.getElementById('map');
    function initMap() {
      if (!mapEl || !window.L) {
        if (mapEl) mapEl.hidden = true;
        var nb0 = document.getElementById('near-me');
        if (nb0) nb0.hidden = true;
        return;
      }
      map = L.map('map', { scrollWheelZoom: false }).setView([-25.5, 134.0], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      map.on('focus', function () { map.scrollWheelZoom.enable(); });
      map.on('blur', function () { map.scrollWheelZoom.disable(); });
      group = L.featureGroup().addTo(map);
      map.on('popupopen', function (e) {
        var el = e.popup.getElement();
        var btn = el && el.querySelector('.popup-details');
        if (btn) btn.addEventListener('click', function () {
          openPlaceDetail(btn.getAttribute('data-place-id'));
        });
      });

      var nearBtn = document.getElementById('near-me');
      if (nearBtn && navigator.geolocation) {
        nearBtn.addEventListener('click', function () {
          nearBtn.disabled = true;
          nearBtn.textContent = 'Locating…';
          navigator.geolocation.getCurrentPosition(function (pos) {
            var ll = [pos.coords.latitude, pos.coords.longitude];
            map.setView(ll, 7);
            L.circleMarker(ll, { radius: 9, color: '#fff', weight: 3, fillColor: '#f2c14e', fillOpacity: 1 })
              .addTo(map).bindPopup('You are here').openPopup();
            nearBtn.disabled = false;
            nearBtn.textContent = '📍 Near me';
          }, function () {
            nearBtn.disabled = false;
            nearBtn.textContent = '📍 Near me';
            if (countEl) countEl.textContent = 'Location unavailable — check browser permissions.';
          }, { enableHighAccuracy: false, timeout: 8000 });
        });
      } else if (nearBtn) {
        nearBtn.hidden = true;
      }
    }
    function buildMarkers(rows) {
      if (!map) return;
      rows.forEach(function (p) {
        var t = types[p.type] || {};
        var m = L.circleMarker([p.lat, p.lng], {
          radius: 8, color: '#0f1c1a', weight: 2, fillColor: t.color || '#e0743a', fillOpacity: 0.95
        });
        m.bindPopup(
          '<strong>' + escapeHtml(p.name) + '</strong><br>' +
          '<span class="popup-meta">' + escapeHtml(t.label || p.type) + ' · ' + escapeHtml(p.state) + '</span><br>' +
          escapeHtml(p.desc || '') +
          '<br><button type="button" class="popup-details" data-place-id="' + escapeHtml(p.id) + '">Details &amp; reviews</button>'
        );
        markers[p.id] = m;
      });
    }

    /* ---- place detail + reviews modal ---- */
    var placeModal = document.getElementById('place-modal');
    var pmType = document.getElementById('place-modal-type');
    var pmTitle = document.getElementById('place-modal-title');
    var pmMeta = document.getElementById('place-modal-meta');
    var pmDesc = document.getElementById('place-modal-desc');
    var viewMapBtn = document.getElementById('place-view-map');
    var bookmarkBtn = document.getElementById('place-bookmark');
    var reviewsSummary = document.getElementById('reviews-summary');
    var reviewsListEl = document.getElementById('reviews-list');
    var reviewForm = document.getElementById('review-form');
    var reviewStars = document.getElementById('review-stars');
    var reviewBody = document.getElementById('review-body');
    var reviewMsg = document.getElementById('review-msg');
    var signinNote = document.getElementById('review-signin-note');
    var currentPlaceId = null;
    var currentRating = 0;
    var starEls = [];

    function openPlaceModal() {
      if (!placeModal) return;
      placeModal.hidden = false;
      document.addEventListener('keydown', onPlaceEsc);
    }
    function closePlaceModal() {
      if (!placeModal) return;
      placeModal.hidden = true;
      document.removeEventListener('keydown', onPlaceEsc);
    }
    function onPlaceEsc(e) { if (e.key === 'Escape') closePlaceModal(); }
    if (placeModal) placeModal.addEventListener('click', function (e) {
      if (e.target === placeModal) closePlaceModal();
    });
    var placeClose = document.getElementById('place-close');
    if (placeClose) placeClose.addEventListener('click', closePlaceModal);
    if (viewMapBtn) viewMapBtn.addEventListener('click', function () {
      var m = markers[currentPlaceId], p = placesById[currentPlaceId];
      closePlaceModal();
      if (map && m && p) {
        map.setView([p.lat, p.lng], 8, { animate: true });
        m.openPopup();
        if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    function starString(n) {
      var s = ''; for (var i = 0; i < 5; i++) s += (i < n ? '★' : '☆'); return s;
    }
    function setStars(v) {
      currentRating = v;
      starEls.forEach(function (b, idx) {
        b.textContent = idx < v ? '★' : '☆';
        b.classList.toggle('on', idx < v);
      });
    }
    if (reviewStars) {
      for (var s = 1; s <= 5; s++) {
        (function (val) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'star'; b.textContent = '☆';
          b.setAttribute('aria-label', val + (val === 1 ? ' star' : ' stars'));
          b.addEventListener('click', function () { setStars(val); });
          reviewStars.appendChild(b); starEls.push(b);
        })(s);
      }
    }

    function renderReviews(rows) {
      if (!reviewsListEl) return;
      if (!rows.length) {
        reviewsListEl.innerHTML = '<p class="reviews-empty">No reviews yet — be the first.</p>';
        if (reviewsSummary) reviewsSummary.textContent = '';
        return;
      }
      if (reviewsSummary) reviewsSummary.textContent = '(' + rows.length + ')';
      reviewsListEl.innerHTML = rows.map(function (r) {
        var who = r.profiles ? (r.profiles.display_name || ('@' + r.profiles.username)) : 'Traveller';
        return '<div class="review">' +
          '<div class="review-head"><span class="review-stars">' + starString(r.rating) + '</span>' +
          '<span class="review-who">' + escapeHtml(who) + '</span></div>' +
          (r.body ? '<p>' + escapeHtml(r.body) + '</p>' : '') + '</div>';
      }).join('');
    }

    function setupReviews(id) {
      if (reviewMsg) { reviewMsg.textContent = ''; }
      setStars(0);
      if (reviewBody) reviewBody.value = '';
      if (!configured) {
        if (reviewsSummary) reviewsSummary.textContent = '';
        if (reviewsListEl) reviewsListEl.innerHTML =
          '<p class="reviews-empty">Community reviews arrive once accounts go live.</p>';
        if (reviewForm) reviewForm.hidden = true;
        if (signinNote) signinNote.hidden = true;
        return;
      }
      if (reviewsListEl) reviewsListEl.innerHTML = '<p class="reviews-empty">Loading reviews…</p>';
      window.uviPlaces.getReviews(id).then(renderReviews);
      window.uviGetUser().then(function (user) {
        if (reviewForm) reviewForm.hidden = !user;
        if (signinNote) signinNote.hidden = !!user;
      });
    }
    if (reviewForm) reviewForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentRating) { if (reviewMsg) { reviewMsg.style.color = '#f2c14e'; reviewMsg.textContent = 'Pick a star rating first.'; } return; }
      reviewMsg.style.color = ''; reviewMsg.textContent = 'Posting…';
      window.uviPlaces.saveReview(currentPlaceId, currentRating, (reviewBody.value || '').trim())
        .then(function (res) {
          if (res && res.error) { reviewMsg.style.color = '#f2c14e'; reviewMsg.textContent = res.error.message; return; }
          reviewMsg.style.color = '#6fbf9a'; reviewMsg.textContent = 'Thanks — your review is posted.';
          reviewBody.value = ''; setStars(0);
          window.uviPlaces.getReviews(currentPlaceId).then(renderReviews);
        }).catch(function () {
          reviewMsg.style.color = '#f2c14e'; reviewMsg.textContent = 'Something went wrong — please try again.';
        });
    });

    function setBookmarkUI(on) {
      if (!bookmarkBtn) return;
      bookmarkBtn.setAttribute('data-on', on ? '1' : '0');
      bookmarkBtn.textContent = on ? '★ Saved' : '☆ Save';
    }
    function setupBookmark(id) {
      if (!bookmarkBtn) return;
      if (!configured) { bookmarkBtn.hidden = true; return; }
      window.uviGetUser().then(function (user) {
        if (!user) { bookmarkBtn.hidden = true; return; }
        bookmarkBtn.hidden = false;
        window.uviPlaces.getBookmarks().then(function (ids) {
          setBookmarkUI(ids.indexOf(id) >= 0);
        });
      });
      bookmarkBtn.onclick = function () {
        var on = bookmarkBtn.getAttribute('data-on') === '1';
        window.uviPlaces.setBookmark(id, !on).then(function (res) {
          if (!(res && res.error)) setBookmarkUI(!on);
        });
      };
    }

    function openPlaceDetail(id) {
      var p = placesById[id];
      if (!p) return;
      currentPlaceId = id;
      var t = types[p.type] || {};
      if (pmType) pmType.textContent = (t.icon ? t.icon + ' ' : '') + (t.label || p.type);
      if (pmTitle) pmTitle.textContent = p.name;
      var metaBits = [p.state];
      if (p.rating_count) metaBits.push('★ ' + Number(p.rating_avg).toFixed(1) + ' (' + p.rating_count + ')');
      if (pmMeta) pmMeta.textContent = metaBits.join(' · ');
      if (pmDesc) pmDesc.textContent = p.desc || '';
      if (viewMapBtn) viewMapBtn.hidden = !(map && markers[id]);
      setupReviews(id);
      setupBookmark(id);
      openPlaceModal();
    }

    /* ---- boot the finder ---- */
    fetch('/data/place-types.json').then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (t) {
        types = t || {};
        initMap();
        return loadData();
      })
      .then(function (result) {
        var rows = result.rows || [];
        rows.forEach(function (p) { placesById[p.id] = p; });
        renderList(rows);
        buildMarkers(rows);
        applyFilter();
        if (map) setTimeout(function () { map.invalidateSize(); }, 200);
      })
      .catch(function () {
        if (countEl) countEl.textContent = '';
      });
  }
})();
