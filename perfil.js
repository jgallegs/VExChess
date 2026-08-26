// ============================================================
//  VEXCHESS · Página de perfil
// ============================================================
import { t } from './i18n.js?v=9';
import { api, getUser, getStats, getBadges, setBadges, onAuth, avatarHTML, AVATAR_COLORS, AVATAR_IMAGES, AVATAR_IMAGE_NAMES, openAuth, isAuthResolved, applyUserPatch } from './auth.js?v=30';
import { badgeMeta } from './badges.js?v=3';
import { vexbornByKey, rarityMeta } from './vexborn.js?v=2';
import { skProfile } from './skeleton.js?v=1';

const root = document.getElementById('perfil-root');
const LEVEL_NAMES = { principiante: t('perfil.levelPrincipiante'), facil: t('perfil.levelFacil'), intermedio: t('perfil.levelIntermedio'), avanzado: t('perfil.levelAvanzado'), maximo: t('perfil.levelMaximo'), desconocido: t('perfil.levelDesconocido') };

function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return '—'; } }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function streakText(s) {
  if (!s) return '—';
  return s > 0
    ? t(s === 1 ? 'perfil.streakWinOne' : 'perfil.streakWinMany', { n: s })
    : t((-s) === 1 ? 'perfil.streakLossOne' : 'perfil.streakLossMany', { n: -s });
}

function loadingHTML() {
  // esqueleto con la silueta del perfil: nada de spinners en cargas de pantalla
  return skProfile();
}

function notLogged() {
  return '<section class="pf-guest">' +
    '<img src="assets/knight-logo.svg" alt="" class="pf-guest-logo">' +
    '<h1>' + t('perfil.guestTitle') + '</h1>' +
    '<p>' + t('perfil.guestText') + '</p>' +
    '<button class="btn-play" id="pf-entrar">' + t('perfil.guestCta') + ' <span aria-hidden="true">→</span></button>' +
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
    ? '<div class="pf-pinned"><span class="pf-pinned-label">' + t('perfil.pinnedLabel') + '</span>' +
        '<span class="pf-pinned-icos">' + pinned.map(b =>
          '<span class="pf-pin" data-badge="' + b.badge + '">' +
            '<img class="pf-pin-ico" src="assets/badges/' + b.badge + '.png" alt="">' +
            tipHTML(badgeMeta(b.badge)) +
          '</span>').join('') + '</span>' +
      '</div>'
    : '';

  const vb = u.vexborn ? vexbornByKey(u.vexborn) : null;
  const vbChip = vb ? (function () {
    const rm = rarityMeta(vb.rarity);
    return '<a class="pf-vexborn" href="vexborn.html" style="--rar:' + rm.color + '" title="' + esc(vb.title) + '">' +
        '<span class="pf-vexborn-star">✦</span>' +
        '<span class="pf-vexborn-txt"><b>' + esc(vb.name) + '</b><span>' + esc(vb.title) + '</span></span>' +
      '</a>';
  })() : '';

  return '' +
    '<section class="pf-hero"' + (vb ? ' style="--rar:' + rarityMeta(vb.rarity).color + '"' : '') + '>' +
      avatarHTML(u.avatar, 'lg') +
      '<div class="pf-hero-info">' +
        '<h1 class="pf-name">' + esc(u.username) + nameBadge + '</h1>' +
        '<div class="pf-hero-meta"><span class="pf-elo">' + t('perfil.eloLabel', { elo: u.elo }) + '</span>' +
          '<span class="pf-since">' + t('perfil.memberSince', { date: fmtDate(u.created_at) }) + '</span></div>' +
        vbChip +
      '</div>' +
      '<div class="pf-hero-actions"><a class="pf-btn ghost" href="partidas.html">' + t('perfil.myGamesLink') + '</a>' +
        '<button class="pf-btn danger" id="pf-logout">' + t('perfil.logout') + '</button></div>' +
      pinnedRow +
    '</section>' +
    badgesSection(badges) +

    '<section class="pf-stats">' +
      stat(t('perfil.statGames'), s.played) +
      stat(t('perfil.statWins'), s.wins, 'w') +
      stat(t('perfil.statLosses'), s.losses, 'l') +
      stat(t('perfil.statDraws'), s.draws, 'd') +
      stat(t('perfil.statWinRate'), wr + '%') +
      stat(t('perfil.statCurrentStreak'), streakText(s.streak), s.streak > 0 ? 'w' : s.streak < 0 ? 'l' : '', true) +
      stat(t('perfil.statBestStreak'), s.best_streak ? t(s.best_streak === 1 ? 'perfil.streakWinOne' : 'perfil.streakWinMany', { n: s.best_streak }) : '—', 'w', true) +
    '</section>' +

    (s.played ? (
    '<section class="pf-card">' +
      '<h2>' + t('perfil.byLevelTitle') + '</h2>' +
      '<table class="pf-table"><thead><tr><th>' + t('perfil.tableColLevel') + '</th><th>' + t('perfil.tableColPlayed') + '</th><th>' + t('perfil.tableColWins') + '</th><th>' + t('perfil.tableColLosses') + '</th><th>' + t('perfil.tableColDraws') + '</th></tr></thead><tbody>' + byLevel + '</tbody></table>' +
    '</section>') : '') +

    '<section class="pf-card">' +
      '<h2>' + t('perfil.avatarTitle') + '</h2>' +
      '<div class="pf-av-imgs">' + imgAvatars + '</div>' +
      '<div class="pf-av-classic">' + t('perfil.avatarClassic') + '</div>' +
      '<div class="pf-avatars">' + swatches + '</div>' +
    '</section>' +

    displaySection(u);
}

