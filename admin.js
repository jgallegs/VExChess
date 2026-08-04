// ============================================================
//  VEXCHESS · Panel de administración (vitaminado)
//  Dashboard + lista con filtros/orden + ficha con roles,
//  Elo e insignias. Permisos por jerarquía de roles.
// ============================================================
import { api, getUser, onAuth, avatarHTML, isAuthResolved, openAuth, ROLES, roleMeta, roleLevel, STAFF_LEVEL } from './auth.js?v=10';
import { BADGE_CATALOG, badgeMeta, badgeIcon } from './badges.js?v=3';

const ELO_LEVEL = 80, ROLE_LEVEL = 80;
const root = document.getElementById('admin-root');
const state = { q: '', role: 'all', sort: 'recent', offset: 0, limit: 25, total: 0, users: [], selId: null };
let mounted = false, currentDetail = null, searchTimer = null, overview = null;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return '—'; } }
function roleChip(role, big) {
  const m = roleMeta(role);
  if (role === 'member' && !big) return '';
  return '<span class="ad-role-chip' + (big ? ' big' : '') + '" style="--rc:' + m.color + '">' + esc(m.label) + '</span>';
}

// ---------- pantallas de estado ----------
function loaderHTML() {
  return '<section class="ad-state"><div class="pf-loading-inner"><div class="pf-loading-ring"></div>' +
    '<img class="pf-loading-knight" src="assets/knight-logo.svg" alt=""></div><p>Cargando…</p></section>';
}
function gateHTML(title, msg, showLogin) {
  return '<section class="ad-state"><img src="assets/knight-logo.svg" alt="" class="ad-state-logo">' +
    '<h1>' + esc(title) + '</h1><p>' + esc(msg) + '</p>' +
    (showLogin ? '<button class="btn-play" id="ad-login">Entrar <span aria-hidden="true">→</span></button>' : '<a class="btn-play" href="index.html">Volver al inicio <span aria-hidden="true">→</span></a>') +
    '</section>';
}

// ---------- toast ----------
let toastEl = null;
function toast(msg, ok) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'ad-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.className = 'ad-toast show' + (ok ? ' ok' : ' err');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.className = 'ad-toast'; }, 2600);
}

// ---------- montaje ----------
function render() {
  const u = getUser();
  if (!isAuthResolved()) { root.innerHTML = loaderHTML(); mounted = false; return; }
  if (!u) {
    root.innerHTML = gateHTML('Inicia sesión', 'Necesitas una cuenta con permisos para ver esta página.', true);
    mounted = false;
    const lb = document.getElementById('ad-login');
    if (lb) lb.addEventListener('click', () => openAuth('login'));
    return;
  }
  if (!u.is_admin) { root.innerHTML = gateHTML('Acceso restringido', 'Tu cuenta no tiene permisos de moderación o administración.', false); mounted = false; return; }
  if (!mounted) { mountShell(); mounted = true; loadOverview(); loadUsers(); }
}

