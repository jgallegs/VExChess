// ============================================================
//  VEXCHESS · Puzzles tácticos (100% en el navegador)
//  Tipos: mate1 (mate en 1), mate2 (mate en 2, validado en vivo
//  contra cualquier defensa) y win (gana material · horquilla).
//  Reglas y validación vía chess.js.
// ============================================================
import { Chess } from './chess.js';
import { sfx } from './sounds.js?v=1';

const PUZZLES = [
  // ---- Mate en 1 ----
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
  // ---- Mate en 2 (técnica de dama) ----
  { fen: "k7/8/2K5/8/2Q5/8/8/8 w - - 0 1", theme: "Mate en 2 · dama", type: "mate2", sol: "c4a6" },
  { fen: "k7/8/2K1Q3/8/8/8/8/8 w - - 0 1", theme: "Mate en 2 · dama", type: "mate2", sol: "e6c8" },
  { fen: "3k4/8/3K4/2Q5/8/8/8/8 w - - 0 1", theme: "Mate en 2 · dama", type: "mate2", sol: "c5c7" },
  { fen: "8/8/8/8/5Q2/4K3/8/4k3 w - - 0 1", theme: "Mate en 2 · dama", type: "mate2", sol: "f4f2" },
  // ---- Gana material (horquilla de caballo al rey y la dama) ----
  { fen: "8/8/8/8/1q6/2k5/8/K1N5 w - - 0 1", theme: "Horquilla · gana la dama", type: "win", sol: "c1a2" },
  { fen: "8/8/8/1k6/2q5/8/8/KN6 w - - 0 1", theme: "Horquilla · gana la dama", type: "win", sol: "b1a3" },
  { fen: "8/8/8/1q6/2k5/8/K1N5/8 w - - 0 1", theme: "Horquilla · gana la dama", type: "win", sol: "c2a3" },
];

const GOAL = { mate1: 'Encuentra el mate en 1.', mate2: 'Encuentra el mate en 2.', win: 'Gana material.' };

const FILES = 'abcdefgh';
const boardEl = document.getElementById('pz-board');
const themeEl = document.getElementById('pz-theme');
const turnEl = document.getElementById('pz-turn');
const statusEl = document.getElementById('pz-status');
const progressEl = document.getElementById('pz-progress');
const solvedEl = document.getElementById('pz-solved');

let idx = 0, game = null, orientBlack = false, selected = null, legal = [], locked = false, solved = false;
let phase = 0;                 // para mate2: 0 = jugada clave, 1 = dar el mate
let solvedSet = new Set();

function pieceSVG(color, type) {
  return '<svg class="pc" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';
}
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
  selected = null; legal = []; locked = false; solved = false; phase = 0;
  boardEl.classList.remove('solved', 'wrong');
  render();
  themeEl.textContent = pz.theme;
  turnEl.innerHTML = '<span class="pz-dot ' + (game.turn() === 'w' ? 'w' : 'b') + '"></span> Juegan ' + (game.turn() === 'w' ? 'blancas' : 'negras');
  statusEl.className = 'pz-status';
  statusEl.textContent = GOAL[pz.type] || 'Encuentra la mejor jugada.';
  progressEl.textContent = 'Puzzle ' + (idx + 1) + ' / ' + PUZZLES.length;
  solvedEl.textContent = solvedSet.size + ' resueltos';
}

function clearSel() { selected = null; legal = []; }

function onClick(e) {
  if (locked) return;
  const cell = e.target.closest('.pz-sq');
  if (!cell) return;
  const sq = cell.dataset.sq;
  if (selected) {
    const mv = legal.find(m => m.to === sq);
    if (mv) { attemptMove(selected, sq); return; }
  }
  const piece = game.get(sq);
  if (piece && piece.color === game.turn()) {
    selected = sq;
    legal = game.moves({ square: sq, verbose: true });
    render();
  } else { clearSel(); render(); }
}

