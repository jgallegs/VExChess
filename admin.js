// ============================================================
//  VEXCHESS · Panel de administración (vitaminado)
//  Dashboard + lista con filtros/orden + ficha con roles,
//  Elo e insignias. Permisos por jerarquía de roles.
// ============================================================
import { t } from './i18n.js?v=9';
import { api, getUser, onAuth, avatarHTML, isAuthResolved, openAuth, ROLES, roleMeta, roleLevel, STAFF_LEVEL } from './auth.js?v=16';
import { BADGE_CATALOG, badgeMeta, badgeIcon } from './badges.js?v=3';

const ELO_LEVEL = 80, ROLE_LEVEL = 80;
const root = document.getElementById('adm-root');
const state = { q: '', role: 'all', sort: 'recent', offset: 0, limit: 25, total: 0, users: [], selId: null };
let mounted = false, currentDetail = null, searchTimer = null, overview = null;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return t('admin.dateDash'); } }
function roleChip(role, big) {
  const m = roleMeta(role);
  if (role === 'member' && !big) return '';
  return '<span class="adm-role-chip' + (big ? ' big' : '') + '" style="--rc:' + m.color + '">' + esc(m.label) + '</span>';
}

// ---------- pantallas de estado ----------
function loaderHTML() {
  return '<section class="adm-state"><div class="pf-loading-inner"><div class="pf-loading-ring"></div>' +
    '<img class="pf-loading-knight" src="assets/knight-logo.svg" alt=""></div><p>' + t('admin.loading') + '</p></section>';
}
function gateHTML(title, msg, showLogin) {
  return '<section class="adm-state"><img src="assets/knight-logo.svg" alt="" class="adm-state-logo">' +
    '<h1>' + esc(title) + '</h1><p>' + esc(msg) + '</p>' +
    (showLogin ? '<button class="btn-play" id="adm-login">' + t('admin.loginBtn') + ' <span aria-hidden="true">→</span></button>' : '<a class="btn-play" href="index.html">' + t('admin.backHome') + ' <span aria-hidden="true">→</span></a>') +
    '</section>';
}

// ---------- toast ----------
let toastEl = null;
function toast(msg, ok) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'adm-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.className = 'adm-toast show' + (ok ? ' ok' : ' err');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.className = 'adm-toast'; }, 2600);
}

// ---------- montaje ----------
function render() {
  const u = getUser();
  if (!isAuthResolved()) { root.innerHTML = loaderHTML(); mounted = false; return; }
  if (!u) {
    root.innerHTML = gateHTML(t('admin.gateLoginTitle'), t('admin.gateLoginMsg'), true);
    mounted = false;
    const lb = document.getElementById('adm-login');
    if (lb) lb.addEventListener('click', () => openAuth('login'));
    return;
  }
  if (!u.is_admin) { root.innerHTML = gateHTML(t('admin.gateRestrictedTitle'), t('admin.gateRestrictedMsg'), false); mounted = false; return; }
  if (!mounted) { mountShell(); mounted = true; loadOverview(); loadUsers(); }
}

