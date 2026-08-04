// ============================================================
//  VEXCHESS · Comunidad
//  Amigos · Solicitudes · Buscar · Mi VEX ID (tarjeta + QR)
// ============================================================
import { api, getUser, isAuthResolved, onAuth, openAuth, avatarHTML } from './auth.js?v=11';
import { badgeIcon, badgeMeta } from './badges.js?v=3';
import qrcode from './assets/vendor/qrcode.mjs?v=1';

const root = document.getElementById('comunidad-root');
const TABS = [['amigos', 'Amigos'], ['solicitudes', 'Solicitudes'], ['buscar', 'Buscar'], ['vexid', 'Mi VEX ID']];
let tab = 'amigos', mounted = false, reqCount = 0, searchTimer = null, lastSearch = '';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function vexId(no) { return no ? 'VEX-' + String(no).padStart(4, '0') : 'VEX-—'; }
function repChip(rep) { return '<span class="cm-rep cm-rep-' + esc((rep || '').toLowerCase()) + '">' + esc(rep || '') + '</span>'; }

// ---------- toast ----------
let toastEl = null;
function toast(msg, ok) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'cm-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.className = 'cm-toast show' + (ok ? ' ok' : ' err');
  clearTimeout(toastEl._t); toastEl._t = setTimeout(() => { toastEl.className = 'cm-toast'; }, 2600);
}

// ---------- estado ----------
function stateHTML(inner) { return '<section class="cm-state">' + inner + '</section>'; }
function render() {
  if (!isAuthResolved()) { root.innerHTML = stateHTML('<div class="cm-ring"></div><p>Cargando…</p>'); mounted = false; return; }
  const u = getUser();
  if (!u) {
    root.innerHTML = stateHTML('<img class="cm-state-logo" src="assets/knight-logo.svg" alt=""><h1>Tu comunidad te espera</h1>' +
      '<p>Inicia sesión para tener amigos, buscar jugadores y compartir tu VEX ID.</p>' +
      '<button class="btn-play" id="cm-login">Entrar <span aria-hidden="true">→</span></button>');
    mounted = false;
    const lb = document.getElementById('cm-login'); if (lb) lb.addEventListener('click', () => openAuth('login'));
    return;
  }
  if (!mounted) { mountShell(); mounted = true; refreshReqCount(); loadTab(); }
}

