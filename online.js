// ============================================================
//  VEXCHESS · Lobby online (emparejamiento + retos + rivales)
// ============================================================
import { api, getUser, isAuthResolved, onAuth, openAuth, avatarHTML } from './auth.js';
import { t } from './i18n.js';
import { skOnline } from './skeleton.js';

const root = document.getElementById('online-root');
export const TCS = [['1+0', t('online.tcBullet')], ['3+0', t('online.tcBlitz')], ['3+2', t('online.tcBlitz')], ['5+0', t('online.tcBlitz')], ['10+0', t('online.tcRapid')], ['15+10', t('online.tcRapid')]];
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
  if (!isAuthResolved()) { root.innerHTML = skOnline(); return; }
  const u = getUser();
  if (!u) {
    // Sin sesión también se puede jugar: contra la IA no hace falta cuenta.
    root.innerHTML = state('<img class="ol-state-logo" src="assets/knight-logo.svg" alt=""><h1>' + t('online.loggedOutTitle') + '</h1><p>' + t('online.loggedOutSubtitle') + '</p>' +
      '<button class="btn-play" id="ol-login">' + t('online.loginBtn') + ' <span aria-hidden="true">→</span></button>' +
      '<a class="ol-ai-quiet" href="play.html">' + t('common.playVsAi') + ' <span aria-hidden="true">→</span></a>');
    const lb = document.getElementById('ol-login'); if (lb) lb.addEventListener('click', () => openAuth('login'));
    return;
  }
  mountShell(u);
  loadChallenges(); loadRivals();
  if (chTimer) clearInterval(chTimer);
  chTimer = setInterval(loadChallenges, 5000);
}

// ---------- carrusel de modos de juego ----------
// Raíl horizontal con scroll-snap y arte Vexborn. Reglas de la casa (y de la
// guía scrollcraft): sin contadores, sin flechitas de "desliza", solo
// transform/opacity, marcado real. El movimiento firma: el arte de cada
// tarjeta se desplaza en paralaje según su posición en el raíl.
const MODES = () => [
  { href: 'play.html', art: 'noctis', title: t('online.vsAiTitle'), sub: t('online.vsAiSub') },
  { href: '#ol-mm', art: 'aurelia', title: t('online.modes.rivalTitle'), sub: t('online.modes.rivalSub') },
  { href: 'comunidad.html', art: 'kael', title: t('online.modes.friendTitle'), sub: t('online.modes.friendSub') },
  { href: 'puzzles.html', art: 'tikk', title: t('online.modes.puzzTitle'), sub: t('online.modes.puzzSub') },
  { href: 'academia.html', art: 'oryn', title: t('online.modes.acadTitle'), sub: t('online.modes.acadSub') },
];
function modesRailHTML() {
  return '<nav class="ol-modes" aria-label="' + t('online.modes.aria') + '">' +
    '<button class="ol-modes-btn prev" type="button" aria-hidden="true" tabindex="-1">‹</button>' +
    '<div class="ol-rail" id="ol-rail">' + MODES().map(m =>
      '<a class="ol-slide" href="' + m.href + '"' + (m.href.startsWith('#') ? ' data-anchor="1"' : '') + '>' +
        '<img class="ol-slide-art" src="assets/vexborn/card/' + m.art + '.webp" alt="" loading="lazy" draggable="false">' +
        '<span class="ol-slide-veil" aria-hidden="true"></span>' +
        '<span class="ol-slide-txt"><b>' + m.title + '</b><span>' + m.sub + '</span></span>' +
        '<span class="ol-slide-arrow" aria-hidden="true">→</span>' +
      '</a>').join('') + '</div>' +
    '<button class="ol-modes-btn next" type="button" aria-hidden="true" tabindex="-1">›</button>' +
  '</nav>';
}
function wireModesRail() {
  const rail = document.getElementById('ol-rail');
  if (!rail) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // el ancla del propio lobby baja suave hasta el emparejamiento
  rail.querySelectorAll('[data-anchor]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    const tgt = document.querySelector(a.getAttribute('href'));
    if (tgt) tgt.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }));
  // flechas (solo escritorio por CSS): un paso de tarjeta por pulsación
  const step = () => {
    const card = rail.querySelector('.ol-slide');
    return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).gap || '12') : 260;
  };
  const syncBtns = () => {
    const prev = rail.parentElement.querySelector('.prev'), next = rail.parentElement.querySelector('.next');
    if (!prev) return;
    prev.classList.toggle('off', rail.scrollLeft < 8);
    next.classList.toggle('off', rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8);
  };
  rail.parentElement.querySelectorAll('.ol-modes-btn').forEach(b =>
    b.addEventListener('click', () => rail.scrollBy({ left: (b.classList.contains('prev') ? -1 : 1) * step(), behavior: reduced ? 'auto' : 'smooth' })));
  // paralaje del arte: cada retrato se desliza según la posición de su
  // tarjeta respecto al centro del raíl (solo transform, con rAF)
  let raf = 0;
  const parallax = () => {
    raf = 0;
    const rb = rail.getBoundingClientRect();
    const mid = rb.left + rb.width / 2;
    rail.querySelectorAll('.ol-slide').forEach(s => {
      const b = s.getBoundingClientRect();
      const d = Math.max(-1, Math.min(1, (b.left + b.width / 2 - mid) / rb.width));
      const img = s.querySelector('.ol-slide-art');
      if (img) img.style.transform = 'translateX(' + (-d * 1.1) + 'rem) scale(1.16)';
    });
    syncBtns();
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(parallax); };
  if (!reduced) { rail.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); }
  parallax();
}

