// ============================================================
//  VEXCHESS · Mis partidas (archivo + reproductor)
//  100% en el navegador. Lee las partidas terminadas guardadas
//  en localStorage por app.js (clave "vexchess:archive").
// ============================================================
import { Chess } from './chess.js';

const ARCHIVE_KEY = 'vexchess:archive';
const FILES = 'abcdefgh';

const boardEl   = document.getElementById('rv-board');
const listEl    = document.getElementById('rv-list');
const countEl   = document.getElementById('rv-count');
const clearEl   = document.getElementById('rv-clear');
const emptyEl   = document.getElementById('rv-empty');
const movesCard = document.getElementById('rv-moves-card');
const movesEl   = document.getElementById('rv-moves');
const captionEl = document.getElementById('rv-caption');
const dotEl     = document.getElementById('rv-dot');
const plyEl     = document.getElementById('rv-ply');

let archive = [];
let current = null;      // { entry, fens[], sans[], lastMoves[] }
let ply = 0;             // 0 = posición inicial; N = tras la jugada N
let orientBlack = false;
let autoTimer = null;

// ---------- Utilidades de tablero ----------
function pieceSVG(color, type) {
  return '<svg class="pc" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';
}
function screenToSquare(sr, sc) {
  const file = orientBlack ? 7 - sc : sc;
  const rank = orientBlack ? sr + 1 : 8 - sr;
  return FILES[file] + rank;
}

function renderBoard() {
  const fen = current ? current.fens[ply] : new Chess().fen();
  const g = new Chess(fen);
  const board = g.board();
  const last = current && ply > 0 ? current.lastMoves[ply - 1] : null;
  let html = '';
  for (let sr = 0; sr < 8; sr++) for (let sc = 0; sc < 8; sc++) {
    const sq = screenToSquare(sr, sc);
    const dark = (FILES.indexOf(sq[0]) + (+sq[1])) % 2 === 0;
    const p = board[8 - (+sq[1])][FILES.indexOf(sq[0])];
    let cls = 'rv-sq ' + (dark ? 'dark' : 'light');
    if (last && (sq === last.from || sq === last.to)) cls += ' lastmv';
    html += '<div class="' + cls + '" data-sq="' + sq + '">';
    if (p) html += pieceSVG(p.color, p.type);
    if (sc === 0) html += '<span class="rv-coord rank">' + sq[1] + '</span>';
    if (sr === 7) html += '<span class="rv-coord file">' + sq[0] + '</span>';
    html += '</div>';
  }
  boardEl.innerHTML = html;
}

// ---------- Carga del archivo ----------
function loadArchive() {
  try { archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); }
  catch (e) { archive = []; }
  if (!Array.isArray(archive)) archive = [];
}

function resultLabel(entry) {
  // resultado desde la perspectiva del jugador humano
  if (entry.result === '1/2-1/2') return { txt: 'Tablas', cls: 'draw' };
  const humanWon = (entry.result === '1-0' && entry.humanColor === 'w') ||
                   (entry.result === '0-1' && entry.humanColor === 'b');
  return humanWon ? { txt: 'Victoria', cls: 'win' } : { txt: 'Derrota', cls: 'loss' };
}
const LEVEL_NAMES = {
  principiante: 'Principiante', facil: 'Fácil', intermedio: 'Intermedio',
  avanzado: 'Avanzado', maximo: 'Máximo'
};
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}

