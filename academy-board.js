// ============================================================
//  VEXCHESS · Tablero de lección (Academia)
//  Tablero interactivo reutilizable: chess.js real, click para
//  mover, orientación, y overlays programables (flechas, casillas
//  destacadas, amenazas) que dibuja AXIOM sobre el tablero.
// ============================================================
import { Chess } from './chess.js';

const FILES = 'abcdefgh';

export function createBoard(root, opts = {}) {
  const state = {
    game: new Chess(opts.fen || undefined),
    orientBlack: opts.orientation === 'b',
    playerColor: opts.playerColor || 'w',
    interactive: opts.interactive !== false,
    onAttempt: opts.onAttempt || (() => {}),
    selected: null,
    legal: [],
    locked: false,
    lastMove: null,
  };

  root.classList.add('ab-board');
  if (opts.holo) root.classList.add('holo');
  root.innerHTML = '<div class="ab-grid"></div><svg class="ab-ov" viewBox="0 0 8 8" preserveAspectRatio="none" aria-hidden="true"></svg>';
  const grid = root.querySelector('.ab-grid');
  const ov = root.querySelector('.ab-ov');
  const overlays = { squares: new Map(), arrows: [] };

  function pieceSVG(color, type) {
    return '<svg class="pc pc-' + color + '" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';
  }
  function screenToSquare(sr, sc) {
    const file = state.orientBlack ? 7 - sc : sc;
    const rank = state.orientBlack ? sr + 1 : 8 - sr;
    return FILES[file] + rank;
  }
  function squareToCR(sq) {
    const file = FILES.indexOf(sq[0]); const rank = +sq[1];
    const col = state.orientBlack ? 7 - file : file;
    const row = state.orientBlack ? rank - 1 : 8 - rank;
    return [col, row];
  }

  function render() {
    const board = state.game.board();
    let html = '';
    for (let sr = 0; sr < 8; sr++) for (let sc = 0; sc < 8; sc++) {
      const sq = screenToSquare(sr, sc);
      const dark = (FILES.indexOf(sq[0]) + (+sq[1])) % 2 === 0;
      const p = board[8 - (+sq[1])][FILES.indexOf(sq[0])];
      let cls = 'ab-sq ' + (dark ? 'dark' : 'light');
      if (state.selected === sq) cls += ' sel';
      if (state.lastMove && (sq === state.lastMove.from || sq === state.lastMove.to)) cls += ' last';
      const mark = overlays.squares.get(sq);
      if (mark) cls += ' mk-' + mark;
      const hint = state.legal.find(m => m.to === sq);
      html += '<div class="' + cls + '" data-sq="' + sq + '">';
      if (hint) html += '<span class="ab-dot ' + (p ? 'cap' : '') + '"></span>';
      if (p) html += pieceSVG(p.color, p.type);
      if (sc === 0) html += '<span class="ab-coord rank">' + sq[1] + '</span>';
      if (sr === 7) html += '<span class="ab-coord file">' + sq[0] + '</span>';
      html += '</div>';
    }
    grid.innerHTML = html;
    renderArrows();
  }

  function renderArrows() {
    let s = '';
    for (const a of overlays.arrows) {
      const [c1, r1] = squareToCR(a.from), [c2, r2] = squareToCR(a.to);
      const x1 = c1 + 0.5, y1 = r1 + 0.5, x2 = c2 + 0.5, y2 = r2 + 0.5;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const shorten = 0.28;
      const ex = x2 - Math.cos(ang) * shorten, ey = y2 - Math.sin(ang) * shorten;
      const cls = 'ab-arrow ' + (a.cls || '');
      s += '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + ex + '" y2="' + ey + '" />';
      const ah = 0.17;
      const p1x = ex - Math.cos(ang - 0.5) * ah, p1y = ey - Math.sin(ang - 0.5) * ah;
      const p2x = ex - Math.cos(ang + 0.5) * ah, p2y = ey - Math.sin(ang + 0.5) * ah;
      s += '<polygon class="' + cls + ' head" points="' + ex + ',' + ey + ' ' + p1x + ',' + p1y + ' ' + p2x + ',' + p2y + '" />';
    }
    ov.innerHTML = s;
  }

  function clearSel() { state.selected = null; state.legal = []; }

  grid.addEventListener('click', (e) => {
    if (state.locked || !state.interactive) return;
    const cell = e.target.closest('.ab-sq');
    if (!cell) return;
    const sq = cell.dataset.sq;
    if (state.selected) {
      const mv = state.legal.find(m => m.to === sq);
      if (mv) { attempt(state.selected, sq); return; }
    }
    const piece = state.game.get(sq);
    if (piece && piece.color === state.game.turn() && piece.color === state.playerColor) {
      state.selected = sq;
      state.legal = state.game.moves({ square: sq, verbose: true });
      render();
    } else { clearSel(); render(); }
  });

  function attempt(from, to) {
    const needsPromo = state.legal.find(m => m.to === to && m.promotion);
    const promotion = needsPromo ? 'q' : undefined;
    let mv;
    try { mv = state.game.move({ from, to, promotion }); } catch (e) { mv = null; }
    if (!mv) { clearSel(); render(); return; }
    state.lastMove = { from, to };
    clearSel(); render();
    state.onAttempt(from + to + (promotion || ''), mv, api);
  }

  const api = {
    el: root,
    fen: () => state.game.fen(),
    turn: () => state.game.turn(),
    game: () => state.game,
    lock() { state.locked = true; },
    unlock() { state.locked = false; },
    setInteractive(b) { state.interactive = !!b; },
    // Deshace la última jugada del jugador (para intentos legales pero incorrectos).
    undoLast() {
      state.game.undo();
      state.lastMove = null;
      clearSel(); render();
    },
    // Aplica una jugada por programa (respuesta guionizada o demostración de AXIOM).
    play(uciMove) {
      const from = uciMove.slice(0, 2), to = uciMove.slice(2, 4), promotion = uciMove[4];
      let mv; try { mv = state.game.move({ from, to, promotion: promotion || 'q' }); } catch (e) { mv = null; }
      if (mv) { state.lastMove = { from, to }; clearSel(); render(); }
      return mv;
    },
    reset(fen, orientation, playerColor) {
      state.game = new Chess(fen);
      if (orientation) state.orientBlack = orientation === 'b';
      if (playerColor) state.playerColor = playerColor;
      state.lastMove = null; clearSel();
      overlays.squares.clear(); overlays.arrows = [];
      render();
    },
    setOverlaySquares(map) { overlays.squares = new Map(Object.entries(map || {})); render(); },
    markSquare(sq, cls) { overlays.squares.set(sq, cls); render(); },
    arrow(from, to, cls) { overlays.arrows.push({ from, to, cls }); renderArrows(); },
    clearOverlays() { overlays.squares.clear(); overlays.arrows = []; render(); },
    flash(sq) {
      const cell = grid.querySelector('.ab-sq[data-sq="' + sq + '"]');
      if (cell) { cell.classList.remove('ab-shake'); void cell.offsetWidth; cell.classList.add('ab-shake'); }
    },
    render,
  };

  render();
  return api;
}
