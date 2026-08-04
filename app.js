/* ============================================================
   Ajedrez con rival IA (Stockfish 18 · red neuronal NNUE)
   ------------------------------------------------------------
   - chess.js       -> reglas
   - Stockfish (x2) -> rival (Elo limitado) + entrenador (máx.)
   - Fichas         -> set SVG "Staunty"
   - i18n.js        -> TODOS los textos (es / en)
   ============================================================ */
import { Chess } from './chess.js';
import { MESSAGES, PIECE_META, CONCEPT_ICONS } from './i18n.js?v=8';
import { sfx } from './sounds.js?v=1';
import { api, getUser, AVATAR_COLORS } from './auth.js?v=16';

// --- Idioma ----------------------------------------------------------------
function detectLang() {
  try { const s = localStorage.getItem('lang'); if (s && MESSAGES[s]) return s; } catch (e) {}
  return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
}
let lang = detectLang();
function t(key) {
  const m = MESSAGES[lang] || MESSAGES.es;
  return m[key] !== undefined ? m[key] : MESSAGES.es[key];
}

// --- Estado del juego ------------------------------------------------------
const game = new Chess();
let selected = null;
let legalTargets = [];
let flipped = false;
let showDanger = true;
let pendingPromotion = null;

// --- Estado del rival ------------------------------------------------------
let humanColor = 'w';
let colorPref = 'random';   // 'w' | 'b' | 'random'  (color elegido por el jugador)
let firstStart = true;      // primera carga: dispara el sorteo si el color es Aleatorio
let engineThinking = false;
let engineReady = false;
let lastEval = null;

// --- Estado del entrenador -------------------------------------------------
let coachMode = false;
let suggestion = null;        // { from, to, san, reasonKey }
let coachEngine = null;
let coachReady = false;
let coachPending = false;

const LEVELS = {
  principiante: { elo: 1320, movetime: 300, limit: true },
  facil:        { elo: 1500, movetime: 400, limit: true },
  intermedio:   { elo: 1800, movetime: 600, limit: true },
  avanzado:     { elo: 2200, movetime: 800, limit: true },
  maximo:       { elo: 3190, movetime: 1000, limit: false },
};
let level = 'intermedio';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const CAP_ORDER = ['p', 'n', 'b', 'r', 'q'];
const HUMAN_FLAG = '🇪🇸';

function pieceSVG(color, type) {
  return '<svg class="pc" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';
}
function brandMark(cls) { return '<img class="' + cls + '" src="assets/knight.svg" alt="">'; }

// --- DOM -------------------------------------------------------------------
const boardEl = document.getElementById('board');
const arrowsEl = document.getElementById('arrows');
const statusEl = document.getElementById('status');
const noticeEl = document.getElementById('notice');
const historyEl = document.getElementById('history');
const promoEl = document.getElementById('promotion');
const evalEl = document.getElementById('eval');
const levelSel = document.getElementById('level');
const langSel = document.getElementById('lang');
const engineStatusEl = document.getElementById('engine-status');
const playerTopEl = document.getElementById('player-top');
const playerBottomEl = document.getElementById('player-bottom');
const loaderEl = document.getElementById('loader');
const loaderTextEl = document.getElementById('loader-text');
const loaderKnightEl = document.getElementById('loader-knight');
const piecesEl = document.getElementById('pieces');

function showLoader(text) { if (text) loaderTextEl.textContent = text; loaderEl.classList.remove('hidden'); }
function hideLoader() { loaderEl.classList.add('hidden'); }

// ==========================================================================
//  MOTOR DEL RIVAL
// ==========================================================================
let engine;
function initEngine() {
  engine = new Worker('./engine/stockfish-18-lite-single.js');
  engine.onmessage = onEngineMessage;
  engine.onerror = (e) => { engineStatusEl.textContent = t('engineError') + e.message; };
  post('uci');
}
function post(cmd) { engine.postMessage(cmd); }

function onEngineMessage(e) {
  const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
  if (line === 'uciok') { configureEngine(); post('isready'); return; }
  if (line === 'readyok') {
    engineReady = true;
    engineStatusEl.textContent = t('engineReady');
    hideLoader();
    if (firstStart) {                 // primera carga: retomar guardada, o sortear color
      firstStart = false;
      const saved = loadSavedGame();
      if (saved) { offerResume(saved); return; }
      if (colorPref === 'random' && drawEl) { pawnDraw(); return; }
    }
    maybeEngineMove();
    return;
  }
  if (line.startsWith('info') && line.includes(' score ')) { parseEval(line); render(); return; }
  if (line.startsWith('bestmove')) {
    const uci = line.split(' ')[1];
    engineThinking = false;
    if (uci && uci !== '(none)') applyUci(uci);
    render();
    maybeCoach();
    return;
  }
}
function configureEngine() {
  const cfg = LEVELS[level];
  post('setoption name UCI_LimitStrength value ' + (cfg.limit ? 'true' : 'false'));
  if (cfg.limit) post('setoption name UCI_Elo value ' + cfg.elo);
}
function maybeEngineMove() {
  if (game.isGameOver() || game.turn() === humanColor || !engineReady) return;
  engineThinking = true;
  lastEval = null;
  clearSuggestion();
  render();
  post('position fen ' + game.fen());
  post('go movetime ' + LEVELS[level].movetime);
}
function applyUci(uci) {
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci.length > 4) move.promotion = uci[4];
  const mv = game.move(move);
  if (mv) { animateMove(mv); moveSound(mv); }
  persistGame();
}

// Elige el efecto de sonido según la jugada y el estado resultante.
function moveSound(mv) {
  if (!mv) return;
  if (game.isCheckmate()) { (game.turn() === humanColor ? sfx.lose : sfx.win)(); return; }
  if (game.isStalemate() || game.isDraw()) { sfx.draw(); return; }
  const f = mv.flags || '';
  if (game.isCheck()) { sfx.check(); return; }
  if (f.includes('p')) { sfx.promote(); return; }
  if (f.includes('k') || f.includes('q')) { sfx.castle(); return; }
  if (f.includes('c') || f.includes('e')) { sfx.capture(); return; }
  sfx.move();
}

// --- Guardar / retomar partida (localStorage, sin backend) -----------------
const SAVE_KEY = 'vexchess:game';
function persistGame() {
  try {
    if (game.history().length === 0 || game.isGameOver()) { localStorage.removeItem(SAVE_KEY); return; }
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      pgn: game.pgn(), humanColor, level, plies: game.history().length, ts: Date.now()
    }));
  } catch (e) {}
}
function loadSavedGame() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (d && d.pgn) return d;
  } catch (e) {}
  return null;
}
function clearSavedGame() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

