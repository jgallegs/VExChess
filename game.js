// ============================================================
//  VEXCHESS · Partida online (tablero estilo IA + WebSocket)
//  Mismo tablero, piezas y animación que el modo contra la IA.
// ============================================================
import { Chess } from './chess.js';
import { getUser, isAuthResolved, onAuth, avatarHTML } from './auth.js?v=15';
import { sfx } from './sounds.js?v=1';

const root = document.getElementById('game-root');
const FILES = 'abcdefgh';
function gameId() {
  const m = location.pathname.match(/\/game\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return (new URLSearchParams(location.search).get('g') || '').trim();
}

let ws = null, you = null;
let serverFen = new Chess().fen();
let confirmedFen = serverFen, pendingFrom = null, pendingTo = null;
let moves = [], white = null, black = null, statusG = 'waiting', result = null, reason = null, drawOffer = null, watchers = 0;
let clock = { wMs: 0, bMs: 0, turn: 'w', base: 0, active: false };
let sel = null, targets = new Set(), pendingPromo = null;
let clockTimer = null, booted = false, laid = false, flip = false, drawShown = false;
const pieceNodes = new Map();   // casilla -> nodo DOM
const squareEls = {};           // casilla -> nodo casilla
let boardEl = null, piecesEl = null;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtClock(ms) {
  ms = Math.max(0, ms); const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const ss = s % 60;
  if (m >= 1) return m + ':' + String(ss).padStart(2, '0');
  return '0:' + String(ss).padStart(2, '0') + (ms < 10000 ? '.' + Math.floor((ms % 1000) / 100) : '');
}
function stateHTML(inner) { return '<section class="gm-state">' + inner + '</section>'; }
const PIECE = (color, type) => '<svg class="pc" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';

// ---------- arranque + WebSocket ----------
function boot() {
  if (booted) return;
  if (!isAuthResolved()) { root.innerHTML = stateHTML('<div class="gm-ring"></div><p>Cargando…</p>'); return; }
  booted = true;
  const id = gameId();
  if (!id) { root.innerHTML = stateHTML('<h1>Partida no válida</h1><a class="btn-play" href="online.html">Volver</a>'); return; }
  root.innerHTML = stateHTML('<div class="gm-ring"></div><p>Conectando a la partida…</p>');
  connect(id);
}
function connect(id) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/api/game/' + id + '/ws');
  ws.addEventListener('message', (e) => onMsg(e));
  ws.addEventListener('close', () => { if (statusG !== 'over') setTimeout(() => connect(id), 1500); });
  ws.addEventListener('error', () => {});
}
function send(obj) { try { ws && ws.readyState === 1 && ws.send(JSON.stringify(obj)); } catch (e) {} }

function applyData(m) {
  if (m.fen) serverFen = m.fen;
  if (m.moves) moves = m.moves;
  if (m.white) white = m.white; if (m.black) black = m.black;
  if (m.status) statusG = m.status;
  result = m.result; reason = m.reason; drawOffer = m.drawOffer;
  if (m.watchers != null) watchers = m.watchers;
  if (m.you !== undefined) you = m.you;
  clock = { wMs: m.wMs, bMs: m.bMs, turn: m.turn, base: Date.now(), active: m.status === 'active' };
  confirmedFen = serverFen;
  maybeColorDraw();
}

// Sorteo/revelado de color al arrancar la partida (una sola vez, solo jugadores).
function maybeColorDraw() {
  if (drawShown || statusG !== 'active' || !you) return;
  drawShown = true;
  const label = you === 'w' ? 'blancas' : 'negras';
  const ov = document.createElement('div');
  ov.className = 'gm-draw';
  ov.innerHTML = '<div class="gm-draw-box"><div class="gm-draw-coin gm-' + you + '">' + PIECE(you, 'n') + '</div>' +
    '<div class="gm-draw-label">Juegas con <b>' + label + '</b></div><div class="gm-draw-sub">¡Suerte!</div></div>';
  document.body.appendChild(ov);
  try { sfx.ui(); } catch (e) {}
  setTimeout(() => { ov.classList.add('out'); setTimeout(() => ov.remove(), 400); }, 1900);
}
function onMsg(e) {
  let m; try { m = JSON.parse(e.data); } catch (err) { return; }
  if (m.t === 'state') { applyData(m); render(true); }
  else if (m.t === 'move') {
    if (pendingFrom === m.from && pendingTo === m.to) {
      // Mi propia jugada, ya animada de forma optimista: solo confirmar datos.
      pendingFrom = pendingTo = null;
      applyData(m); renderInfo(); decorate();
    } else {
      // Jugada del rival: anímala desde la posición actual.
      let mv = null;
      try { mv = new Chess(serverFen).move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }); } catch (err) { mv = null; }
      applyData(m);
      if (laid && mv) { animateMove(mv); moveSound(mv); } else render(true);
      sel = null; targets = new Set();
      renderInfo(); decorate();
    }
  }
  else if (m.t === 'end') { applyData(m); render(true); endSound(); showEnd(); }
  else if (m.t === 'illegal') { serverFen = confirmedFen; pendingFrom = pendingTo = null; sel = null; targets = new Set(); render(true); }
  else if (m.t === 'watchers') { watchers = m.n; updateWatchers(); }
  else if (m.t === 'draw_offer') { drawOffer = m.by; renderInfo(); }
  else if (m.t === 'draw_declined') { drawOffer = null; renderInfo(); }
}