function mountShell() {
  root.innerHTML =
    '<div class="cm-head"><span class="eyebrow">Comunidad</span><h1 class="cm-title">Tu <span class="accent">gente</span></h1></div>' +
    '<div class="cm-tabs" id="cm-tabs">' + TABS.map(([id, label]) =>
      '<button class="cm-tab' + (id === tab ? ' active' : '') + '" data-tab="' + id + '">' + label +
        (id === 'solicitudes' ? '<span class="cm-tab-badge" id="cm-reqbadge" hidden></span>' : '') + '</button>').join('') + '</div>' +
    '<div class="cm-panel" id="cm-panel"></div>';
  document.querySelectorAll('.cm-tab').forEach(t => t.addEventListener('click', () => {
    tab = t.dataset.tab;
    document.querySelectorAll('.cm-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
    loadTab();
  }));
}

async function refreshReqCount() {
  try {
    const r = await api.commRequests();
    reqCount = (r.incoming || []).length;
    const badge = document.getElementById('cm-reqbadge');
    if (badge) { badge.textContent = reqCount; badge.hidden = reqCount === 0; }
  } catch (e) {}
}

function loadTab() {
  const panel = document.getElementById('cm-panel');
  panel.innerHTML = '<div class="cm-loading">Cargando…</div>';
  if (tab === 'amigos') return loadFriends(panel);
  if (tab === 'solicitudes') return loadRequests(panel);
  if (tab === 'buscar') return loadSearch(panel);
  if (tab === 'vexid') return loadVexId(panel);
}

// ---------- tarjeta de persona ----------
function personCard(u, ctx) {
  const actions = [];
  if (ctx === 'search') {
    if (u.status === 'friends') actions.push('<button class="cm-btn ghost" disabled>✓ Amigos</button>');
    else if (u.status === 'pending_out') actions.push('<button class="cm-btn ghost" disabled>Solicitud enviada</button>');
    else if (u.status === 'pending_in') actions.push('<button class="cm-btn primary" data-act="accept" data-id="' + u.id + '">Aceptar</button>');
    else actions.push('<button class="cm-btn primary" data-act="add" data-id="' + u.id + '">Añadir</button>');
  } else if (ctx === 'friend') {
    actions.push('<button class="cm-btn ghost" data-act="challenge" disabled title="Próximamente">Retar</button>');
    actions.push('<button class="cm-btn danger" data-act="remove" data-id="' + u.id + '">Eliminar</button>');
  } else if (ctx === 'incoming') {
    actions.push('<button class="cm-btn primary" data-act="accept" data-id="' + u.id + '">Aceptar</button>');
    actions.push('<button class="cm-btn ghost" data-act="decline" data-id="' + u.id + '">Rechazar</button>');
  } else if (ctx === 'outgoing') {
    actions.push('<button class="cm-btn ghost" data-act="cancel" data-id="' + u.id + '">Cancelar</button>');
  }
  const mutual = (u.mutual != null && u.mutual > 0) ? '<span class="cm-mutual">' + u.mutual + ' en común</span>' : '';
  return '<div class="cm-person" data-user="' + u.id + '" data-username="' + esc(u.username) + '">' +
      '<button class="cm-person-main" data-act="profile" data-username="' + esc(u.username) + '">' +
        avatarHTML(u.avatar, 'md') +
        '<span class="cm-person-info"><span class="cm-person-name">' + esc(u.username) + repChip(u.reputation) + '</span>' +
          '<span class="cm-person-sub">' + vexId(u.member_no) + ' · ' + u.elo + ' Elo' + (mutual ? ' · ' + mutual : '') + '</span></span>' +
      '</button>' +
      '<div class="cm-person-actions">' + actions.join('') + '</div>' +
    '</div>';
}

function wirePanel(panel) {
  panel.querySelectorAll('[data-act]').forEach(el => {
    const act = el.dataset.act;
    el.addEventListener('click', async (e) => {
      if (act === 'profile') { openProfile(el.dataset.username); return; }
      const id = el.dataset.id;
      try {
        if (act === 'add') { await api.commRequest(id); toast('Solicitud enviada', true); }
        else if (act === 'accept') { await api.commRespond(id, 'accept'); toast('¡Ahora sois amigos!', true); }
        else if (act === 'decline') { await api.commRespond(id, 'decline'); toast('Solicitud rechazada', true); }
        else if (act === 'cancel') { await api.commRemove(id); toast('Solicitud cancelada', true); }
        else if (act === 'remove') { await api.commRemove(id); toast('Amigo eliminado', true); }
        refreshReqCount(); loadTab();
      } catch (err) { toast(err.message || 'Error', false); }
    });
  });
}

// ---------- Amigos ----------
async function loadFriends(panel) {
  try {
    const r = await api.commFriends();
    const list = r.friends || [];
    panel.innerHTML = list.length
      ? '<div class="cm-list">' + list.map(u => personCard(u, 'friend')).join('') + '</div>'
      : emptyHTML('Aún no tienes amigos', 'Busca jugadores por su nombre o comparte tu VEX ID para que te añadan.');
    wirePanel(panel);
  } catch (e) { panel.innerHTML = '<div class="cm-error">' + esc(e.message) + '</div>'; }
}

// ---------- Solicitudes ----------
async function loadRequests(panel) {
  try {
    const r = await api.commRequests();
    const inc = r.incoming || [], out = r.outgoing || [];
    let html = '';
    html += '<h3 class="cm-sub">Recibidas <span class="cm-count">' + inc.length + '</span></h3>';
    html += inc.length ? '<div class="cm-list">' + inc.map(u => personCard(u, 'incoming')).join('') + '</div>' : '<p class="cm-muted">No tienes solicitudes pendientes.</p>';
    html += '<h3 class="cm-sub">Enviadas <span class="cm-count">' + out.length + '</span></h3>';
    html += out.length ? '<div class="cm-list">' + out.map(u => personCard(u, 'outgoing')).join('') + '</div>' : '<p class="cm-muted">No has enviado ninguna solicitud.</p>';
    panel.innerHTML = html;
    wirePanel(panel);
  } catch (e) { panel.innerHTML = '<div class="cm-error">' + esc(e.message) + '</div>'; }
}

// ---------- Buscar ----------
function loadSearch(panel) {
  panel.innerHTML =
    '<div class="cm-search"><svg viewBox="0 0 24 24" width="1rem" height="1rem" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input id="cm-q" type="search" placeholder="Buscar por nombre de usuario…" autocomplete="off" value="' + esc(lastSearch) + '"></div>' +
    '<div id="cm-results"><p class="cm-muted">Escribe al menos 2 letras para buscar.</p></div>';
  const q = document.getElementById('cm-q');
  q.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => doSearch(q.value.trim()), 250); });
  q.focus();
  if (lastSearch.length >= 2) doSearch(lastSearch);
}
async function doSearch(q) {
  lastSearch = q;
  const box = document.getElementById('cm-results');
  if (!box) return;
  if (q.length < 2) { box.innerHTML = '<p class="cm-muted">Escribe al menos 2 letras para buscar.</p>'; return; }
  box.innerHTML = '<div class="cm-loading">Buscando…</div>';
  try {
    const r = await api.commSearch(q);
    const list = r.results || [];
    box.innerHTML = list.length ? '<div class="cm-list">' + list.map(u => personCard(u, 'search')).join('') + '</div>'
      : '<p class="cm-muted">Ningún jugador coincide con «' + esc(q) + '».</p>';
    wirePanel(box);
  } catch (e) { box.innerHTML = '<div class="cm-error">' + esc(e.message) + '</div>'; }
}