// --- Archivo de partidas terminadas (para revisarlas después) ---------------
const ARCHIVE_KEY = 'vexchess:archive';
let gameArchived = false;
function archiveGame() {
  if (gameArchived || !game.isGameOver() || game.history().length < 2) return;
  gameArchived = true;
  let result = '1/2-1/2';
  if (game.isCheckmate()) result = game.turn() === 'w' ? '0-1' : '1-0';
  const entry = {
    id: Date.now(), pgn: game.pgn(), result,
    humanColor, level, plies: game.history().length,
    date: new Date().toISOString()
  };
  try {
    const arr = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    arr.unshift(entry);
    if (arr.length > 60) arr.length = 60;
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(arr));
  } catch (e) {}
  // Si hay sesión, guarda también la partida en la cuenta (no bloquea el juego)
  try {
    if (getUser()) {
      api.saveGame({ pgn: entry.pgn, result: entry.result, human_color: entry.humanColor, level: entry.level, plies: entry.plies, played_at: entry.date }).catch(() => {});
    }
  } catch (e) {}
}
function parseEval(line) {
  const m = line.match(/score (cp|mate) (-?\d+)/);
  if (!m) return;
  let val = m[1] === 'cp' ? parseInt(m[2]) / 100 : (parseInt(m[2]) > 0 ? 1 : -1) * 100;
  const engineColor = humanColor === 'w' ? 'b' : 'w';
  lastEval = engineColor === 'w' ? val : -val;
}

// ==========================================================================
//  MOTOR DEL ENTRENADOR (fuerza máxima)
// ==========================================================================
function initCoach() {
  coachEngine = new Worker('./engine/stockfish-18-lite-single.js');
  coachEngine.onmessage = onCoachMessage;
  coachEngine.postMessage('uci');
}
function onCoachMessage(e) {
  const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
  if (line === 'uciok') {
    coachEngine.postMessage('setoption name UCI_LimitStrength value false');
    coachEngine.postMessage('isready');
    return;
  }
  if (line === 'readyok') { coachReady = true; render(); maybeCoach(); return; }
  if (line.startsWith('bestmove')) {
    coachPending = false;
    const uci = line.split(' ')[1];
    if (coachMode && uci && uci !== '(none)' && game.turn() === humanColor && !game.isGameOver()) {
      suggestion = describeMove(uci);
      render();
    }
    return;
  }
}
function maybeCoach() {
  if (!coachMode || !coachReady || coachPending) return;
  if (game.isGameOver() || engineThinking || game.turn() !== humanColor) return;
  coachPending = true;
  coachEngine.postMessage('position fen ' + game.fen());
  coachEngine.postMessage('go movetime 500');
}
function clearSuggestion() { suggestion = null; drawArrow(null); }

// Convierte una jugada UCI en { from, to, san, reasonKey } (sin tocar la partida).
function describeMove(uci) {
  const tmp = new Chess(game.fen());
  const mv = tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
  if (!mv) return null;
  let key;
  if (mv.flags.includes('k') || mv.flags.includes('q')) key = 'castle';
  else if (mv.san.includes('#')) key = 'mate';
  else if (mv.san.includes('+')) key = 'check';
  else if (mv.flags.includes('p')) key = 'promote';
  else if (mv.flags.includes('c') || mv.flags.includes('e')) key = 'capture';
  else if (mv.piece === 'n' || mv.piece === 'b') key = 'develop';
  else if (mv.piece === 'p') key = 'space';
  else key = 'improve';
  return { from: mv.from, to: mv.to, san: mv.san, reasonKey: key };
}

// --- Flecha del entrenador -------------------------------------------------
function squareCenter(sq) {
  let col = sq.charCodeAt(0) - 97;
  let row = 8 - parseInt(sq[1]);
  if (flipped) { col = 7 - col; row = 7 - row; }
  return { x: col + 0.5, y: row + 0.5 };
}
function drawArrow(from, to) {
  if (!from) { arrowsEl.innerHTML = ''; return; }
  const a = squareCenter(from), b = squareCenter(to);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const bx = b.x - (dx / len) * 0.32, by = b.y - (dy / len) * 0.32;
  arrowsEl.innerHTML =
    '<defs><marker id="ah" markerWidth="3.2" markerHeight="3.2" refX="1.6" refY="1.6" orient="auto">' +
    '<path d="M0,0 L3.2,1.6 L0,3.2 z" fill="#3aa856"/></marker></defs>' +
    '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + bx + '" y2="' + by + '" ' +
    'stroke="#3aa856" stroke-width="0.26" stroke-linecap="round" marker-end="url(#ah)" opacity="0.9"/>';
}

// ==========================================================================
//  TABLERO
// ==========================================================================
const squareEls = {};
function buildBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.rc = r + ',' + c;
      sq.addEventListener('click', onSquareClick);
      boardEl.appendChild(sq);
      squareEls[r + ',' + c] = sq;
    }
}
function rcToSquare(r, c) { return FILES[c] + (8 - r); }

// --- Capa de piezas (animación de movimiento) ------------------------------
const pieceNodes = new Map();   // casilla -> nodo DOM
function transformFor(square) {
  let col = square.charCodeAt(0) - 97, row = 8 - parseInt(square[1]);
  if (flipped) { col = 7 - col; row = 7 - row; }
  return 'translate(' + (col * 100) + '%,' + (row * 100) + '%)';
}
function rebuildPieces() {
  piecesEl.innerHTML = '';
  pieceNodes.clear();
  const board = game.board();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sq = rcToSquare(r, c);
      const el = document.createElement('div');
      el.className = 'pnode';
      el.style.transform = transformFor(sq);
      el.innerHTML = pieceSVG(p.color, p.type);
      piecesEl.appendChild(el);
      pieceNodes.set(sq, el);
    }
}
function repositionAll() { for (const [sq, el] of pieceNodes) el.style.transform = transformFor(sq); }
function removeNode(sq) {
  const el = pieceNodes.get(sq);
  if (!el) return;
  pieceNodes.delete(sq);
  el.classList.add('captured-out');
  setTimeout(() => el.remove(), 200);
}
// Anima una jugada (verbose move de chess.js): desliza, captura, enroque, corona.
function animateMove(mv) {
  if (!mv) return;
  if (mv.flags.includes('e')) removeNode(mv.to[0] + mv.from[1]);   // captura al paso
  else if (mv.captured) removeNode(mv.to);                          // captura normal
  const node = pieceNodes.get(mv.from);
  if (!node) { rebuildPieces(); return; }
  pieceNodes.delete(mv.from);
  pieceNodes.set(mv.to, node);
  node.style.transform = transformFor(mv.to);
  if (mv.promotion) node.innerHTML = pieceSVG(mv.color, mv.promotion);
  if (mv.flags.includes('k') || mv.flags.includes('q')) {          // enroque: mover la torre
    const rank = mv.color === 'w' ? '1' : '8';
    const rFrom = (mv.flags.includes('k') ? 'h' : 'a') + rank;
    const rTo = (mv.flags.includes('k') ? 'f' : 'd') + rank;
    const rn = pieceNodes.get(rFrom);
    if (rn) { pieceNodes.delete(rFrom); pieceNodes.set(rTo, rn); rn.style.transform = transformFor(rTo); }
  }
}

