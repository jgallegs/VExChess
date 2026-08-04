// ============================================================
//  VEXCHESS · Página de conexión (/connect/CÓDIGO)
//  Muestra al jugador del VEX ID y permite añadirlo (con
//  confirmación por ambas partes).
// ============================================================
import { api, getUser, isAuthResolved, onAuth, openAuth, avatarHTML, repChipHTML } from './auth.js?v=15';
import { badgeIcon, badgeMeta } from './badges.js?v=3';

const root = document.getElementById('connect-root');
function code() {
  const m = location.pathname.match(/\/connect\/([A-Za-z0-9]+)/);
  if (m) return m[1].toUpperCase();
  return (new URLSearchParams(location.search).get('c') || '').toUpperCase();
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function vexId(no) { return no ? 'VEX-' + String(no).padStart(4, '0') : 'VEX-—'; }
function repChip(rep) { return repChipHTML(rep); }

function state(inner) { return '<section class="cm-state">' + inner + '</section>'; }

async function render() {
  if (!isAuthResolved()) { root.innerHTML = state('<div class="cm-ring"></div><p>Cargando…</p>'); return; }
  const c = code();
  if (!c) { root.innerHTML = state('<img class="cm-state-logo" src="assets/knight-logo.svg" alt=""><h1>Enlace no válido</h1><p>Este enlace de conexión no es correcto.</p><a class="btn-play" href="index.html">Inicio</a>'); return; }
  root.innerHTML = state('<div class="cm-ring"></div><p>Buscando jugador…</p>');
  let info;
  try { info = await api.commConnectInfo(c); }
  catch (e) {
    root.innerHTML = state('<img class="cm-state-logo" src="assets/knight-logo.svg" alt=""><h1>VEX ID no encontrado</h1><p>Este código no corresponde a ningún jugador.</p><a class="btn-play" href="index.html">Inicio</a>');
    return;
  }
  const p = info.profile, u = getUser();
  const badges = (p.badges || []).slice(0, 6);
  let action;
  if (!u) action = '<button class="btn-play cn-cta" id="cn-login">Inicia sesión para añadir</button>';
  else if (p.status === 'self') action = '<p class="cm-muted cn-msg">Este es tu propio VEX ID.</p><a class="btn-play cn-cta" href="comunidad.html">Ir a mi comunidad</a>';
  else if (p.status === 'friends') action = '<p class="cn-ok">✓ Ya sois amigos.</p><a class="btn-play cn-cta" href="comunidad.html">Ver amigos</a>';
  else if (p.status === 'pending_out') action = '<p class="cm-muted cn-msg">Ya le enviaste una solicitud. Falta que la acepte.</p>';
  else if (p.status === 'pending_in') action = '<button class="btn-play cn-cta" id="cn-accept">Aceptar solicitud</button>';
  else action = '<button class="btn-play cn-cta" id="cn-add">Añadir como amig@</button>';

  root.innerHTML =
    '<section class="cn-found">' +
      '<span class="cn-eyebrow">Has encontrado a</span>' +
      '<div class="cn-avatar">' + avatarHTML(p.avatar, 'lg') + '</div>' +
      '<h1 class="cn-name">' + esc(p.username) + '</h1>' +
      '<div class="cn-meta"><span class="cm-vexno">' + vexId(p.member_no) + '</span> · ' + p.elo + ' Elo ' + repChip(p.reputation) + '</div>' +
      (p.mutual ? '<div class="cn-mutual">' + p.mutual + ' amig@s en común</div>' : '') +
      (badges.length ? '<div class="cn-badges">' + badges.map(b => '<span title="' + esc(badgeMeta(b.badge).name) + '">' + badgeIcon(b.badge, 'mb') + '</span>').join('') + '</div>' : '') +
      '<div class="cn-action">' + action + '</div>' +
      '<p class="cm-note">Nadie se añade automáticamente: ambos tenéis que confirmar.</p>' +
    '</section>';

  const login = document.getElementById('cn-login');
  if (login) login.addEventListener('click', () => openAuth('login'));
  const add = document.getElementById('cn-add');
  if (add) add.addEventListener('click', async () => {
    add.disabled = true;
    try { const r = await api.commConnectAdd(c); showDone(r.status === 'friends' ? '¡Ahora sois amig@s!' : 'Solicitud enviada. Cuando la acepte, seréis amig@s.'); }
    catch (e) { add.disabled = false; toast(e.message || 'Error'); }
  });
  const acc = document.getElementById('cn-accept');
  if (acc) acc.addEventListener('click', async () => {
    acc.disabled = true;
    try { await api.commRespond(p.id, 'accept'); showDone('¡Ahora sois amig@s!'); }
    catch (e) { acc.disabled = false; toast(e.message || 'Error'); }
  });
}

function showDone(msg) {
  root.innerHTML = state('<img class="cn-done-anim" src="assets/social/anim/vex-connect.svg" alt=""><h1>' + esc(msg) + '</h1><a class="btn-play" href="comunidad.html">Ir a mi comunidad <span aria-hidden="true">→</span></a>');
}
let toastEl = null;
function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'cm-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.className = 'cm-toast show err';
  clearTimeout(toastEl._t); toastEl._t = setTimeout(() => { toastEl.className = 'cm-toast'; }, 2600);
}

onAuth(render);
