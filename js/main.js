document.getElementById('year').textContent = new Date().getFullYear();

/* Header scroll state + progress bar */
const header = document.getElementById('siteHeader');
const progressBar = document.getElementById('progressBar');
const backToTop = document.getElementById('backToTop');

function onScroll(){
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';

  header.classList.toggle('scrolled', scrollTop > 40);
  backToTop.classList.toggle('visible', scrollTop > 600);
}
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* Mobile nav toggle */
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
const navBackdrop = document.getElementById('navBackdrop');

function openNav(){
  mainNav.classList.add('open');
  navBackdrop.classList.add('open');
  navToggle.classList.add('open');
  navToggle.setAttribute('aria-expanded', 'true');
  const firstLink = mainNav.querySelector('a');
  if (firstLink) firstLink.focus();
}

function closeNav({ returnFocus = false } = {}){
  mainNav.classList.remove('open');
  navBackdrop.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  if (returnFocus) navToggle.focus();
}

navToggle.addEventListener('click', () => {
  if (mainNav.classList.contains('open')) closeNav();
  else openNav();
});

navBackdrop.addEventListener('click', () => closeNav());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mainNav.classList.contains('open')) closeNav({ returnFocus: true });
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => closeNav());
});

/* Reveal-on-scroll animation */
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

/* Itinerary tabs */
const itinTabs = document.querySelectorAll('.itin-tab');
const itinPanels = document.querySelectorAll('.itin-panel');

itinTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    itinTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    itinPanels.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.dataset.target).classList.add('active');
  });
});

/* Hero search — seeds the trip planner and scrolls to it, no backend */
const heroSearch = document.getElementById('heroSearch');
heroSearch.addEventListener('submit', (e) => {
  e.preventDefault();
  const length = document.getElementById('tripLength');
  if (typeof window.__seedPlanner === 'function') {
    window.__seedPlanner({ length: length ? length.value : null });
  }
  const target = document.getElementById('planner') || document.getElementById('destinations');
  target.scrollIntoView({ behavior: 'smooth' });
});

/* Contact form — client-side validation + honest demo confirmation */
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
const cfName = document.getElementById('cfName');
const cfEmail = document.getElementById('cfEmail');

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formNote.classList.remove('success', 'error');

  const name = cfName.value.trim();
  const email = cfEmail.value.trim();

  if (name.length < 2) {
    formNote.textContent = 'Please enter your name.';
    formNote.classList.add('error');
    cfName.focus();
    return;
  }
  if (!isValidEmail(email)) {
    formNote.textContent = 'Please enter a valid email address.';
    formNote.classList.add('error');
    cfEmail.focus();
    return;
  }

  // Demo only: nothing is sent or stored.
  formNote.textContent = "Thanks! In a live version we'd email your custom itinerary. (Demo — nothing was sent.)";
  formNote.classList.add('success');
  contactForm.reset();
});