function render() {
  const board = game.board();
  const turn = game.turn();
  const checkSquare = game.isCheck() ? findPiece('k', turn) : null;
  const danger = (showDanger && !engineThinking) ? attackedPieces(humanColor) : new Set();

  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const dr = flipped ? 7 - r : r;
      const dc = flipped ? 7 - c : c;
      const el = squareEls[dr + ',' + dc];
      const piece = board[r][c];
      const squareName = rcToSquare(r, c);

      el.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      el.innerHTML = '';
      if (selected === squareName) el.classList.add('selected');
      // el rey en jaque: fondo oscuro en su casilla para resaltar el glow de la ficha
      if (squareName === checkSquare) el.classList.add('checkbg');
      else if (danger.has(squareName)) el.classList.add('danger');
      if (legalTargets.find(m => m.to === squareName)) {
        const dot = document.createElement('span');
        dot.className = piece ? 'hint capture' : 'hint move';
        el.appendChild(dot);
      }
      addCoordLabels(el, dr, dc, squareName);
    }

  // Glow del rey en jaque (rojo, sobre la ficha) y halo BLANCO en la ficha seleccionada
  pieceNodes.forEach(el => el.classList.remove('king-danger', 'sel-glow'));
  if (checkSquare) { const kn = pieceNodes.get(checkSquare); if (kn) kn.classList.add('king-danger'); }
  if (selected) { const sn = pieceNodes.get(selected); if (sn) sn.classList.add('sel-glow'); }

  if (coachMode && suggestion && turn === humanColor && !engineThinking && !game.isGameOver())
    drawArrow(suggestion.from, suggestion.to);
  else drawArrow(null);

  updateStatus(turn, danger);
  updatePlayers(turn);
  updateHistory();
  updateEvalBar();
}

// Barra de evaluación (visual): blancas llenan desde abajo. lastEval va en perspectiva de blancas.
function updateEvalBar() {
  const fill = document.getElementById('evalbar-fill');
  if (!fill) return;
  let pct = 50;
  if (lastEval !== null && lastEval !== undefined && !game.isGameOver()) {
    if (Math.abs(lastEval) >= 100) pct = lastEval > 0 ? 100 : 0;
    else { const c = Math.max(-8, Math.min(8, lastEval)); pct = 50 + (c / 8) * 46; }
  }
  fill.style.height = pct.toFixed(1) + '%';
}

function addCoordLabels(el, dr, dc, squareName) {
  if (dr === 7) { const f = document.createElement('span'); f.className = 'coord file'; f.textContent = squareName[0]; el.appendChild(f); }
  if (dc === 0) { const n = document.createElement('span'); n.className = 'coord rank'; n.textContent = squareName[1]; el.appendChild(n); }
}
function findPiece(type, color) {
  const board = game.board();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === type && p.color === color) return rcToSquare(r, c);
    }
  return null;
}
function attackedPieces(color) {
  const enemy = color === 'w' ? 'b' : 'w';
  const set = new Set();
  const board = game.board();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && game.isAttacked(rcToSquare(r, c), enemy)) set.add(rcToSquare(r, c));
    }
  return set;
}

// ==========================================================================
//  BARRAS DE JUGADOR
// ==========================================================================
function updatePlayers(turn) {
  const hist = game.history({ verbose: true });
  const capByW = [], capByB = [];
  for (const m of hist) if (m.captured) (m.color === 'w' ? capByW : capByB).push(m.captured);
  const matW = capByW.reduce((s, x) => s + VALUE[x], 0);
  const matB = capByB.reduce((s, x) => s + VALUE[x], 0);
  const advW = matW - matB;

  const bottomColor = flipped ? 'b' : 'w';
  const topColor = bottomColor === 'w' ? 'b' : 'w';
  const capOf = (col) => col === 'w' ? capByW : capByB;
  const advOf = (col) => col === 'w' ? advW : -advW;
  const active = (col) => turn === col && !game.isGameOver();
  renderBar(playerTopEl, topColor, capOf(topColor), advOf(topColor), active(topColor));
  renderBar(playerBottomEl, bottomColor, capOf(bottomColor), advOf(bottomColor), active(bottomColor));
}
function renderBar(el, color, capturedTypes, adv, isActive) {
  const isYou = color === humanColor;
  const rating = LEVELS[level].limit ? LEVELS[level].elo : t('max');
  const capColor = color === 'w' ? 'b' : 'w';

  const counts = {};
  capturedTypes.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
  let icons = '';
  for (const x of CAP_ORDER) {
    if (!counts[x]) continue;
    let group = '<span class="cap-group">';
    for (let i = 0; i < counts[x]; i++) group += '<span class="cap-ico">' + pieceSVG(capColor, x) + '</span>';
    icons += group + '</span>';
  }
  if (!icons) icons = '<span class="cap-empty">' + (labels.noCaps || 'Sin capturas') + '</span>';
  const advTxt = adv > 0 ? '<span class="adv">+' + adv + '</span>' : '';

  const user = isYou ? getUser() : null;
  let avatarInner, avatarStyle = '';
  if (isYou && user) {
    const av = user.avatar || 'knight:red';
    if (av.startsWith('img:')) {
      avatarInner = '<img class="avatar-mark avatar-img" src="assets/social/avatars/' + av.slice(4) + '.png" alt="">';
    } else {
      const col = AVATAR_COLORS[av.split(':')[1]] || AVATAR_COLORS.red;
      avatarInner = '<img class="avatar-mark avatar-knight" src="assets/knight.svg" alt="">';
      avatarStyle = ' style="background:' + col + '"';
    }
  } else if (isYou) {
    avatarInner = '<img class="avatar-mark avatar-guest" src="assets/icons/features/profile.svg" alt="">';
  } else {
    avatarInner = brandMark('avatar-mark');
  }
  const nm = isYou ? (user ? user.username : t('you')) : 'Stockfish 18';
  const colorLabel = t(color === 'w' ? 'white' : 'black');
  const meta = isYou
    ? '<span class="flag">' + HUMAN_FLAG + '</span><span class="rating">' + colorLabel + (user ? ' · ' + user.elo : '') + '</span>'
    : '<span class="rating">(' + rating + ')</span>';

  el.className = 'player' + (isActive ? ' active' : '');
  el.innerHTML =
    '<div class="avatar ' + (isYou ? 'you' : 'ai') + '"' + avatarStyle + '>' + avatarInner + '</div>' +
    '<div class="pinfo">' +
      '<div class="pname"><span class="nm">' + nm + '</span>' + meta + '</div>' +
      '<div class="captured">' + icons + advTxt + '</div>' +
    '</div>';
}