function mountShell(u) {
  const tcBtns = TCS.map(([v, fam]) => '<button class="ol-tc' + (v === tc ? ' active' : '') + '" data-tc="' + v + '"><b>' + v + '</b><span>' + fam + '</span></button>').join('');
  root.innerHTML =
    '<div class="ol-head"><span class="eyebrow">' + t('online.eyebrow') + '</span><h1 class="ol-title">' + t('online.heroTitle') + '</h1>' +
      '<div class="ol-elo">' + t('online.eloOnlineLabel') + ' <b>' + vexElo(u) + '</b></div></div>' +
    modesRailHTML() +
    '<section class="ol-mm" id="ol-mm">' +
      '<div class="ol-tcs" id="ol-tcs">' + tcBtns + '</div>' +
      '<div class="ol-mm-action" id="ol-mm-action"></div>' +
    '</section>' +
    '<div class="ol-cols">' +
      '<section class="ol-card"><h2 class="ol-h2">' + t('online.challengesHeading') + '</h2><div id="ol-challenges"><div class="ol-loading">' + t('online.loading') + '</div></div></section>' +
      '<section class="ol-card"><h2 class="ol-h2">' + t('online.rivalsHeading') + '</h2><div id="ol-rivals"><div class="ol-loading">' + t('online.loading') + '</div></div></section>' +
    '</div>';
  document.querySelectorAll('.ol-tc').forEach(b => b.addEventListener('click', () => {
    if (searching) return;
    tc = b.dataset.tc;
    document.querySelectorAll('.ol-tc').forEach(x => x.classList.toggle('active', x.dataset.tc === tc));
  }));
  wireModesRail();
  renderMmAction();
}

function renderMmAction() {
  const box = document.getElementById('ol-mm-action');
  if (!box) return;
  box.innerHTML = searching
    ? '<div class="ol-searching"><div class="ol-ring small"></div><span>' + t('online.searchingRival', { tc: tc }) + '</span><button class="ol-btn ghost" id="ol-cancel">' + t('online.cancelBtn') + '</button></div>'
    : '<button class="btn-play ol-find" id="ol-find">' + t('online.findRivalBtn') + '</button>';
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
    } catch (e) { toast(e.message || t('online.toastError'), false); stopSearch(); return true; }
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
    if (!inc.length && !out.length) html = '<p class="ol-muted">' + t('online.challengesEmpty') + '</p>';
    if (inc.length) html += '<div class="ol-sub">' + t('online.challengesIncoming') + '</div>' + inc.map(c => chRow(c, 'in')).join('');
    if (out.length) html += '<div class="ol-sub">' + t('online.challengesOutgoing') + '</div>' + out.map(c => chRow(c, 'out')).join('');
    box.innerHTML = html;
    box.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', () => chAction(el.dataset.act, el.dataset.id)));
  } catch (e) { box.innerHTML = '<p class="ol-error">' + esc(e.message) + '</p>'; }
}
function chRow(c, dir) {
  const u = c.user;
  const actions = dir === 'in'
    ? '<button class="ol-btn primary" data-act="accept" data-id="' + c.id + '">' + t('online.acceptBtn') + '</button><button class="ol-btn ghost" data-act="decline" data-id="' + c.id + '">' + t('online.declineBtn') + '</button>'
    : '<button class="ol-btn ghost" data-act="cancel" data-id="' + c.id + '">' + t('online.cancelBtn') + '</button>';
  return '<div class="ol-person">' + avatarHTML(u.avatar, 'md') +
    '<span class="ol-person-info"><b>' + esc(u.name) + '</b><span>' + t('online.personEloMeta', { elo: u.elo, tc: esc(c.tc) }) + '</span></span>' +
    '<span class="ol-person-actions">' + actions + '</span></div>';
}
async function chAction(act, id) {
  try {
    if (act === 'accept') { const r = await api.playRespond(id, 'accept'); if (r.game_id) { location.href = '/game.html?g=' + r.game_id; return; } }
    else if (act === 'decline') { await api.playRespond(id, 'decline'); toast(t('online.toastDeclined'), true); }
    else if (act === 'cancel') { await api.playCancel(id); toast(t('online.toastCancelled'), true); }
    loadChallenges();
  } catch (e) { toast(e.message || t('online.toastError'), false); }
}

async function loadRivals() {
  const box = document.getElementById('ol-rivals');
  if (!box) return;
  try {
    const r = await api.playRivals();
    const list = r.rivals || [];
    box.innerHTML = list.length ? list.map(rivRow).join('')
      : '<p class="ol-muted">' + t('online.rivalsEmpty') + '</p>';
  } catch (e) { box.innerHTML = '<p class="ol-error">' + esc(e.message) + '</p>'; }
}
function rivRow(r) {
  const u = r.user;
  return '<div class="ol-person"><span class="ol-rank ' + (r.wins > r.losses ? 'up' : r.wins < r.losses ? 'down' : '') + '">' + r.wins + '–' + r.losses + (r.draws ? '–' + r.draws : '') + '</span>' +
    avatarHTML(u.avatar, 'md') + '<span class="ol-person-info"><b>' + esc(u.name) + '</b><span>' + (r.games === 1 ? t('online.rivalEloGamesMeta', { elo: u.elo, count: r.games }) : t('online.rivalEloGamesMetaPlural', { elo: u.elo, count: r.games })) + '</span></span></div>';
}

onAuth(render);
