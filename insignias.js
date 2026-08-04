// ============================================================
//  VEXCHESS · Inventario de insignias
//  Galería de las 16 insignias agrupadas por familia, con
//  significado, cómo se consiguen y modo de concesión.
// ============================================================
import { BADGE_CATALOG, badgeMeta, badgeIcon } from './badges.js?v=3';
import { getBadges, getUser, isAuthResolved, onAuth } from './auth.js?v=16';

const root = document.getElementById('insignias-root');

// Modo de concesión (según el catálogo oficial v2).
const GRANT = {
  creator: { mode: 'Manual · única', rev: false }, staff: { mode: 'Sistema', rev: true },
  champion: { mode: 'Evento', rev: false }, 'first-move': { mode: 'Sistema', rev: false },
  'early-supporter': { mode: 'Manual', rev: false }, pioneer: { mode: 'Evento', rev: false },
  'giant-slayer': { mode: 'Sistema', rev: false }, veteran: { mode: 'Sistema', rev: false },
  mentor: { mode: 'Manual', rev: false }, 'tournament-host': { mode: 'Manual', rev: false },
  builder: { mode: 'Manual', rev: false }, translator: { mode: 'Manual', rev: false },
  'puzzle-author': { mode: 'Manual', rev: false }, 'bug-hunter': { mode: 'Manual', rev: false },
  'fair-play': { mode: 'Sistema + revisión', rev: true }, tactician: { mode: 'Sistema', rev: false },
};

const FAMILY_ORDER = ['Rol', 'Legado', 'Competición', 'Comunidad', 'Contribución'];
const FAMILY_DESC = {
  'Rol': 'Quién es quién dentro de VEXCHESS.',
  'Legado': 'Estuviste aquí desde el principio.',
  'Competición': 'Lo que ganas sobre el tablero.',
  'Comunidad': 'Cómo tratas a los demás.',
  'Contribución': 'Lo que aportas al proyecto.',
};

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
  const m = badgeMeta(id); const g = GRANT[id] || { mode: '—', rev: false };
  const owned = ownedSet.has(id);
  return '<article class="ins-card' + (owned ? ' owned' : '') + '" style="--bc:' + m.color + '">' +
    (owned ? '<span class="ins-owned-tag">✓ La tienes</span>' : '') +
    '<div class="ins-card-ico">' + badgeIcon(id, 'ins') + '</div>' +
    '<h3 class="ins-card-name" style="color:' + m.color + '">' + esc(m.name) + '</h3>' +
    '<span class="ins-card-family">' + esc(m.family) + '</span>' +
    '<p class="ins-card-desc">' + esc(m.desc) + '</p>' +
    '<p class="ins-card-howto">' + esc(m.howto) + '</p>' +
    '<div class="ins-card-foot">' +
      '<span class="ins-chip ins-chip-mode">' + esc(g.mode) + '</span>' +
      '<span class="ins-chip ins-chip-rev">' + (g.rev ? 'Revocable' : 'Permanente') + '</span>' +
    '</div>' +
  '</article>';
}

function stateHTML(inner) { return '<section class="ins-state">' + inner + '</section>'; }

function render() {
  // El inventario es solo para el equipo: al resto no se le enseña el catálogo
  // completo (mantiene el misterio de cómo se consiguen).
  if (!isAuthResolved()) { root.innerHTML = stateHTML('<div class="ins-ring"></div><p>Cargando…</p>'); return; }
  const u = getUser();
  if (!u || !u.is_admin) {
    root.innerHTML = stateHTML(
      '<img class="ins-state-logo" src="assets/knight-logo.svg" alt="">' +
      '<h1>Zona del equipo</h1>' +
      '<p>El inventario completo de insignias es solo para el equipo de VEXCHESS. Las demás se descubren jugando, compitiendo y participando en la comunidad.</p>' +
      '<a class="btn-play" href="index.html">Volver al inicio <span aria-hidden="true">→</span></a>');
    return;
  }
  const ownedSet = new Set((getBadges() || []).map(b => b.badge));
  const groups = byFamily();
  const total = ids().length;
  const ownedN = [...ownedSet].filter(id => BADGE_CATALOG[id]).length;

  const filters = ['all', ...FAMILY_ORDER.filter(f => groups[f])].map(f =>
    '<button class="ins-filter' + (state.filter === f ? ' active' : '') + '" data-f="' + f + '">' +
      (f === 'all' ? 'Todas' : esc(f)) + '</button>').join('');

  const sections = FAMILY_ORDER.filter(f => groups[f]).map(f => {
    const show = state.filter === 'all' || state.filter === f;
    return '<section class="ins-section" data-family="' + esc(f) + '"' + (show ? '' : ' hidden') + '>' +
      '<div class="ins-section-head"><h2>' + esc(f) + '</h2><span>' + esc(FAMILY_DESC[f] || '') + '</span></div>' +
      '<div class="ins-grid">' + groups[f].map(id => cardHTML(id, ownedSet)).join('') + '</div>' +
    '</section>';
  }).join('');

  root.innerHTML =
    '<header class="ins-hero">' +
      '<span class="eyebrow">Inventario</span>' +
      '<h1 class="ins-title">Insignias de <span class="accent">VEXCHESS</span></h1>' +
      '<p class="ins-sub">Cada insignia cuenta algo sobre ti: tu papel, tu historia, tus victorias o lo que aportas. ' +
        (ownedN ? 'Llevas <b>' + ownedN + '</b> de ' + total + '.' : 'Hay <b>' + total + '</b> por descubrir.') + '</p>' +
      '<div class="ins-filters">' + filters + '</div>' +
    '</header>' + sections;

  root.querySelectorAll('.ins-filter').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.f; render(); }));
}

onAuth(render);