function mountShell() {
  const roleOpts = ['all', 'staff', 'owner', 'admin', 'moderator', 'member'].map(r =>
    '<option value="' + r + '">' + (r === 'all' ? 'Todos los roles' : r === 'staff' ? 'Solo staff' : roleMeta(r).label) + '</option>').join('');
  const sortOpts = [['recent', 'Más recientes'], ['oldest', 'Más antiguos'], ['elo_desc', 'Elo ↓'], ['elo_asc', 'Elo ↑'], ['name', 'Nombre A-Z']]
    .map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('');
  root.innerHTML =
    '<section class="ad-topbar">' +
      '<div><span class="eyebrow">Administración</span><h1 class="ad-title">Centro de control</h1></div>' +
      '<a class="ad-inv-link" href="insignias.html"><span class="ad-inv-ico">🏅</span> Inventario de insignias</a>' +
    '</section>' +
    '<div class="ad-dash" id="ad-dash"></div>' +
    '<div class="ad-toolbar">' +
      '<div class="ad-search"><svg viewBox="0 0 24 24" width="1rem" height="1rem" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
        '<input id="ad-q" type="search" placeholder="Buscar por usuario o email…" autocomplete="off"></div>' +
      '<select id="ad-role" class="ad-select">' + roleOpts + '</select>' +
      '<select id="ad-sort" class="ad-select">' + sortOpts + '</select>' +
    '</div>' +
    '<div class="ad-cols">' +
      '<div class="ad-list-col"><div class="ad-list" id="ad-list"></div><div class="ad-pager" id="ad-pager"></div></div>' +
      '<div class="ad-detail" id="ad-detail"><div class="ad-detail-empty"><img src="assets/knight-logo.svg" alt=""><p>Selecciona un usuario para ver y editar su ficha.</p></div></div>' +
    '</div>';
  const q = document.getElementById('ad-q');
  q.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = q.value.trim(); state.offset = 0; loadUsers(); }, 250); });
  document.getElementById('ad-role').addEventListener('change', e => { state.role = e.target.value; state.offset = 0; loadUsers(); });
  document.getElementById('ad-sort').addEventListener('change', e => { state.sort = e.target.value; state.offset = 0; loadUsers(); });
}

// ---------- dashboard ----------
async function loadOverview() {
  try { overview = await api.adminOverview(); renderDash(); } catch (e) { /* silencioso */ }
}
function renderDash() {
  const dash = document.getElementById('ad-dash');
  if (!dash || !overview) return;
  const o = overview;
  dash.innerHTML =
    dashCard('Usuarios', o.total_users, 'Cuentas registradas') +
    dashCard('Staff', o.staff, 'Owner + admins + mods') +
    dashCard('Insignias', o.badges_granted, 'Concedidas en total') +
    dashCard('Partidas', o.total_games, 'Guardadas en la nube');
}
function dashCard(label, value, sub) {
  return '<div class="ad-dash-card"><b>' + value + '</b><span class="ad-dash-label">' + label + '</span><span class="ad-dash-sub">' + sub + '</span></div>';
}

// ---------- lista ----------
async function loadUsers() {
  const list = document.getElementById('ad-list');
  if (list) list.innerHTML = '<div class="ad-loading-row">Cargando usuarios…</div>';
  try {
    const data = await api.adminUsers({ q: state.q, role: state.role, sort: state.sort, limit: state.limit, offset: state.offset });
    state.users = data.users || []; state.total = data.total || 0;
    renderList();
  } catch (e) {
    if (list) list.innerHTML = '<div class="ad-error">' + esc(e.message || 'Error al cargar') + '</div>';
  }
}
function rowHTML(u) {
  return '<button class="ad-row' + (u.id === state.selId ? ' sel' : '') + '" data-id="' + u.id + '">' +
      avatarHTML(u.avatar, 'sm') +
      '<span class="ad-row-main"><span class="ad-row-name">' + esc(u.username) + roleChip(u.role) + '</span>' +
        '<span class="ad-row-mail">' + esc(u.email) + '</span></span>' +
      '<span class="ad-row-stat"><b>' + u.elo + '</b><i>Elo</i></span>' +
      '<span class="ad-row-stat hide-sm"><b>' + u.badge_count + '</b><i>Insig.</i></span>' +
      '<span class="ad-row-stat hide-sm"><b>' + u.games_count + '</b><i>Part.</i></span>' +
    '</button>';
}
function renderList() {
  const list = document.getElementById('ad-list');
  if (!list) return;
  if (!state.users.length) { list.innerHTML = '<div class="ad-empty">Sin resultados.</div>'; renderPager(); return; }
  list.innerHTML = state.users.map(rowHTML).join('');
  list.querySelectorAll('.ad-row').forEach(r => r.addEventListener('click', () => selectUser(r.dataset.id)));
  renderPager();
}
function renderPager() {
  const pager = document.getElementById('ad-pager');
  if (!pager) return;
  const pages = Math.max(1, Math.ceil(state.total / state.limit));
  const cur = Math.floor(state.offset / state.limit) + 1;
  pager.innerHTML =
    '<button class="ad-page-btn" id="ad-prev"' + (state.offset <= 0 ? ' disabled' : '') + '>‹ Anterior</button>' +
    '<span class="ad-page-info">' + state.total + ' usuario' + (state.total === 1 ? '' : 's') + ' · pág. ' + cur + '/' + pages + '</span>' +
    '<button class="ad-page-btn" id="ad-next"' + (cur >= pages ? ' disabled' : '') + '>Siguiente ›</button>';
  const prev = document.getElementById('ad-prev'), next = document.getElementById('ad-next');
  if (prev) prev.addEventListener('click', () => { state.offset = Math.max(0, state.offset - state.limit); loadUsers(); });
  if (next) next.addEventListener('click', () => { state.offset += state.limit; loadUsers(); });
}