// ¿La posición actual (rival a mover) permite mate a la siguiente para el jugador?
function currentForcesMate() {
  const replies = game.moves({ verbose: true });
  if (!replies.length) return false;
  for (const r of replies) {
    game.move(r);
    const canMate = game.moves({ verbose: true }).some(pm => { game.move(pm); const m = game.isCheckmate(); game.undo(); return m; });
    game.undo();
    if (!canMate) return false;
  }
  return true;
}
// El rival juega una defensa cualquiera (todas pierden); preferimos mover el rey.
function autoDefense() {
  const replies = game.moves({ verbose: true });
  if (!replies.length) return;
  const pick = replies.find(r => r.piece === 'k') || replies[0];
  game.move(pick);
}

function ok(msg) {
  locked = true; solved = true;
  solvedSet.add(idx);
  boardEl.classList.add('solved');
  statusEl.className = 'pz-status ok';
  statusEl.textContent = msg;
  solvedEl.textContent = solvedSet.size + ' resueltos';
  sfx.win();
  setTimeout(() => { if (idx < PUZZLES.length - 1) loadPuzzle(idx + 1); else finishAll(); }, 1500);
}
function wrong(msg) {
  boardEl.classList.add('wrong');
  statusEl.className = 'pz-status err';
  statusEl.textContent = msg;
  sfx.wrong();
  setTimeout(() => { boardEl.classList.remove('wrong'); render(); }, 480);
}

function attemptMove(from, to) {
  const pz = PUZZLES[idx];
  const moving = game.get(from);
  const promo = (moving && moving.type === 'p' && (to[1] === '8' || to[1] === '1')) ? 'q' : undefined;
  const mv = game.move({ from, to, promotion: promo });
  if (!mv) { clearSel(); render(); return; }
  clearSel();

  if (pz.type === 'mate1') {
    render();
    if (game.isCheckmate()) return ok('¡Correcto! Jaque mate. ✓');
    game.undo(); return wrong('Esa no da mate. Prueba otra. 🔁');
  }

  if (pz.type === 'win') {
    render();
    if (from + to === pz.sol.slice(0, 4)) return ok('¡Horquilla! Ganas la dama. ✓');
    game.undo(); return wrong('Esa no gana material. 🔁');
  }

  if (pz.type === 'mate2') {
    if (phase === 0) {
      // la jugada clave debe forzar el mate contra cualquier defensa
      if (game.isCheckmate()) return ok('¡Mate! ✓');
      if (!currentForcesMate()) { game.undo(); render(); return wrong('Eso no fuerza el mate. 🔁'); }
      render();
      phase = 1; locked = true;
      statusEl.className = 'pz-status';
      statusEl.textContent = '¡Bien! El rival defiende… ahora da el mate.';
      sfx.move();
      setTimeout(() => { autoDefense(); locked = false; render(); }, 520);
      return;
    } else {
      render();
      if (game.isCheckmate()) return ok('¡Correcto! Jaque mate en 2. ✓');
      game.undo(); return wrong('Aún no es mate. 🔁');
    }
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
  // en mate2 fase 1 no hay pista fija (depende de la defensa); solo animamos
  const from = (pz.type === 'mate2' && phase === 1) ? null : pz.sol.slice(0, 2);
  if (from) {
    const cell = boardEl.querySelector('.pz-sq[data-sq="' + from + '"]');
    if (cell) { cell.classList.add('hintsq'); setTimeout(() => cell.classList.remove('hintsq'), 1200); }
    statusEl.className = 'pz-status';
    statusEl.textContent = 'Pista: mueve la pieza de ' + from + '.';
  } else {
    statusEl.className = 'pz-status';
    statusEl.textContent = 'Pista: busca el jaque mate ahora.';
  }
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
document.addEventListener('pointerdown', () => sfx.unlock(), { once: true, capture: true });

loadPuzzle(0);
