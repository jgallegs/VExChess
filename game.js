// ============================================================
//  VEXCHESS · Partida online (tablero + WebSocket + relojes)
// ============================================================
import { Chess } from './chess.js';
import { getUser, isAuthResolved, onAuth, avatarHTML } from './auth.js?v=13';

const root = document.getElementById('game-root');
function gameId() { const m = location.pathname.match(/\/game\/([A-Za-z0-9-]+)/); return m ? m[1] : ''; }

let ws = null, you = null, info = null;
let serverFen = new Chess().fen();
let moves = [], white = null, black = null, statusG = 'waiting', result = null, reason = null, drawOffer = null;
let clock = { wMs: 0, bMs: 0, turn: 'w', base: 0, active: false };
let sel = null, targets = new Set(), pendingPromo = null;
let clockTimer = null, booted = false;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtClock(ms) {
  ms = Math.max(0, ms); const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const ss = s % 60;
  if (m >= 1) return m + ':' + String(ss).padStart(2, '0');
  return '0:' + String(ss).padStart(2, '0') + (ms < 10000 ? '.' + Math.floor((ms % 1000) / 100) : '');
}

function boot() {
  if (booted) return;
  if (!isAuthResolved()) { root.innerHTML = stateHTML('<div class="gm-ring"></div><p>Cargando…</p>'); return; }
  booted = true;
  const id = gameId();
  if (!id) { root.innerHTML = stateHTML('<h1>Partida no válida</h1><a class="btn-play" href="online.html">Volver</a>'); return; }
  root.innerHTML = stateHTML('<div class="gm-ring"></div><p>Conectando a la partida…</p>');
  connect(id);
}
function stateHTML(inner) { return '<section class="gm-state">' + inner + '</section>'; }

function connect(id) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/api/game/' + id + '/ws');
  ws.addEventListener('open', () => {});
  ws.addEventListener('message', (e) => onMsg(e));
  ws.addEventListener('close', () => { if (statusG !== 'over') setTimeout(() => { root.querySelector('.gm-conn') && (root.querySelector('.gm-conn').textContent = 'Reconectando…'); connect(id); }, 1500); });
  ws.addEventListener('error', () => {});
}

function applyState(m) {
  serverFen = m.fen; moves = m.moves || []; white = m.white; black = m.black; statusG = m.status;
  result = m.result; reason = m.reason; drawOffer = m.drawOffer;
  if (m.you !== undefined) you = m.you;
  clock = { wMs: m.wMs, bMs: m.bMs, turn: m.turn, base: Date.now(), active: m.status === 'active' };
  sel = null; targets = new Set();
  renderGame();
}
function onMsg(e) {
  let m; try { m = JSON.parse(e.data); } catch (err) { return; }
  if (m.t === 'state' || m.t === 'move') applyState(m);
  else if (m.t === 'end') { applyState(m); showEnd(); }
  else if (m.t === 'illegal') { renderGame(); }
  else if (m.t === 'draw_offer') { drawOffer = m.by; renderGame(); }
  else if (m.t === 'draw_declined') { drawOffer = null; renderGame(); }
}

function send(obj) { try { ws && ws.readyState === 1 && ws.send(JSON.stringify(obj)); } catch (e) {} }

// ---------- render ----------
const PIECE = (color, type) => '<svg class="gm-pc" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';
function renderGame() {
  const flip = you === 'b';
  const me = you === 'b' ? black : white;
  const opp = you === 'b' ? white : black;
  const meColor = you || 'w', oppColor = meColor === 'w' ? 'b' : 'w';
  root.innerHTML =
    '<div class="gm-layout">' +
      playerBar(opp, oppColor, 'top') +
      '<div class="gm-board" id="gm-board">' + boardHTML(flip) + '</div>' +
      playerBar(me, meColor, 'bottom') +
      '<div class="gm-bar">' +
        '<span class="gm-conn">' + (statusG === 'waiting' ? 'Esperando al rival…' : statusG === 'over' ? 'Partida terminada' : 'En juego') + '</span>' +
        (statusG === 'active' && you ? '<span class="gm-actions">' +
          (drawOffer && drawOffer !== you ? '<button class="gm-btn" id="gm-draw-yes">Aceptar tablas</button><button class="gm-btn ghost" id="gm-draw-no">Rechazar</button>' :
            '<button class="gm-btn ghost" id="gm-draw">' + (drawOffer === you ? 'Tablas ofrecidas' : 'Ofrecer tablas') + '</button>') +
          '<button class="gm-btn danger" id="gm-resign">Rendirse</button></span>' : '') +
      '</div>' +
      movesHTML() +
    '</div>';
  wireBoard(flip); wireActions();
  updateClocks();
  if (pendingPromo) renderPromo();
}
function playerBar(p, color, pos) {
  const ms = color === 'w' ? clock.wMs : clock.bMs;
  const turnOn = clock.active && clock.turn === color;
  return '<div class="gm-player ' + pos + (turnOn ? ' turn' : '') + '">' +
    (p ? avatarHTML(p.avatar, 'md') : '<span class="vx-avatar md"></span>') +
    '<span class="gm-player-info"><b>' + esc(p ? p.name : '—') + '</b><span>' + (p ? p.elo + ' Elo' : '') + '</span></span>' +
    '<span class="gm-clock" data-color="' + color + '">' + fmtClock(ms) + '</span>' +
  '</div>';
}
function boardHTML(flip) {
  const chess = new Chess(serverFen);
  const board = chess.board();
  const ranks = flip ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const last = moves.length ? lastMoveSquares(chess) : null;
  let html = '';
  for (const r of ranks) for (const f of files) {
    const sq = 'abcdefgh'[f] + (r + 1);
    const cell = board[7 - r][f];
    const dark = (r + f) % 2 === 0;
    const cls = ['gm-sq', dark ? 'd' : 'l'];
    if (sel === sq) cls.push('sel');
    if (targets.has(sq)) cls.push(cell ? 'cap' : 'tgt');
    if (last && (last.from === sq || last.to === sq)) cls.push('last');
    html += '<div class="' + cls.join(' ') + '" data-sq="' + sq + '">' + (cell ? PIECE(cell.color, cell.type) : '') + '</div>';
  }
  return html;
}
function lastMoveSquares(chess) {
  const h = chess.history({ verbose: true });
  const m = h[h.length - 1];
  return m ? { from: m.from, to: m.to } : null;
}
function movesHTML() {
  if (!moves.length) return '<div class="gm-moves" id="gm-moves"></div>';
  let rows = '';
  for (let i = 0; i < moves.length; i += 2) {
    rows += '<span class="gm-mv-n">' + (i / 2 + 1) + '.</span><span class="gm-mv">' + esc(moves[i]) + '</span><span class="gm-mv">' + (moves[i + 1] ? esc(moves[i + 1]) : '') + '</span>';
  }
  return '<div class="gm-moves" id="gm-moves">' + rows + '</div>';
}

