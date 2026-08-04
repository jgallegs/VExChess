// ============================================================
//  VEXCHESS · Academia — Modo entrenamiento con AXIOM
//  Bucle real: Observa → Predice → Juega → Explica, sobre el
//  tablero interactivo. Memoria de mentor (D1) por concepto.
// ============================================================
import { onAuth, getUser, api, isAuthResolved, openAuth } from './auth.js?v=16';
import { AXIOM, AX_SPLASH, portraitOf, sceneOf, LINES, pick, greeting, conceptName, hangingSquares } from './axiom.js?v=1';
import { PATH, LESSONS, lessonById, lessonsForLevel } from './academy-lessons.js?v=1';
import { createBoard } from './academy-board.js?v=1';

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
    '<section class="ac-hero">' +
      '<div class="ac-hero-scene" style="background-image:url(' + AX_SPLASH + ')"></div>' +
      '<div class="ac-hero-inner">' +
        '<div class="ac-hero-axiom"><img src="' + AX_SPLASH + '" alt="AXIOM"></div>' +
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
      '</div>' +
    '</section>' +
    conceptsBar() +
    '<section class="ac-path">' + PATH.map(pathBlock).join('') + '</section>' +
    '<p class="ac-note">La Academia mide tu <b>aprendizaje</b> (conceptos que dominas y puedes explicar), no tu Elo.</p>';

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
  session = { lesson, stepIdx: 0, hintLevel: -1, maxHint: 0, board: null, solved: false, phase: 'observe' };
  renderRunner();
}

function currentStep() { return session.lesson.steps[session.stepIdx]; }

function axiomLine(state, text, sub) {
  return '<div class="ac-axiom-panel" data-state="' + state + '">' +
      '<img class="ac-portrait" src="' + portraitOf(state) + '" alt="AXIOM">' +
      '<div class="ac-bubble"><p class="ac-bubble-main">' + esc(text) + '</p>' +
        (sub ? '<p class="ac-bubble-sub">' + esc(sub) + '</p>' : '') + '</div>' +
    '</div>';
}

function renderRunner() {
  const l = session.lesson, step = currentStep();
  root.innerHTML =
    '<section class="ac-runner">' +
      '<div class="ac-runner-top">' +
        '<button class="ac-back" id="ac-back" type="button">← Academia</button>' +
        '<div class="ac-runner-title"><span class="ac-eyebrow">' + esc(cap(conceptName(l.concept))) + '</span><h2>' + esc(l.title) + '</h2></div>' +
        '<div class="ac-progress-steps">' + l.steps.map((s, i) => '<span class="ac-dot-step' + (i === session.stepIdx ? ' on' : '') + (i < session.stepIdx ? ' done' : '') + '"></span>').join('') + '</div>' +
      '</div>' +
      '<div class="ac-stage">' +
        '<div class="ac-board-col"><div class="ac-board" id="ac-board"></div>' +
          '<div class="ac-goal" id="ac-goal">' + esc(step.goal) + '</div>' +
        '</div>' +
        '<div class="ac-side" id="ac-side">' +
          axiomLine('explain', l.intro, step.observe) +
          '<div class="ac-actions" id="ac-actions">' +
            '<button class="ac-btn ghost" id="ac-hint" type="button">Pedir una pista</button>' +
          '</div>' +
          '<div class="ac-hintbox" id="ac-hintbox" hidden></div>' +
        '</div>' +
      '</div>' +
    '</section>';

  document.getElementById('ac-back').addEventListener('click', () => { session = null; renderHome(); });
  session.board = createBoard(document.getElementById('ac-board'), {
    fen: step.fen, orientation: step.orientation, playerColor: step.playerColor,
    onAttempt: onPlayerMove,
  });
  document.getElementById('ac-hint').addEventListener('click', giveHint);
}

function setAxiom(state, text, sub) {
  const side = document.getElementById('ac-side');
  const old = side.querySelector('.ac-axiom-panel');
  const wrap = document.createElement('div');
  wrap.innerHTML = axiomLine(state, text, sub);
  const fresh = wrap.firstChild;
  old.replaceWith(fresh);
}

