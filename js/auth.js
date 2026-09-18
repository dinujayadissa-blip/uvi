/**
 * Uvi — Phase A auth & accounts (Stage 1: vanilla JS + supabase-js).
 *
 * Provides: email/password + Google sign-in, email verification, password
 * reset, a username onboarding step, profile edit, and persistence of the
 * "notify me" list to the email_subscribers table.
 *
 * Degrades gracefully: if config.js still holds placeholders (or supabase-js
 * failed to load), account UI is hidden and the site behaves as static.
 */
(function () {
  'use strict';

  var cfg = window.UVI_CONFIG || {};
  var hasLib = typeof window.supabase !== 'undefined' && window.supabase.createClient;
  var configured = hasLib &&
    cfg.supabaseUrl && cfg.supabaseAnonKey &&
    cfg.supabaseUrl.indexOf('YOUR_') === -1 &&
    cfg.supabaseAnonKey.indexOf('YOUR_') === -1;

  if (!configured) {
    // Not wired up yet: leave account UI hidden; main.js uses its local fallback.
    return;
  }

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  window.uviSupabase = sb;

  /* ---------- small helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.style.color = kind === 'error' ? '#f2c14e' : kind === 'ok' ? '#6fbf9a' : '';
  }
  function origin() { return window.location.origin; }

  /* ---------- persist "notify me" subscribers ---------- */
  window.uviSaveSubscriber = function (email) {
    return sb.from('email_subscribers')
      .insert({ email: email, source: 'notify_me' })
      .then(function (res) {
        // Duplicate email (already subscribed) is a success from the user's POV.
        if (res.error && res.error.code !== '23505') throw res.error;
        return true;
      });
  };

  /* ---------- modal plumbing ---------- */
  var authModal = $('auth-modal');
  var profileModal = $('profile-modal');
  var lastFocus = null;

  function openModal(modal) {
    lastFocus = document.activeElement;
    show(modal);
    var first = modal.querySelector('input, button');
    if (first) first.focus();
    document.addEventListener('keydown', onEsc);
  }
  function closeModal(modal) {
    hide(modal);
    document.removeEventListener('keydown', onEsc);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onEsc(e) {
    if (e.key === 'Escape') {
      if (authModal && !authModal.hidden) closeModal(authModal);
      if (profileModal && !profileModal.hidden) closeModal(profileModal);
    }
  }
  [authModal, profileModal].forEach(function (m) {
    if (!m) return;
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(m); });
  });

  /* ---------- account header UI ---------- */
  var accountWrap = $('account');
  var signinBtn = $('account-signin');
  var accountMenu = $('account-menu');
  var accountTrigger = $('account-trigger');
  var accountDropdown = $('account-dropdown');
  var accountAvatar = $('account-avatar');
  var accountName = $('account-name');

  show(accountWrap); // config present → reveal the account area

  if (signinBtn) signinBtn.addEventListener('click', function () { openAuth('signin'); });
  if (accountTrigger) {
    accountTrigger.addEventListener('click', function () {
      if (accountDropdown) accountDropdown.hidden = !accountDropdown.hidden;
    });
  }
  document.addEventListener('click', function (e) {
    if (accountDropdown && !accountDropdown.hidden &&
        !accountMenu.contains(e.target)) accountDropdown.hidden = true;
  });

  var editBtn = $('account-edit');
  if (editBtn) editBtn.addEventListener('click', function () {
    if (accountDropdown) accountDropdown.hidden = true;
    openProfile(true);
  });
  var signoutBtn = $('account-signout');
  if (signoutBtn) signoutBtn.addEventListener('click', function () {
    sb.auth.signOut();
    if (accountDropdown) accountDropdown.hidden = true;
  });

  function renderLoggedOut() {
    show(signinBtn); hide(accountMenu);
  }
  function renderLoggedIn(profile) {
    hide(signinBtn); show(accountMenu);
    var label = (profile && profile.display_name) || 'Traveller';
    if (accountAvatar) accountAvatar.textContent = label.charAt(0).toUpperCase();
    if (accountName) accountName.textContent = profile
      ? (profile.display_name + ' · @' + profile.username)
      : 'Finish your profile';
  }

  /* ---------- profile lookup / onboarding ---------- */
  var currentProfile = null;

  function loadProfile(userId) {
    return sb.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(function (res) { return res.data; });
  }

  function refreshForSession(session) {
    if (!session || !session.user) { currentProfile = null; renderLoggedOut(); return; }
    loadProfile(session.user.id).then(function (profile) {
      currentProfile = profile;
      renderLoggedIn(profile);
      if (!profile) openProfile(false); // new user → onboarding
    });
  }

  /* ---------- auth modal ---------- */
  var authForm = $('auth-form');
  var authEmail = $('auth-email');
  var authPassword = $('auth-password');
  var authSubmit = $('auth-submit');
  var authMsg = $('auth-msg');
  var authTitle = $('auth-title');
  var authTabs = Array.prototype.slice.call(document.querySelectorAll('.auth-tab'));
  var mode = 'signin';

  function openAuth(m) { setAuthMode(m || 'signin'); setMsg(authMsg, ''); openModal(authModal); }
  function setAuthMode(m) {
    mode = m;
    authTabs.forEach(function (t) {
      var on = t.getAttribute('data-mode') === m;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    if (authTitle) authTitle.textContent = m === 'signup' ? 'Create your Uvi account' : 'Welcome back';
    if (authSubmit) authSubmit.textContent = m === 'signup' ? 'Create account' : 'Sign in';
  }
  authTabs.forEach(function (t) {
    t.addEventListener('click', function () { setAuthMode(t.getAttribute('data-mode')); setMsg(authMsg, ''); });
  });
  var authClose = $('auth-close');
  if (authClose) authClose.addEventListener('click', function () { closeModal(authModal); });

  if (authForm) authForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (authEmail.value || '').trim();
    var password = authPassword.value || '';
    if (!email || password.length < 8) {
      setMsg(authMsg, 'Enter an email and a password of at least 8 characters.', 'error');
      return;
    }
    authSubmit.disabled = true;
    setMsg(authMsg, mode === 'signup' ? 'Creating your account…' : 'Signing you in…');
    var op = mode === 'signup'
      ? sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: origin() } })
      : sb.auth.signInWithPassword({ email: email, password: password });
    op.then(function (res) {
      authSubmit.disabled = false;
      if (res.error) { setMsg(authMsg, res.error.message, 'error'); return; }
      if (mode === 'signup' && res.data.user && !res.data.session) {
        setMsg(authMsg, 'Check your email to confirm your account, then come back and sign in.', 'ok');
      } else {
        closeModal(authModal);
      }
    }).catch(function () {
      authSubmit.disabled = false;
      setMsg(authMsg, 'Something went wrong — please try again.', 'error');
    });
  });

  var googleBtn = $('auth-google');
  if (googleBtn) googleBtn.addEventListener('click', function () {
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin() } });
  });

  var forgotBtn = $('auth-forgot');
  if (forgotBtn) forgotBtn.addEventListener('click', function () {
    var email = (authEmail.value || '').trim();
    if (!email) { setMsg(authMsg, 'Enter your email above first, then tap reset.', 'error'); return; }
    sb.auth.resetPasswordForEmail(email, { redirectTo: origin() }).then(function (res) {
      setMsg(authMsg, res.error ? res.error.message : 'Password reset link sent — check your email.',
        res.error ? 'error' : 'ok');
    });
  });

  /* ---------- profile / onboarding modal ---------- */
  var profileForm = $('profile-form');
  var pfUsername = $('pf-username');
  var pfDisplay = $('pf-display');
  var pfState = $('pf-state');
  var pfRig = $('pf-rig');
  var profileMsg = $('profile-msg');
  var profileTitle = $('profile-title');
  var profileClose = $('profile-close');

  function openProfile(isEdit) {
    setMsg(profileMsg, '');
    if (profileTitle) profileTitle.textContent = isEdit ? 'Edit your profile' : 'Set up your profile';
    if (isEdit && currentProfile) {
      pfUsername.value = currentProfile.username || '';
      pfDisplay.value = currentProfile.display_name || '';
      pfState.value = currentProfile.home_state || '';
      pfRig.value = currentProfile.rig || '';
    }
    openModal(profileModal);
  }
  if (profileClose) profileClose.addEventListener('click', function () { closeModal(profileModal); });

  if (profileForm) profileForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sb.auth.getUser().then(function (res) {
      var user = res.data && res.data.user;
      if (!user) { setMsg(profileMsg, 'Please sign in again.', 'error'); return; }
      var username = (pfUsername.value || '').trim().toLowerCase();
      var display = (pfDisplay.value || '').trim();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        setMsg(profileMsg, 'Username: 3–20 lowercase letters, numbers or underscores.', 'error'); return;
      }
      if (!display) { setMsg(profileMsg, 'Please enter a display name.', 'error'); return; }
      var row = {
        id: user.id, username: username, display_name: display,
        home_state: pfState.value || null, rig: (pfRig.value || '').trim() || null
      };
      setMsg(profileMsg, 'Saving…');
      sb.from('profiles').upsert(row, { onConflict: 'id' }).then(function (r) {
        if (r.error) {
          setMsg(profileMsg,
            r.error.code === '23505' ? 'That username is taken — try another.' : r.error.message,
            'error');
          return;
        }
        currentProfile = row;
        renderLoggedIn(row);
        closeModal(profileModal);
      });
    });
  });

  /* ---------- session bootstrap ---------- */
  sb.auth.getSession().then(function (res) { refreshForSession(res.data.session); });
  sb.auth.onAuthStateChange(function (_event, session) { refreshForSession(session); });

  // Expose for debugging / tests
  window.uviAuth = { openAuth: openAuth, openProfile: openProfile };
})();
