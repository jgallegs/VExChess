// ============================================================
//  VEXCHESS · Mis partidas (archivo + reproductor)
//  100% en el navegador. Lee las partidas terminadas guardadas
//  en localStorage por app.js (clave "vexchess:archive").
// ============================================================
import { Chess } from './chess.js';
import { api, getUser, onAuth } from './auth.js?v=10';

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

// ---------- Carga del archivo (nube si hay sesión, si no localStorage) ----------
async function loadGames() {
  if (getUser()) {
    try {
      const out = await api.listGames(100, 0);
      archive = (out.games || []).map(g => ({
        id: g.id, pgn: g.pgn, result: g.result, humanColor: g.human_color,
        level: g.level, plies: g.plies, date: g.played_at, _server: true,
      }));
      return;
    } catch (e) { /* si falla la API, cae a local */ }
  }
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
  evalCP = null; classif = null;           // reinicia el análisis para la nueva partida
  const gw = document.getElementById('rv-graph-wrap'); if (gw) gw.hidden = true;
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
      '<span class="rv-san" data-ply="' + (i + 1) + '">' + (s[i] || '') + (s[i] ? moveMark(i + 1) : '') + '</span>' +
      '<span class="rv-san" data-ply="' + (i + 2) + '">' + (s[i + 1] || '') + (s[i + 1] ? moveMark(i + 2) : '') + '</span></div>';
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
  if (evalCP) renderGraph();
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

// ---------- Análisis con Stockfish ----------
let engine = null, engineReady = false, readyResolvers = [], analyzeResolve = null, lastInfo = null;
let evalCP = null, classif = null, analyzing = false;
const DEPTH = 11, CLAMP = 800;

function ensureEngine() {
  return new Promise((resolve) => {
    if (engineReady) { resolve(); return; }
    readyResolvers.push(resolve);
    if (engine) return;
    engine = new Worker('./engine/stockfish-18-lite-single.js');
    engine.onmessage = onEng;
    engine.onerror = () => {};
    engine.postMessage('uci');
  });
}
function onEng(e) {
  const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
  if (line === 'uciok') { engine.postMessage('isready'); return; }
  if (line === 'readyok') { if (!engineReady) { engineReady = true; readyResolvers.forEach(r => r()); readyResolvers = []; } return; }
  if (line.startsWith('info') && line.includes(' score ')) {
    const m = line.match(/score (cp|mate) (-?\d+)/);
    if (m) lastInfo = m[1] === 'mate' ? { mate: parseInt(m[2], 10) } : { cp: parseInt(m[2], 10) };
    return;
  }
  if (line.startsWith('bestmove')) { if (analyzeResolve) { const r = analyzeResolve; analyzeResolve = null; r(lastInfo); } return; }
}
function analyzeFen(fen) {
  return new Promise((resolve) => { lastInfo = null; analyzeResolve = resolve; engine.postMessage('position fen ' + fen); engine.postMessage('go depth ' + DEPTH); });
}
function clampCp(v) { return Math.max(-CLAMP * 3, Math.min(CLAMP * 3, v)); }

async function analyzeGame() {
  if (!current || analyzing) return;
  analyzing = true;
  const btn = document.getElementById('rv-analyze'); btn.textContent = 'Analizando…'; btn.disabled = true;
  document.getElementById('rv-graph-wrap').hidden = false;
  const bar = document.getElementById('rv-analyze-bar'); const fill = document.getElementById('rv-analyze-fill');
  bar.hidden = false; fill.style.width = '0%';
  await ensureEngine();
  const fens = current.fens, N = fens.length;
  evalCP = new Array(N).fill(null);
  for (let i = 0; i < N; i++) {
    const g = new Chess(fens[i]);
    if (g.isGameOver()) {
      evalCP[i] = g.isCheckmate() ? (g.turn() === 'w' ? -100000 : 100000) : 0;
    } else {
      const info = await analyzeFen(fens[i]);
      const stm = fens[i].split(' ')[1];
      let v = 0;
      if (info && info.mate != null) v = info.mate > 0 ? (100000 - info.mate * 100) : (-100000 - info.mate * 100);
      else if (info && typeof info.cp === 'number') v = info.cp;
      evalCP[i] = stm === 'w' ? v : -v;
    }
    fill.style.width = Math.round(((i + 1) / N) * 100) + '%';
    renderGraph();
  }
  classif = classifyMoves();
  analyzing = false; bar.hidden = true; btn.textContent = 'Analizar'; btn.disabled = false;
  renderGraph(); renderMoves(); renderSummary();
}
function classifyMoves() {
  if (!current || !evalCP) return null;
  const out = [];
  for (let p = 0; p < current.sans.length; p++) {
    const stm = current.fens[p].split(' ')[1], sign = stm === 'w' ? 1 : -1;
    const before = clampCp(evalCP[p] * sign), after = clampCp(evalCP[p + 1] * sign);
    const loss = before - after;
    let cls = 'best';
    if (loss >= 300) cls = 'blunder';
    else if (loss >= 150) cls = 'mistake';
    else if (loss >= 75) cls = 'inacc';
    else if (loss >= 40) cls = 'good';
    out.push(cls);
  }
  return out;
}
function graphY(cp, H) {
  if (cp == null) return H / 2;
  let c = cp;
  if (c >= 100000 - 1000) c = CLAMP; else if (c <= -100000 + 1000) c = -CLAMP;
  c = Math.max(-CLAMP, Math.min(CLAMP, c));
  return H / 2 - (c / CLAMP) * (H / 2 - 1);
}
function renderGraph() {
  const svg = document.getElementById('rv-graph');
  if (!svg || !evalCP) return;
  const N = evalCP.length, H = 42, W = 100;
  const pts = [];
  for (let i = 0; i < N; i++) pts.push([N <= 1 ? 0 : (i / (N - 1)) * W, graphY(evalCP[i], H)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
  const area = 'M0 ' + (H / 2) + ' ' + pts.map(p => 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ') + ' L' + W + ' ' + (H / 2) + ' Z';
  const cx = (N <= 1 ? 0 : (ply / (N - 1)) * W).toFixed(2);
  svg.innerHTML =
    '<line class="rv-graph-mid" x1="0" y1="' + (H / 2) + '" x2="' + W + '" y2="' + (H / 2) + '"/>' +
    '<path class="rv-graph-area" d="' + area + '"/>' +
    '<path class="rv-graph-line" d="' + line + '"/>' +
    '<line class="rv-graph-cursor" x1="' + cx + '" y1="0" x2="' + cx + '" y2="' + H + '"/>';
}
function renderSummary() {
  const el = document.getElementById('rv-analysis-summary');
  if (!el || !classif) return;
  const hc = (current.entry.humanColor) || 'w';
  let ina = 0, mis = 0, blu = 0;
  for (let p = 0; p < classif.length; p++) {
    if (current.fens[p].split(' ')[1] !== hc) continue;
    if (classif[p] === 'inacc') ina++; else if (classif[p] === 'mistake') mis++; else if (classif[p] === 'blunder') blu++;
  }
  el.textContent = ina + ' impr. · ' + mis + ' err. · ' + blu + ' graves';
}
function moveMark(ply1) {
  if (!classif) return '';
  const sym = { inacc: '?!', mistake: '?', blunder: '??' }[classif[ply1 - 1]];
  return sym ? '<span class="rv-mark ' + classif[ply1 - 1] + '">' + sym + '</span>' : '';
}

// ---------- Eventos ----------
listEl.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    e.stopPropagation();
    const id = del.dataset.del;
    const entry = archive.find(x => String(x.id) === id);
    archive = archive.filter(x => String(x.id) !== id);
    if (entry && entry._server) { api.deleteGame(id).catch(() => {}); }
    else { try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive)); } catch (err) {} }
    if (current && String(current.entry.id) === id) { current = null; ply = 0; stopAuto(); renderBoard(); updateCaption(); movesCard.hidden = true; }
    renderList();
    return;
  }
  const item = e.target.closest('.rv-item');
  if (!item) return;
  const entry = archive.find(x => String(x.id) === item.dataset.id);
  if (entry) openGame(entry);
});
clearEl.addEventListener('click', async () => {
  const ids = archive.map(x => x.id);
  const wasServer = archive.some(x => x._server);
  archive = [];
  if (wasServer) { for (const id of ids) { try { await api.deleteGame(id); } catch (e) {} } }
  else { try { localStorage.removeItem(ARCHIVE_KEY); } catch (e) {} }
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
document.getElementById('rv-analyze').addEventListener('click', analyzeGame);
document.getElementById('rv-graph').addEventListener('click', (e) => {
  if (!evalCP || evalCP.length < 2) return;
  const r = e.currentTarget.getBoundingClientRect();
  const frac = (e.clientX - r.left) / r.width;
  goto(Math.max(0, Math.min(evalCP.length - 1, Math.round(frac * (evalCP.length - 1)))));
});
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
renderBoard();
updateCaption();
let reloadPending = false;
async function reload() {
  if (reloadPending) return; reloadPending = true;
  await loadGames();
  reloadPending = false;
  renderBoard(); renderList(); updateCaption();
  if (archive.length) openGame(archive[0]);
  else { current = null; ply = 0; stopAuto(); renderBoard(); updateCaption(); movesCard.hidden = true; }
}
// Carga inicial y recarga al iniciar/cerrar sesión (local ↔ nube)
onAuth(() => { reload(); });