// Preferencias de visualización del chip de cuenta (barra superior).
function displaySection(u) {
  const disp = (u.data && u.data.chip) || {};
  const pc = ['both', 'name', 'elo'].includes(disp.pc) ? disp.pc : 'both';
  const mobile = ['name', 'elo'].includes(disp.mobile) ? disp.mobile : 'elo';
  const seg = (pref, current, opts) =>
    '<div class="pf-seg" data-pref="' + pref + '" role="group">' +
      opts.map(([val, label]) =>
        '<button type="button" class="pf-seg-btn' + (val === current ? ' active' : '') + '" data-val="' + val + '"' +
          (val === current ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + label + '</button>'
      ).join('') +
    '</div>';
  return '<section class="pf-card pf-display">' +
    '<h2>' + t('perfil.displayTitle') + '</h2>' +
    '<p class="pf-display-desc">' + t('perfil.displayDesc') + '</p>' +
    '<div class="pf-seg-row">' +
      '<span class="pf-seg-label">' + t('perfil.displayPcLabel') + '</span>' +
      seg('pc', pc, [['both', t('perfil.displayOptBoth')], ['name', t('perfil.displayOptName')], ['elo', t('perfil.displayOptElo')]]) +
    '</div>' +
    '<div class="pf-seg-row">' +
      '<span class="pf-seg-label">' + t('perfil.displayMobileLabel') + '</span>' +
      seg('mobile', mobile, [['name', t('perfil.displayOptName')], ['elo', t('perfil.displayOptElo')]]) +
    '</div>' +
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

  // Preferencias de visualización del chip de cuenta.
  document.querySelectorAll('.pf-seg .pf-seg-btn').forEach(btn => btn.addEventListener('click', async () => {
    const seg = btn.closest('.pf-seg');
    if (!seg || btn.classList.contains('active')) return;
    const cur = (getUser().data && getUser().data.chip) || {};
    const chip = { pc: cur.pc || 'both', mobile: cur.mobile || 'elo' };
    chip[seg.dataset.pref] = btn.dataset.val;
    // Feedback inmediato en el propio control (optimista)
    seg.querySelectorAll('.pf-seg-btn').forEach(b => { const on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    try {
      const out = await api.updateProfile({ chip });
      if (out && out.user) applyUserPatch(out.user);  // refresca el chip de la navbar
    } catch (e) {}
  }));
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
    '<h2>' + t('perfil.badgesTitle') + ' <span class="pf-badges-count">' + badges.length + '</span></h2>' +
    (badges.length
      ? '<div class="pf-badges">' + badges.map(b => {
          const m = badgeMeta(b.badge);
          return '<button class="pf-badge' + (b.pinned ? ' pinned' : '') + '" data-badge="' + b.badge + '">' +
            '<img src="assets/badges/' + b.badge + '.png" alt="">' +
            '<span class="pf-badge-name">' + esc(m.name) + '</span>' +
            (b.featured ? '<span class="pf-badge-star" title="' + t('perfil.badgeStarTitle') + '">★</span>' : '') +
            tipHTML(m) +
          '</button>';
        }).join('') + '</div>' +
        '<p class="pf-badges-hint">' + t('perfil.badgesHint') + '</p>'
      : '<p class="pf-badges-empty">' + t('perfil.badgesEmpty') + '</p>') +
  '</section>';
}

let overlayEl = null;
function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.className = 'pf-badge-modal';
  overlayEl.innerHTML = '<div class="pf-badge-box"><button class="pf-badge-x" aria-label="' + t('perfil.modalClose') + '">✕</button><div class="pf-badge-body"></div></div>';
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
    '<p class="pf-badge-date">' + t('perfil.badgeGrantedOn', { date: fmtDate(b.granted_at) }) + '</p>' +
    '<div class="pf-badge-actions">' +
      '<button class="pf-btn ' + (b.pinned ? 'danger' : 'ghost') + '" id="bd-pin"' + (canPin ? '' : ' disabled') + '>' + (b.pinned ? t('perfil.badgeUnpin') : t('perfil.badgePin')) + '</button>' +
      '<button class="pf-btn ' + (b.featured ? 'danger' : 'ghost') + '" id="bd-feat">' + (b.featured ? t('perfil.badgeUnfeature') : t('perfil.badgeFeature')) + '</button>' +
    '</div>' +
    (!canPin && !b.pinned ? '<p class="pf-badge-hint2">' + t('perfil.badgePinLimit') + '</p>' : '');
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
