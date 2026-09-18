/* ==========================================================================
   Uvi — interactions
   ========================================================================== */
(function () {
  'use strict';

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

  /* ---- Community signup (front-end only; no backend yet) ---- */
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
      msgEl.textContent = "You're on the list — we'll be in touch as Uvi launches.";
      signupForm.reset();
    });
  }

  /* ---- Interactive map finder ---- */
  var placeList = document.getElementById('place-list');
  if (placeList) {
    var listItems = Array.prototype.slice.call(placeList.querySelectorAll('.place-item'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip-filter'));
    var stateSel = document.getElementById('state-filter');
    var countEl = document.getElementById('map-count');
    var activeType = 'all';

    var map = null, group = null, markers = {}, placesById = {};

    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

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

    /* Filter wiring works with or without the map library */
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

    /* Build the Leaflet map if the library loaded */
    var mapEl = document.getElementById('map');
    if (mapEl && window.L) {
      map = L.map('map', { scrollWheelZoom: false }).setView([-25.5, 134.0], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      map.on('focus', function () { map.scrollWheelZoom.enable(); });
      map.on('blur', function () { map.scrollWheelZoom.disable(); });
      group = L.featureGroup().addTo(map);

      Promise.all([
        fetch('/data/place-types.json').then(function (r) { return r.json(); }),
        fetch('/data/places.json').then(function (r) { return r.json(); })
      ]).then(function (res) {
        var types = res[0], data = res[1];
        data.forEach(function (p) {
          placesById[p.id] = p;
          var color = (types[p.type] || {}).color || '#e0743a';
          var label = (types[p.type] || {}).label || p.type;
          var m = L.circleMarker([p.lat, p.lng], {
            radius: 8, color: '#0f1c1a', weight: 2, fillColor: color, fillOpacity: 0.95
          });
          m.bindPopup(
            '<strong>' + escapeHtml(p.name) + '</strong><br>' +
            '<span class="popup-meta">' + escapeHtml(label) + ' · ' + escapeHtml(p.state) + '</span><br>' +
            escapeHtml(p.desc)
          );
          markers[p.id] = m;
        });
        applyFilter();
        setTimeout(function () { map.invalidateSize(); }, 200);
      }).catch(function () {
        if (countEl) countEl.textContent = listItems.length + ' locations listed';
      });

      listItems.forEach(function (el) {
        el.addEventListener('click', function () {
          var id = el.getAttribute('data-id');
          var m = markers[id], p = placesById[id];
          if (m && p) {
            map.setView([p.lat, p.lng], 8, { animate: true });
            m.openPopup();
            mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
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
    } else {
      /* No map library (e.g. offline): keep list + filters usable, drop map + near-me */
      if (mapEl) mapEl.hidden = true;
      var nb = document.getElementById('near-me');
      if (nb) nb.hidden = true;
      applyFilter();
    }
  }
})();
