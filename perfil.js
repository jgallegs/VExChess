// ============================================================
//  VEXCHESS · Página de perfil
// ============================================================
import { api, getUser, getStats, getBadges, setBadges, onAuth, avatarHTML, AVATAR_COLORS, AVATAR_IMAGES, AVATAR_IMAGE_NAMES, openAuth, isAuthResolved } from './auth.js?v=14';
import { badgeMeta } from './badges.js?v=3';

const root = document.getElementById('perfil-root');
const LEVEL_NAMES = { principiante: 'Principiante', facil: 'Fácil', intermedio: 'Intermedio', avanzado: 'Avanzado', maximo: 'Máximo', desconocido: 'Otro' };

function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return '—'; } }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function streakText(s) {
  if (!s) return '—';
  return s > 0 ? (s + (s === 1 ? ' victoria' : ' victorias')) : ((-s) + ((-s) === 1 ? ' derrota' : ' derrotas'));
}

function loadingHTML() {
  return '<section class="pf-loading">' +
    '<div class="pf-loading-inner"><div class="pf-loading-ring"></div>' +
    '<img class="pf-loading-knight" src="assets/knight-logo.svg" alt=""></div>' +
    '<p>Cargando tu perfil…</p>' +
    '</section>';
}

function notLogged() {
  return '<section class="pf-guest">' +
    '<img src="assets/knight-logo.svg" alt="" class="pf-guest-logo">' +
    '<h1>Tu perfil te espera</h1>' +
    '<p>Inicia sesión o crea una cuenta para guardar tus partidas, ver tus estadísticas y tu Elo desde cualquier dispositivo.</p>' +
    '<button class="btn-play" id="pf-entrar">Entrar o crear cuenta <span aria-hidden="true">→</span></button>' +
    '</section>';
}

function loggedIn(u, s) {
  const wr = pct(s.wins, s.played);
  const byLevel = Object.keys(s.by_level || {}).map(k => {
    const b = s.by_level[k];
    return '<tr><td>' + (LEVEL_NAMES[k] || esc(k)) + '</td><td>' + b.played + '</td><td class="w">' + b.wins + '</td><td class="l">' + b.losses + '</td><td class="d">' + b.draws + '</td></tr>';
  }).join('');
  const swatches = Object.keys(AVATAR_COLORS).map(c =>
    '<button class="pf-sw' + (u.avatar === 'knight:' + c ? ' active' : '') + '" data-avatar="knight:' + c + '" style="background:' + AVATAR_COLORS[c] + '" aria-label="' + c + '"></button>').join('');
  const imgAvatars = AVATAR_IMAGES.map(name =>
    '<button class="pf-av-img' + (u.avatar === 'img:' + name ? ' active' : '') + '" data-avatar="img:' + name + '" title="' + esc(AVATAR_IMAGE_NAMES[name] || name) + '"><img src="assets/social/avatars/' + name + '.png" alt=""></button>').join('');

  const badges = getBadges().slice().sort((a, b) => (badgeMeta(b.badge).priority || 0) - (badgeMeta(a.badge).priority || 0));
  const featured = badges.find(b => b.featured);
  const pinned = badges.filter(b => b.pinned).slice(0, 3);
  const nameBadge = featured ? '<span class="pf-name-badge-wrap">' +
      '<img class="pf-name-badge" src="assets/badges/' + featured.badge + '.png" alt="">' +
      tipHTML(badgeMeta(featured.badge)) + '</span>' : '';
  const pinnedRow = pinned.length
    ? '<div class="pf-pinned"><span class="pf-pinned-label">Fijadas</span>' +
        '<span class="pf-pinned-icos">' + pinned.map(b =>
          '<span class="pf-pin" data-badge="' + b.badge + '">' +
            '<img class="pf-pin-ico" src="assets/badges/' + b.badge + '.png" alt="">' +
            tipHTML(badgeMeta(b.badge)) +
          '</span>').join('') + '</span>' +
      '</div>'
    : '';

  return '' +
    '<section class="pf-hero">' +
      avatarHTML(u.avatar, 'lg') +
      '<div class="pf-hero-info">' +
        '<h1 class="pf-name">' + esc(u.username) + nameBadge + '</h1>' +
        '<div class="pf-hero-meta"><span class="pf-elo">Elo ' + u.elo + '</span>' +
          '<span class="pf-since">Miembro desde ' + fmtDate(u.created_at) + '</span></div>' +
      '</div>' +
      '<div class="pf-hero-actions"><a class="pf-btn ghost" href="partidas.html">Mis partidas</a>' +
        '<button class="pf-btn danger" id="pf-logout">Cerrar sesión</button></div>' +
      pinnedRow +
    '</section>' +
    badgesSection(badges) +

    '<section class="pf-stats">' +
      stat('Partidas', s.played) +
      stat('Victorias', s.wins, 'w') +
      stat('Derrotas', s.losses, 'l') +
      stat('Tablas', s.draws, 'd') +
      stat('% Victorias', wr + '%') +
      stat('Racha actual', streakText(s.streak), s.streak > 0 ? 'w' : s.streak < 0 ? 'l' : '', true) +
      stat('Mejor racha', s.best_streak ? s.best_streak + (s.best_streak === 1 ? ' victoria' : ' victorias') : '—', 'w', true) +
    '</section>' +

    (s.played ? (
    '<section class="pf-card">' +
      '<h2>Por nivel de la IA</h2>' +
      '<table class="pf-table"><thead><tr><th>Nivel</th><th>Jug.</th><th>V</th><th>D</th><th>E</th></tr></thead><tbody>' + byLevel + '</tbody></table>' +
    '</section>') : '') +

    '<section class="pf-card">' +
      '<h2>Avatar</h2>' +
      '<div class="pf-av-imgs">' + imgAvatars + '</div>' +
      '<div class="pf-av-classic">Clásicos</div>' +
      '<div class="pf-avatars">' + swatches + '</div>' +
    '</section>';
}
function stat(label, value, cls, isText) {
  return '<div class="pf-stat' + (isText ? ' text' : '') + '"><b class="' + (cls || '') + '">' + value + '</b><span>' + label + '</span></div>';
}

