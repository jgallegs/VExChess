// ============================================================
//  VEXCHESS · Lobby online (emparejamiento + retos + rivales)
// ============================================================
import { api, getUser, isAuthResolved, onAuth, openAuth, avatarHTML } from './auth.js?v=14';

const root = document.getElementById('online-root');
export const TCS = [['1+0', 'Bullet'], ['3+0', 'Blitz'], ['3+2', 'Blitz'], ['5+0', 'Blitz'], ['10+0', 'Rápida'], ['15+10', 'Rápida']];
let tc = '5+0', searching = false, qTimer = null, chTimer = null;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function vexElo(u) { return (u.online_elo != null ? u.online_elo : (u.elo || 1200)); }

let toastEl = null;
function toast(msg, ok) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'ol-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.className = 'ol-toast show' + (ok ? ' ok' : ' err');
  clearTimeout(toastEl._t); toastEl._t = setTimeout(() => { toastEl.className = 'ol-toast'; }, 2600);
}
function state(inner) { return '<section class="ol-state">' + inner + '</section>'; }

function render() {
  if (!isAuthResolved()) { root.innerHTML = state('<div class="ol-ring"></div><p>Cargando…</p>'); return; }
  const u = getUser();
  if (!u) {
    root.innerHTML = state('<img class="ol-state-logo" src="assets/knight-logo.svg" alt=""><h1>Juega online</h1><p>Inicia sesión para retar a tus amigos o buscar rival.</p><button class="btn-play" id="ol-login">Entrar <span aria-hidden="true">→</span></button>');
    const lb = document.getElementById('ol-login'); if (lb) lb.addEventListener('click', () => openAuth('login'));
    return;
  }
  mountShell(u);
  loadChallenges(); loadRivals();
  if (chTimer) clearInterval(chTimer);
  chTimer = setInterval(loadChallenges, 5000);
}

function mountShell(u) {
  const tcBtns = TCS.map(([v, fam]) => '<button class="ol-tc' + (v === tc ? ' active' : '') + '" data-tc="' + v + '"><b>' + v + '</b><span>' + fam + '</span></button>').join('');
  root.innerHTML =
    '<div class="ol-head"><span class="eyebrow">Jugar online</span><h1 class="ol-title">Encuentra <span class="accent">rival</span></h1>' +
      '<div class="ol-elo">Elo online <b>' + vexElo(u) + '</b></div></div>' +
    '<section class="ol-mm">' +
      '<div class="ol-tcs" id="ol-tcs">' + tcBtns + '</div>' +
      '<div class="ol-mm-action" id="ol-mm-action"></div>' +
    '</section>' +
    '<div class="ol-cols">' +
      '<section class="ol-card"><h2 class="ol-h2">Retos</h2><div id="ol-challenges"><div class="ol-loading">Cargando…</div></div></section>' +
      '<section class="ol-card"><h2 class="ol-h2">Rivales</h2><div id="ol-rivals"><div class="ol-loading">Cargando…</div></div></section>' +
    '</div>';
  document.querySelectorAll('.ol-tc').forEach(b => b.addEventListener('click', () => {
    if (searching) return;
    tc = b.dataset.tc;
    document.querySelectorAll('.ol-tc').forEach(x => x.classList.toggle('active', x.dataset.tc === tc));
  }));
  renderMmAction();
}

function renderMmAction() {
  const box = document.getElementById('ol-mm-action');
  if (!box) return;
  box.innerHTML = searching
    ? '<div class="ol-searching"><div class="ol-ring small"></div><span>Buscando rival (' + tc + ')…</span><button class="ol-btn ghost" id="ol-cancel">Cancelar</button></div>'
    : '<button class="btn-play ol-find" id="ol-find">Buscar rival</button>';
  const find = document.getElementById('ol-find');
  if (find) find.addEventListener('click', startSearch);
  const cancel = document.getElementById('ol-cancel');
  if (cancel) cancel.addEventListener('click', stopSearch);
}

