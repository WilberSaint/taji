import './styles.css';
import { I18N, NOTES } from './i18n.js';

const root = document.documentElement;
root.classList.add('js');

/* ---------- tema (claro por defecto; el usuario puede pasar a oscuro) ---------- */
let storedTheme;
try { storedTheme = localStorage.getItem('ludo-theme'); } catch (e) { /* noop */ }
root.setAttribute('data-theme', storedTheme === 'dark' ? 'dark' : 'light');

document.getElementById('theme').addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('ludo-theme', next); } catch (e) { /* noop */ }
});

/* ---------- idioma ---------- */
const originals = {};
document.querySelectorAll('[data-i18n]').forEach((el) => {
  originals[el.getAttribute('data-i18n')] = el.innerHTML;
});

const noteEl = document.getElementById('langnote');
let noteTimer;
function showNote(msg) {
  noteEl.textContent = msg;
  noteEl.classList.add('show');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => noteEl.classList.remove('show'), 4600);
}

function setLang(lang) {
  const dict = I18N[lang] || {};
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n');
    el.innerHTML = lang === 'es'
      ? originals[k]
      : (dict[k] != null ? dict[k] : originals[k]);
  });
  root.setAttribute('lang', lang === 'en' ? 'en' : 'es');
  document.querySelectorAll('.langbar button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
  if (NOTES[lang]) showNote(NOTES[lang]); else noteEl.classList.remove('show');
  try { localStorage.setItem('ludo-lang', lang); } catch (e) { /* noop */ }
}

document.querySelectorAll('.langbar button').forEach((b) => {
  b.addEventListener('click', () => setLang(b.dataset.lang));
});

try {
  const sl = localStorage.getItem('ludo-lang');
  if (sl && sl !== 'es') setLang(sl);
} catch (e) { /* noop */ }

/* ---------- reveals ---------- */
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !prefersReduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
}

/* ---------- scrollspy: resalta la sección visible en la barra ---------- */
const navLinks = [...document.querySelectorAll('nav.main a[href^="#"]')];
const sections = navLinks
  .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
  .filter(Boolean);
if ('IntersectionObserver' in window && sections.length) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const href = '#' + e.target.id;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === href));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
}
