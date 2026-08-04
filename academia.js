// ============================================================
//  VEXCHESS · Academia — Modo entrenamiento con AXIOM
//  Bucle real: Observa → Predice → Juega → Explica, sobre el
//  tablero interactivo. Memoria de mentor (D1) por concepto.
// ============================================================
import { onAuth, getUser, api, isAuthResolved, openAuth } from './auth.js?v=16';
import { AXIOM, AX_SPLASH, portraitOf, sceneOf, LINES, pick, greeting, conceptName, hangingSquares } from './axiom.js?v=1';
import { PATH, LESSONS, lessonById, lessonsForLevel } from './academy-lessons.js?v=2';
import { createBoard } from './academy-board.js?v=2';
import { mountScene, bgFor, poseFor, sceneFor } from './axiom-scene.js?v=2';

const root = document.getElementById('academia-root');
let user = null;
let memory = null;         // { streak, dueConcepts, weakestConcept, lessonsDone, ... }
let progressByConcept = {};
let loaded = false;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function done(id) { return (memory && memory.lessonsDone || []).includes(id); }
function conceptStat(c) { const p = progressByConcept[c]; return p ? { mastery: p.mastery, confidence: p.confidence } : { mastery: 0, confidence: 0 }; }

async function loadMemory() {
  if (!user) { memory = null; progressByConcept = {}; loaded = true; return; }
  try {
    const out = await api.academy();
    memory = out.memory; progressByConcept = {};
    (out.progress || []).forEach(p => { progressByConcept[p.concept] = p; });
  } catch (e) { memory = null; }
  loaded = true;
}

// ---------- Vista: HOME de la academia ----------
function renderHome() {
  const g = greeting(memory, user ? user.username : null);
  const streak = memory ? memory.streak : 0;

  root.innerHTML =
    '<section class="ac-hero cine">' +
      '<div class="ac-hero-stage" id="ac-hero-stage"></div>' +
      '<div class="ac-hero-copy">' +
          '<span class="ac-eyebrow">Academia VEX · Entrenador</span>' +
          '<h1 class="ac-name">AXIOM <span>Maestro de las Variantes</span></h1>' +
          '<p class="ac-say">' + esc(g.line) + '</p>' +
          '<p class="ac-say sub">' + esc(g.sub) + '</p>' +
          '<div class="ac-hero-meta">' +
            (user ? '<span class="ac-streak" title="Días seguidos entrenando">🔥 ' + streak + ' día' + (streak === 1 ? '' : 's') + '</span>' : '') +
            '<span class="ac-tag">' + esc(AXIOM.tagline) + '</span>' +
          '</div>' +
          (user ? '' : '<button class="ac-btn primary" id="ac-login" type="button">Entrar para guardar tu progreso</button>') +
      '</div>' +
    '</section>' +
    conceptsBar() +
    '<section class="ac-path">' + PATH.map(pathBlock).join('') + '</section>' +
    '<p class="ac-note">La Academia mide tu <b>aprendizaje</b> (conceptos que dominas y puedes explicar), no tu Elo.</p>';

  const stage = document.getElementById('ac-hero-stage');
  if (stage) mountScene(stage, 'welcome');
  const lg = document.getElementById('ac-login');
  if (lg) lg.addEventListener('click', () => openAuth('login'));
  root.querySelectorAll('[data-lesson]').forEach(b => b.addEventListener('click', () => startLesson(b.getAttribute('data-lesson'))));
}