// --- Interacción -----------------------------------------------------------
function onSquareClick(e) {
  if (pendingPromotion || engineThinking) return;
  if (game.turn() !== humanColor) return;
  const [dr, dc] = e.currentTarget.dataset.rc.split(',').map(Number);
  const r = flipped ? 7 - dr : dr;
  const c = flipped ? 7 - dc : dc;
  const square = rcToSquare(r, c);
  const piece = game.get(square);
  const move = legalTargets.find(m => m.to === square);
  if (selected && move) {
    if (move.promotion) { openPromotion(selected, square, game.turn()); return; }
    humanMove({ from: selected, to: square });
    return;
  }
  if (piece && piece.color === game.turn()) {
    selected = square;
    legalTargets = game.moves({ square, verbose: true });
  } else { selected = null; legalTargets = []; }
  render();
}
function humanMove(m) {
  const mv = game.move(m);
  animateMove(mv);
  moveSound(mv);
  selected = null; legalTargets = [];
  clearSuggestion();
  persistGame();
  render();
  setTimeout(maybeEngineMove, 120);
}

// --- Coronación ------------------------------------------------------------
function openPromotion(from, to, color) {
  pendingPromotion = { from, to };
  promoEl.innerHTML = '';
  promoEl.classList.add('open');
  ['q', 'r', 'b', 'n'].forEach(x => {
    const btn = document.createElement('button');
    btn.className = 'promo-btn';
    btn.innerHTML = pieceSVG(color, x);
    btn.title = t('pieceNames')[x];
    btn.addEventListener('click', () => {
      const p = pendingPromotion;
      pendingPromotion = null;
      promoEl.classList.remove('open');
      humanMove({ from: p.from, to: p.to, promotion: x });
    });
    promoEl.appendChild(btn);
  });
}

// --- Estado / mensajes -----------------------------------------------------
function updateStatus(turn, danger) {
  if (game.isGameOver()) archiveGame();
  let msg = '';
  if (game.isCheckmate()) {
    msg = (turn !== humanColor) ? t('checkmateWin') : t('checkmateLose');
    statusEl.className = 'status over';
  } else if (game.isStalemate()) { msg = t('stalemate'); statusEl.className = 'status over'; }
  else if (game.isDraw()) { msg = t('draw'); statusEl.className = 'status over'; }
  else if (game.isCheck()) { msg = t('check'); statusEl.className = 'status check'; }
  else statusEl.className = 'status';
  statusEl.textContent = msg;

  if (lastEval !== null && !game.isGameOver()) {
    const s = (lastEval > 0 ? '+' : '') + lastEval.toFixed(1);
    const tag = lastEval > 0.4 ? t('advWhite') : lastEval < -0.4 ? t('advBlack') : t('even');
    evalEl.textContent = t('evalLabel') + ': ' + s + ' · ' + tag;
  } else evalEl.textContent = '';

  updateNotice(danger, turn);
  boardEl.classList.toggle('locked', engineThinking);
}
function updateNotice(danger, turn) {
  if (engineThinking) {
    noticeEl.className = 'notice thinking';
    noticeEl.innerHTML = '<span class="spinner"></span> ' + t('thinking');
    return;
  }
  if (coachMode && !coachReady && turn === humanColor && !game.isGameOver()) {
    noticeEl.className = 'notice coach';
    noticeEl.innerHTML = '<span class="spinner"></span> ' + t('coachLoading');
    return;
  }
  if (coachMode && suggestion && turn === humanColor && !game.isGameOver()) {
    noticeEl.className = 'notice coach';
    noticeEl.innerHTML = '<img class="vex-icon" src="assets/icons/gameplay/coach-mode.svg" alt=""> ' + t('suggestion') + ': <b>' + suggestion.san + '</b> — ' + t('reasons')[suggestion.reasonKey] + '.';
    return;
  }
  const queen = findPiece('q', humanColor);
  if (showDanger && !game.isGameOver() && queen && danger.has(queen)) {
    noticeEl.className = 'notice danger';
    noticeEl.innerHTML = '<img class="vex-icon" src="assets/icons/features/danger-queen.svg" alt=""> ' + t('queenDanger') + ' (' + queen + ')';
  } else if (showDanger && !game.isGameOver() && danger.size > 0) {
    noticeEl.className = 'notice danger';
    noticeEl.innerHTML = '<img class="vex-icon" src="assets/icons/features/danger-queen.svg" alt=""> ' + (danger.size === 1 ? t('piecesDanger1') : t('piecesDangerN').replace('{n}', danger.size));
  } else { noticeEl.className = 'notice'; noticeEl.innerHTML = ''; }
}
function updateHistory() {
  const moves = game.history();
  let html = '';
  for (let i = 0; i < moves.length; i += 2) {
    html += '<div class="ply"><span class="num">' + (i / 2 + 1) + '.</span>' +
            '<span class="san">' + (moves[i] || '') + '</span>' +
            '<span class="san">' + (moves[i + 1] || '') + '</span></div>';
  }
  historyEl.innerHTML = html || '<div class="empty">' + t('historyEmpty') + '</div>';
  historyEl.scrollTop = historyEl.scrollHeight;
}

// --- Nueva partida / controles --------------------------------------------
function newGame() {
  cancelDraw();                       // cierra el overlay del sorteo si estaba abierto
  clearSavedGame();                   // partida nueva: descarta la guardada
  gameArchived = false;
  game.reset();
  selected = null; legalTargets = []; pendingPromotion = null;
  engineThinking = false; lastEval = null;
  clearSuggestion();
  promoEl.classList.remove('open');
  flipped = (humanColor === 'b');
  rebuildPieces();
  configureEngine();
  post('isready');
  render();
  maybeCoach();
}
document.getElementById('btn-reset').addEventListener('click', startColorFlow);
document.getElementById('btn-undo').addEventListener('click', () => {
  if (engineThinking) return;
  game.undo();
  if (game.turn() !== humanColor) game.undo();
  selected = null; legalTargets = []; lastEval = null;
  clearSuggestion();
  persistGame();
  rebuildPieces();
  render();
  maybeCoach();
});
document.getElementById('btn-flip').addEventListener('click', () => { flipped = !flipped; repositionAll(); render(); });

