// ============================================================
//  VEXCHESS · Página de perfil
// ============================================================
import { api, getUser, getStats, onAuth, avatarHTML, AVATAR_COLORS, openAuth } from './auth.js?v=1';

const root = document.getElementById('perfil-root');
const LEVEL_NAMES = { principiante: 'Principiante', facil: 'Fácil', intermedio: 'Intermedio', avanzado: 'Avanzado', maximo: 'Máximo', desconocido: 'Otro' };

function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return '—'; } }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function streakText(s) {
  if (!s) return '—';
  return s > 0 ? (s + (s === 1 ? ' victoria' : ' victorias')) : ((-s) + ((-s) === 1 ? ' derrota' : ' derrotas'));
}

function notLogged() {
  return '<section class="pf-guest">' +
    '<img src="assets/knight-logo.svg" alt="" class="pf-guest-logo">' +
    '<h1>Tu perfil te espera</h1>' +
    '<p>Inicia sesión o crea una cuenta para guardar tus partidas, ver tus estadísticas y tu Elo desde cualquier dispositivo.</p>' +
    '<button class="btn-play" id="pf-entrar">Entrar o crear cuenta <span aria-hidden="true">→</span></button>' +
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

  return '' +
    '<section class="pf-hero">' +
      avatarHTML(u.avatar, 'lg') +
      '<div class="pf-hero-info">' +
        '<h1 class="pf-name">' + esc(u.username) + '</h1>' +
        '<div class="pf-hero-meta"><span class="pf-elo">Elo ' + u.elo + '</span>' +
          '<span class="pf-since">Miembro desde ' + fmtDate(u.created_at) + '</span></div>' +
      '</div>' +
      '<div class="pf-hero-actions"><a class="pf-btn ghost" href="partidas.html">Mis partidas</a>' +
        '<button class="pf-btn danger" id="pf-logout">Cerrar sesión</button></div>' +
    '</section>' +

    '<section class="pf-stats">' +
      stat('Partidas', s.played) +
      stat('Victorias', s.wins, 'w') +
      stat('Derrotas', s.losses, 'l') +
      stat('Tablas', s.draws, 'd') +
      stat('% Victorias', wr + '%') +
      stat('Racha actual', streakText(s.streak)) +
      stat('Mejor racha', s.best_streak ? s.best_streak + ' seguidas' : '—') +
    '</section>' +

    (s.played ? (
    '<section class="pf-card">' +
      '<h2>Por nivel de la IA</h2>' +
      '<table class="pf-table"><thead><tr><th>Nivel</th><th>Jug.</th><th>V</th><th>D</th><th>E</th></tr></thead><tbody>' + byLevel + '</tbody></table>' +
    '</section>') : '') +

    '<section class="pf-card">' +
      '<h2>Avatar</h2>' +
      '<div class="pf-avatars">' + swatches + '</div>' +
    '</section>';
}
function stat(label, value, cls) {
  return '<div class="pf-stat"><b class="' + (cls || '') + '">' + value + '</b><span>' + label + '</span></div>';
}

function render() {
  const u = getUser();
  const s = getStats() || { played: 0, wins: 0, losses: 0, draws: 0, streak: 0, best_streak: 0, by_level: {} };
  root.innerHTML = u ? loggedIn(u, s) : notLogged();

  const entrar = document.getElementById('pf-entrar');
  if (entrar) entrar.addEventListener('click', () => openAuth('login'));

  const logout = document.getElementById('pf-logout');
  if (logout) logout.addEventListener('click', async () => { try { await api.logout(); } catch (e) {} location.reload(); });

  document.querySelectorAll('.pf-sw').forEach(sw => sw.addEventListener('click', async () => {
    try {
      const out = await api.updateProfile({ avatar: sw.dataset.avatar });
      if (out && out.user) { Object.assign(getUser(), out.user); render(); document.dispatchEvent(new CustomEvent('vexchess:auth', { detail: getUser() })); }
    } catch (e) {}
  }));
}

onAuth(render);