function giveHint() {
  const step = currentStep();
  session.hintLevel = Math.min(4, session.hintLevel + 1);
  session.maxHint = Math.max(session.maxHint, session.hintLevel);
  const lvl = session.hintLevel;
  const hints = step.hints && step.hints.length ? step.hints : LINES.hint;
  setAxiom('hint', hints[Math.min(lvl, hints.length - 1)]);
  // Overlays progresivos: foco (1), candidatas (2), demostración (4).
  const b = session.board; const exp = step.expected[0];
  const from = exp.slice(0, 2), to = exp.slice(2, 4);
  b.clearOverlays();
  if (lvl >= 1) b.markSquare(from, 'focus');
  if (lvl >= 2) b.markSquare(to, 'cand');
  if (lvl >= 4) b.arrow(from, to, 'idea');
  const hb = document.getElementById('ac-hintbox');
  hb.hidden = false;
  hb.innerHTML = 'Pista ' + (lvl + 1) + ' de 5' + (lvl >= 4 ? ' · última' : '');
  if (lvl >= 4) document.getElementById('ac-hint').disabled = true;
}

function onPlayerMove(uciMove, moveObj, boardApi) {
  if (session.solved) return;
  const step = currentStep();
  const isExpected = step.expected.includes(uciMove);
  const mateOK = step.mustMate ? boardApi.game().isCheckmate() : true;
  if (isExpected && mateOK) return onCorrect();
  // Jugada legal pero no es la idea: AXIOM avisa y se deshace.
  onMistake(uciMove, moveObj, boardApi);
}

function onMistake(uciMove, moveObj, boardApi) {
  const step = currentStep();
  boardApi.lock();
  // Muestra la consecuencia: piezas propias que quedan colgadas.
  const mover = step.playerColor;
  const hangs = hangingSquares(boardApi.fen(), mover);
  hangs.forEach(sq => boardApi.markSquare(sq, 'danger'));
  setAxiom('mistake', step.wrong || pick(LINES.mistake), hangs.length ? 'Fíjate en lo que queda sin defensa.' : '');
  boardApi.flash(uciMove.slice(2, 4));
  setTimeout(() => {
    boardApi.undoLast();
    boardApi.clearOverlays();
    boardApi.unlock();
  }, 1400);
}

async function onCorrect() {
  session.solved = true;
  const step = currentStep(), l = session.lesson;
  session.board.lock();
  const exp = step.expected[0];
  session.board.clearOverlays();
  session.board.arrow(exp.slice(0, 2), exp.slice(2, 4), 'good');
  setAxiom('correct', pick(LINES.correct), step.explain);

  const last = session.stepIdx >= l.steps.length - 1;
  const acts = document.getElementById('ac-actions');
  acts.innerHTML = last
    ? '<button class="ac-btn primary" id="ac-finish" type="button">Terminar lección</button>'
    : '<button class="ac-btn primary" id="ac-next" type="button">Siguiente →</button>';
  if (last) {
    document.getElementById('ac-finish').addEventListener('click', finishLesson);
  } else {
    document.getElementById('ac-next').addEventListener('click', () => {
      session.stepIdx++; session.hintLevel = -1; session.solved = false; renderRunner();
    });
  }
}

async function finishLesson() {
  const l = session.lesson;
  // Registrar resultado (memoria del mentor) si hay sesión.
  if (user) {
    try {
      const out = await api.academyResult({ lesson: l.id, concept: l.concept, correct: true, hintUsed: session.maxHint });
      memory = out.memory; progressByConcept = {};
      (out.progress || []).forEach(p => { progressByConcept[p.concept] = p; });
    } catch (e) {}
  }
  renderComplete(l);
}

function renderComplete(l) {
  const st = conceptStat(l.concept);
  const scene = sceneOf('complete');
  root.innerHTML =
    '<section class="ac-complete">' +
      (scene ? '<div class="ac-complete-scene" style="background-image:url(' + scene + ')"></div>' : '') +
      '<div class="ac-complete-inner">' +
        '<img class="ac-complete-portrait" src="' + portraitOf('complete') + '" alt="AXIOM">' +
        '<span class="ac-eyebrow">Concepto reforzado</span>' +
        '<h1>' + esc(l.title) + '</h1>' +
        '<p class="ac-say">' + esc(pick(LINES.complete)) + '</p>' +
        (user ? '<div class="ac-complete-stat"><div><b>' + st.mastery + '</b><span>Dominio</span></div><div><b>' + st.confidence + '</b><span>Confianza</span></div>' +
          '<div><b>' + (session ? session.maxHint : 0) + '</b><span>Pistas usadas</span></div></div>' : '<p class="ac-say sub">Entra para guardar tu progreso y que AXIOM recuerde tus conceptos.</p>') +
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
