/* ============================================================
   VEXCHESS · i18n — Runtime multiidioma para toda la app.
   ------------------------------------------------------------
   · El catálogo de cada idioma vive en  lang/<código>.json
   · El idioma activo se carga UNA vez con top-level await, así
     t() es SÍNCRONO en todo módulo que importe este fichero
     (por semántica de ES modules: el import espera a este await).
   · Textos estáticos del HTML: atributos data-i18n / data-i18n-attr,
     aplicados solos al cargar el DOM.
   · Para añadir un idioma: crea lang/<código>.json y añade su
     código y endónimo a LANGS.
   ============================================================ */

// Idiomas soportados: [código, nombre en su propio idioma]. RTL: ar, fa.
export const LANGS = [
  ['es', 'Español'], ['en', 'English'], ['ru', 'Русский'], ['de', 'Deutsch'],
  ['fr', 'Français'], ['it', 'Italiano'], ['pt', 'Português'], ['hi', 'हिन्दी'],
  ['zh', '中文'], ['ar', 'العربية'], ['nl', 'Nederlands'], ['uk', 'Українська'],
  ['pl', 'Polski'], ['fa', 'فارسی'],
];
export const RTL_LANGS = ['ar', 'fa'];
const SUPPORTED = LANGS.map(l => l[0]);
const STORE_KEY = 'vex_lang';
const DEFAULT = 'es';

// Metadatos que NO se traducen (compat con el juego).
export const PIECE_META = [
  { t: 'p', valor: '1' }, { t: 'n', valor: '3' }, { t: 'b', valor: '3' },
  { t: 'r', valor: '5' }, { t: 'q', valor: '9' }, { t: 'k', valor: '∞' },
];
export const CONCEPT_ICONS = ['📊', '🎯', '♚', '✨', '⚖️', '💡'];

function detect() {
  try { const s = localStorage.getItem(STORE_KEY); if (s && SUPPORTED.includes(s)) return s; } catch (e) {}
  try {
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(nav)) return nav;
  } catch (e) {}
  return DEFAULT;
}

let LANG = detect();

async function loadCat(code) {
  try {
    const res = await fetch(new URL('./lang/' + code + '.json', import.meta.url));
    if (!res.ok) throw new Error('http ' + res.status);
    return await res.json();
  } catch (e) { return null; }
}

// --- Carga del catálogo activo + fallback español (top-level await) ---
let CAT = await loadCat(LANG);
if (!CAT) { // el idioma pedido falló: cae a español
  LANG = DEFAULT; CAT = await loadCat(DEFAULT) || {};
}
const FALLBACK = LANG === DEFAULT ? CAT : (await loadCat(DEFAULT) || {});

// Aplica dirección e idioma al documento cuanto antes.
try {
  const el = document.documentElement;
  el.setAttribute('lang', LANG);
  el.setAttribute('dir', RTL_LANGS.includes(LANG) ? 'rtl' : 'ltr');
} catch (e) {}

// --- Resolución de claves con notación por puntos ---
function dig(obj, key) {
  if (obj == null) return undefined;
  if (obj[key] !== undefined) return obj[key];           // clave literal (permite puntos en la propia clave)
  const parts = key.split('.');
  let cur = obj;
  for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
  return cur;
}

function interpolate(str, params) {
  if (typeof str !== 'string' || !params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m));
}

// t(key[, params]) — devuelve el valor traducido (string, array u objeto).
// Fallback: idioma activo → español → la propia clave.
export function t(key, params) {
  let v = dig(CAT, key);
  if (v === undefined) v = dig(FALLBACK, key);
  if (v === undefined) return key;
  return (typeof v === 'string') ? interpolate(v, params) : v;
}

export function getLang() { return LANG; }
export function isRTL() { return RTL_LANGS.includes(LANG); }
export function langName(code) { const f = LANGS.find(l => l[0] === code); return f ? f[1] : code; }

// Cambia de idioma: persiste y recarga (garantiza estado limpio en toda la app).
export function setLang(code) {
  if (!SUPPORTED.includes(code) || code === LANG) return;
  try { localStorage.setItem(STORE_KEY, code); } catch (e) {}
  try { location.reload(); } catch (e) {}
}

// --- Aplicación a HTML estático ---
//  data-i18n="clave"            -> textContent
//  data-i18n-html="clave"       -> innerHTML (para texto con <b>, <i>…)
//  data-i18n-attr="attr:clave;attr2:clave2"  -> atributos (placeholder, title, aria-label, content…)
export function applyStatic(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.getAttribute('data-i18n'));
    if (typeof v === 'string') el.textContent = v;
  });
  scope.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = t(el.getAttribute('data-i18n-html'));
    if (typeof v === 'string') el.innerHTML = v;
  });
  scope.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s && s.trim());
      if (attr && key) { const v = t(key); if (typeof v === 'string') el.setAttribute(attr, v); }
    });
  });
}

// Construye un <select> de idioma listo para insertar (id opcional).
export function langSelectHTML(id, cls) {
  const opts = LANGS.map(([code, name]) => '<option value="' + code + '"' + (code === LANG ? ' selected' : '') + '>' + name + '</option>').join('');
  return '<select' + (id ? ' id="' + id + '"' : '') + (cls ? ' class="' + cls + '"' : '') + ' aria-label="' + t('nav.language') + '">' + opts + '</select>';
}

// Enlaza cualquier <select> para que cambie el idioma al elegir.
export function wireLangSelect(el) {
  if (!el) return;
  el.value = LANG;
  el.addEventListener('change', () => setLang(el.value));
}

// Auto-aplica los textos estáticos en cuanto el DOM esté listo.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => applyStatic(document));
  else applyStatic(document);
}

// --- Compat con el juego (app.js): sub-catálogo "game" ya resuelto al idioma activo ---
export const GAME = (() => {
  const g = (FALLBACK && FALLBACK.game) || {};
  const a = (CAT && CAT.game) || {};
  return Object.assign({}, g, a); // idioma activo sobre el fallback español
})();

// MESSAGES: compat mínima para código antiguo que hacía MESSAGES[lang].x
export const MESSAGES = new Proxy({}, {
  get() { return GAME; }, // cualquier idioma devuelve el bundle activo
});