// ==========================================================================
//  COLOR + SORTEO DE PEONES (Pawn Draw)
// ==========================================================================
const drawEl = document.getElementById('draw');
const drawCardsEl = document.getElementById('draw-cards');
const drawMsgEl = document.getElementById('draw-msg');
const drawHintEl = document.getElementById('draw-hint');
const drawSkipEl = document.getElementById('draw-skip');
const drawCards = Array.from(document.querySelectorAll('.draw-card'));
let drawLeftWhite = true, drawActive = false, drawTimer = null;

// Cierra/cancela cualquier sorteo en curso (evita que se queden las cartas).
function cancelDraw() {
  drawActive = false;
  if (drawTimer) { clearTimeout(drawTimer); drawTimer = null; }
  if (drawCardsEl) drawCardsEl.classList.remove('shuffling');
  if (drawEl) drawEl.classList.remove('open');
}
function setColorPref(pref) {
  colorPref = pref;
  document.querySelectorAll('.seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.color === pref));
  positionSegSlider(true);
}
// Deslizador vivo del segmento de color (estilo Atlas)
function positionSegSlider(animate) {
  const seg = document.getElementById('color-seg');
  if (!seg) return;
  let slider = seg.querySelector('.seg-slider');
  if (!slider) { slider = document.createElement('div'); slider.className = 'seg-slider'; seg.insertBefore(slider, seg.firstChild); }
  const active = seg.querySelector('.seg-btn.active');
  if (!active || !active.offsetWidth) return;
  if (animate === false) slider.style.transition = 'none';
  slider.style.width = active.offsetWidth + 'px';
  slider.style.transform = 'translateX(' + active.offsetLeft + 'px)';
  if (animate === false) requestAnimationFrame(() => { slider.style.transition = ''; });
}
window.addEventListener('resize', () => positionSegSlider(false));
function startColorFlow() {
  cancelDraw();                       // si había un sorteo abierto, ciérralo primero
  if (colorPref === 'random') {
    if (drawEl) pawnDraw();
    else { humanColor = Math.random() < 0.5 ? 'w' : 'b'; newGame(); }  // fallback sin overlay
  } else { humanColor = colorPref; newGame(); }
}
function colorForCard(i) { return i === 0 ? (drawLeftWhite ? 'w' : 'b') : (drawLeftWhite ? 'b' : 'w'); }
function revealCard(i, color) {
  const c = drawCards[i];
  c.innerHTML = '<span class="draw-pawn">' + pieceSVG(color, 'p') + '</span>';
  requestAnimationFrame(() => c.classList.add('revealed'));
}
function pawnDraw() {
  drawActive = true;
  drawLeftWhite = Math.random() < 0.5;
  drawMsgEl.textContent = '';
  drawHintEl.style.visibility = 'visible';
  drawSkipEl.style.visibility = 'visible';
  drawCards.forEach(c => { c.classList.remove('revealed'); c.innerHTML = ''; });
  drawEl.classList.add('open');
  drawCardsEl.classList.add('shuffling');   // barajado decorativo
  setTimeout(() => drawCardsEl.classList.remove('shuffling'), 520);
}
function resolveDraw(color) {
  if (!drawActive) return;
  drawActive = false;
  drawCardsEl.classList.remove('shuffling');
  humanColor = color;
  revealCard(0, colorForCard(0));
  revealCard(1, colorForCard(1));
  drawHintEl.style.visibility = 'hidden';
  drawSkipEl.style.visibility = 'hidden';
  drawMsgEl.textContent = color === 'w' ? t('drawWhite') : t('drawBlack');
  drawTimer = setTimeout(() => { drawTimer = null; drawEl.classList.remove('open'); newGame(); }, 1100);
}
drawCards.forEach(c => c.addEventListener('click', () => {
  if (drawActive && drawCardsEl && !drawCardsEl.classList.contains('shuffling')) resolveDraw(colorForCard(+c.dataset.i));
}));
drawSkipEl?.addEventListener('click', () => { if (drawActive) resolveDraw(colorForCard(Math.random() < 0.5 ? 0 : 1)); });

// --- Overlay "retomar partida" --------------------------------------------
const resumeEl = document.getElementById('resume');
function offerResume(saved) {
  if (!resumeEl) { doResume(saved); return; }
  const info = document.getElementById('resume-info');
  if (info) {
    let n = saved.plies;
    if (typeof n !== 'number') { try { n = (saved.pgn.match(/[a-hKQRBNO][^\s]*/g) || []).length; } catch (e) { n = 0; } }
    const es = lang !== 'en';
    const side = saved.humanColor === 'b' ? (es ? 'Negras' : 'Black') : (es ? 'Blancas' : 'White');
    const movesTxt = n ? (n + ' ' + (es ? (n === 1 ? 'jugada' : 'jugadas') : (n === 1 ? 'move' : 'moves')))
                       : (es ? 'partida en curso' : 'game in progress');
    info.textContent = movesTxt + ' · ' + side;
  }
  resumeEl.classList.add('open');
}
function closeResume() { if (resumeEl) resumeEl.classList.remove('open'); }
function startFreshAfterResume() {
  clearSavedGame();
  if (colorPref === 'random' && drawEl) { pawnDraw(); return; }
  maybeEngineMove();
}
function doResume(saved) {
  closeResume();
  humanColor = (saved && saved.humanColor === 'b') ? 'b' : 'w';
  if (saved && saved.level && LEVELS[saved.level]) { level = saved.level; if (levelSel) levelSel.value = level; }
  setColorPref(humanColor);
  game.reset();
  try { game.loadPgn(saved.pgn); }
  catch (e) { clearSavedGame(); startColorFlow(); return; }
  gameArchived = false;
  selected = null; legalTargets = []; pendingPromotion = null;
  engineThinking = false; lastEval = null;
  clearSuggestion();
  flipped = (humanColor === 'b');
  configureEngine();
  rebuildPieces();
  render();
  maybeCoach();
  setTimeout(maybeEngineMove, 200);   // si toca al motor, que mueva
}
document.getElementById('resume-yes')?.addEventListener('click', () => doResume(loadSavedGame()));
document.getElementById('resume-no')?.addEventListener('click', () => { closeResume(); startFreshAfterResume(); });

// Confirmación (reiniciar partida al cambiar de color a mitad de juego)
const confirmEl = document.getElementById('confirm');
let confirmCb = null;
function askConfirm(msg, onOk) {
  if (!confirmEl) { onOk(); return; }
  document.getElementById('confirm-msg').textContent = msg;
  confirmCb = onOk;
  confirmEl.classList.add('open');
}
document.getElementById('confirm-ok')?.addEventListener('click', () => { confirmEl.classList.remove('open'); const cb = confirmCb; confirmCb = null; if (cb) cb(); });
document.getElementById('confirm-cancel')?.addEventListener('click', () => { confirmEl.classList.remove('open'); confirmCb = null; });
confirmEl?.addEventListener('click', (e) => { if (e.target === confirmEl) { confirmEl.classList.remove('open'); confirmCb = null; } });

document.querySelectorAll('.seg-btn').forEach(btn => btn.addEventListener('click', () => {
  const c = btn.dataset.color;
  if (c === colorPref && game.history().length === 0) return;   // ya seleccionado y tablero fresco
  const apply = () => { setColorPref(c); startColorFlow(); };
  if (game.history().length > 0 && !game.isGameOver()) askConfirm(t('confirmRestart'), apply);
  else apply();
}));
const dangerToggle = document.getElementById('toggle-danger');
dangerToggle.addEventListener('change', () => { showDanger = dangerToggle.checked; render(); });
const coachToggle = document.getElementById('toggle-coach');
coachToggle.addEventListener('change', () => {
  coachMode = coachToggle.checked;
  if (coachMode && !coachEngine) initCoach();
  if (!coachMode) clearSuggestion();
  render();
  maybeCoach();
});
levelSel.addEventListener('change', () => { level = levelSel.value; configureEngine(); render(); });
langSel.addEventListener('change', () => {
  lang = langSel.value;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  applyI18n();
  requestAnimationFrame(() => positionSegSlider(false));   // reajusta el deslizador si cambió el ancho del texto
});

// ==========================================================================
//  GUÍA (modal) — contenido desde i18n
// ==========================================================================
function buildHelpContent() {
  const concepts = MESSAGES[lang].concepts;
  document.getElementById('help-concepts').innerHTML = concepts.map((c, i) => (
    '<div class="card">' +
      '<div class="card-top"><div class="card-emoji">' + CONCEPT_ICONS[i] + '</div>' +
      '<div class="card-name">' + c.nombre + '</div></div>' +
      '<div class="card-row">' + c.texto + '</div>' +
    '</div>'
  )).join('');

  buildPieceCarousel();
}

// ==========================================================================
//  CARRUSEL DE PIEZAS (guía): pieza grande a la izq. + simulación en bucle a la der.
// ==========================================================================
// Jugadas en un tablero 7x7 (centro [3,3]); "cap" marca capturas de piezas enemigas (negras).
const DEMO = {
  p: { start: [3, 4], scene: [{ t: 'n', c: 'b', at: [4, 3] }],
       moves: [{ to: [3, 3] }, { to: [4, 3], cap: 1 }] },
  n: { start: [3, 3], scene: [{ t: 'p', c: 'b', at: [1, 2] }, { t: 'b', c: 'b', at: [5, 4] }],
       moves: [{ to: [1, 2], cap: 1 }, { to: [5, 4], cap: 1 }, { to: [4, 1] }, { to: [2, 5] }] },
  b: { start: [3, 3], scene: [{ t: 'r', c: 'b', at: [5, 5] }],
       moves: [{ to: [1, 1] }, { to: [5, 5], cap: 1 }, { to: [1, 5] }] },
  r: { start: [3, 3], scene: [{ t: 'p', c: 'b', at: [3, 1] }],
       moves: [{ to: [3, 1], cap: 1 }, { to: [6, 3] }, { to: [0, 3] }] },
  q: { start: [3, 3], scene: [{ t: 'n', c: 'b', at: [5, 5] }, { t: 'p', c: 'b', at: [3, 1] }],
       moves: [{ to: [5, 5], cap: 1 }, { to: [3, 1], cap: 1 }, { to: [0, 3] }, { to: [6, 6] }] },
  k: { start: [3, 3], scene: [{ t: 'p', c: 'b', at: [4, 3] }],
       moves: [{ to: [3, 2] }, { to: [4, 3], cap: 1 }, { to: [2, 4] }] },
};
let pcIndex = 0, demoToken = 0;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const PC_TRT = 'transform .6s cubic-bezier(.34,.72,.28,1)';

function buildPieceCarousel() {
  const host = document.getElementById('help-cards');
  if (!host) return;
  const pieces = MESSAGES[lang].pieces;
  const slides = PIECE_META.map(p => {
    const d = pieces[p.t];
    let cells = '';
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) cells += '<div class="pc-cell ' + (((r + c) % 2 === 0) ? 'l' : 'd') + '"></div>';
    const scene = (DEMO[p.t].scene || []).map(s => '<div class="pc-scene" data-at="' + s.at[0] + ',' + s.at[1] + '">' + pieceSVG(s.c, s.t) + '</div>').join('');
    return '<div class="pc-slide" data-piece="' + p.t + '">' +
        '<div class="pc-left">' +
          '<div class="pc-head">' +
            '<div class="pc-bigpiece">' + pieceSVG('w', p.t) + '</div>' +
            '<div class="pc-titlewrap"><div class="pc-name">' + d.nombre + '</div>' +
              '<span class="pc-value">' + labels.value + ' ' + p.valor + '</span></div>' +
          '</div>' +
          '<div class="pc-rows">' +
            '<div class="pc-row"><b>' + labels.move + '</b> ' + d.mueve + '</div>' +
            '<div class="pc-row"><b>' + labels.history + '</b> ' + d.historia + '</div>' +
            '<div class="pc-row"><b>' + labels.goals + '</b> ' + d.objetivos + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pc-right"><div class="pc-demoboard">' +
          '<div class="pc-grid">' + cells + '</div>' +
          scene +
          '<div class="pc-targetdot"></div>' +
          '<div class="pc-piece-anim">' + pieceSVG('w', p.t) + '</div>' +
        '</div></div>' +
      '</div>';
  }).join('');
  const dots = PIECE_META.map((p, i) => '<button class="pc-dot" data-i="' + i + '" aria-label="' + pieces[p.t].nombre + '"></button>').join('');
  host.className = 'pc-carousel';
  host.innerHTML =
    '<button class="pc-nav pc-prev" id="pc-prev" aria-label="Anterior">‹</button>' +
    '<div class="pc-viewport"><div class="pc-track" id="pc-track">' + slides + '</div></div>' +
    '<button class="pc-nav pc-next" id="pc-next" aria-label="Siguiente">›</button>' +
    '<div class="pc-dots" id="pc-dots">' + dots + '</div>';
  host.querySelector('#pc-prev').addEventListener('click', () => pcGoto(pcIndex - 1));
  host.querySelector('#pc-next').addEventListener('click', () => pcGoto(pcIndex + 1));
  host.querySelectorAll('.pc-dot').forEach(dot => dot.addEventListener('click', () => pcGoto(+dot.dataset.i)));
  wirePcSwipe(host.querySelector('#pc-track'));
  pcGoto(Math.min(pcIndex, PIECE_META.length - 1));
}