// ---------- Mi VEX ID ----------
function loadVexId(panel) {
  const u = getUser();
  const code = u.connect_code || '';
  const url = location.origin + '/connect/' + code;
  let qrSvg = '';
  try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); qrSvg = qr.createSvgTag({ scalable: true, margin: 1 }); }
  catch (e) { qrSvg = '<div class="cm-qr-fail">No se pudo generar el QR</div>'; }

  panel.innerHTML =
    '<div class="cm-vex">' +
      '<div class="cm-card">' +
        '<div class="cm-card-glow"></div>' +
        '<div class="cm-card-top">' + avatarHTML(u.avatar, 'lg') +
          '<div class="cm-card-id"><div class="cm-card-name">' + esc(u.username) + '</div>' +
            '<div class="cm-card-handle">@' + esc(u.username.toLowerCase()) + '</div>' +
            '<div class="cm-card-meta"><span class="cm-vexno">' + vexId(u.member_no) + '</span>' + repChip(reputationFromStats()) + '</div></div>' +
        '</div>' +
        '<div class="cm-qr">' + qrSvg + '</div>' +
        '<div class="cm-code"><span class="cm-code-label">Código de conexión</span><b>' + esc(fmtCode(code)) + '</b></div>' +
        '<button class="btn-play cm-share" id="cm-share">Compartir VEX ID</button>' +
      '</div>' +
      '<div class="cm-vex-side">' +
        '<h3 class="cm-sub">Añadir en persona</h3>' +
        '<p class="cm-muted">Enseña tu QR y que lo escaneen con la cámara, o pásales tu código. También puedes añadir a alguien con su código:</p>' +
        '<div class="cm-addcode"><input id="cm-addcode-in" placeholder="Código (p. ej. ' + esc(fmtCode('ABCDEF')) + ')" autocomplete="off" maxlength="7">' +
          '<button class="cm-btn primary" id="cm-addcode-btn">Añadir</button></div>' +
        '<p class="cm-note">El escáner de cámara y las tarjetas NFC llegarán con la app. Nadie se añade sin que ambos confirmen.</p>' +
      '</div>' +
    '</div>';

  document.getElementById('cm-share').addEventListener('click', () => shareVex(url));
  document.getElementById('cm-addcode-btn').addEventListener('click', addByCode);
  document.getElementById('cm-addcode-in').addEventListener('keydown', e => { if (e.key === 'Enter') addByCode(); });
}
function fmtCode(c) { c = (c || '').toUpperCase(); return c.length > 3 ? c.slice(0, 3) + '-' + c.slice(3) : c; }
function reputationFromStats() {
  // El backend ya calcula reputación; aquí aproximamos para la tarjeta propia.
  return 'Nuevo';
}
async function addByCode() {
  const inp = document.getElementById('cm-addcode-in');
  const code = (inp.value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (code.length < 6) { toast('Introduce un código válido de 6 caracteres.', false); return; }
  try { const r = await api.commConnectAdd(code); toast(r.status === 'friends' ? '¡Ahora sois amigos!' : 'Solicitud enviada', true); inp.value = ''; refreshReqCount(); }
  catch (e) { toast(e.message || 'Error', false); }
}
async function shareVex(url) {
  try { if (navigator.share) { await navigator.share({ title: 'Mi VEX ID · VEXCHESS', text: 'Añádeme en VEXCHESS', url }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(url); toast('Enlace copiado al portapapeles', true); }
  catch (e) { toast('Copia tu enlace: ' + url); }
}

// ---------- modal perfil ----------
let modal = null;
function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'cm-modal';
  modal.innerHTML = '<div class="cm-modal-box"><button class="cm-modal-x" aria-label="Cerrar">✕</button><div class="cm-modal-body"></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.cm-modal-x').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('mousedown', e => { if (e.target === modal) modal.classList.remove('open'); });
  return modal;
}
async function openProfile(username) {
  const m = ensureModal();
  m.querySelector('.cm-modal-body').innerHTML = '<div class="cm-loading">Cargando perfil…</div>';
  m.classList.add('open');
  try {
    const r = await api.publicProfile(username);
    const p = r.profile;
    const played = (p.stats && p.stats.played) || 0;
    const badges = (p.badges || []).slice(0, 6);
    m.querySelector('.cm-modal-body').innerHTML =
      '<div class="cm-modal-head">' + avatarHTML(p.avatar, 'lg') +
        '<div><div class="cm-modal-name">' + esc(p.username) + '</div>' +
          '<div class="cm-modal-handle">@' + esc(p.username.toLowerCase()) + ' · ' + p.elo + ' Elo</div></div></div>' +
      '<div class="cm-modal-stats">' +
        cmStat('Partidas', played) + cmStat('Victorias', (p.stats && p.stats.wins) || 0) + cmStat('Derrotas', (p.stats && p.stats.losses) || 0) +
      '</div>' +
      (badges.length ? '<div class="cm-modal-badges">' + badges.map(b => '<span class="cm-mb" title="' + esc(badgeMeta(b.badge).name) + '">' + badgeIcon(b.badge, 'mb') + '</span>').join('') + '</div>' : '');
  } catch (e) {
    m.querySelector('.cm-modal-body').innerHTML = '<p class="cm-error">' + esc(e.message || 'No se pudo cargar el perfil') + '</p>';
  }
}
function cmStat(label, v) { return '<div class="cm-modal-stat"><b>' + v + '</b><span>' + label + '</span></div>'; }

function emptyHTML(title, sub) {
  return '<div class="cm-empty"><div class="cm-empty-ico">👥</div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></div>';
}

onAuth(render);