// ---------- montaje del tablero ----------
function mountLayout() {
  flip = you === 'b';
  root.innerHTML =
    '<div class="gm-layout">' +
      '<div id="gm-top"></div>' +
      '<div class="board-wrap gm-board-wrap"><div id="board"></div><div class="pieces" id="pieces"></div></div>' +
      '<div id="gm-bottom"></div>' +
      '<div class="gm-bar" id="gm-bar"></div>' +
      '<div id="gm-moves-wrap"></div>' +
    '</div>';
  boardEl = document.getElementById('board'); piecesEl = document.getElementById('pieces');
  buildSquares();
  laid = true;
}
function buildSquares() {
  boardEl.innerHTML = '';
  for (const k in squareEls) delete squareEls[k];
  for (let dr = 0; dr < 8; dr++) for (let dc = 0; dc < 8; dc++) {
    const file = flip ? 7 - dc : dc;
    const rank = flip ? dr : 7 - dr;      // 0 = fila 1
    const sq = FILES[file] + (rank + 1);
    const el = document.createElement('div');
    el.className = 'square ' + ((dr + dc) % 2 === 0 ? 'light' : 'dark');
    el.dataset.sq = sq;
    el.addEventListener('click', () => onSquare(sq));
    if (dr === 7) { const f = document.createElement('span'); f.className = 'coord file'; f.textContent = FILES[file]; el.appendChild(f); }
    if (dc === 0) { const n = document.createElement('span'); n.className = 'coord rank'; n.textContent = (rank + 1); el.appendChild(n); }
    boardEl.appendChild(el);
    squareEls[sq] = el;
  }
}
function transformFor(sq) {
  let col = sq.charCodeAt(0) - 97, row = 8 - parseInt(sq[1], 10);
  if (flip) { col = 7 - col; row = 7 - row; }
  return 'translate(' + (col * 100) + '%,' + (row * 100) + '%)';
}
function rebuildPieces() {
  if (!piecesEl) return;
  piecesEl.innerHTML = ''; pieceNodes.clear();
  const b = new Chess(serverFen).board();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (!p) continue;
    const sq = FILES[c] + (8 - r);
    const el = document.createElement('div');
    el.className = 'pnode'; el.style.transform = transformFor(sq); el.innerHTML = PIECE(p.color, p.type);
    piecesEl.appendChild(el); pieceNodes.set(sq, el);
  }
}
function removeNode(sq) {
  const el = pieceNodes.get(sq); if (!el) return;
  pieceNodes.delete(sq); el.classList.add('captured-out'); setTimeout(() => el.remove(), 200);
}
function animateMove(mv) {
  if (!mv) return;
  if (mv.flags.includes('e')) removeNode(mv.to[0] + mv.from[1]);   // captura al paso
  else if (mv.captured) removeNode(mv.to);
  const node = pieceNodes.get(mv.from);
  if (!node) { rebuildPieces(); return; }
  pieceNodes.delete(mv.from); pieceNodes.set(mv.to, node);
  node.style.transform = transformFor(mv.to);
  if (mv.promotion) node.innerHTML = PIECE(mv.color, mv.promotion);
  if (mv.flags.includes('k') || mv.flags.includes('q')) {
    const rank = mv.color === 'w' ? '1' : '8';
    const rFrom = (mv.flags.includes('k') ? 'h' : 'a') + rank, rTo = (mv.flags.includes('k') ? 'f' : 'd') + rank;
    const rn = pieceNodes.get(rFrom);
    if (rn) { pieceNodes.delete(rFrom); pieceNodes.set(rTo, rn); rn.style.transform = transformFor(rTo); }
  }
}