function pcGoto(i) {
  const n = PIECE_META.length;
  pcIndex = (i % n + n) % n;
  const track = document.getElementById('pc-track');
  if (!track) return;
  track.style.transform = 'translateX(' + (-pcIndex * 100) + '%)';
  document.querySelectorAll('.pc-dot').forEach((d, idx) => d.classList.toggle('active', idx === pcIndex));
  startActiveDemo();
}

function startActiveDemo() {
  const token = ++demoToken;   // cancela cualquier demo anterior
  const modal = document.getElementById('help-modal');
  if (!modal || !modal.classList.contains('open')) return;   // solo anima con el modal abierto
  const slide = document.querySelectorAll('.pc-slide')[pcIndex];
  if (slide) runDemo(slide, DEMO[slide.dataset.piece], token);
}

async function runDemo(slide, cfg, token) {
  const piece = slide.querySelector('.pc-piece-anim');
  const dot = slide.querySelector('.pc-targetdot');
  const scenes = Array.from(slide.querySelectorAll('.pc-scene'));
  if (!piece || !dot || !cfg) return;
  const setPos = (el, c, r) => { el.style.transform = 'translate(' + (c * 100) + '%, ' + (r * 100) + '%)'; };
  const sceneAt = (c, r) => scenes.find(s => s.dataset.at === c + ',' + r);
  // init: pieza en salida, enemigos visibles en su sitio
  piece.style.transition = 'none';
  setPos(piece, cfg.start[0], cfg.start[1]);
  piece.style.opacity = '1';
  scenes.forEach(s => { const [c, r] = s.dataset.at.split(',').map(Number); s.style.transition = 'none'; setPos(s, c, r); s.style.opacity = '1'; });
  void piece.offsetWidth;
  piece.style.transition = PC_TRT;
  scenes.forEach(s => { s.style.transition = 'opacity .3s ease'; });
  let i = 0;
  await wait(600);
  while (token === demoToken) {
    const mv = cfg.moves[i % cfg.moves.length];
    const [tc, tr] = mv.to;
    const victim = mv.cap ? sceneAt(tc, tr) : null;
    dot.classList.toggle('cap', !!mv.cap);
    setPos(dot, tc, tr); dot.style.opacity = '1';
    await wait(430); if (token !== demoToken) break;
    setPos(piece, tc, tr);
    await wait(360); if (token !== demoToken) break;
    if (victim) victim.style.opacity = '0';        // la pieza aterriza -> captura
    dot.style.opacity = '0';
    await wait(320); if (token !== demoToken) break;
    piece.style.transition = 'opacity .28s ease';
    piece.style.opacity = '0';
    await wait(300); if (token !== demoToken) break;
    piece.style.transition = 'none';
    setPos(piece, cfg.start[0], cfg.start[1]);
    void piece.offsetWidth;
    if (victim) victim.style.opacity = '1';          // se restaura el enemigo al reiniciar
    piece.style.transition = 'opacity .28s ease';
    piece.style.opacity = '1';
    await wait(320); if (token !== demoToken) break;
    piece.style.transition = PC_TRT;
    i++;
    await wait(430);
  }
}