function render() {
  const u = getUser();
  const s = getStats() || { played: 0, wins: 0, losses: 0, draws: 0, streak: 0, best_streak: 0, by_level: {} };
  // Mientras el /me inicial no ha resuelto, mostramos el loader en vez del
  // estado "sin sesión" para que no parpadee la pantalla de invitado.
  root.innerHTML = u ? loggedIn(u, s) : (isAuthResolved() ? notLogged() : loadingHTML());
  if (!u) { if (isAuthResolved()) { const e2 = document.getElementById('pf-entrar'); if (e2) e2.addEventListener('click', () => openAuth('login')); } return; }

  const entrar = document.getElementById('pf-entrar');
  if (entrar) entrar.addEventListener('click', () => openAuth('login'));

  const logout = document.getElementById('pf-logout');
  if (logout) logout.addEventListener('click', async () => { try { await api.logout(); } catch (e) {} location.reload(); });

  document.querySelectorAll('.pf-sw, .pf-av-img').forEach(sw => sw.addEventListener('click', async () => {
    try {
      const out = await api.updateProfile({ avatar: sw.dataset.avatar });
      if (out && out.user) { Object.assign(getUser(), out.user); render(); document.dispatchEvent(new CustomEvent('vexchess:auth', { detail: getUser() })); }
    } catch (e) {}
  }));

  document.querySelectorAll('.pf-badge').forEach(el => el.addEventListener('click', () => openBadgeDetail(el.dataset.badge)));
  document.querySelectorAll('.pf-pin').forEach(el => el.addEventListener('click', () => openBadgeDetail(el.dataset.badge)));
}

// ---------- Insignias ----------
// Tooltip flotante reutilizable (tarjetas de insignias + fijadas + destacada)
function tipHTML(m) {
  return '<span class="pf-tip" style="--bc:' + m.color + '" role="tooltip">' +
    '<span class="pf-tip-name">' + esc(m.name) + '</span>' +
    (m.family ? '<span class="pf-tip-fam">' + esc(m.family) + '</span>' : '') +
    (m.desc ? '<span class="pf-tip-desc">' + esc(m.desc) + '</span>' : '') +
  '</span>';
}
function badgesSection(badges) {
  return '<section class="pf-card">' +
    '<h2>Insignias <span class="pf-badges-count">' + badges.length + '</span></h2>' +
    (badges.length
      ? '<div class="pf-badges">' + badges.map(b => {
          const m = badgeMeta(b.badge);
          return '<button class="pf-badge' + (b.pinned ? ' pinned' : '') + '" data-badge="' + b.badge + '">' +
            '<img src="assets/badges/' + b.badge + '.png" alt="">' +
            '<span class="pf-badge-name">' + esc(m.name) + '</span>' +
            (b.featured ? '<span class="pf-badge-star" title="Destacada">★</span>' : '') +
            tipHTML(m) +
          '</button>';
        }).join('') + '</div>' +
        '<p class="pf-badges-hint">Pulsa una insignia para ver su detalle, fijarla (máx. 3) o destacarla junto a tu nombre.</p>'
      : '<p class="pf-badges-empty">Aún no tienes insignias. Se irán desbloqueando con logros, eventos y participación en la comunidad.</p>') +
  '</section>';
}