// ---------- ficha ----------
async function selectUser(id) {
  state.selId = id;
  document.querySelectorAll('.ad-row').forEach(r => r.classList.toggle('sel', r.dataset.id === id));
  const detail = document.getElementById('ad-detail');
  detail.innerHTML = '<div class="ad-loading-row">Cargando ficha…</div>';
  try { currentDetail = await api.adminUser(id); renderDetail(); }
  catch (e) { detail.innerHTML = '<div class="ad-error">' + esc(e.message || 'Error') + '</div>'; }
}
function renderDetail() {
  const detail = document.getElementById('ad-detail');
  const d = currentDetail; if (!d) return;
  const u = d.user, s = d.stats || {};
  const owned = new Set((d.badges || []).map(b => b.badge));
  const actor = getUser();
  const actorLevel = actor.role_level || 0;
  const isSelf = actor.id === u.id;
  const targetLevel = u.role_level || 0;

  // Permisos
  const canElo = actorLevel >= ELO_LEVEL;
  const canRole = actorLevel >= ROLE_LEVEL && !isSelf && u.role !== 'owner' && actorLevel > targetLevel;
  const canBadges = actorLevel >= STAFF_LEVEL;

  // Selector de rol (solo roles por debajo del nivel del actor, sin owner)
  let roleControl;
  if (u.role === 'owner') roleControl = '<div class="ad-role-static">' + roleChip('owner', true) + '<span class="ad-field-note">El propietario no se puede modificar.</span></div>';
  else if (isSelf) roleControl = '<div class="ad-role-static">' + roleChip(u.role, true) + '<span class="ad-field-note">No puedes cambiar tu propio rol.</span></div>';
  else if (!canRole) roleControl = '<div class="ad-role-static">' + roleChip(u.role, true) + '<span class="ad-field-note">Necesitas un rango superior para cambiarlo.</span></div>';
  else {
    const opts = Object.keys(ROLES).filter(r => r !== 'owner' && roleLevel(r) < actorLevel)
      .map(r => '<option value="' + r + '"' + (r === u.role ? ' selected' : '') + '>' + roleMeta(r).label + '</option>').join('');
    roleControl = '<select id="ad-role-sel" class="ad-select role">' + opts + '</select>';
  }

  const badgeGrid = Object.keys(BADGE_CATALOG).map(id => {
    const m = BADGE_CATALOG[id]; const has = owned.has(id);
    return '<button class="ad-badge' + (has ? ' has' : '') + (canBadges ? '' : ' ro') + '" data-badge="' + id + '" style="--bc:' + m.color + '" title="' + esc(m.desc) + '"' + (canBadges ? '' : ' disabled') + '>' +
        badgeIcon(id, 'admin') +
        '<span class="ad-badge-name">' + esc(m.name) + '</span>' +
        '<span class="ad-badge-act">' + (has ? '✓ Concedida' : 'Conceder') + '</span>' +
      '</button>';
  }).join('');

  detail.innerHTML =
    '<div class="ad-card">' +
      '<div class="ad-user-head">' + avatarHTML(u.avatar, 'lg') +
        '<div class="ad-user-id"><div class="ad-user-name">' + esc(u.username) + roleChip(u.role) + '</div>' +
          '<div class="ad-user-mail">' + esc(u.email) + '</div>' +
          '<div class="ad-user-sub">Miembro desde ' + fmtDate(u.created_at) + ' · <span class="ad-uid">' + esc(u.id) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="ad-mini-stats">' +
        miniStat('Partidas', s.played || 0) + miniStat('Victorias', s.wins || 0, 'w') +
        miniStat('Derrotas', s.losses || 0, 'l') + miniStat('Elo', u.elo) +
      '</div>' +
      '<div class="ad-controls">' +
        '<div class="ad-field"><label>Rol</label>' + roleControl + '</div>' +
        '<div class="ad-field"><label>Elo</label><div class="ad-elo-row">' +
          '<input type="number" id="ad-elo" min="100" max="3500" value="' + u.elo + '"' + (canElo ? '' : ' disabled') + '>' +
          (canElo ? '<button class="ad-btn" id="ad-elo-save">Guardar</button>' : '') + '</div>' +
          (canElo ? '' : '<span class="ad-field-note">Requiere rango de administrador.</span>') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="ad-card">' +
      '<h3 class="ad-card-title">Insignias <span class="ad-badges-n">' + owned.size + ' / ' + Object.keys(BADGE_CATALOG).length + '</span></h3>' +
      '<p class="ad-card-hint">' + (canBadges ? 'Pulsa para conceder o retirar. El usuario podrá fijarlas y destacarlas desde su perfil.' : 'Solo lectura: tu rol no permite conceder insignias.') + '</p>' +
      '<div class="ad-badges">' + badgeGrid + '</div>' +
    '</div>';

  if (canBadges) detail.querySelectorAll('.ad-badge').forEach(b => b.addEventListener('click', () => toggleBadge(u.id, b.dataset.badge, owned.has(b.dataset.badge))));
  const eloSave = detail.querySelector('#ad-elo-save');
  if (eloSave) eloSave.addEventListener('click', () => saveElo(u.id, detail.querySelector('#ad-elo').value));
  const roleSel = detail.querySelector('#ad-role-sel');
  if (roleSel) roleSel.addEventListener('change', () => setRole(u.id, roleSel.value));
}
function miniStat(label, value, cls) {
  return '<div class="ad-mini"><b class="' + (cls || '') + '">' + value + '</b><span>' + label + '</span></div>';
}

