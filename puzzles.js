// ============================================================
//  VEXCHESS · Puzzles tácticos (100% en el navegador)
//  Reglas vía chess.js. Set inicial: mates en 1 (validados).
//  Estructura preparada para líneas multi-jugada en el futuro.
// ============================================================
import { Chess } from './chess.js';

const PUZZLES = [
  { fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", theme: "Mate del pasillo", type: "mate1", sol: "a1a8" },
  { fen: "6k1/4Rppp/8/8/8/8/8/6K1 w - - 0 1", theme: "Torre a la 8ª", type: "mate1", sol: "e7e8" },
  { fen: "6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1", theme: "Mate de dama", type: "mate1", sol: "d1d8" },
  { fen: "2R3k1/5ppp/8/8/8/8/8/6K1 w - - 0 1", theme: "Mate del pasillo", type: "mate1", sol: "c8d8" },
  { fen: "6rk/6pp/7N/8/8/8/8/7K w - - 0 1", theme: "Mate ahogado", type: "mate1", sol: "h6f7" },
  { fen: "6k1/R4ppp/8/8/8/8/8/6K1 w - - 0 1", theme: "Torre a la 8ª", type: "mate1", sol: "a7a8" },
  { fen: "7k/5ppp/8/8/8/8/8/R6K w - - 0 1", theme: "Mate del pasillo", type: "mate1", sol: "a1a8" },
  { fen: "1R4k1/5ppp/8/8/8/8/8/6K1 w - - 0 1", theme: "Torre a la 8ª", type: "mate1", sol: "b8c8" },
  { fen: "6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1", theme: "Mate del pasillo", type: "mate1", sol: "b1b8" },
  { fen: "6k1/3R1ppp/8/8/8/8/8/6K1 w - - 0 1", theme: "Torre a la 8ª", type: "mate1", sol: "d7d8" },
  { fen: "kr6/ppN5/8/8/8/8/8/6K1 w - - 0 1", theme: "Mate de caballo", type: "mate1", sol: "g1f2" },
];

const FILES = 'abcdefgh';
const boardEl = document.getElementById('pz-board');
const themeEl = document.getElementById('pz-theme');
const turnEl = document.getElementById('pz-turn');
const statusEl = document.getElementById('pz-status');
const progressEl = document.getElementById('pz-progress');
const solvedEl = document.getElementById('pz-solved');

let idx = 0, game = null, orientBlack = false, selected = null, legal = [], locked = false, solved = false;
let solvedSet = new Set();

function pieceSVG(color, type) {
  return '<svg class="pc" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';
}
// nombre de casilla <-> fila/columna de pantalla según orientación
function screenToSquare(sr, sc) {
  const file = orientBlack ? 7 - sc : sc;
  const rank = orientBlack ? sr + 1 : 8 - sr;
  return FILES[file] + rank;
}
function squareToScreen(sq) {
  const file = FILES.indexOf(sq[0]); const rank = +sq[1];
  return orientBlack ? [rank - 1, 7 - file] : [8 - rank, file];
}

function render() {
  const board = game.board();
  let html = '';
  for (let sr = 0; sr < 8; sr++) for (let sc = 0; sc < 8; sc++) {
    const sq = screenToSquare(sr, sc);
    const dark = (FILES.indexOf(sq[0]) + (+sq[1])) % 2 === 0;
    const p = board[8 - (+sq[1])][FILES.indexOf(sq[0])];
    const isSel = selected === sq;
    const hint = legal.find(m => m.to === sq);
    let cls = 'pz-sq ' + (dark ? 'dark' : 'light');
    if (isSel) cls += ' sel';
    html += '<div class="' + cls + '" data-sq="' + sq + '">';
    if (hint) html += '<span class="pz-hint ' + (p ? 'cap' : '') + '"></span>';
    if (p) html += pieceSVG(p.color, p.type);
    // coordenadas
    if (sc === 0) html += '<span class="pz-coord rank">' + sq[1] + '</span>';
    if (sr === 7) html += '<span class="pz-coord file">' + sq[0] + '</span>';
    html += '</div>';
  }
  boardEl.innerHTML = html;
}

function loadPuzzle(i) {
  idx = ((i % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  const pz = PUZZLES[idx];
  game = new Chess(pz.fen);
  orientBlack = game.turn() === 'b';
  selected = null; legal = []; locked = false; solved = false;
  boardEl.classList.remove('solved', 'wrong');
  render();
  themeEl.textContent = pz.theme;
  turnEl.innerHTML = '<span class="pz-dot ' + (game.turn() === 'w' ? 'w' : 'b') + '"></span> Juegan ' + (game.turn() === 'w' ? 'blancas' : 'negras');
  statusEl.className = 'pz-status';
  statusEl.textContent = pz.type === 'mate1' ? 'Encuentra el mate en 1.' : 'Encuentra la mejor jugada.';
  progressEl.textContent = 'Puzzle ' + (idx + 1) + ' / ' + PUZZLES.length;
  solvedEl.textContent = solvedSet.size + ' resueltos';
}

function clearSel() { selected = null; legal = []; }

function onClick(e) {
  if (locked) return;
  const cell = e.target.closest('.pz-sq');
  if (!cell) return;
  const sq = cell.dataset.sq;
  // ¿es un destino legal?
  if (selected) {
    const mv = legal.find(m => m.to === sq);
    if (mv) { attemptMove(selected, sq); return; }
  }
  // seleccionar pieza propia
  const piece = game.get(sq);
  if (piece && piece.color === game.turn()) {
    selected = sq;
    legal = game.moves({ square: sq, verbose: true });
    render();
  } else { clearSel(); render(); }
}

function attemptMove(from, to) {
  const pz = PUZZLES[idx];
  const moving = game.get(from);
  const promo = (moving && moving.type === 'p' && (to[1] === '8' || to[1] === '1')) ? 'q' : undefined;
  const mv = game.move({ from, to, promotion: promo });
  if (!mv) { clearSel(); render(); return; }
  clearSel();
  render();
  const good = pz.type === 'mate1' ? game.isCheckmate() : (from + to === pz.sol.slice(0, 4));
  if (good) {
    locked = true; solved = true;
    solvedSet.add(idx);
    boardEl.classList.add('solved');
    statusEl.className = 'pz-status ok';
    statusEl.textContent = '¡Correcto! Jaque mate. ✓';
    solvedEl.textContent = solvedSet.size + ' resueltos';
    setTimeout(() => { if (idx < PUZZLES.length - 1) loadPuzzle(idx + 1); else finishAll(); }, 1400);
  } else {
    // jugada legal pero no resuelve: deshacer y avisar
    game.undo();
    boardEl.classList.add('wrong');
    statusEl.className = 'pz-status err';
    statusEl.textContent = 'Esa no da mate. Prueba otra. 🔁';
    setTimeout(() => { boardEl.classList.remove('wrong'); render(); }, 480);
  }
}

function finishAll() {
  boardEl.classList.add('solved');
  statusEl.className = 'pz-status ok';
  statusEl.textContent = '¡Has resuelto todos los puzzles! 🎉';
}

function hint() {
  if (locked) return;
  const pz = PUZZLES[idx];
  const from = pz.sol.slice(0, 2);
  const [sr, sc] = squareToScreen(from);
  const cell = boardEl.querySelector('.pz-sq[data-sq="' + from + '"]');
  if (cell) { cell.classList.add('hintsq'); setTimeout(() => cell.classList.remove('hintsq'), 1200); }
  statusEl.className = 'pz-status';
  statusEl.textContent = 'Pista: mueve la pieza de ' + from + '.';
}

boardEl.addEventListener('click', onClick);
document.getElementById('pz-hint-btn').addEventListener('click', hint);
document.getElementById('pz-retry-btn').addEventListener('click', () => loadPuzzle(idx));
document.getElementById('pz-next-btn').addEventListener('click', () => loadPuzzle(idx + 1));
document.getElementById('pz-prev-btn').addEventListener('click', () => loadPuzzle(idx - 1));
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') loadPuzzle(idx + 1);
  else if (e.key === 'ArrowLeft') loadPuzzle(idx - 1);
  else if (e.key.toLowerCase() === 'h') hint();
});

loadPuzzle(0);