function wireBoard(flip) {
  if (statusG !== 'active' || !you) return;
  root.querySelectorAll('.gm-sq').forEach(el => el.addEventListener('click', () => onSquare(el.dataset.sq)));
}
function onSquare(sq) {
  const chess = new Chess(serverFen);
  if (chess.turn() !== you) return;              // no es tu turno
  if (sel && targets.has(sq)) { tryMove(sel, sq); return; }
  const piece = chess.get(sq);
  if (piece && piece.color === you) {
    sel = sq;
    targets = new Set(chess.moves({ square: sq, verbose: true }).map(m => m.to));
    renderGame();
  } else { sel = null; targets = new Set(); renderGame(); }
}
function tryMove(from, to) {
  const chess = new Chess(serverFen);
  const legal = chess.moves({ square: from, verbose: true }).find(m => m.to === to);
  if (!legal) { sel = null; targets = new Set(); renderGame(); return; }
  if (legal.promotion) { pendingPromo = { from, to }; renderGame(); return; }
  send({ t: 'move', from, to });
  sel = null; targets = new Set();
}
function renderPromo() {
  let box = document.querySelector('.gm-promo');
  if (box) box.remove();
  box = document.createElement('div');
  box.className = 'gm-promo';
  box.innerHTML = '<div class="gm-promo-box">' + ['q', 'r', 'b', 'n'].map(t =>
    '<button class="gm-promo-pc" data-t="' + t + '">' + PIECE(you, t) + '</button>').join('') + '</div>';
  document.body.appendChild(box);
  box.querySelectorAll('.gm-promo-pc').forEach(b => b.addEventListener('click', () => {
    send({ t: 'move', from: pendingPromo.from, to: pendingPromo.to, promotion: b.dataset.t });
    pendingPromo = null; sel = null; targets = new Set(); box.remove();
  }));
  box.addEventListener('mousedown', e => { if (e.target === box) { pendingPromo = null; box.remove(); renderGame(); } });
}
function wireActions() {
  const r = document.getElementById('gm-resign'); if (r) r.addEventListener('click', () => { if (confirm('¿Seguro que quieres rendirte?')) send({ t: 'resign' }); });
  const d = document.getElementById('gm-draw'); if (d && !drawOffer) d.addEventListener('click', () => send({ t: 'drawoffer' }));
  const dy = document.getElementById('gm-draw-yes'); if (dy) dy.addEventListener('click', () => send({ t: 'drawrespond', accept: true }));
  const dn = document.getElementById('gm-draw-no'); if (dn) dn.addEventListener('click', () => send({ t: 'drawrespond', accept: false }));
}

// ---------- relojes ----------
function updateClocks() {
  root.querySelectorAll('.gm-clock').forEach(el => {
    const color = el.dataset.color;
    let ms = color === 'w' ? clock.wMs : clock.bMs;
    if (clock.active && clock.turn === color) ms -= (Date.now() - clock.base);
    el.textContent = fmtClock(ms);
    el.classList.toggle('low', ms < 20000 && clock.active);
  });
}
if (clockTimer) clearInterval(clockTimer);
clockTimer = setInterval(() => { if (statusG === 'active') updateClocks(); }, 200);

// ---------- fin ----------
function showEnd() {
  const meWon = (result === '1-0' && you === 'w') || (result === '0-1' && you === 'b');
  const draw = result === '1/2-1/2';
  const title = draw ? 'Tablas' : (you && meWon ? '¡Has ganado!' : you ? 'Has perdido' : (result === '1-0' ? 'Ganan las blancas' : 'Ganan las negras'));
  const reasons = { checkmate: 'jaque mate', resign: 'rendición', timeout: 'tiempo agotado', stalemate: 'rey ahogado', insufficient: 'material insuficiente', repetition: 'triple repetición', fifty: 'regla de 50 jugadas', draw: 'acuerdo de tablas' };
  let ov = document.querySelector('.gm-end');
  if (ov) ov.remove();
  ov = document.createElement('div'); ov.className = 'gm-end';
  ov.innerHTML = '<div class="gm-end-box"><div class="gm-end-title ' + (draw ? 'draw' : meWon ? 'win' : 'lose') + '">' + title + '</div>' +
    '<div class="gm-end-reason">' + (reasons[reason] || '') + '</div>' +
    '<div class="gm-end-score">' + (result || '') + '</div>' +
    '<div class="gm-end-actions"><a class="btn-play" href="online.html">Jugar otra <span aria-hidden="true">→</span></a></div></div>';
  document.body.appendChild(ov);
}

onAuth(boot);
