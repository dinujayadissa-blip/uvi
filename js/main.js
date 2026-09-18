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
})();
