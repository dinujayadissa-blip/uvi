const items = [];
function addItem(name) {
  if (!items.includes(name)) items.push(name);
  const ul = document.getElementById('items');
  ul.innerHTML = items.map((n, i) => `<li>${n}<button type="button" onclick="removeItem(${i})" aria-label="Remove">×</button></li>`).join('');
  document.getElementById('enquire').scrollIntoView({ behavior: 'smooth' });
}
function removeItem(i) {
  items.splice(i, 1);
  if (!items.length) return (document.getElementById('items').innerHTML = '<li class="empty">Use “+ Add to enquiry” on any product</li>');
  addItem(items[0]);
}
document.querySelectorAll('.chips').forEach(g => g.addEventListener('click', e => {
  if (e.target.tagName !== 'SPAN') return;
  g.querySelectorAll('span').forEach(s => s.classList.remove('on'));
  e.target.classList.add('on');
}));
document.querySelectorAll('.tabs span').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tabs span').forEach(s => s.classList.remove('on'));
  t.classList.add('on');
}));
document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('open')));
function sendEnquiry(e) {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  const chip = k => document.querySelector(`.chips[data-k="${k}"] .on`)?.textContent || '';
  const msg = [
    'Wholesale enquiry (website)',
    `Products: ${items.join(', ') || 'not specified'}`,
    `Company: ${v('co')}`, `Country: ${v('ct')}`, `Role: ${chip('role')}`, `Volume: ${chip('vol')}`,
    `Name: ${v('nm')}`, `Contact: ${v('em')}`,
  ].join('\n');
  window.open('https://wa.me/94773885898?text=' + encodeURIComponent(msg), '_blank');
  return false;
}
