// ============================================================
//  VEXCHESS · Inventario de insignias
//  Galería de las 16 insignias agrupadas por familia, con
//  significado, cómo se consiguen y modo de concesión.
// ============================================================
import { t } from './i18n.js?v=9';
import { BADGE_CATALOG, badgeMeta, badgeIcon } from './badges.js?v=3';
import { getBadges, getUser, isAuthResolved, onAuth } from './auth.js?v=30';

const root = document.getElementById('insignias-root');

// Modo de concesión (según el catálogo oficial v2).
const GRANT = {
  creator: { mode: 'manualUnica', rev: false }, staff: { mode: 'sistema', rev: true },
  champion: { mode: 'evento', rev: false }, 'first-move': { mode: 'sistema', rev: false },
  'early-supporter': { mode: 'manual', rev: false }, pioneer: { mode: 'evento', rev: false },
  'giant-slayer': { mode: 'sistema', rev: false }, veteran: { mode: 'sistema', rev: false },
  mentor: { mode: 'manual', rev: false }, 'tournament-host': { mode: 'manual', rev: false },
  builder: { mode: 'manual', rev: false }, translator: { mode: 'manual', rev: false },
  'puzzle-author': { mode: 'manual', rev: false }, 'bug-hunter': { mode: 'manual', rev: false },
  'fair-play': { mode: 'sistemaRevision', rev: true }, tactician: { mode: 'sistema', rev: false },
};

const FAMILY_ORDER = ['Rol', 'Legado', 'Competición', 'Comunidad', 'Contribución'];
// Mapa nombre de familia (dato del catálogo) → sufijo de clave i18n.
const FAMILY_KEY = {
  'Rol': 'rol', 'Legado': 'legado', 'Competición': 'competicion',
  'Comunidad': 'comunidad', 'Contribución': 'contribucion',
};
function familyLabel(f) { return FAMILY_KEY[f] ? t('insignias.family.' + FAMILY_KEY[f]) : f; }
function familyDesc(f) { return FAMILY_KEY[f] ? t('insignias.familyDesc.' + FAMILY_KEY[f]) : ''; }

let state = { filter: 'all' };

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function ids() {
  return Object.keys(BADGE_CATALOG).slice().sort((a, b) => (badgeMeta(b).priority || 0) - (badgeMeta(a).priority || 0));
}
function byFamily() {
  const map = {};
  ids().forEach(id => { const f = badgeMeta(id).family || 'Otras'; (map[f] = map[f] || []).push(id); });
  return map;
}

function cardHTML(id, ownedSet) {
  const m = badgeMeta(id); const g = GRANT[id] || { mode: null, rev: false };
  const owned = ownedSet.has(id);
  return '<article class="ins-card' + (owned ? ' owned' : '') + '" style="--bc:' + m.color + '">' +
    (owned ? '<span class="ins-owned-tag">' + t('insignias.card.ownedTag') + '</span>' : '') +
    '<div class="ins-card-ico">' + badgeIcon(id, 'ins') + '</div>' +
    '<h3 class="ins-card-name" style="color:' + m.color + '">' + esc(m.name) + '</h3>' +
    '<span class="ins-card-family">' + esc(familyLabel(m.family)) + '</span>' +
    '<p class="ins-card-desc">' + esc(m.desc) + '</p>' +
    '<p class="ins-card-howto">' + esc(m.howto) + '</p>' +
    '<div class="ins-card-foot">' +
      '<span class="ins-chip ins-chip-mode">' + (g.mode ? t('insignias.grant.mode.' + g.mode) : '—') + '</span>' +
      '<span class="ins-chip ins-chip-rev">' + (g.rev ? t('insignias.grant.revocable') : t('insignias.grant.permanente')) + '</span>' +
    '</div>' +
  '</article>';
}

function stateHTML(inner) { return '<section class="ins-state">' + inner + '</section>'; }

function render() {
  // El inventario es solo para el equipo: al resto no se le enseña el catálogo
  // completo (mantiene el misterio de cómo se consiguen).
  if (!isAuthResolved()) { root.innerHTML = stateHTML('<div class="ins-ring"></div><p>' + t('insignias.loading') + '</p>'); return; }
  const u = getUser();
  if (!u || !u.is_admin) {
    root.innerHTML = stateHTML(
      '<img class="ins-state-logo" src="assets/knight-logo.svg" alt="">' +
      '<h1>' + t('insignias.guest.title') + '</h1>' +
      '<p>' + t('insignias.guest.body') + '</p>' +
      '<a class="btn-play" href="index.html">' + t('insignias.guest.backHome') + '</a>');
    return;
  }
  const ownedSet = new Set((getBadges() || []).map(b => b.badge));
  const groups = byFamily();
  const total = ids().length;
  const ownedN = [...ownedSet].filter(id => BADGE_CATALOG[id]).length;

  const filters = ['all', ...FAMILY_ORDER.filter(f => groups[f])].map(f =>
    '<button class="ins-filter' + (state.filter === f ? ' active' : '') + '" data-f="' + f + '">' +
      (f === 'all' ? t('insignias.filter.all') : esc(familyLabel(f))) + '</button>').join('');

  const sections = FAMILY_ORDER.filter(f => groups[f]).map(f => {
    const show = state.filter === 'all' || state.filter === f;
    return '<section class="ins-section" data-family="' + esc(f) + '"' + (show ? '' : ' hidden') + '>' +
      '<div class="ins-section-head"><h2>' + esc(familyLabel(f)) + '</h2><span>' + esc(familyDesc(f)) + '</span></div>' +
      '<div class="ins-grid">' + groups[f].map(id => cardHTML(id, ownedSet)).join('') + '</div>' +
    '</section>';
  }).join('');

  root.innerHTML =
    '<header class="ins-hero">' +
      '<span class="eyebrow">' + t('insignias.hero.eyebrow') + '</span>' +
      '<h1 class="ins-title">' + t('insignias.hero.title') + '</h1>' +
      '<p class="ins-sub">' + t('insignias.hero.sub') + ' ' +
        (ownedN ? t('insignias.hero.progressOwned', { owned: ownedN, total: total }) : t('insignias.hero.progressNone', { total: total })) + '</p>' +
      '<div class="ins-filters">' + filters + '</div>' +
    '</header>' + sections;

  root.querySelectorAll('.ins-filter').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.f; render(); }));
}

onAuth(render);