function wirePcSwipe(track) {
  if (!track) return;
  let x0 = null;
  track.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  track.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) pcGoto(pcIndex + (dx < 0 ? 1 : -1));
  });
  track.addEventListener('pointercancel', () => { x0 = null; });
}
// etiquetas internas de las tarjetas por idioma
let labels = {};
function refreshLabels() {
  labels = lang === 'en'
    ? { value: 'Value:', move: 'How it moves.', history: 'History & trivia.', goals: 'Goals & play.', noCaps: 'No captures yet' }
    : { value: 'Valor:', move: 'Cómo se mueve.', history: 'Historia y curiosidades.', goals: 'Objetivos y jugadas.', noCaps: 'Sin capturas' };
}
function wireHelp() {
  const modal = document.getElementById('help-modal');
  const open = () => { modal.classList.add('open'); startActiveDemo(); };
  const close = () => { modal.classList.remove('open'); demoToken++; };   // detiene la simulación
  document.getElementById('help-btn').addEventListener('click', open);
  document.getElementById('help-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') pcGoto(pcIndex + 1);
    else if (e.key === 'ArrowLeft') pcGoto(pcIndex - 1);
  });
}

// ==========================================================================
//  APLICAR IDIOMA A TODA LA INTERFAZ
// ==========================================================================
function buildLevels() {
  const current = levelSel.value || level;
  levelSel.innerHTML = '';
  const labelsLv = t('levels');
  Object.keys(LEVELS).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = labelsLv[key];
    if (key === current) opt.selected = true;
    levelSel.appendChild(opt);
  });
}
function applyI18n() {
  document.documentElement.lang = lang;
  document.title = 'VEXCHESS · ' + t('appSub');
  langSel.value = lang;
  refreshLabels();

  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('lang-label', t('langLabel'));
  set('level-label', t('levelLabel'));
  set('coach-text', t('coachToggle'));
  set('coach-sub', t('coachToggleSub'));
  set('danger-text', t('dangerToggle'));
  set('help-title', t('helpTitle'));
  set('concepts-title', t('conceptsTitle'));
  set('pieces-title', t('piecesTitle'));
  set('loader-text', t('loaderText'));
  engineStatusEl.textContent = engineReady ? t('engineReady') : t('engineLoading');
  document.getElementById('help-btn').title = t('helpBtn');
  document.getElementById('btn-undo').textContent = t('undo');
  document.getElementById('btn-flip').textContent = t('flip');
  document.getElementById('btn-reset').textContent = t('newGame');
  set('color-label', t('colorLabel'));
  set('color-w', t('colorWhite'));
  set('color-r', t('colorRandom'));
  set('color-b', t('colorBlack'));
  set('draw-title', t('drawTitle'));
  set('draw-hint', t('drawPick'));
  set('draw-skip', t('drawSkip'));
  set('confirm-ok', t('confirmOk'));
  set('confirm-cancel', t('confirmCancel'));

  const el = (id) => document.getElementById(id);
  if (el('coach-wrap')) el('coach-wrap').title = t('coachToggle') + ' · ' + t('coachToggleSub');
  if (el('danger-wrap')) el('danger-wrap').title = t('dangerToggle');
  const movesTxt = lang === 'en' ? 'Moves' : 'Jugadas';
  if (el('moves-btn')) el('moves-btn').textContent = movesTxt;
  if (el('moves-title')) el('moves-title').textContent = movesTxt;

  buildLevels();
  buildHelpContent();
  syncCustomSelects();
  render();
}

