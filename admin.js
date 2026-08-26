// ============================================================
//  VEXCHESS · Panel de administración (vitaminado)
//  Dashboard + lista con filtros/orden + ficha con roles,
//  Elo e insignias. Permisos por jerarquía de roles.
// ============================================================
import { t } from './i18n.js';
import { api, getUser, onAuth, avatarHTML, isAuthResolved, openAuth, ROLES, roleMeta, roleLevel, STAFF_LEVEL } from './auth.js';
import { BADGE_CATALOG, badgeMeta, badgeIcon } from './badges.js';
import { seriesDays, areaChart, columnChart, sparkline, outcomesBar, barList, worldMap, countryList, tableTwin, tableTwinLabeled, fmtN } from './admin-stats.js';
import { skAdmin } from './skeleton.js';

const ELO_LEVEL = 80, ROLE_LEVEL = 80;
const root = document.getElementById('adm-root');
const state = { q: '', role: 'all', sort: 'recent', offset: 0, limit: 25, total: 0, users: [], selId: null, view: 'users' };
let mounted = false, currentDetail = null, searchTimer = null, overview = null;
let analytics = null, anMetric = 'ai_games', anRange = 90;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return t('admin.dateDash'); } }
function roleChip(role, big) {
  const m = roleMeta(role);
  if (role === 'member' && !big) return '';
  return '<span class="adm-role-chip' + (big ? ' big' : '') + '" style="--rc:' + m.color + '">' + esc(m.label) + '</span>';
}

// ---------- pantallas de estado ----------
function loaderHTML() {
  return skAdmin();
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
    '<div class="vx-seg adm-views" role="tablist">' +
      '<button class="on" data-view="users" role="tab" aria-selected="true">' + t('admin.tabUsers') + '</button>' +
      '<button data-view="stats" role="tab" aria-selected="false">' + t('admin.tabStats') + '</button>' +
    '</div>' +
    '<div id="adm-view-users">' +
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
      '</div>' +
    '</div>' +
    '<div id="adm-view-stats" hidden></div>';
  const q = document.getElementById('adm-q');
  q.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = q.value.trim(); state.offset = 0; loadUsers(); }, 250); });
  document.getElementById('adm-role').addEventListener('change', e => { state.role = e.target.value; state.offset = 0; loadUsers(); });
  document.getElementById('adm-sort').addEventListener('change', e => { state.sort = e.target.value; state.offset = 0; loadUsers(); });
  root.querySelectorAll('.adm-views [data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
}

function setView(view) {
  state.view = view;
  document.querySelectorAll('.adm-views [data-view]').forEach(b => {
    const on = b.dataset.view === view;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.getElementById('adm-view-users').hidden = view !== 'users';
  document.getElementById('adm-view-stats').hidden = view !== 'stats';
  if (view === 'stats' && !analytics) loadAnalytics();
}

// ---------- analíticas ----------
let statsResizeWired = false;
async function loadAnalytics() {
  const box = document.getElementById('adm-view-stats');
  box.innerHTML = '<div class="adm-loading-row">' + t('admin.loading') + '</div>';
  try { analytics = await api.adminAnalytics(); renderStats(); }
  catch (e) { box.innerHTML = '<div class="adm-error">' + esc(e.message || t('admin.loadError')) + '</div>'; return; }
  // al cruzar el umbral compacto/ancho, la gráfica grande se re-pinta
  if (!statsResizeWired) {
    statsResizeWired = true;
    let wasCompact = box.clientWidth < 640, rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const el = document.getElementById('adm-view-stats');
        if (!el || el.hidden || !analytics) return;
        const isCompact = el.clientWidth < 640;
        if (isCompact !== wasCompact) { wasCompact = isCompact; renderStats(); }
      }, 180);
    });
  }
}

function kpiTile(label, value, delta, spark, sub) {
  return '<div class="ast-kpi vx-in">' +
    '<span class="ast-kpi-label">' + esc(label) + '</span>' +
    '<div class="ast-kpi-row"><b class="ast-kpi-v">' + fmtN(value) + '</b>' + (spark || '') + '</div>' +
    (delta != null
      ? '<span class="ast-kpi-delta' + (delta > 0 ? ' up' : '') + '">' + t('admin.st.week', { n: fmtN(delta) }) + '</span>'
      : '<span class="ast-kpi-delta">' + esc(sub || '') + '</span>') +
    '</div>';
}