let overlayEl = null;
function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.className = 'pf-badge-modal';
  overlayEl.innerHTML = '<div class="pf-badge-box"><button class="pf-badge-x" aria-label="Cerrar">✕</button><div class="pf-badge-body"></div></div>';
  document.body.appendChild(overlayEl);
  overlayEl.querySelector('.pf-badge-x').addEventListener('click', () => overlayEl.classList.remove('open'));
  overlayEl.addEventListener('mousedown', e => { if (e.target === overlayEl) overlayEl.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlayEl) overlayEl.classList.remove('open'); });
  return overlayEl;
}
function openBadgeDetail(id) {
  const badges = getBadges();
  const b = badges.find(x => x.badge === id);
  if (!b) return;
  const m = badgeMeta(id);
  const o = ensureOverlay();
  const canPin = b.pinned || badges.filter(x => x.pinned).length < 3;
  const titles = Array.isArray(b.detail && b.detail.titles) ? b.detail.titles : [];
  o.querySelector('.pf-badge-body').innerHTML =
    '<div class="pf-badge-hero" style="--bc:' + m.color + '"><img src="assets/badges/' + id + '.png" alt=""></div>' +
    '<h3 style="color:' + m.color + '">' + esc(m.name) + '</h3>' +
    (m.family ? '<span class="pf-badge-family">' + esc(m.family) + '</span>' : '') +
    '<p class="pf-badge-desc">' + esc(m.desc) + '</p>' +
    '<p class="pf-badge-howto">' + esc(m.howto) + '</p>' +
    (titles.length ? '<ul class="pf-badge-titles">' + titles.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '') +
    '<p class="pf-badge-date">Conseguida el ' + fmtDate(b.granted_at) + '</p>' +
    '<div class="pf-badge-actions">' +
      '<button class="pf-btn ' + (b.pinned ? 'danger' : 'ghost') + '" id="bd-pin"' + (canPin ? '' : ' disabled') + '>' + (b.pinned ? 'Quitar de fijadas' : 'Fijar en el perfil') + '</button>' +
      '<button class="pf-btn ' + (b.featured ? 'danger' : 'ghost') + '" id="bd-feat">' + (b.featured ? 'Quitar de destacada' : 'Destacar junto al nombre') + '</button>' +
    '</div>' +
    (!canPin && !b.pinned ? '<p class="pf-badge-hint2">Ya tienes 3 fijadas. Quita una para fijar esta.</p>' : '');
  o.querySelector('#bd-pin').onclick = () => togglePin(id);
  o.querySelector('#bd-feat').onclick = () => toggleFeature(id);
  o.dataset.badge = id;
  o.classList.add('open');
}
async function applyBadges() {
  const badges = getBadges();
  const pinned = badges.filter(b => b.pinned).map(b => b.badge).slice(0, 3);
  const featured = (badges.find(b => b.featured) || {}).badge || null;
  try { const out = await api.updateBadges({ pinned, featured }); setBadges(out.badges); } catch (e) {}
  render();
  if (overlayEl && overlayEl.classList.contains('open')) openBadgeDetail(overlayEl.dataset.badge);
}
function togglePin(id) {
  const badges = getBadges();
  const b = badges.find(x => x.badge === id); if (!b) return;
  if (!b.pinned && badges.filter(x => x.pinned).length >= 3) return;
  b.pinned = !b.pinned; applyBadges();
}
function toggleFeature(id) {
  const badges = getBadges();
  const b = badges.find(x => x.badge === id); if (!b) return;
  const was = b.featured; badges.forEach(x => { x.featured = false; }); b.featured = !was;
  applyBadges();
}

onAuth(render);