// ==========================================================================
//  DESPLEGABLES PROPIOS (estilo de la web, sin bordes) que envuelven a los <select>
// ==========================================================================
const CARET_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function enhanceSelects() {
  document.querySelectorAll('select[data-enhance]').forEach(sel => {
    if (sel.__enhanced) return;
    sel.__enhanced = true;
    const wrap = document.createElement('div');
    wrap.className = 'cselect';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cselect-trigger';
    trigger.innerHTML = '<span class="cselect-label"></span><span class="cselect-caret">' + CARET_SVG + '</span>';
    const list = document.createElement('div');
    list.className = 'cselect-list';
    wrap.appendChild(trigger);
    wrap.appendChild(list);

    const buildList = () => {
      list.innerHTML = '';
      Array.from(sel.options).forEach((o, i) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cselect-opt' + (i === sel.selectedIndex ? ' active' : '');
        item.textContent = o.textContent;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (sel.selectedIndex !== i) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
          syncCustomSelects();
          wrap.classList.remove('open');
        });
        list.appendChild(item);
      });
    };
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = wrap.classList.contains('open');
      document.querySelectorAll('.cselect.open').forEach(w => w.classList.remove('open'));
      if (!wasOpen) { buildList(); wrap.classList.add('open'); }
    });
    sel.addEventListener('change', syncCustomSelects);
  });
  if (!enhanceSelects.__wired) {
    enhanceSelects.__wired = true;
    document.addEventListener('click', () => document.querySelectorAll('.cselect.open').forEach(w => w.classList.remove('open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.cselect.open').forEach(w => w.classList.remove('open')); });
  }
  syncCustomSelects();
}
function syncCustomSelects() {
  document.querySelectorAll('.cselect').forEach(w => {
    const sel = w.querySelector('select');
    const lab = w.querySelector('.cselect-label');
    if (sel && lab) { const o = sel.options[sel.selectedIndex]; lab.textContent = o ? o.textContent : ''; }
  });
}

// ==========================================================================
//  ASA DE REDIMENSIONAR EL TABLERO (solo escritorio; el CSS la oculta en móvil)
//  Arrastra hacia abajo-derecha para agrandar. Mínimo/por defecto = tamaño actual.
//  Doble clic = restablecer.
// ==========================================================================
(function setupBoardResize() {
  const handle = document.getElementById('resize-handle');
  const wrap = document.querySelector('.board-wrap');
  const bEl = document.getElementById('board');
  if (!handle || !wrap || !bEl) return;
  const MIN = 1, MAX = 1.35;
  let scale = 1, startX = 0, startY = 0, startScale = 1, startPx = 1, dragging = false;

  const setScale = (s) => {
    scale = Math.max(MIN, Math.min(MAX, s));
    document.documentElement.style.setProperty('--board-scale', scale.toFixed(4));
  };
  const onMove = (e) => {
    if (!dragging) return;
    const delta = ((e.clientX - startX) + (e.clientY - startY)) / 2;  // abajo-derecha = agrandar
    setScale(startScale * ((startPx + delta) / startPx));
    e.preventDefault();
  };
  const onUp = (e) => {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('resizing');
    document.body.classList.remove('resizing-board');
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  handle.addEventListener('pointerdown', (e) => {
    if (!handle.offsetParent) return;   // oculto (móvil): desactivado
    dragging = true;
    startX = e.clientX; startY = e.clientY; startScale = scale;
    startPx = bEl.getBoundingClientRect().width || 1;
    wrap.classList.add('resizing');
    document.body.classList.add('resizing-board');
    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  });
  handle.addEventListener('dblclick', (e) => { setScale(1); e.preventDefault(); });
})();

// --- Arranque --------------------------------------------------------------
// La pantalla de inicio (intro con la animación del logo) la gestiona navbar.js
// en la variante "battle". Aquí ya no se dispara para evitar duplicados.
// Al iniciar/cerrar sesión, repinta la tarjeta del jugador (nombre, avatar, Elo)
document.addEventListener('vexchess:auth', () => { try { render(); } catch (e) {} });
loaderKnightEl.innerHTML = brandMark('loader-mark');
buildBoard();
rebuildPieces();
wireHelp();
setColorPref('random');   // "Aleatorio" activo por defecto
// Popover de jugadas (historial), abierto desde el botón del dock
(function wireMoves() {
  const btn = document.getElementById('moves-btn');
  const pop = document.getElementById('history-pop');
  if (!btn || !pop) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); const open = pop.classList.toggle('open'); btn.classList.toggle('active', open); });
  document.addEventListener('click', (e) => {
    if (pop.classList.contains('open') && !pop.contains(e.target) && !btn.contains(e.target)) { pop.classList.remove('open'); btn.classList.remove('active'); }
  });
})();
// Exportar / copiar PGN
(function wirePgn() {
  const b = document.getElementById('pgn-btn');
  if (!b) return;
  b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const pgn = game.pgn() || '';
    const done = (msg) => { const old = b.textContent; b.textContent = msg; setTimeout(() => { b.textContent = old; }, 1300); };
    try { await navigator.clipboard.writeText(pgn); done('¡Copiado!'); }
    catch (_) {
      // fallback: descargar como archivo
      try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([pgn], { type: 'text/plain' })); a.download = 'partida.pgn'; a.click(); done('Descargado'); }
      catch (e2) { done('Error'); }
    }
  });
})();
// Sonido: botón de silencio + desbloqueo del audio al primer gesto
(function wireSound() {
  const btn = document.getElementById('sound-btn');
  const paint = () => {
    if (!btn) return;
    btn.innerHTML = '<img class="vex-icon" src="assets/icons/gameplay/' + (sfx.muted ? 'sound-off' : 'sound-on') + '.svg" alt="">';
    btn.classList.toggle('muted', sfx.muted);
    btn.setAttribute('aria-pressed', String(!sfx.muted));
  };
  btn?.addEventListener('click', () => { sfx.toggle(); paint(); if (!sfx.muted) sfx.ui(); });
  paint();
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true, capture: true });
})();
enhanceSelects();     // desplegables propios con estilo de la web
applyI18n();          // pinta todos los textos en el idioma detectado
requestAnimationFrame(() => positionSegSlider(false));   // coloca el deslizador del segmento sin animación
showLoader(t('loaderText'));
initEngine();