// ---------- decoración (selección, jaque, pistas) ----------
function findKing(chess, color) {
  const b = chess.board();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = b[r][c]; if (p && p.type === 'k' && p.color === color) return FILES[c] + (8 - r); }
  return null;
}
function decorate() {
  Object.values(squareEls).forEach(el => { el.classList.remove('checkbg'); el.querySelectorAll('.hint').forEach(h => h.remove()); });
  pieceNodes.forEach(n => n.classList.remove('sel-glow', 'king-danger'));
  const chess = new Chess(serverFen);
  if (chess.isCheck()) { const k = findKing(chess, chess.turn()); if (k) { if (squareEls[k]) squareEls[k].classList.add('checkbg'); const kn = pieceNodes.get(k); if (kn) kn.classList.add('king-danger'); } }
  if (sel) {
    const n = pieceNodes.get(sel); if (n) n.classList.add('sel-glow');
    targets.forEach(t => { const el = squareEls[t]; if (!el) return; const h = document.createElement('div'); h.className = 'hint ' + (chess.get(t) ? 'capture' : 'move'); el.appendChild(h); });
  }
}

// ---------- interacción ----------
function onSquare(sq) {
  if (statusG !== 'active' || !you) return;
  const chess = new Chess(serverFen);
  if (chess.turn() !== you) return;
  if (sel && targets.has(sq)) { tryMove(sel, sq); return; }
  const p = chess.get(sq);
  if (p && p.color === you) { sel = sq; targets = new Set(chess.moves({ square: sq, verbose: true }).map(m => m.to)); decorate(); }
  else { sel = null; targets = new Set(); decorate(); }
}
function tryMove(from, to) {
  const chess = new Chess(serverFen);
  const legal = chess.moves({ square: from, verbose: true }).find(m => m.to === to);
  if (!legal) { sel = null; targets = new Set(); decorate(); return; }
  if (legal.promotion) { pendingPromo = { from, to }; renderPromo(); return; }
  doMove(from, to, 'q');
}
// Jugada optimista: mueve la pieza YA (como contra la IA) y avisa al servidor.
function doMove(from, to, promo) {
  sel = null; targets = new Set();
  try {
    const c = new Chess(serverFen);
    const mv = c.move({ from, to, promotion: promo || 'q' });
    if (mv) {
      animateMove(mv); moveSound(mv);
      serverFen = c.fen(); moves = moves.concat(mv.san);
      clock.turn = c.turn(); clock.base = Date.now();     // el reloj pasa al rival al instante
      pendingFrom = from; pendingTo = to;
    }
  } catch (e) {}
  send({ t: 'move', from, to, promotion: promo });
  renderInfo(); decorate();
}
function renderPromo() {
  let box = document.querySelector('.gm-promo'); if (box) box.remove();
  box = document.createElement('div'); box.className = 'gm-promo';
  box.innerHTML = '<div class="gm-promo-box">' + ['q', 'r', 'b', 'n'].map(t => '<button class="gm-promo-pc" data-t="' + t + '">' + PIECE(you, t) + '</button>').join('') + '</div>';
  document.body.appendChild(box);
  box.querySelectorAll('.gm-promo-pc').forEach(b => b.addEventListener('click', () => {
    const pp = pendingPromo; pendingPromo = null; box.remove();
    doMove(pp.from, pp.to, b.dataset.t);
  }));
  box.addEventListener('mousedown', e => { if (e.target === box) { pendingPromo = null; box.remove(); } });
}