async function startSearch() {
  searching = true; renderMmAction();
  const tryJoin = async () => {
    try {
      const r = await api.playQueueJoin(tc);
      if (r.status === 'matched' && r.game_id) { stopSearch(true); location.href = '/game.html?g=' + r.game_id; return true; }
    } catch (e) { toast(e.message || 'Error', false); stopSearch(); return true; }
    return false;
  };
  if (await tryJoin()) return;
  qTimer = setInterval(async () => { await tryJoin(); }, 2500);
}
function stopSearch(matched) {
  searching = false;
  if (qTimer) { clearInterval(qTimer); qTimer = null; }
  if (!matched) { api.playQueueLeave().catch(() => {}); }
  renderMmAction();
}

async function loadChallenges() {
  const box = document.getElementById('ol-challenges');
  if (!box) return;
  try {
    const r = await api.playChallenges();
    const inc = r.incoming || [], out = r.outgoing || [];
    let html = '';
    if (!inc.length && !out.length) html = '<p class="ol-muted">No tienes retos. Reta a un amigo desde <a href="comunidad.html">Comunidad</a>.</p>';
    if (inc.length) html += '<div class="ol-sub">Recibidos</div>' + inc.map(c => chRow(c, 'in')).join('');
    if (out.length) html += '<div class="ol-sub">Enviados</div>' + out.map(c => chRow(c, 'out')).join('');
    box.innerHTML = html;
    box.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', () => chAction(el.dataset.act, el.dataset.id)));
  } catch (e) { box.innerHTML = '<p class="ol-error">' + esc(e.message) + '</p>'; }
}
function chRow(c, dir) {
  const u = c.user;
  const actions = dir === 'in'
    ? '<button class="ol-btn primary" data-act="accept" data-id="' + c.id + '">Aceptar</button><button class="ol-btn ghost" data-act="decline" data-id="' + c.id + '">Rechazar</button>'
    : '<button class="ol-btn ghost" data-act="cancel" data-id="' + c.id + '">Cancelar</button>';
  return '<div class="ol-person">' + avatarHTML(u.avatar, 'md') +
    '<span class="ol-person-info"><b>' + esc(u.name) + '</b><span>' + u.elo + ' Elo · ' + esc(c.tc) + '</span></span>' +
    '<span class="ol-person-actions">' + actions + '</span></div>';
}
async function chAction(act, id) {
  try {
    if (act === 'accept') { const r = await api.playRespond(id, 'accept'); if (r.game_id) { location.href = '/game.html?g=' + r.game_id; return; } }
    else if (act === 'decline') { await api.playRespond(id, 'decline'); toast('Reto rechazado', true); }
    else if (act === 'cancel') { await api.playCancel(id); toast('Reto cancelado', true); }
    loadChallenges();
  } catch (e) { toast(e.message || 'Error', false); }
}

async function loadRivals() {
  const box = document.getElementById('ol-rivals');
  if (!box) return;
  try {
    const r = await api.playRivals();
    const list = r.rivals || [];
    box.innerHTML = list.length ? list.map(rivRow).join('')
      : '<p class="ol-muted">Aún no tienes rivalidades. Juega partidas online y aquí verás tu cara a cara.</p>';
  } catch (e) { box.innerHTML = '<p class="ol-error">' + esc(e.message) + '</p>'; }
}
function rivRow(r) {
  const u = r.user;
  return '<div class="ol-person"><span class="ol-rank ' + (r.wins > r.losses ? 'up' : r.wins < r.losses ? 'down' : '') + '">' + r.wins + '–' + r.losses + (r.draws ? '–' + r.draws : '') + '</span>' +
    avatarHTML(u.avatar, 'md') + '<span class="ol-person-info"><b>' + esc(u.name) + '</b><span>' + u.elo + ' Elo · ' + r.games + ' partida' + (r.games === 1 ? '' : 's') + '</span></span></div>';
}

onAuth(render);