function mountShell() {
  const roleOpts = ['all', 'staff', 'owner', 'admin', 'moderator', 'member'].map(r =>
    '<option value="' + r + '">' + (r === 'all' ? t('admin.roleAll') : r === 'staff' ? t('admin.roleStaffOnly') : roleMeta(r).label) + '</option>').join('');
  const sortOpts = [['recent', t('admin.sortRecent')], ['oldest', t('admin.sortOldest')], ['elo_desc', t('admin.sortEloDesc')], ['elo_asc', t('admin.sortEloAsc')], ['name', t('admin.sortName')]]
    .map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('');
  root.innerHTML =
    '<section class="adm-topbar">' +
      '<div><span class="eyebrow">' + t('admin.eyebrow') + '</span><h1 class="adm-title">' + t('admin.controlCenterTitle') + '</h1></div>' +
      '<a class="adm-inv-link" href="insignias.html"><span class="adm-inv-ico">🏅</span> ' + t('admin.badgeInventoryLink') + '</a>' +
    '</section>' +
    '<div class="adm-dash" id="adm-dash"></div>' +
    '<div class="adm-toolbar">' +
      '<div class="adm-search"><svg viewBox="0 0 24 24" width="1rem" height="1rem" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
        '<input id="adm-q" type="search" placeholder="' + t('admin.searchPlaceholder') + '" autocomplete="off"></div>' +
      '<select id="adm-role" class="adm-select">' + roleOpts + '</select>' +
      '<select id="adm-sort" class="adm-select">' + sortOpts + '</select>' +
    '</div>' +
    '<div class="adm-cols">' +
      '<div class="adm-list-col"><div class="adm-list" id="adm-list"></div><div class="adm-pager" id="adm-pager"></div></div>' +
      '<div class="adm-detail" id="adm-detail"><div class="adm-detail-empty"><img src="assets/knight-logo.svg" alt=""><p>' + t('admin.detailEmpty') + '</p></div></div>' +
    '</div>';
  const q = document.getElementById('adm-q');
  q.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = q.value.trim(); state.offset = 0; loadUsers(); }, 250); });
  document.getElementById('adm-role').addEventListener('change', e => { state.role = e.target.value; state.offset = 0; loadUsers(); });
  document.getElementById('adm-sort').addEventListener('change', e => { state.sort = e.target.value; state.offset = 0; loadUsers(); });
}

// ---------- dashboard ----------
async function loadOverview() {
  try { overview = await api.adminOverview(); renderDash(); } catch (e) { /* silencioso */ }
}
function renderDash() {
  const dash = document.getElementById('adm-dash');
  if (!dash || !overview) return;
  const o = overview;
  dash.innerHTML =
    dashCard(t('admin.dashUsers'), o.total_users, t('admin.dashUsersSub')) +
    dashCard(t('admin.dashStaff'), o.staff, t('admin.dashStaffSub')) +
    dashCard(t('admin.dashBadges'), o.badges_granted, t('admin.dashBadgesSub')) +
    dashCard(t('admin.dashGames'), o.total_games, t('admin.dashGamesSub'));
}
function dashCard(label, value, sub) {
  return '<div class="adm-dash-card"><b>' + value + '</b><span class="adm-dash-label">' + label + '</span><span class="adm-dash-sub">' + sub + '</span></div>';
}

// ---------- lista ----------
async function loadUsers() {
  const list = document.getElementById('adm-list');
  if (list) list.innerHTML = '<div class="adm-loading-row">' + t('admin.loadingUsers') + '</div>';
  try {
    const data = await api.adminUsers({ q: state.q, role: state.role, sort: state.sort, limit: state.limit, offset: state.offset });
    state.users = data.users || []; state.total = data.total || 0;
    renderList();
  } catch (e) {
    if (list) list.innerHTML = '<div class="adm-error">' + esc(e.message || t('admin.loadError')) + '</div>';
  }
}
function rowHTML(u) {
  return '<button class="adm-row' + (u.id === state.selId ? ' sel' : '') + '" data-id="' + u.id + '">' +
      avatarHTML(u.avatar, 'sm') +
      '<span class="adm-row-main"><span class="adm-row-name">' + esc(u.username) + roleChip(u.role) + '</span>' +
        '<span class="adm-row-mail">' + esc(u.email) + '</span></span>' +
      '<span class="adm-row-stat"><b>' + u.elo + '</b><i>' + t('admin.rowEloLabel') + '</i></span>' +
      '<span class="adm-row-stat hide-sm"><b>' + u.badge_count + '</b><i>' + t('admin.rowBadgesLabel') + '</i></span>' +
      '<span class="adm-row-stat hide-sm"><b>' + u.games_count + '</b><i>' + t('admin.rowGamesLabel') + '</i></span>' +
    '</button>';
}
function renderList() {
  const list = document.getElementById('adm-list');
  if (!list) return;
  if (!state.users.length) { list.innerHTML = '<div class="adm-empty">' + t('admin.emptyResults') + '</div>'; renderPager(); return; }
  list.innerHTML = state.users.map(rowHTML).join('');
  list.querySelectorAll('.adm-row').forEach(r => r.addEventListener('click', () => selectUser(r.dataset.id)));
  renderPager();
}
function renderPager() {
  const pager = document.getElementById('adm-pager');
  if (!pager) return;
  const pages = Math.max(1, Math.ceil(state.total / state.limit));
  const cur = Math.floor(state.offset / state.limit) + 1;
  pager.innerHTML =
    '<button class="adm-page-btn" id="adm-prev"' + (state.offset <= 0 ? ' disabled' : '') + '>' + t('admin.pagerPrev') + '</button>' +
    '<span class="adm-page-info">' + t('admin.pagerInfo', { total: state.total, s: (state.total === 1 ? '' : 's'), cur: cur, pages: pages }) + '</span>' +
    '<button class="adm-page-btn" id="adm-next"' + (cur >= pages ? ' disabled' : '') + '>' + t('admin.pagerNext') + '</button>';
  const prev = document.getElementById('adm-prev'), next = document.getElementById('adm-next');
  if (prev) prev.addEventListener('click', () => { state.offset = Math.max(0, state.offset - state.limit); loadUsers(); });
  if (next) next.addEventListener('click', () => { state.offset += state.limit; loadUsers(); });
}