// ---------- info (jugadores, relojes, jugadas, acciones) ----------
function render(full) {
  if (!laid) mountLayout();
  if (full) rebuildPieces();
  renderInfo(); decorate(); updateClocks();
  if (pendingPromo) renderPromo();
}
function playerBar(p, color) {
  const ms = color === 'w' ? clock.wMs : clock.bMs;
  const turnOn = clock.active && clock.turn === color;
  return '<div class="gm-player' + (turnOn ? ' turn' : '') + '">' +
    (p ? avatarHTML(p.avatar, 'md') : '<span class="vx-avatar md"></span>') +
    '<span class="gm-player-info"><b>' + esc(p ? p.name : '—') + '</b><span>' + (p ? p.elo + ' Elo' : '') + '</span></span>' +
    '<span class="gm-clock" data-color="' + color + '">' + fmtClock(ms) + '</span></div>';
}
function renderInfo() {
  const me = flip ? black : white, opp = flip ? white : black;
  const meColor = you || 'w', oppColor = meColor === 'w' ? 'b' : 'w';
  const top = document.getElementById('gm-top'), bottom = document.getElementById('gm-bottom');
  if (top) top.innerHTML = playerBar(opp, oppColor);
  if (bottom) bottom.innerHTML = playerBar(me, meColor);
  const bar = document.getElementById('gm-bar');
  if (bar) {
    bar.innerHTML =
      '<span class="gm-conn">' + (statusG === 'waiting' ? 'Esperando al rival…' : statusG === 'over' ? 'Partida terminada' : 'En juego') +
        (you ? '' : ' · <b class="gm-spec">Espectador</b>') +
        '<span class="gm-watchers"' + (watchers > 0 ? '' : ' hidden') + '><img class="vex-icon" src="assets/icons/social/spectate.svg" alt="" style="width:.95rem;height:.95rem;vertical-align:-.15em;margin-right:.25rem">' + watchers + '</span></span>' +
      (statusG === 'active' && you ? '<span class="gm-actions">' +
        (drawOffer && drawOffer !== you ? '<button class="gm-btn" id="gm-draw-yes">Aceptar tablas</button><button class="gm-btn ghost" id="gm-draw-no">Rechazar</button>' :
          '<button class="gm-btn ghost" id="gm-draw">' + (drawOffer === you ? 'Tablas ofrecidas' : 'Ofrecer tablas') + '</button>') +
        '<button class="gm-btn danger" id="gm-resign">Rendirse</button></span>' : '');
    wireActions();
  }
  const mw = document.getElementById('gm-moves-wrap');
  if (mw) mw.innerHTML = movesHTML();
}
function movesHTML() {
  if (!moves.length) return '';
  let rows = '';
  for (let i = 0; i < moves.length; i += 2) rows += '<span class="gm-mv-n">' + (i / 2 + 1) + '.</span><span class="gm-mv">' + esc(moves[i]) + '</span><span class="gm-mv">' + (moves[i + 1] ? esc(moves[i + 1]) : '') + '</span>';
  return '<div class="gm-moves">' + rows + '</div>';
}
function wireActions() {
  const r = document.getElementById('gm-resign'); if (r) r.addEventListener('click', () => { if (confirm('¿Seguro que quieres rendirte?')) send({ t: 'resign' }); });
  const d = document.getElementById('gm-draw'); if (d && !drawOffer) d.addEventListener('click', () => send({ t: 'drawoffer' }));
  const dy = document.getElementById('gm-draw-yes'); if (dy) dy.addEventListener('click', () => send({ t: 'drawrespond', accept: true }));
  const dn = document.getElementById('gm-draw-no'); if (dn) dn.addEventListener('click', () => send({ t: 'drawrespond', accept: false }));
}
function updateWatchers() { const el = root.querySelector('.gm-watchers'); if (el) { el.innerHTML = '<img class="vex-icon" src="assets/icons/social/spectate.svg" alt="" style="width:.95rem;height:.95rem;vertical-align:-.15em;margin-right:.25rem">' + watchers; el.hidden = watchers <= 0; } }

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

// ---------- sonidos ----------
function moveSound(mv) {
  try {
    if (new Chess(serverFen).isCheck()) sfx.check();
    else if (mv.promotion) sfx.promote();
    else if (mv.flags.includes('k') || mv.flags.includes('q')) sfx.castle();
    else if (mv.captured || mv.flags.includes('e')) sfx.capture();
    else sfx.move();
  } catch (e) {}
}
function endSound() {
  try { const meWon = (result === '1-0' && you === 'w') || (result === '0-1' && you === 'b'); if (result === '1/2-1/2') sfx.draw(); else if (you) (meWon ? sfx.win() : sfx.lose()); } catch (e) {}
}

// ---------- fin ----------
function showEnd() {
  const meWon = (result === '1-0' && you === 'w') || (result === '0-1' && you === 'b');
  const draw = result === '1/2-1/2';
  const title = draw ? 'Tablas' : (you && meWon ? '¡Has ganado!' : you ? 'Has perdido' : (result === '1-0' ? 'Ganan las blancas' : 'Ganan las negras'));
  const reasons = { checkmate: 'jaque mate', resign: 'rendición', timeout: 'tiempo agotado', stalemate: 'rey ahogado', insufficient: 'material insuficiente', repetition: 'triple repetición', fifty: 'regla de 50 jugadas', draw: 'acuerdo de tablas' };
  let ov = document.querySelector('.gm-end'); if (ov) ov.remove();
  ov = document.createElement('div'); ov.className = 'gm-end';
  ov.innerHTML = '<div class="gm-end-box"><div class="gm-end-title ' + (draw ? 'draw' : meWon ? 'win' : 'lose') + '">' + title + '</div>' +
    '<div class="gm-end-reason">' + (reasons[reason] || '') + '</div><div class="gm-end-score">' + (result || '') + '</div>' +
    '<div class="gm-end-actions"><a class="btn-play" href="online.html">Jugar otra <span aria-hidden="true">→</span></a></div></div>';
  document.body.appendChild(ov);
}

onAuth(boot);
