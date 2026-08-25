// ============================================================
//  VEXCHESS · Cliente de cuentas (auth) + UI compartida
//  - Cliente del API (/api/*)
//  - Inyecta el modal de registro/login en cualquier página
//  - Pinta el chip de cuenta en los slots .vx-account del navbar
//  - Migra las partidas locales a la cuenta al iniciar sesión
// ============================================================
import { badgeIcon } from './badges.js?v=3';
import { t } from './i18n.js?v=9';
import { mountAccountChip, closeAllAccountMenus } from './account-chip.js?v=13';
const JSON_H = { 'Content-Type': 'application/json' };

async function req(path, opts = {}) {
  const res = await fetch('/api' + path, { credentials: 'same-origin', ...opts });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw Object.assign(new Error((data && data.error) || ('Error ' + res.status)), { status: res.status, data });
  return data;
}

export const api = {
  me: () => req('/auth/me'),
  register: (b) => req('/auth/register', { method: 'POST', headers: JSON_H, body: JSON.stringify(b) }),
  checkUsername: (u) => req('/auth/check-username?u=' + encodeURIComponent(u)),
  login: (b) => req('/auth/login', { method: 'POST', headers: JSON_H, body: JSON.stringify(b) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  updateProfile: (b) => req('/profile', { method: 'PUT', headers: JSON_H, body: JSON.stringify(b) }),
  academy: () => req('/academy'),
  academyResult: (b) => req('/academy/result', { method: 'POST', headers: JSON_H, body: JSON.stringify(b) }),
  updateBadges: (b) => req('/profile/badges', { method: 'PUT', headers: JSON_H, body: JSON.stringify(b) }),
  listGames: (limit = 50, offset = 0) => req('/games?limit=' + limit + '&offset=' + offset),
  saveGame: (g) => req('/games', { method: 'POST', headers: JSON_H, body: JSON.stringify(g) }),
  importGames: (games) => req('/games/import', { method: 'POST', headers: JSON_H, body: JSON.stringify({ games }) }),
  deleteGame: (id) => req('/games/' + id, { method: 'DELETE' }),
  stats: () => req('/stats'),
  publicProfile: (username) => req('/u/' + encodeURIComponent(username)),
  // comunidad
  commSearch: (q) => req('/community/search?q=' + encodeURIComponent(q)),
  commSummary: () => req('/community/summary'),
  commFriends: () => req('/community/friends'),
  commRequests: () => req('/community/requests'),
  commRequest: (to) => req('/community/request', { method: 'POST', headers: JSON_H, body: JSON.stringify({ to }) }),
  commRespond: (user_id, action) => req('/community/respond', { method: 'POST', headers: JSON_H, body: JSON.stringify({ user_id, action }) }),
  commRemove: (user_id) => req('/community/remove', { method: 'POST', headers: JSON_H, body: JSON.stringify({ user_id }) }),
  commConnectInfo: (code) => req('/connect/' + encodeURIComponent(code)),
  commConnectAdd: (code) => req('/community/connect', { method: 'POST', headers: JSON_H, body: JSON.stringify({ code }) }),
  // online
  playChallenge: (to, tc) => req('/play/challenge', { method: 'POST', headers: JSON_H, body: JSON.stringify({ to, tc }) }),
  playChallenges: () => req('/play/challenges'),
  playRespond: (id, action) => req('/play/challenge/respond', { method: 'POST', headers: JSON_H, body: JSON.stringify({ id, action }) }),
  playCancel: (id) => req('/play/challenge/cancel', { method: 'POST', headers: JSON_H, body: JSON.stringify({ id }) }),
  playChallengePoll: (id) => req('/play/challenge/' + id),
  playQueueJoin: (tc) => req('/play/queue', { method: 'POST', headers: JSON_H, body: JSON.stringify({ tc }) }),
  playQueueLeave: () => req('/play/queue', { method: 'DELETE' }),
  playRivals: () => req('/play/rivals'),
  gameInfo: (id) => req('/game/' + id),
  // admin
  adminOverview: () => req('/admin/overview'),
  adminUsers: (opts = {}) => {
    const p = new URLSearchParams();
    p.set('q', opts.q || ''); p.set('limit', opts.limit || 25); p.set('offset', opts.offset || 0);
    if (opts.role) p.set('role', opts.role);
    if (opts.sort) p.set('sort', opts.sort);
    return req('/admin/users?' + p.toString());
  },
  adminUser: (id) => req('/admin/users/' + id),
  adminGrant: (id, badge) => req('/admin/users/' + id + '/badges', { method: 'POST', headers: JSON_H, body: JSON.stringify({ badge }) }),
  adminRevoke: (id, badge) => req('/admin/users/' + id + '/badges/' + encodeURIComponent(badge), { method: 'DELETE' }),
  adminUpdateUser: (id, patch) => req('/admin/users/' + id, { method: 'PUT', headers: JSON_H, body: JSON.stringify(patch) }),
};

// ---------- estado ----------
// undefined = sesión aún sin resolver (el chip pinta un esqueleto);
// null = anónimo confirmado (botón Entrar); objeto = sesión iniciada.
let currentUser;
let currentStats = null;
let currentBadges = [];
let authResolved = false;
const listeners = [];
export function getUser() { return currentUser; }
export function getStats() { return currentStats; }
export function getBadges() { return currentBadges; }
export function isAuthResolved() { return authResolved; }
export function setBadges(arr) { currentBadges = arr || []; renderAccounts(); }
export function onAuth(fn) { listeners.push(fn); fn(currentUser); }
function emit() { listeners.forEach(f => { try { f(currentUser); } catch (e) {} }); document.dispatchEvent(new CustomEvent('vexchess:auth', { detail: currentUser })); }

// ---------- roles (compartido con el panel de admin) ----------
export const ROLES = {
  owner:     { level: 100, label: t('auth.role.owner'),     color: '#FF3B47' },
  admin:     { level: 80,  label: t('auth.role.admin'),     color: '#F59E0B' },
  moderator: { level: 50,  label: t('auth.role.moderator'), color: '#3B82F6' },
  member:    { level: 0,   label: t('auth.role.member'),    color: '#8b97a9' },
};
export const STAFF_LEVEL = 50;
export function roleMeta(r) { return ROLES[r] || ROLES.member; }
export function roleLevel(r) { return (ROLES[r] ? ROLES[r].level : 0); }

// ---------- avatar ----------
export const AVATAR_COLORS = { red: '#FF3B47', blue: '#3B82F6', green: '#3AA856', gold: '#E0A82E', slate: '#64748B', violet: '#8B5CF6' };
export const AVATAR_IMAGES = ['vex-knight', 'ivory-queen', 'cobalt-rook', 'violet-bishop', 'teal-pawn', 'golden-king', 'shadow-knight', 'rival-duo'];
export const AVATAR_IMAGE_NAMES = { 'vex-knight': t('auth.avatar.vexKnight'), 'ivory-queen': t('auth.avatar.ivoryQueen'), 'cobalt-rook': t('auth.avatar.cobaltRook'), 'violet-bishop': t('auth.avatar.violetBishop'), 'teal-pawn': t('auth.avatar.tealPawn'), 'golden-king': t('auth.avatar.goldenKing'), 'shadow-knight': t('auth.avatar.shadowKnight'), 'rival-duo': t('auth.avatar.rivalDuo') };
export function avatarHTML(avatar, cls) {
  const a = avatar || 'knight:red';
  if (a.startsWith('img:')) {
    return '<span class="vx-avatar img ' + (cls || '') + '"><img src="assets/social/avatars/' + a.slice(4) + '.png" alt=""></span>';
  }
  const color = AVATAR_COLORS[a.split(':')[1]] || AVATAR_COLORS.red;
  return '<span class="vx-avatar ' + (cls || '') + '" style="background:' + color + '"><img src="assets/knight.svg" alt=""></span>';
}

// ---------- reputación (Social Identity Pack) ----------
export const REPUTATION = { unrated: { label: t('auth.reputation.unrated'), order: 0 }, 'good-standing': { label: t('auth.reputation.goodStanding'), order: 1 }, trusted: { label: t('auth.reputation.trusted'), order: 2 }, respected: { label: t('auth.reputation.respected'), order: 3 }, exemplary: { label: t('auth.reputation.exemplary'), order: 4 } };
export function repMeta(k) { return REPUTATION[k] || REPUTATION.unrated; }
export function repChipHTML(k, iconOnly) {
  const m = repMeta(k);
  return '<span class="vx-rep vx-rep-' + esc(k) + '" title="' + esc(m.label) + '"><img src="assets/social/reputation/' + esc(k) + '.png" alt="">' + (iconOnly ? '' : '<span>' + esc(m.label) + '</span>') + '</span>';
}
export const PRESENCE = { online: t('auth.presence.online'), away: t('auth.presence.away'), playing: t('auth.presence.playing'), spectating: t('auth.presence.spectating'), offline: t('auth.presence.offline') };
export function presenceHTML(p) { if (!p || p === 'offline') return ''; return '<span class="vx-presence p-' + p + '" title="' + (PRESENCE[p] || '') + '"></span>'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- modal ----------
let modalEl = null;
function ensureModal() {
  if (modalEl) return modalEl;
  const d = document.createElement('div');
  d.className = 'vx-modal'; d.id = 'vx-modal';
  d.innerHTML =
    '<div class="vx-modal-box" role="dialog" aria-modal="true">' +
      '<button class="vx-modal-x" aria-label="' + t('auth.modal.close') + '">✕</button>' +
      '<div class="vx-modal-brand"><img src="assets/knight-logo.svg" alt=""><b>VEXCHESS</b></div>' +
      '<div class="vx-tabs"><span class="vx-tab-slider"></span><button class="vx-tab active" data-tab="login">' + t('auth.modal.tabLogin') + '</button><button class="vx-tab" data-tab="register">' + t('auth.modal.tabRegister') + '</button></div>' +
      '<form class="vx-form" data-form="login">' +
        '<label>' + t('auth.login.loginLabel') + '<input name="login" autocomplete="username" required></label>' +
        '<label>' + t('auth.login.passwordLabel') + '<input name="password" type="password" autocomplete="current-password" required></label>' +
        '<div class="vx-err" hidden></div>' +
        '<button class="vx-submit" type="submit">' + t('auth.login.submit') + '</button>' +
      '</form>' +
      '<form class="vx-form" data-form="register" hidden>' +
        '<label>' + t('auth.register.usernameLabel') + '<input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required><span class="vx-check" data-check="username"></span></label>' +
        '<label>' + t('auth.register.emailLabel') + '<input name="email" type="email" autocomplete="email" required></label>' +
        '<label>' + t('auth.login.passwordLabel') + '<input name="password" type="password" autocomplete="new-password" required></label>' +
        '<div class="vx-strength" data-strength><div class="vx-bars"><i></i><i></i><i></i><i></i></div><span class="vx-strength-label"></span></div>' +
        '<div class="vx-err" hidden></div>' +
        '<button class="vx-submit" type="submit">' + t('auth.register.submit') + '</button>' +
      '</form>' +
    '</div>';
  document.body.appendChild(d);
  modalEl = d;

  const close = () => { d.classList.remove('open'); };
  d.querySelector('.vx-modal-x').addEventListener('click', close);
  d.addEventListener('mousedown', (e) => { if (e.target === d) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Deslizador vivo de pestañas (estilo Atlas)
  const tabsEl = d.querySelector('.vx-tabs');
  const slider = tabsEl.querySelector('.vx-tab-slider');
  function moveSlider(animate) {
    const active = tabsEl.querySelector('.vx-tab.active') || tabsEl.querySelector('.vx-tab');
    if (!active || !active.offsetWidth) return;
    if (animate === false) slider.style.transition = 'none';
    slider.style.width = active.offsetWidth + 'px';
    slider.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    if (animate === false) requestAnimationFrame(() => { slider.style.transition = ''; });
  }
  d._moveSlider = moveSlider;
  d.querySelectorAll('.vx-tab').forEach(tb => tb.addEventListener('click', () => setTab(tb.dataset.tab)));
  function setTab(name) {
    d.querySelectorAll('.vx-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    d.querySelectorAll('.vx-form').forEach(f => { f.hidden = f.dataset.form !== name; });
    d.querySelectorAll('.vx-err').forEach(e => { e.hidden = true; });
    moveSlider(true);
  }
  d._setTab = setTab;
  window.addEventListener('resize', () => { if (d.classList.contains('open')) moveSlider(false); });

  d.querySelectorAll('.vx-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = form.querySelector('.vx-err');
      const btn = form.querySelector('.vx-submit');
      errEl.hidden = true; btn.disabled = true; const old = btn.textContent; btn.textContent = '…';
      try {
        const fd = Object.fromEntries(new FormData(form).entries());
        const out = form.dataset.form === 'login' ? await api.login(fd) : await api.register(fd);
        currentUser = out.user; currentStats = out.stats || null; currentBadges = out.badges || [];
        close(); renderAccounts(); emit();
        await maybeMigrate();
      } catch (err) {
        errEl.textContent = (err && err.message) || t('auth.error.generic'); errEl.hidden = false;
      } finally { btn.disabled = false; btn.textContent = old; }
    });
  });
  // Validación en vivo del registro (usuario disponible + contraseña)
  const regForm = d.querySelector('.vx-form[data-form="register"]');
  const uInput = regForm.querySelector('input[name="username"]');
  const pInput = regForm.querySelector('input[name="password"]');
  const uCheck = regForm.querySelector('.vx-check[data-check="username"]');
  const strengthEl = regForm.querySelector('.vx-strength');
  const strengthLabel = strengthEl.querySelector('.vx-strength-label');
  const setCheck = (el, state, msg) => { el.className = 'vx-check' + (state ? ' ' + state : ''); el.textContent = msg || ''; };
  let uTimer = null, uReq = 0;
  uInput.addEventListener('input', () => {
    const v = uInput.value.trim();
    if (!v) { setCheck(uCheck, '', ''); return; }
    const fmt = validateUsernameClient(v);
    if (fmt) { clearTimeout(uTimer); setCheck(uCheck, 'bad', fmt); return; }
    setCheck(uCheck, 'checking', t('auth.username.checking'));
    clearTimeout(uTimer); const my = ++uReq;
    uTimer = setTimeout(async () => {
      try {
        const r = await api.checkUsername(v); if (my !== uReq) return;
        if (r.valid && r.available) setCheck(uCheck, 'ok', t('auth.username.available'));
        else setCheck(uCheck, 'bad', r.reason || t('auth.username.unavailable'));
      } catch (e) { if (my === uReq) setCheck(uCheck, 'ok', t('auth.username.formatValid')); }
    }, 380);
  });
  pInput.addEventListener('input', () => {
    const v = pInput.value;
    const sc = passwordScore(v);
    strengthEl.className = 'vx-strength' + (v ? ' s' + sc.score : '');
    strengthLabel.textContent = v ? (v.length < 8 ? t('auth.password.minChars', { n: v.length }) : sc.label) : '';
  });

  return d;
}
const RESERVED_C = new Set(['admin','administrator','root','moderator','mod','staff','support','help','system','sistema','vexchess','vex','api','www','mail','official','oficial','null','undefined','none','guest','invitado','bot','stockfish','me','yo','owner','user','usuario','users','login','register','logout','settings','profile','perfil','play','puzzles','partidas','directo','about','contacto']);
function validateUsernameClient(u) {
  if (u.length < 3 || u.length > 20) return t('auth.username.rangeError');
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(u)) return t('auth.username.formatError');
  if (RESERVED_C.has(u.toLowerCase())) return t('auth.username.reservedError');
  return null;
}
// Fuerza de la contraseña: 0 (vacía) a 4 (fuerte)
function passwordScore(p) {
  if (!p) return { score: 0, label: '' };
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
  s += Math.max(0, classes - 1);
  s = Math.min(4, s);
  if (p.length < 8) s = Math.min(s, 1);
  return { score: s, label: ['', t('auth.password.weak'), t('auth.password.acceptable'), t('auth.password.good'), t('auth.password.strong')][s] || '' };
}
export function openAuth(tab) {
  const d = ensureModal();
  d._setTab(tab || 'login');
  d.classList.add('open');
  requestAnimationFrame(() => d._moveSlider(false));   // coloca el deslizador ya visible
  const f = d.querySelector('.vx-form:not([hidden]) input');
  setTimeout(() => f && f.focus(), 40);
}

// ---------- migración de partidas locales ----------
async function maybeMigrate() {
  try {
    if (!currentUser || localStorage.getItem('vexchess:migrated')) return;
    const arr = JSON.parse(localStorage.getItem('vexchess:archive') || '[]');
    if (Array.isArray(arr) && arr.length) {
      const games = arr.map(e => ({ pgn: e.pgn, result: e.result, human_color: e.humanColor, level: e.level, plies: e.plies, played_at: e.date }));
      await api.importGames(games);
      // refrescar usuario + estadísticas desde el servidor tras importar
      try { const meOut = await api.me(); if (meOut && meOut.user) { currentUser = meOut.user; currentStats = meOut.stats || currentStats; currentBadges = meOut.badges || currentBadges; } } catch (e) {}
    }
    localStorage.setItem('vexchess:migrated', '1');
    renderAccounts(); emit();
  } catch (e) {}
}

// ---------- avisos (solicitudes de amistad + retos) ----------
let notifCount = 0, challengeCount = 0;
export function getNotifCount() { return notifCount + challengeCount; }
async function pollNotifs() {
  if (!currentUser) { if (notifCount || challengeCount) { notifCount = 0; challengeCount = 0; renderAccounts(); } return; }
  try {
    const r = await api.commSummary();
    const n = r.incoming || 0, c = r.challenges || 0;
    if (n !== notifCount || c !== challengeCount) { notifCount = n; challengeCount = c; renderAccounts(); }
  } catch (e) {}
}
export function refreshNotifs() { return pollNotifs(); }

// ---------- chip de cuenta en el navbar ----------
// La presentación vive en el componente reutilizable account-chip.js.
// auth.js solo aporta el estado (modelo) y los manejadores.
async function doSignout() {
  try { await api.logout(); } catch (e) {}
  currentUser = null; currentStats = null; renderAccounts(); emit();
}
function renderAccounts() {
  const display = (currentUser && currentUser.data && currentUser.data.chip) || null;
  const model = { user: currentUser, badges: currentBadges, notifCount, challengeCount, display };
  const ctx = {
    avatarHTML, roleMeta, badgeIcon,
    onLogin: () => openAuth('login'),
    onSignout: doSignout,
  };
  document.querySelectorAll('.vx-account').forEach(slot => mountAccountChip(slot, model, ctx));
}
document.addEventListener('click', closeAllAccountMenus);

// Permite a otras vistas (p.ej. el perfil) refrescar el chip tras cambiar
// datos del usuario en memoria (avatar, preferencias de visualización…).
export function refreshAccountChip() { renderAccounts(); }
export function applyUserPatch(patch) {
  if (!currentUser || !patch) return;
  Object.assign(currentUser, patch);
  renderAccounts(); emit();
}

// Botones "Entrar" existentes en la web (p.ej. la home) que quieran abrir el modal
function wireLegacyEntrar() {
  document.querySelectorAll('[data-auth-open]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openAuth('login'); }));
}

// ---------- init ----------
(async function init() {
  wireLegacyEntrar();
  renderAccounts();               // sesión sin resolver: pinta el esqueleto
  try {
    const out = await api.me();
    currentUser = out.user; currentStats = out.stats || null; currentBadges = out.badges || [];
  } catch (e) { currentUser = null; }
  authResolved = true;
  renderAccounts();
  emit();
  if (currentUser) { maybeMigrate(); pollNotifs(); }
  // Sondea las solicitudes recibidas para el aviso del navbar.
  setInterval(pollNotifs, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollNotifs(); });
})();