function conceptsBar() {
  const concepts = [...new Set(LESSONS.map(l => l.concept))];
  const chips = concepts.map(c => {
    const st = conceptStat(c);
    return '<div class="ac-concept">' +
        '<div class="ac-ring" style="--m:' + st.mastery + ';--c:' + st.confidence + '">' +
          '<span>' + st.mastery + '</span>' +
        '</div>' +
        '<div class="ac-concept-info"><b>' + esc(cap(conceptName(c))) + '</b>' +
          '<span>Dominio ' + st.mastery + ' · Confianza ' + st.confidence + '</span></div>' +
      '</div>';
  }).join('');
  const dueTxt = memory && memory.dueConcepts && memory.dueConcepts.length
    ? '<span class="ac-due">Repaso pendiente: ' + memory.dueConcepts.map(c => cap(conceptName(c))).join(', ') + '</span>' : '';
  return '<section class="ac-concepts"><h2>Tus conceptos</h2><div class="ac-concepts-grid">' + (chips || '<p class="ac-empty">Aún no has entrenado ningún concepto. Empieza abajo.</p>') + '</div>' + dueTxt + '</section>';
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function pathBlock(node) {
  const list = lessonsForLevel(node.level);
  const cards = list.length
    ? list.map(l => {
        const solved = done(l.id);
        const st = conceptStat(l.concept);
        return '<button class="ac-lesson' + (solved ? ' solved' : '') + '" data-lesson="' + l.id + '" type="button">' +
            '<span class="ac-lesson-state">' + (solved ? '✓' : '▶') + '</span>' +
            '<span class="ac-lesson-body"><b>' + esc(l.title) + '</b><span>' + esc(l.subtitle) + '</span></span>' +
            '<span class="ac-lesson-m" title="Dominio del concepto">' + st.mastery + '</span>' +
          '</button>';
      }).join('')
    : '<div class="ac-soon">Próximamente</div>';
  return '<div class="ac-level' + (list.length ? '' : ' locked') + '">' +
      '<div class="ac-level-head"><span class="ac-level-n">' + node.level + '</span><div><h3>' + esc(node.name) + '</h3><p>' + esc(node.desc) + '</p></div></div>' +
      '<div class="ac-lessons">' + cards + '</div>' +
    '</div>';
}

// ---------- Vista: RUNNER de lección ----------
let session = null;
function startLesson(id) {
  const lesson = lessonById(id);
  if (!lesson) return;
  session = { lesson, stepIdx: 0, hintLevel: -1, maxHint: 0, board: null, solved: false, phase: 'demo', beatIdx: 0 };
  renderRunner();
}

function currentStep() { return session.lesson.steps[session.stepIdx]; }

// Demostración por defecto si la lección no define una.
function getDemo() {
  const step = currentStep(), l = session.lesson, exp = step.expected[0];
  if (step.demo && step.demo.length) return step.demo;
  return [
    { state: 'welcome', say: l.intro, ops: [{ t: 'reset' }] },
    { state: 'explain', say: step.observe, ops: [{ t: 'arrow', from: exp.slice(0, 2), to: exp.slice(2, 4), cls: 'idea' }] },
    { state: 'correct', say: step.explain, ops: [{ t: 'clear' }, { t: 'play', uci: exp }] },
  ];
}

function renderRunner() {
  const l = session.lesson, step = currentStep();
  root.innerHTML =
    '<section class="ac-runner cine" id="ac-runner">' +
      '<div class="ac-cine-bg" id="ac-cine-bg"></div>' +
      '<div class="ac-cine-scrim"></div>' +
      '<div class="ac-runner-top">' +
        '<button class="ac-back" id="ac-back" type="button">← Academia</button>' +
        '<div class="ac-runner-title"><span class="ac-eyebrow">' + esc(cap(conceptName(l.concept))) + '</span><h2>' + esc(l.title) + '</h2></div>' +
        '<div class="ac-phase-dots" id="ac-phase-dots"></div>' +
      '</div>' +
      '<div class="ac-stage">' +
        '<div class="ac-board-col">' +
          '<div class="ac-board holo" id="ac-board"></div>' +
          '<div class="ac-goal" id="ac-goal">' + esc(step.goal) + '</div>' +
        '</div>' +
        '<div class="ac-coach" id="ac-coach">' +
          '<img class="ac-pose" id="ac-pose" src="' + poseFor(sceneFor('welcome')) + '" alt="AXIOM">' +
          '<div class="ac-bubble2" id="ac-bubble" data-state="welcome">' +
            '<p class="ac-bubble-main" id="ac-say"></p>' +
            '<p class="ac-bubble-sub" id="ac-saysub"></p>' +
          '</div>' +
          '<div class="ac-actions" id="ac-actions"></div>' +
          '<div class="ac-hintbox" id="ac-hintbox" hidden></div>' +
        '</div>' +
      '</div>' +
    '</section>';

  document.getElementById('ac-back').addEventListener('click', () => { session = null; renderHome(); });
  session.board = createBoard(document.getElementById('ac-board'), {
    fen: step.fen, orientation: step.orientation, playerColor: step.playerColor,
    holo: true, interactive: false, onAttempt: onPlayerMove,
  });
  showBeat(0);
}

// Fondo cinematográfico + pose de AXIOM según el estado + texto.
function setAxiom(state, text, sub) {
  const scene = sceneFor(state);
  const bg = document.getElementById('ac-cine-bg');
  if (bg) bg.style.backgroundImage = 'url(' + bgFor(scene) + ')';
  const pose = document.getElementById('ac-pose');
  if (pose) { pose.classList.remove('in'); void pose.offsetWidth; pose.src = poseFor(scene); pose.classList.add('in'); }
  const bubble = document.getElementById('ac-bubble');
  if (bubble) bubble.dataset.state = state;
  const say = document.getElementById('ac-say'); if (say) say.textContent = text || '';
  const sub2 = document.getElementById('ac-saysub'); if (sub2) sub2.textContent = sub || '';
}

function applyOps(ops) {
  const b = session.board; if (!b) return;
  for (const op of ops || []) {
    if (op.t === 'reset') { const s = currentStep(); b.reset(s.fen, s.orientation, s.playerColor); }
    else if (op.t === 'clear') b.clearOverlays();
    else if (op.t === 'arrow') b.arrow(op.from, op.to, op.cls || 'idea');
    else if (op.t === 'mark') b.markSquare(op.sq, op.cls || 'cand');
    else if (op.t === 'play') b.play(op.uci);
    else if (op.t === 'undo') b.undoLast();
  }
}

function renderPhaseDots(n, active) {
  const el = document.getElementById('ac-phase-dots'); if (!el) return;
  let s = '';
  for (let i = 0; i < n; i++) s += '<span class="ac-dot-step' + (i === active ? ' on' : '') + (i < active ? ' done' : '') + '"></span>';
  el.innerHTML = s;
}

// ---- Fase 1: demostración guiada ----
function showBeat(i) {
  session.beatIdx = i;
  const demo = getDemo(), beat = demo[i];
  setAxiom(beat.state, beat.say, beat.sub);
  applyOps(beat.ops);
  renderPhaseDots(demo.length + 1, i); // +1 = práctica
  const acts = document.getElementById('ac-actions');
  if (i < demo.length - 1) {
    acts.innerHTML = '<button class="ac-btn primary" id="ac-next" type="button">Siguiente →</button>';
    document.getElementById('ac-next').onclick = () => showBeat(i + 1);
  } else {
    endDemo();
  }
}

function endDemo() {
  renderPhaseDots(getDemo().length + 1, getDemo().length); // última fase = práctica
  setAxiom('reward', '¿Lo pruebas tú? Reconstruyo la posición y buscas la idea.', 'Sin prisa. Puedes pedir pistas cuando quieras.');
  const acts = document.getElementById('ac-actions');
  acts.innerHTML =
    '<button class="ac-btn primary" id="ac-try" type="button">Pruébalo tú →</button>' +
    '<button class="ac-btn ghost" id="ac-skip" type="button">Terminar lección</button>';
  document.getElementById('ac-try').onclick = startPractice;
  document.getElementById('ac-skip').onclick = () => finishLesson(false);
}

// ---- Fase 2: práctica opcional ----
function startPractice() {
  const step = currentStep();
  session.phase = 'practice'; session.solved = false; session.hintLevel = -1;
  session.board.reset(step.fen, step.orientation, step.playerColor);
  session.board.setInteractive(true); session.board.unlock();
  setAxiom('listening', step.observe, step.goal);
  const acts = document.getElementById('ac-actions');
  acts.innerHTML = '<button class="ac-btn ghost" id="ac-hint" type="button">Pedir una pista</button>';
  document.getElementById('ac-hint').onclick = giveHint;
  const hb = document.getElementById('ac-hintbox'); if (hb) hb.hidden = true;
}

function giveHint() {
  const step = currentStep();
  session.hintLevel = Math.min(4, session.hintLevel + 1);
  session.maxHint = Math.max(session.maxHint, session.hintLevel);
  const lvl = session.hintLevel;
  const hints = step.hints && step.hints.length ? step.hints : LINES.hint;
  setAxiom('hint', hints[Math.min(lvl, hints.length - 1)]);
  const b = session.board, exp = step.expected[0];
  const from = exp.slice(0, 2), to = exp.slice(2, 4);
  b.clearOverlays();
  if (lvl >= 1) b.markSquare(from, 'focus');
  if (lvl >= 2) b.markSquare(to, 'cand');
  if (lvl >= 4) b.arrow(from, to, 'idea');
  const hb = document.getElementById('ac-hintbox');
  hb.hidden = false;
  hb.textContent = 'Pista ' + (lvl + 1) + ' de 5' + (lvl >= 4 ? ' · última' : '');
  if (lvl >= 4) document.getElementById('ac-hint').disabled = true;
}

function onPlayerMove(uciMove, moveObj, boardApi) {
  if (session.phase !== 'practice' || session.solved) return;
  const step = currentStep();
  const isExpected = step.expected.includes(uciMove);
  const mateOK = step.mustMate ? boardApi.game().isCheckmate() : true;
  if (isExpected && mateOK) return onCorrect();
  onMistake(uciMove, boardApi);
}

function onMistake(uciMove, boardApi) {
  const step = currentStep();
  boardApi.lock();
  const hangs = hangingSquares(boardApi.fen(), step.playerColor);
  hangs.forEach(sq => boardApi.markSquare(sq, 'danger'));
  setAxiom('mistake', step.wrong || pick(LINES.mistake), hangs.length ? 'Fíjate en lo que queda sin defensa.' : '');
  boardApi.flash(uciMove.slice(2, 4));
  setTimeout(() => { boardApi.undoLast(); boardApi.clearOverlays(); boardApi.unlock(); }, 1400);
}

function onCorrect() {
  session.solved = true;
  const step = currentStep();
  session.board.lock();
  const exp = step.expected[0];
  session.board.clearOverlays();
  session.board.arrow(exp.slice(0, 2), exp.slice(2, 4), 'good');
  setAxiom('correct', pick(LINES.correct), step.explain);
  const acts = document.getElementById('ac-actions');
  acts.innerHTML = '<button class="ac-btn primary" id="ac-finish" type="button">Terminar lección →</button>';
  document.getElementById('ac-finish').onclick = () => finishLesson(true);
}

async function finishLesson(practiced) {
  const l = session.lesson;
  // Ver la demo sin practicar cuenta como "mostrado" (hint 4: menos confianza).
  const hint = practiced ? session.maxHint : 4;
  if (user) {
    try {
      const out = await api.academyResult({ lesson: l.id, concept: l.concept, correct: true, hintUsed: hint });
      memory = out.memory; progressByConcept = {};
      (out.progress || []).forEach(p => { progressByConcept[p.concept] = p; });
    } catch (e) {}
  }
  renderComplete(l, practiced);
}

function renderComplete(l, practiced) {
  const st = conceptStat(l.concept);
  root.innerHTML =
    '<section class="ac-complete cine">' +
      '<div class="ac-complete-scene" style="background-image:url(' + bgFor(sceneFor('complete')) + ')"></div>' +
      '<div class="ac-complete-inner">' +
        '<img class="ac-complete-pose" src="' + poseFor(sceneFor('complete')) + '" alt="AXIOM">' +
        '<span class="ac-eyebrow">Concepto reforzado</span>' +
        '<h1>' + esc(l.title) + '</h1>' +
        '<p class="ac-say">' + esc(practiced ? pick(LINES.complete) : 'Bien. Has visto la idea; cuando quieras, vuelve y practícala tú.') + '</p>' +
        (user ? '<div class="ac-complete-stat"><div><b>' + st.mastery + '</b><span>Dominio</span></div><div><b>' + st.confidence + '</b><span>Confianza</span></div>' +
          '<div><b>' + (session && practiced ? session.maxHint : '—') + '</b><span>Pistas</span></div></div>' : '<p class="ac-say sub">Entra para guardar tu progreso y que AXIOM recuerde tus conceptos.</p>') +
        '<div class="ac-actions center"><button class="ac-btn primary" id="ac-toacademy" type="button">Volver a la Academia</button></div>' +
      '</div>' +
    '</section>';
  document.getElementById('ac-toacademy').addEventListener('click', () => { session = null; renderHome(); });
}

// ---------- init ----------
function render() {
  if (!isAuthResolved() || !loaded) { root.innerHTML = '<div class="ac-loading"><div class="ac-ring2"></div><p>Cargando la Academia…</p></div>'; return; }
  renderHome();
}

onAuth(async (u) => {
  user = u; loaded = false; render();
  await loadMemory();
  if (!session) render();
});
render();