function renderList() {
  countEl.textContent = archive.length + (archive.length === 1 ? ' partida' : ' partidas');
  clearEl.hidden = archive.length === 0;
  if (archive.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    movesCard.hidden = true;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = archive.map((e, i) => {
    const r = resultLabel(e);
    const side = e.humanColor === 'b' ? 'Negras' : 'Blancas';
    const moves = Math.ceil((e.plies || 0) / 2);
    const active = current && current.entry.id === e.id ? ' active' : '';
    return '<button class="rv-item' + active + '" data-id="' + e.id + '">' +
      '<span class="rv-badge ' + r.cls + '">' + r.txt + '</span>' +
      '<span class="rv-item-main">' +
        '<span class="rv-item-top">vs Stockfish · ' + (LEVEL_NAMES[e.level] || e.level || '—') + '</span>' +
        '<span class="rv-item-sub">' + side + ' · ' + moves + ' jugadas · ' + fmtDate(e.date) + '</span>' +
      '</span>' +
      '<span class="rv-del" data-del="' + e.id + '" title="Borrar" aria-label="Borrar partida">✕</span>' +
    '</button>';
  }).join('');
}

// ---------- Abrir una partida ----------
function openGame(entry) {
  const g = new Chess();
  try { g.loadPgn(entry.pgn); } catch (e) { return; }
  const verbose = g.history({ verbose: true });
  // reconstruir la lista de FEN por jugada
  const g2 = new Chess();
  const fens = [g2.fen()];
  const sans = [];
  const lastMoves = [];
  for (const mv of verbose) {
    g2.move(mv);
    fens.push(g2.fen());
    sans.push(mv.san);
    lastMoves.push({ from: mv.from, to: mv.to });
  }
  current = { entry, fens, sans, lastMoves };
  orientBlack = entry.humanColor === 'b';
  ply = fens.length - 1;   // abrir en la posición final
  stopAuto();
  renderBoard();
  renderMoves();
  renderList();
  movesCard.hidden = false;
  updateCaption();
}

function renderMoves() {
  if (!current) { movesEl.innerHTML = ''; return; }
  const s = current.sans;
  let html = '';
  for (let i = 0; i < s.length; i += 2) {
    html += '<div class="rv-mrow"><span class="rv-num">' + (i / 2 + 1) + '.</span>' +
      '<span class="rv-san" data-ply="' + (i + 1) + '">' + (s[i] || '') + '</span>' +
      '<span class="rv-san" data-ply="' + (i + 2) + '">' + (s[i + 1] || '') + '</span></div>';
  }
  movesEl.innerHTML = html;
  highlightMove();
}
function highlightMove() {
  movesEl.querySelectorAll('.rv-san').forEach(el => {
    el.classList.toggle('on', +el.dataset.ply === ply);
  });
  const on = movesEl.querySelector('.rv-san.on');
  if (on) on.scrollIntoView({ block: 'nearest' });
}

function updateCaption() {
  if (!current) { captionEl.textContent = 'Selecciona una partida'; dotEl.className = 'rv-turn-dot'; plyEl.textContent = '—'; return; }
  const total = current.fens.length - 1;
  const g = new Chess(current.fens[ply]);
  const turn = g.turn();
  dotEl.className = 'rv-turn-dot ' + (turn === 'w' ? 'w' : 'b');
  if (ply === 0) captionEl.textContent = 'Posición inicial';
  else {
    const moveNo = Math.ceil(ply / 2);
    const who = (ply % 2 === 1) ? 'blancas' : 'negras';
    captionEl.textContent = current.sans[ply - 1] + '  (' + moveNo + ', ' + who + ')';
  }
  plyEl.textContent = ply + ' / ' + total;
}

// ---------- Navegación ----------
function goto(n) {
  if (!current) return;
  const total = current.fens.length - 1;
  ply = Math.max(0, Math.min(total, n));
  renderBoard();
  highlightMove();
  updateCaption();
  if (ply === total) stopAuto();
}
function stopAuto() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  const b = document.getElementById('rv-play');
  b.textContent = '▶'; b.classList.remove('on');
}
function toggleAuto() {
  if (!current) return;
  if (autoTimer) { stopAuto(); return; }
  const total = current.fens.length - 1;
  if (ply >= total) ply = 0;
  const b = document.getElementById('rv-play');
  b.textContent = '⏸'; b.classList.add('on');
  autoTimer = setInterval(() => {
    if (!current || ply >= current.fens.length - 1) { stopAuto(); return; }
    goto(ply + 1);
  }, 850);
}

// ---------- Eventos ----------
listEl.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    e.stopPropagation();
    const id = +del.dataset.del;
    archive = archive.filter(x => x.id !== id);
    try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive)); } catch (err) {}
    if (current && current.entry.id === id) { current = null; ply = 0; stopAuto(); renderBoard(); updateCaption(); movesCard.hidden = true; }
    renderList();
    return;
  }
  const item = e.target.closest('.rv-item');
  if (!item) return;
  const entry = archive.find(x => x.id === +item.dataset.id);
  if (entry) openGame(entry);
});
clearEl.addEventListener('click', () => {
  archive = [];
  try { localStorage.removeItem(ARCHIVE_KEY); } catch (e) {}
  current = null; ply = 0; stopAuto();
  renderBoard(); updateCaption(); movesCard.hidden = true;
  renderList();
});
movesEl.addEventListener('click', (e) => {
  const s = e.target.closest('.rv-san');
  if (s && s.dataset.ply) goto(+s.dataset.ply);
});
document.getElementById('rv-first').addEventListener('click', () => goto(0));
document.getElementById('rv-prev').addEventListener('click', () => goto(ply - 1));
document.getElementById('rv-next').addEventListener('click', () => goto(ply + 1));
document.getElementById('rv-last').addEventListener('click', () => { if (current) goto(current.fens.length - 1); });
document.getElementById('rv-play').addEventListener('click', toggleAuto);
document.getElementById('rv-flip').addEventListener('click', () => { orientBlack = !orientBlack; renderBoard(); });
document.getElementById('rv-pgn').addEventListener('click', () => {
  if (!current) return;
  const btn = document.getElementById('rv-pgn');
  const txt = current.entry.pgn;
  const done = () => { btn.textContent = '¡Copiado!'; setTimeout(() => btn.textContent = 'Copiar PGN', 1300); };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done).catch(() => fallback());
  else fallback();
  function fallback() {
    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'partida.pgn'; a.click();
    URL.revokeObjectURL(a.href);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') goto(ply + 1);
  else if (e.key === 'ArrowLeft') goto(ply - 1);
  else if (e.key === ' ') { e.preventDefault(); toggleAuto(); }
  else if (e.key === 'Home') goto(0);
  else if (e.key === 'End' && current) goto(current.fens.length - 1);
  else if (e.key.toLowerCase() === 'f') { orientBlack = !orientBlack; renderBoard(); }
});

// ---------- Inicio ----------
loadArchive();
renderBoard();
renderList();
updateCaption();
// abrir automáticamente la partida más reciente
if (archive.length) openGame(archive[0]);