// nombre presentable del nivel del motor (claves internas o Elo numérico)
function levelLabel(l) {
  if (!l) return '—';
  if (/^\d+$/.test(l)) return 'Elo ' + l;
  return l === 'max' || l === 'maximo' ? 'Máximo' : l.charAt(0).toUpperCase() + l.slice(1);
}

function renderStats() {
  const box = document.getElementById('adm-view-stats');
  if (!box || !analytics) return;
  const a = analytics, tt = a.totals;
  const METRICS = [['signups', t('admin.st.mSignups')], ['ai_games', t('admin.st.mAi')], ['pvp_games', t('admin.st.mPvp')]];
  const RANGES = [30, 90, 180];
  const series = seriesDays(a.days[anMetric], anRange);
  const unit = anMetric === 'signups' ? t('admin.st.players') : t('admin.st.gamesUnit');
  const compact = box.clientWidth > 0 && box.clientWidth < 640;
  const chart = areaChart(series, { label: METRICS.find(m => m[0] === anMetric)[1], unit, compact });

  // sparklines de los KPI: la misma serie diaria, últimos 14 días
  const spark = (rows) => sparkline(seriesDays(rows, 14).map(p => p.n));

  const eloBuckets = (a.elo_buckets || []).map(b => ({ label: fmtN(b.bucket), n: b.n }));
  const countries = a.countries || [];
  const browserRows = Object.entries(a.browsers || {}).filter(([, n]) => n > 0)
    .sort((x, y) => y[1] - x[1]).map(([label, n]) => ({ label, n }));
  const tcRows = (a.time_controls || []).sort((x, y) => y.n - x.n)
    .map(r => ({ label: r.time_control || '—', n: r.n }));
  const levelRows = (a.levels || []).sort((x, y) => y.n - x.n)
    .map(r => ({ label: levelLabel(r.level), n: r.n }));

  box.innerHTML =
    '<div class="ast-kpis">' +
      kpiTile(t('admin.st.kUsers'), tt.users, tt.users_7d, spark(a.days.signups)) +
      kpiTile(t('admin.st.kAi'), tt.ai_games, tt.ai_games_7d, spark(a.days.ai_games)) +
      kpiTile(t('admin.st.kPvp'), tt.pvp_games, tt.pvp_games_7d, spark(a.days.pvp_games)) +
      kpiTile(t('admin.st.kActive'), tt.active_7d, null, '', t('admin.st.kActiveSub', { n: fmtN(tt.active_1d) })) +
      kpiTile(t('admin.st.kFriends'), tt.friendships, null, '', t('admin.st.kFriendsSub')) +
      kpiTile(t('admin.st.kBadges'), tt.badges, null, '', t('admin.st.kBadgesSub')) +
    '</div>' +

    '<section class="adm-card ast-card vx-in">' +
      '<div class="ast-head"><div><h3 class="adm-card-title">' + t('admin.st.activity') + '</h3>' +
        '<p class="adm-card-hint">' + t('admin.st.activitySub') + '</p></div>' +
        '<button class="ast-tbl-btn" id="ast-tbl-activity" aria-pressed="false">' + t('admin.st.table') + '</button></div>' +
      '<div class="ast-controls">' +
        '<div class="vx-seg" id="ast-metric">' + METRICS.map(([k, l]) =>
          '<button data-m="' + k + '"' + (k === anMetric ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
        '<div class="vx-seg" id="ast-range">' + RANGES.map(r =>
          '<button data-r="' + r + '"' + (r === anRange ? ' class="on"' : '') + '>' + t('admin.st.days', { n: r }) + '</button>').join('') + '</div>' +
      '</div>' +
      '<div id="ast-activity-chart">' + chart.html + '</div>' +
      '<div id="ast-activity-table" hidden class="ast-table-wrap"></div>' +
    '</section>' +

    '<div class="ast-grid2">' +
      '<section class="adm-card ast-card vx-in">' +
        '<h3 class="adm-card-title">' + t('admin.st.outcomes') + '</h3>' +
        '<p class="adm-card-hint">' + t('admin.st.outcomesSub') + '</p>' +
        outcomesBar(a.outcomes) +
        '<h4 class="ast-subtitle">' + t('admin.st.levels') + '</h4>' +
        barList(levelRows) +
      '</section>' +
      '<section class="adm-card ast-card vx-in">' +
        '<div class="ast-head"><div><h3 class="adm-card-title">' + t('admin.st.elo') + '</h3>' +
          '<p class="adm-card-hint">' + t('admin.st.eloSub') + '</p></div>' +
          '<button class="ast-tbl-btn" id="ast-tbl-elo" aria-pressed="false">' + t('admin.st.table') + '</button></div>' +
        '<div id="ast-elo-chart">' + columnChart(eloBuckets, { label: t('admin.st.elo'), unit: t('admin.st.players') }) + '</div>' +
        '<div id="ast-elo-table" hidden class="ast-table-wrap"></div>' +
      '</section>' +
    '</div>' +

    '<section class="adm-card ast-card ast-map-card vx-in">' +
      '<h3 class="adm-card-title">' + t('admin.st.map') + '</h3>' +
      '<p class="adm-card-hint">' + t('admin.st.mapSub') + '</p>' +
      (countries.length
        ? worldMap(countries) + '<h4 class="ast-subtitle">' + t('admin.st.mapTop') + '</h4>' + countryList(countries, 8)
        : '<p class="ast-empty">' + t('admin.st.mapEmpty') + '</p>') +
    '</section>' +

    '<div class="ast-grid3">' +
      '<section class="adm-card ast-card vx-in">' +
        '<h3 class="adm-card-title">' + t('admin.st.tc') + '</h3>' +
        '<p class="adm-card-hint">' + t('admin.st.tcSub') + '</p>' + barList(tcRows) + '</section>' +
      '<section class="adm-card ast-card vx-in">' +
        '<h3 class="adm-card-title">' + t('admin.st.browsers') + '</h3>' +
        '<p class="adm-card-hint">' + t('admin.st.browsersSub', { n: fmtN(a.sessions_sampled || 0) }) + '</p>' + barList(browserRows) + '</section>' +
      '<section class="adm-card ast-card vx-in">' +
        '<h3 class="adm-card-title">' + t('admin.st.top') + '</h3>' +
        '<p class="adm-card-hint">' + t('admin.st.topSub') + '</p>' +
        '<div class="ast-players">' + (a.top_players || []).map(p =>
          '<div class="ast-player">' + avatarHTML(p.avatar, 'sm') +
            '<span class="ast-player-name">' + esc(p.username) + '</span>' +
            '<span class="ast-player-elo vx-num">' + fmtN(p.elo) + '</span></div>').join('') + '</div>' +
      '</section>' +
    '</div>';

  chart.wire(box);
  document.getElementById('ast-metric').querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => { anMetric = b.dataset.m; renderStats(); }));
  document.getElementById('ast-range').querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => { anRange = +b.dataset.r; renderStats(); }));
  wireTableToggle('ast-tbl-activity', 'ast-activity-chart', 'ast-activity-table', () => tableTwin(series, unit));
  wireTableToggle('ast-tbl-elo', 'ast-elo-chart', 'ast-elo-table', () => tableTwinLabeled(eloBuckets, 'Elo', t('admin.st.players')));
}

function wireTableToggle(btnId, chartId, tableId, buildTable) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const chart = document.getElementById(chartId), table = document.getElementById(tableId);
    const showTable = table.hidden;
    if (showTable && !table.innerHTML) table.innerHTML = buildTable();
    table.hidden = !showTable; chart.hidden = showTable;
    btn.setAttribute('aria-pressed', showTable ? 'true' : 'false');
    btn.textContent = showTable ? t('admin.st.chart') : t('admin.st.table');
  });
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