// ---------- acciones ----------
async function toggleBadge(uid, badge, has) {
  try {
    const out = has ? await api.adminRevoke(uid, badge) : await api.adminGrant(uid, badge);
    currentDetail.badges = out.badges || [];
    const row = state.users.find(x => x.id === uid); if (row) row.badge_count = currentDetail.badges.length;
    renderDetail(); renderList(); loadOverview();
    toast((has ? 'Insignia retirada: ' : 'Insignia concedida: ') + badgeMeta(badge).name, true);
  } catch (e) { toast(e.message || 'Error', false); }
}
async function saveElo(uid, val) {
  const elo = parseInt(val, 10);
  if (!Number.isFinite(elo) || elo < 100 || elo > 3500) { toast('Elo fuera de rango (100–3500).', false); return; }
  try {
    const out = await api.adminUpdateUser(uid, { elo });
    currentDetail.user = out.user;
    const row = state.users.find(x => x.id === uid); if (row) row.elo = out.user.elo;
    renderDetail(); renderList();
    toast('Elo actualizado a ' + out.user.elo, true);
  } catch (e) { toast(e.message || 'Error', false); }
}
async function setRole(uid, role) {
  try {
    const out = await api.adminUpdateUser(uid, { role });
    currentDetail.user = out.user;
    const row = state.users.find(x => x.id === uid); if (row) { row.role = out.user.role; row.role_level = out.user.role_level; }
    renderDetail(); renderList(); loadOverview();
    toast('Rol actualizado: ' + roleMeta(out.user.role).label, true);
  } catch (e) { toast(e.message || 'Error', false); renderDetail(); }
}

onAuth(render);