// ---------- ficha ----------
async function selectUser(id) {
  state.selId = id;
  document.querySelectorAll('.adm-row').forEach(r => r.classList.toggle('sel', r.dataset.id === id));
  const detail = document.getElementById('adm-detail');
  detail.innerHTML = '<div class="adm-loading-row">' + t('admin.loadingDetail') + '</div>';
  try { currentDetail = await api.adminUser(id); renderDetail(); }
  catch (e) { detail.innerHTML = '<div class="adm-error">' + esc(e.message || t('admin.error')) + '</div>'; }
}
function renderDetail() {
  const detail = document.getElementById('adm-detail');
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
  if (u.role === 'owner') roleControl = '<div class="adm-role-static">' + roleChip('owner', true) + '<span class="adm-field-note">' + t('admin.ownerStaticNote') + '</span></div>';
  else if (isSelf) roleControl = '<div class="adm-role-static">' + roleChip(u.role, true) + '<span class="adm-field-note">' + t('admin.selfRoleNote') + '</span></div>';
  else if (!canRole) roleControl = '<div class="adm-role-static">' + roleChip(u.role, true) + '<span class="adm-field-note">' + t('admin.needHigherRankNote') + '</span></div>';
  else {
    const opts = Object.keys(ROLES).filter(r => r !== 'owner' && roleLevel(r) < actorLevel)
      .map(r => '<option value="' + r + '"' + (r === u.role ? ' selected' : '') + '>' + roleMeta(r).label + '</option>').join('');
    roleControl = '<select id="adm-role-sel" class="adm-select role">' + opts + '</select>';
  }

  const badgeGrid = Object.keys(BADGE_CATALOG).map(id => {
    const m = BADGE_CATALOG[id]; const has = owned.has(id);
    return '<button class="adm-badge' + (has ? ' has' : '') + (canBadges ? '' : ' ro') + '" data-badge="' + id + '" style="--bc:' + m.color + '" title="' + esc(m.desc) + '"' + (canBadges ? '' : ' disabled') + '>' +
        badgeIcon(id, 'admin') +
        '<span class="adm-badge-name">' + esc(m.name) + '</span>' +
        '<span class="adm-badge-act">' + (has ? t('admin.badgeGranted') : t('admin.badgeGrant')) + '</span>' +
      '</button>';
  }).join('');

  detail.innerHTML =
    '<div class="adm-card">' +
      '<div class="adm-user-head">' + avatarHTML(u.avatar, 'lg') +
        '<div class="adm-user-id"><div class="adm-user-name">' + esc(u.username) + roleChip(u.role) + '</div>' +
          '<div class="adm-user-mail">' + esc(u.email) + '</div>' +
          '<div class="adm-user-sub">' + t('admin.memberSince', { date: fmtDate(u.created_at) }) + ' · <span class="adm-uid">' + esc(u.id) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="adm-mini-stats">' +
        miniStat(t('admin.miniPartidas'), s.played || 0) + miniStat(t('admin.miniVictorias'), s.wins || 0, 'w') +
        miniStat(t('admin.miniDerrotas'), s.losses || 0, 'l') + miniStat(t('admin.miniElo'), u.elo) +
      '</div>' +
      '<div class="adm-controls">' +
        '<div class="adm-field"><label>' + t('admin.fieldRol') + '</label>' + roleControl + '</div>' +
        '<div class="adm-field"><label>' + t('admin.fieldElo') + '</label><div class="adm-elo-row">' +
          '<input type="number" id="adm-elo" min="100" max="3500" value="' + u.elo + '"' + (canElo ? '' : ' disabled') + '>' +
          (canElo ? '<button class="adm-btn" id="adm-elo-save">' + t('admin.eloSave') + '</button>' : '') + '</div>' +
          (canElo ? '' : '<span class="adm-field-note">' + t('admin.eloRankNote') + '</span>') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="adm-card">' +
      '<h3 class="adm-card-title">' + t('admin.badgesTitle') + ' <span class="adm-badges-n">' + owned.size + ' / ' + Object.keys(BADGE_CATALOG).length + '</span></h3>' +
      '<p class="adm-card-hint">' + (canBadges ? t('admin.badgesHintEditable') : t('admin.badgesHintReadonly')) + '</p>' +
      '<div class="adm-badges">' + badgeGrid + '</div>' +
    '</div>';

  if (canBadges) detail.querySelectorAll('.adm-badge').forEach(b => b.addEventListener('click', () => toggleBadge(u.id, b.dataset.badge, owned.has(b.dataset.badge))));
  const eloSave = detail.querySelector('#adm-elo-save');
  if (eloSave) eloSave.addEventListener('click', () => saveElo(u.id, detail.querySelector('#adm-elo').value));
  const roleSel = detail.querySelector('#adm-role-sel');
  if (roleSel) roleSel.addEventListener('change', () => setRole(u.id, roleSel.value));
}
function miniStat(label, value, cls) {
  return '<div class="adm-mini"><b class="' + (cls || '') + '">' + value + '</b><span>' + label + '</span></div>';
}

