// ============================================================
//  VEXCHESS · Cliente de cuentas (auth) + UI compartida
//  - Cliente del API (/api/*)
//  - Inyecta el modal de registro/login en cualquier página
//  - Pinta el chip de cuenta en los slots .vx-account del navbar
//  - Migra las partidas locales a la cuenta al iniciar sesión
// ============================================================
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
  login: (b) => req('/auth/login', { method: 'POST', headers: JSON_H, body: JSON.stringify(b) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  updateProfile: (b) => req('/profile', { method: 'PUT', headers: JSON_H, body: JSON.stringify(b) }),
  listGames: (limit = 50, offset = 0) => req('/games?limit=' + limit + '&offset=' + offset),
  saveGame: (g) => req('/games', { method: 'POST', headers: JSON_H, body: JSON.stringify(g) }),
  importGames: (games) => req('/games/import', { method: 'POST', headers: JSON_H, body: JSON.stringify({ games }) }),
  deleteGame: (id) => req('/games/' + id, { method: 'DELETE' }),
  stats: () => req('/stats'),
};

// ---------- estado ----------
let currentUser = null;
let currentStats = null;
const listeners = [];
export function getUser() { return currentUser; }
export function getStats() { return currentStats; }
export function onAuth(fn) { listeners.push(fn); fn(currentUser); }
function emit() { listeners.forEach(f => { try { f(currentUser); } catch (e) {} }); document.dispatchEvent(new CustomEvent('vexchess:auth', { detail: currentUser })); }

// ---------- avatar ----------
export const AVATAR_COLORS = { red: '#FF3B47', blue: '#3B82F6', green: '#3AA856', gold: '#E0A82E', slate: '#64748B', violet: '#8B5CF6' };
export function avatarHTML(avatar, cls) {
  const color = AVATAR_COLORS[(avatar || 'knight:red').split(':')[1]] || AVATAR_COLORS.red;
  return '<span class="vx-avatar ' + (cls || '') + '" style="background:' + color + '"><img src="assets/knight.svg" alt=""></span>';
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- modal ----------
let modalEl = null;
function ensureModal() {
  if (modalEl) return modalEl;
  const d = document.createElement('div');
  d.className = 'vx-modal'; d.id = 'vx-modal';
  d.innerHTML =
    '<div class="vx-modal-box" role="dialog" aria-modal="true">' +
      '<button class="vx-modal-x" aria-label="Cerrar">✕</button>' +
      '<div class="vx-modal-brand"><img src="assets/knight-logo.svg" alt=""><b>VEXCHESS</b></div>' +
      '<div class="vx-tabs"><button class="vx-tab active" data-tab="login">Entrar</button><button class="vx-tab" data-tab="register">Crear cuenta</button></div>' +
      '<form class="vx-form" data-form="login">' +
        '<label>Email o nombre de usuario<input name="login" autocomplete="username" required></label>' +
        '<label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>' +
        '<div class="vx-err" hidden></div>' +
        '<button class="vx-submit" type="submit">Entrar</button>' +
      '</form>' +
      '<form class="vx-form" data-form="register" hidden>' +
        '<label>Nombre de usuario<input name="username" autocomplete="username" required></label>' +
        '<label>Email<input name="email" type="email" autocomplete="email" required></label>' +
        '<label>Contraseña<input name="password" type="password" autocomplete="new-password" required></label>' +
        '<div class="vx-hint">3–20 caracteres · empieza por letra · letras, números y _ · contraseña mín. 8</div>' +
        '<div class="vx-err" hidden></div>' +
        '<button class="vx-submit" type="submit">Crear cuenta</button>' +
      '</form>' +
    '</div>';
  document.body.appendChild(d);
  modalEl = d;

  const close = () => { d.classList.remove('open'); };
  d.querySelector('.vx-modal-x').addEventListener('click', close);
  d.addEventListener('mousedown', (e) => { if (e.target === d) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  d.querySelectorAll('.vx-tab').forEach(tb => tb.addEventListener('click', () => setTab(tb.dataset.tab)));
  function setTab(name) {
    d.querySelectorAll('.vx-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    d.querySelectorAll('.vx-form').forEach(f => { f.hidden = f.dataset.form !== name; });
    d.querySelectorAll('.vx-err').forEach(e => { e.hidden = true; });
  }
  d._setTab = setTab;

  d.querySelectorAll('.vx-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = form.querySelector('.vx-err');
      const btn = form.querySelector('.vx-submit');
      errEl.hidden = true; btn.disabled = true; const old = btn.textContent; btn.textContent = '…';
      try {
        const fd = Object.fromEntries(new FormData(form).entries());
        const out = form.dataset.form === 'login' ? await api.login(fd) : await api.register(fd);
        currentUser = out.user; currentStats = out.stats || null;
        close(); renderAccounts(); emit();
        await maybeMigrate();
      } catch (err) {
        errEl.textContent = (err && err.message) || 'No se pudo completar.'; errEl.hidden = false;
      } finally { btn.disabled = false; btn.textContent = old; }
    });
  });
  return d;
}
export function openAuth(tab) {
  const d = ensureModal();
  d._setTab(tab || 'login');
  d.classList.add('open');
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
      try { const meOut = await api.me(); if (meOut && meOut.user) { currentUser = meOut.user; currentStats = meOut.stats || currentStats; } } catch (e) {}
    }
    localStorage.setItem('vexchess:migrated', '1');
    renderAccounts(); emit();
  } catch (e) {}
}

// ---------- chip de cuenta en el navbar ----------
function accountHTML() {
  if (!currentUser) return '<button class="vx-entrar" type="button">Entrar</button>';
  return '<div class="vx-acct">' +
      '<button class="vx-chip" type="button" aria-haspopup="true">' +
        avatarHTML(currentUser.avatar) +
        '<span class="vx-chip-name">' + esc(currentUser.username) + '</span>' +
        '<span class="vx-chip-elo">' + currentUser.elo + '</span>' +
      '</button>' +
      '<div class="vx-menu">' +
        '<a href="perfil.html">Mi perfil</a>' +
        '<a href="partidas.html">Mis partidas</a>' +
        '<button type="button" class="vx-signout">Cerrar sesión</button>' +
      '</div>' +
    '</div>';
}
function renderAccounts() {
  document.querySelectorAll('.vx-account').forEach(slot => {
    slot.innerHTML = accountHTML();
    const entrar = slot.querySelector('.vx-entrar');
    if (entrar) entrar.addEventListener('click', () => openAuth('login'));
    const chip = slot.querySelector('.vx-chip');
    if (chip) {
      const acct = slot.querySelector('.vx-acct');
      chip.addEventListener('click', (e) => { e.stopPropagation(); acct.classList.toggle('open'); });
    }
    const so = slot.querySelector('.vx-signout');
    if (so) so.addEventListener('click', async () => {
      try { await api.logout(); } catch (e) {}
      currentUser = null; currentStats = null; renderAccounts(); emit();
    });
  });
}
document.addEventListener('click', () => { document.querySelectorAll('.vx-acct.open').forEach(a => a.classList.remove('open')); });

// Botones "Entrar" existentes en la web (p.ej. la home) que quieran abrir el modal
function wireLegacyEntrar() {
  document.querySelectorAll('[data-auth-open]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openAuth('login'); }));
}

// ---------- init ----------
(async function init() {
  wireLegacyEntrar();
  renderAccounts();               // pinta "Entrar" mientras carga
  try {
    const out = await api.me();
    currentUser = out.user; currentStats = out.stats || null;
  } catch (e) { currentUser = null; }
  renderAccounts();
  emit();
  if (currentUser) maybeMigrate();
})();