// ---------- acciones ----------
async function toggleBadge(uid, badge, has) {
  try {
    const out = has ? await api.adminRevoke(uid, badge) : await api.adminGrant(uid, badge);
    currentDetail.badges = out.badges || [];
    const row = state.users.find(x => x.id === uid); if (row) row.badge_count = currentDetail.badges.length;
    renderDetail(); renderList(); loadOverview();
    toast(has ? t('admin.toastBadgeRevoked', { name: badgeMeta(badge).name }) : t('admin.toastBadgeGranted', { name: badgeMeta(badge).name }), true);
  } catch (e) { toast(e.message || t('admin.error'), false); }
}
async function saveElo(uid, val) {
  const elo = parseInt(val, 10);
  if (!Number.isFinite(elo) || elo < 100 || elo > 3500) { toast(t('admin.toastEloOutOfRange'), false); return; }
  try {
    const out = await api.adminUpdateUser(uid, { elo });
    currentDetail.user = out.user;
    const row = state.users.find(x => x.id === uid); if (row) row.elo = out.user.elo;
    renderDetail(); renderList();
    toast(t('admin.toastEloUpdated', { elo: out.user.elo }), true);
  } catch (e) { toast(e.message || t('admin.error'), false); }
}
async function setRole(uid, role) {
  try {
    const out = await api.adminUpdateUser(uid, { role });
    currentDetail.user = out.user;
    const row = state.users.find(x => x.id === uid); if (row) { row.role = out.user.role; row.role_level = out.user.role_level; }
    renderDetail(); renderList(); loadOverview();
    toast(t('admin.toastRoleUpdated', { role: roleMeta(out.user.role).label }), true);
  } catch (e) { toast(e.message || t('admin.error'), false); renderDetail(); }
}

onAuth(render);
