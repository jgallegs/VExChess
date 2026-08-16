// ============================================================
//  VEXCHESS · Academia — Modo entrenamiento con AXIOM
//  Bucle real: Observa → Predice → Juega → Explica, sobre el
//  tablero interactivo. Memoria de mentor (D1) por concepto.
// ============================================================
import { onAuth, getUser, api, isAuthResolved, openAuth } from './auth.js?v=18';
import { AXIOM, AX_SPLASH, portraitOf, sceneOf, LINES, pick, greeting, conceptName, hangingSquares } from './axiom.js?v=2';
import { PATH, LESSONS, lessonById, lessonsForLevel } from './academy-lessons.js?v=4';
import { createBoard } from './academy-board.js?v=2';
import { mountScene, bgFor, poseFor, sceneFor } from './axiom-scene.js?v=2';
import { Chess } from './chess.js';
import { createEngine } from './academy-engine.js?v=1';
import { scoreToCp, classifyLoss, sparReaction, threatNote, pickMoments, LAB_LINES } from './academy-coach.js?v=1';
import { mountChat } from './academy-chat.js?v=1';

// Motor Stockfish (perezoso; hueco para inyectar un mock en tests).
let _engine = null;
function engine() { if (!_engine) _engine = (typeof window !== 'undefined' && window.__vexEngine) || createEngine(); return _engine; }

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
    introCard() +
    chatCard() +
    trainHub() +
    conceptsBar() +
    '<section class="ac-path">' + PATH.map(pathBlock).join('') + '</section>' +
    '<p class="ac-note">La Academia mide tu <b>aprendizaje</b> (conceptos que dominas y puedes explicar), no tu Elo.</p>';

  const stage = document.getElementById('ac-hero-stage');
  if (stage) mountScene(stage, 'welcome');
  const lg = document.getElementById('ac-login');
  if (lg) lg.addEventListener('click', () => openAuth('login'));
  root.querySelectorAll('[data-lesson]').forEach(b => b.addEventListener('click', () => startLesson(b.getAttribute('data-lesson'))));
  const gs = document.getElementById('ac-go-spar'); if (gs) gs.addEventListener('click', sparSetup);
  const gl = document.getElementById('ac-go-lab'); if (gl) gl.addEventListener('click', labEntry);
  const gc = document.getElementById('ac-go-chat'); if (gc) gc.addEventListener('click', openChat);
}

// Tarjeta destacada "Empieza aquí" para la historia del ajedrez (solo demo).
function introCard() {
  const story = LESSONS.find(l => l.story);
  if (!story) return '';
  const solved = done(story.id);
  return '<section class="ac-intro-card' + (solved ? ' seen' : '') + '" data-lesson="' + story.id + '" role="button" tabindex="0">' +
      '<div class="ac-intro-glow"></div>' +
      '<img class="ac-intro-pose" src="' + poseFor(sceneFor('welcome')) + '" alt="AXIOM">' +
      '<div class="ac-intro-body">' +
        '<span class="ac-eyebrow">' + (solved ? 'Ya lo viste · repásalo cuando quieras' : '¿Nunca has jugado? Empieza aquí') + '</span>' +
        '<h2>' + esc(story.title) + '</h2>' +
        '<p>' + esc(story.intro) + '</p>' +
        '<span class="ac-intro-cta">' + (solved ? 'Ver de nuevo' : 'Empieza el viaje') + ' →</span>' +
      '</div>' +
    '</section>';
}

// Tarjeta de acceso al chat con AXIOM.
function chatCard() {
  return '<section class="ac-chat-card" id="ac-go-chat" role="button" tabindex="0">' +
      '<img class="ac-chat-av" src="assets/axiom/avatar-128.png" alt="AXIOM" onerror="this.style.display=\'none\'">' +
      '<div class="ac-chat-body">' +
        '<span class="ac-eyebrow">Pregúntale a AXIOM</span>' +
        '<b>Habla con tu entrenador</b>' +
        '<span>Dudas de ajedrez, cómo vas, qué repasar… en tu idioma. Responde al momento; si tu equipo lo permite, puede pensar con un modelo de IA local.</span>' +
      '</div>' +
      '<span class="ac-chat-cta">Abrir chat →</span>' +
    '</section>';
}

function trainHub() {
  return '<section class="ac-train"><h2>Entrena jugando con AXIOM</h2><div class="ac-train-grid">' +
      '<button class="ac-train-card spar" id="ac-go-spar" type="button">' +
        '<span class="ac-train-ic">⚔</span>' +
        '<span class="ac-train-body"><b>Sparring guiado</b><span>Juega contra la IA. AXIOM interviene solo en los momentos clave y te deja rehacer los errores graves.</span></span>' +
      '</button>' +
      '<button class="ac-train-card lab" id="ac-go-lab" type="button">' +
        '<span class="ac-train-ic">🔬</span>' +
        '<span class="ac-train-body"><b>Laboratorio de partida</b><span>Tras jugar, AXIOM elige 3 momentos que merece la pena recordar y te los explica.</span></span>' +
      '</button>' +
    '</div></section>';
}

function conceptsBar() {
  const concepts = [...new Set(LESSONS.filter(l => !l.story).map(l => l.concept))];
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
  const list = lessonsForLevel(node.level).filter(l => !l.story);
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
          (step.goal ? '<div class="ac-goal" id="ac-goal">' + esc(step.goal) + '</div>' : '') +
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
  const demoOnly = session.lesson.demoOnly || !currentStep().expected || !currentStep().expected.length;
  const acts = document.getElementById('ac-actions');
  if (demoOnly) {
    renderPhaseDots(getDemo().length, getDemo().length - 1);
    setAxiom('complete', session.lesson.story ? 'Ya conoces de dónde viene el juego. Ahora vamos a lo básico: el tablero.' : 'Eso es todo por aquí.',
      session.lesson.story ? 'Cuando quieras, empieza por “El tablero y las coordenadas”.' : '');
    acts.innerHTML = '<button class="ac-btn primary" id="ac-skip" type="button">' + (session.lesson.story ? 'Empezar a aprender →' : 'Terminar') + '</button>';
    document.getElementById('ac-skip').onclick = () => finishLesson(false);
    return;
  }
  renderPhaseDots(getDemo().length + 1, getDemo().length); // última fase = práctica
  setAxiom('reward', '¿Lo pruebas tú? Reconstruyo la posición y buscas la idea.', 'Sin prisa. Puedes pedir pistas cuando quieras.');
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
  const isStory = l.story || l.demoOnly;
  const eyebrow = isStory ? 'Primer paso dado' : 'Concepto reforzado';
  const msg = isStory
    ? (l.story ? 'Ya sabes qué es el ajedrez y de dónde viene. Ahora empieza lo bueno: aprender a jugarlo.' : 'Idea vista. Sigue cuando quieras.')
    : (practiced ? pick(LINES.complete) : 'Bien. Has visto la idea; cuando quieras, vuelve y practícala tú.');
  const showStats = user && !isStory;
  root.innerHTML =
    '<section class="ac-complete cine">' +
      '<div class="ac-complete-scene" style="background-image:url(' + bgFor(sceneFor('complete')) + ')"></div>' +
      '<div class="ac-complete-inner">' +
        '<img class="ac-complete-pose" src="' + poseFor(sceneFor('complete')) + '" alt="AXIOM">' +
        '<span class="ac-eyebrow">' + eyebrow + '</span>' +
        '<h1>' + esc(l.title) + '</h1>' +
        '<p class="ac-say">' + esc(msg) + '</p>' +
        (showStats ? '<div class="ac-complete-stat"><div><b>' + st.mastery + '</b><span>Dominio</span></div><div><b>' + st.confidence + '</b><span>Confianza</span></div>' +
          '<div><b>' + (session && practiced ? session.maxHint : '—') + '</b><span>Pistas</span></div></div>'
          : (user ? '' : '<p class="ac-say sub">Entra para guardar tu progreso y que AXIOM recuerde tus conceptos.</p>')) +
        '<div class="ac-actions center">' +
          (isStory && lessonById('board') ? '<button class="ac-btn primary" id="ac-nextlesson" type="button">Primera lección: el tablero →</button>' : '') +
          '<button class="ac-btn ' + (isStory ? 'ghost' : 'primary') + '" id="ac-toacademy" type="button">Volver a la Academia</button>' +
        '</div>' +
      '</div>' +
    '</section>';
  document.getElementById('ac-toacademy').addEventListener('click', () => { session = null; renderHome(); });
  const nx = document.getElementById('ac-nextlesson'); if (nx) nx.addEventListener('click', () => startLesson('board'));
}

// ============================================================
//  CHAT CON AXIOM (multiidioma, IA local opcional)
// ============================================================
function openChat() {
  session = null; spar = null; lab = null;
  mountChat(root, {
    user, memory, progressByConcept,
    onBack: () => renderHome(),
    onStartLesson: (id) => startLesson(id),
    onSparring: () => sparSetup(),
    onLab: () => labEntry(),
  });
}

// ============================================================
//  SPARRING GUIADO — partida real vs IA con AXIOM de coach
// ============================================================
let spar = null;
let lastGame = null;
const SPAR_LEVELS = { aprendiz: { elo: 1350, movetime: 350 }, intermedio: { elo: 1650, movetime: 550 } };

function backBtn() { return '<button class="ac-back" id="ac-back" type="button">← Academia</button>'; }
function wireBack() { const b = document.getElementById('ac-back'); if (b) b.onclick = () => { spar = null; lab = null; session = null; renderHome(); }; }
function seg(group, val, label, active) { return '<button class="ac-seg-btn' + (active ? ' on' : '') + '" data-g="' + group + '" data-v="' + val + '" type="button">' + label + '</button>'; }
function wireSeg(id) { const el = document.getElementById(id); if (!el) return; el.querySelectorAll('.ac-seg-btn').forEach(b => b.onclick = () => { el.querySelectorAll('.ac-seg-btn').forEach(x => x.classList.remove('on')); b.classList.add('on'); }); }
function segValue(id) { const on = document.querySelector('#' + id + ' .ac-seg-btn.on'); return on ? on.dataset.v : null; }

function sparSetup() {
  spar = null;
  root.innerHTML =
    '<section class="ac-setup cine">' +
      '<div class="ac-cine-bg" style="background-image:url(' + bgFor(sceneFor('challenge')) + ')"></div><div class="ac-cine-scrim"></div>' +
      '<div class="ac-runner-top">' + backBtn() + '<div class="ac-runner-title"><span class="ac-eyebrow">Entrena jugando</span><h2>Sparring guiado</h2></div></div>' +
      '<div class="ac-setup-inner">' +
        '<img class="ac-pose" src="' + poseFor(sceneFor('challenge')) + '" alt="AXIOM">' +
        '<p class="ac-say">Jugamos una partida de verdad. Intervengo solo cuando hay algo que aprender, y te dejo rehacer los errores graves.</p>' +
        '<div class="ac-setup-row"><span>Tu color</span><div class="ac-seg" id="sp-color">' + seg('color', 'w', 'Blancas') + seg('color', 'random', 'Aleatorio', true) + seg('color', 'b', 'Negras') + '</div></div>' +
        '<div class="ac-setup-row"><span>Nivel</span><div class="ac-seg" id="sp-level">' + seg('level', 'aprendiz', 'Aprendiz', true) + seg('level', 'intermedio', 'Intermedio') + '</div></div>' +
        '<label class="ac-check"><input type="checkbox" id="sp-aloud"> Pensar en voz alta: declarar mi intención antes de mover</label>' +
        '<button class="ac-btn primary" id="sp-start" type="button">Empezar la partida →</button>' +
      '</div>' +
    '</section>';
  wireBack(); wireSeg('sp-color'); wireSeg('sp-level');
  document.getElementById('sp-start').onclick = beginSpar;
}

function beginSpar() {
  const color = segValue('sp-color') || 'random';
  const level = segValue('sp-level') || 'aprendiz';
  const human = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
  spar = { human, level, aloud: document.getElementById('sp-aloud').checked, over: false, busy: false, chess: new Chess(), pendingBefore: null };
  engine().warmup();
  renderSpar();
  if (human === 'b') { sparEngineReply(); } else { sparPromptTurn(); }
}

function renderSpar() {
  root.innerHTML =
    '<section class="ac-runner cine" id="ac-runner">' +
      '<div class="ac-cine-bg" id="ac-cine-bg"></div><div class="ac-cine-scrim"></div>' +
      '<div class="ac-runner-top">' + backBtn() +
        '<div class="ac-runner-title"><span class="ac-eyebrow">Sparring guiado</span><h2>Partida con AXIOM</h2></div>' +
        '<div class="ac-spar-status" id="sp-status"></div>' +
      '</div>' +
      '<div class="ac-stage">' +
        '<div class="ac-board-col"><div class="ac-board" id="ac-board"></div><div class="ac-spar-controls" id="sp-controls"></div></div>' +
        '<div class="ac-coach">' +
          '<img class="ac-pose" id="ac-pose" src="' + poseFor(sceneFor('welcome')) + '" alt="AXIOM">' +
          '<div class="ac-bubble2" id="ac-bubble" data-state="welcome"><p class="ac-bubble-main" id="ac-say"></p><p class="ac-bubble-sub" id="ac-saysub"></p></div>' +
          '<div class="ac-actions" id="ac-actions"></div>' +
        '</div>' +
      '</div>' +
    '</section>';
  wireBack();
  spar.board = createBoard(document.getElementById('ac-board'), { fen: spar.chess.fen(), orientation: spar.human, playerColor: spar.human, interactive: false, onAttempt: onSparMove });
  setAxiom('welcome', 'Cuando quieras, mueve. Yo observo.', spar.aloud ? 'Puedes declarar tu intención abajo antes de mover.' : '');
  renderSparControls();
}

function setSparStatus(t) { const el = document.getElementById('sp-status'); if (el) el.textContent = t || ''; }

function renderSparControls() {
  const el = document.getElementById('sp-controls'); if (!el) return;
  const intents = spar.aloud
    ? '<div class="ac-intents">' + [['atacar', 'Atacar'], ['defender', 'Defender'], ['desarrollar', 'Desarrollar'], ['intercambiar', 'Intercambiar'], ['amenaza', 'Crear amenaza']]
        .map(([v, l]) => '<button class="ac-intent" data-v="' + v + '" type="button">' + l + '</button>').join('') + '</div>'
    : '';
  el.innerHTML = intents +
    '<div class="ac-spar-btns"><button class="ac-btn ghost sm" id="sp-hint" type="button">Pista</button>' +
      '<button class="ac-btn ghost sm" id="sp-resign" type="button">Rendirse</button></div>';
  el.querySelectorAll('.ac-intent').forEach(b => b.onclick = () => {
    el.querySelectorAll('.ac-intent').forEach(x => x.classList.remove('on')); b.classList.add('on');
    spar.intention = b.dataset.v;
    setAxiom('listening', 'De acuerdo: ' + b.textContent.toLowerCase() + '. Busca la jugada que lo cumpla.', '');
  });
  const hb = document.getElementById('sp-hint'); if (hb) hb.onclick = sparHint;
  const rb = document.getElementById('sp-resign'); if (rb) rb.onclick = () => { if (!spar.over) { spar.chess.header && 0; sparEnd('derrota'); } };
}

function sparPromptTurn() {
  if (spar.over) return;
  spar.pendingBefore = spar.chess.fen();
  spar.busy = false;
  spar.board.setInteractive(true); spar.board.unlock();
  if (typeof window !== 'undefined') window.__sparPlies = spar.chess.history().length;
}

async function sparHint() {
  if (spar.over || spar.busy) return;
  try {
    const info = await engine().evaluate(spar.chess.fen(), 11);
    if (info && info.best) { spar.board.clearOverlays(); spar.board.arrow(info.best.slice(0, 2), info.best.slice(2, 4), 'idea'); setAxiom('hint', 'Una idea sólida empieza por aquí. El resto, tú.', ''); }
  } catch (e) {}
}

async function onSparMove(uci, moveObj, api) {
  if (spar.over || spar.busy) return;
  spar.busy = true; spar.board.lock(); spar.board.clearOverlays();
  spar.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
  let reacted = false;
  const before = spar.pendingBefore;
  if (before && !spar.chess.isGameOver()) {
    try {
      const b = await engine().evaluate(before, 10);
      const a = await engine().evaluate(spar.chess.fen(), 10);
      const bestCp = scoreToCp(b);
      const afterCp = -scoreToCp(a);
      const cls = classifyLoss(bestCp, afterCp);
      const r = sparReaction(cls, { sharp: Math.abs(bestCp) < 250 });
      if (r.intervene) {
        reacted = true;
        setAxiom(r.state, r.line, r.sub);
        if (r.takeback) { offerTakeback(); return; }
      }
    } catch (e) {}
  }
  if (!reacted) setAxiom('listening', pick(['Bien.', 'Sigo.', 'Vale.', 'Anotado.']), '');
  await checkEndOrReply();
}

function offerTakeback() {
  const acts = document.getElementById('ac-actions');
  acts.innerHTML = '<button class="ac-btn primary" id="sp-undo" type="button">Rehacer jugada</button><button class="ac-btn ghost" id="sp-keep" type="button">Seguir así</button>';
  document.getElementById('sp-undo').onclick = () => {
    spar.chess.undo(); spar.board.undoLast(); spar.board.clearOverlays();
    acts.innerHTML = ''; setAxiom('explain', 'Bien pensado. Vuelve a mirar: jaques, capturas y amenazas.', '');
    sparPromptTurn();
  };
  document.getElementById('sp-keep').onclick = () => { acts.innerHTML = ''; checkEndOrReply(); };
}

async function checkEndOrReply() {
  const acts = document.getElementById('ac-actions'); if (acts) acts.innerHTML = '';
  if (spar.chess.isGameOver()) return sparEnd();
  await sparEngineReply();
}

async function sparEngineReply() {
  if (spar.over) return;
  spar.busy = true; spar.board.lock(); setSparStatus('AXIOM calcula su jugada…');
  const lvl = SPAR_LEVELS[spar.level] || SPAR_LEVELS.aprendiz;
  let uci = null;
  try { uci = await engine().bestMove(spar.chess.fen(), { elo: lvl.elo, movetime: lvl.movetime }); } catch (e) {}
  if (!uci) { const ms = spar.chess.moves({ verbose: true }); if (ms.length) uci = ms[0].from + ms[0].to + (ms[0].promotion || ''); }
  if (uci) { spar.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' }); spar.board.play(uci); }
  setSparStatus('');
  if (spar.chess.isGameOver()) return sparEnd();
  const hangs = hangingSquares(spar.chess.fen(), spar.human);
  const note = threatNote(hangs);
  if (note && Math.random() < 0.6) setAxiom(note.state, note.line, note.sub);
  else setAxiom('listening', 'Te toca.', '');
  sparPromptTurn();
}

function buildGameFromSpar() {
  const g = new Chess();
  const hist = spar.chess.history({ verbose: true });
  const fens = [g.fen()], sans = [], lastMoves = [];
  for (const mv of hist) { g.move(mv); fens.push(g.fen()); sans.push(mv.san); lastMoves.push({ from: mv.from, to: mv.to }); }
  let result = '1/2-1/2';
  if (spar.chess.isCheckmate()) result = spar.chess.turn() === 'w' ? '0-1' : '1-0';
  return { fens, sans, lastMoves, humanColor: spar.human, result };
}

function sparEnd(forced) {
  if (spar.over) return;
  spar.over = true; spar.board.lock(); setSparStatus('');
  let outcome;
  if (forced === 'derrota') outcome = 'derrota';
  else if (spar.chess.isCheckmate()) outcome = spar.chess.turn() === spar.human ? 'derrota' : 'victoria';
  else outcome = 'tablas';
  const state = outcome === 'victoria' ? 'correct' : outcome === 'derrota' ? 'loss' : 'analyze';
  const line = outcome === 'victoria' ? pick(LINES.correct) : outcome === 'derrota' ? pick(LINES.loss) : 'Tablas. El equilibrio también enseña.';
  setAxiom(state, 'Partida terminada: ' + outcome + '.', line);
  lastGame = buildGameFromSpar();
  const acts = document.getElementById('ac-actions');
  acts.innerHTML = '<button class="ac-btn primary" id="sp-lab" type="button">Abrir Laboratorio de esta partida →</button><button class="ac-btn ghost" id="sp-again" type="button">Otra partida</button>';
  document.getElementById('sp-lab').onclick = () => startLab(lastGame);
  document.getElementById('sp-again').onclick = sparSetup;
}

// ============================================================
//  LABORATORIO DE PARTIDA — AXIOM elige 3 momentos
// ============================================================
let lab = null;

function reconstructSaved(g) {
  const c = new Chess();
  try { c.loadPgn(g.pgn); } catch (e) { return null; }
  const hist = c.history({ verbose: true });
  const g2 = new Chess();
  const fens = [g2.fen()], sans = [], lastMoves = [];
  for (const mv of hist) { g2.move(mv); fens.push(g2.fen()); sans.push(mv.san); lastMoves.push({ from: mv.from, to: mv.to }); }
  return { fens, sans, lastMoves, humanColor: g.human_color === 'b' ? 'b' : 'w', result: g.result };
}

async function labEntry() {
  if (lastGame) return startLab(lastGame);
  if (!user) { labMessage('Juega un sparring o inicia sesión para revisar tu última partida.'); return; }
  try {
    const out = await api.listGames(1, 0);
    const g = (out.games || [])[0];
    if (!g) { labMessage('Aún no tienes partidas guardadas. Juega un sparring y lo revisamos.'); return; }
    const game = reconstructSaved(g);
    if (!game) { labMessage('No pude leer esa partida.'); return; }
    startLab(game);
  } catch (e) { labMessage('No pude cargar tu última partida.'); }
}

function labMessage(msg) {
  root.innerHTML = '<section class="ac-runner"><div class="ac-runner-top">' + backBtn() +
    '<div class="ac-runner-title"><span class="ac-eyebrow">Laboratorio</span><h2>Revisión de partida</h2></div></div>' +
    '<div class="ac-lab-msg"><img class="ac-pose sm" src="' + poseFor(sceneFor('analysis')) + '" alt="AXIOM"><p class="ac-say">' + esc(msg) + '</p>' +
    '<button class="ac-btn primary" id="lab-spar" type="button">Jugar un sparring →</button></div></section>';
  wireBack();
  document.getElementById('lab-spar').onclick = sparSetup;
}

function labShell() {
  root.innerHTML =
    '<section class="ac-runner cine" id="ac-runner">' +
      '<div class="ac-cine-bg" id="ac-cine-bg"></div><div class="ac-cine-scrim"></div>' +
      '<div class="ac-runner-top">' + backBtn() +
        '<div class="ac-runner-title"><span class="ac-eyebrow">Laboratorio</span><h2>Revisión con AXIOM</h2></div>' +
        '<div class="ac-phase-dots" id="ac-phase-dots"></div>' +
      '</div>' +
      '<div class="ac-stage">' +
        '<div class="ac-board-col"><div class="ac-board" id="ac-board"></div><div class="ac-goal" id="ac-goal"></div></div>' +
        '<div class="ac-coach"><img class="ac-pose" id="ac-pose" src="' + poseFor(sceneFor('analysis')) + '" alt="AXIOM">' +
          '<div class="ac-bubble2" id="ac-bubble" data-state="analyze"><p class="ac-bubble-main" id="ac-say"></p><p class="ac-bubble-sub" id="ac-saysub"></p></div>' +
          '<div class="ac-actions" id="ac-actions"></div></div>' +
      '</div>' +
    '</section>';
  wireBack();
}

async function startLab(game) {
  lab = { game, moments: [], idx: 0, evalCP: null };
  labShell();
  const board = createBoard(document.getElementById('ac-board'), { fen: game.fens[0], orientation: game.humanColor, playerColor: game.humanColor, interactive: false });
  lab.board = board;
  setAxiom('analyze', 'Déjame revisar la partida. No lo veo todo: busco lo que puedes reutilizar.', 'Analizando…');
  engine().warmup();
  const fens = game.fens, evalCP = new Array(fens.length).fill(null);
  for (let i = 0; i < fens.length; i++) {
    const g = new Chess(fens[i]);
    if (g.isGameOver()) evalCP[i] = g.isCheckmate() ? (g.turn() === 'w' ? -2000 : 2000) : 0;
    else { let info = null; try { info = await engine().evaluate(fens[i], 10); } catch (e) {} const stm = g.turn(); const v = scoreToCp(info); evalCP[i] = stm === 'w' ? v : -v; }
    const say = document.getElementById('ac-saysub'); if (say) say.textContent = 'Analizando… ' + Math.round((i + 1) / fens.length * 100) + '%';
  }
  lab.evalCP = evalCP;
  lab.moments = pickMoments(evalCP, game.sans, game.humanColor);
  if (!lab.moments.length) { setAxiom('correct', 'Partida limpia: sin errores claros que destacar.', 'Buen control. Sigue así.'); document.getElementById('ac-actions').innerHTML = '<button class="ac-btn primary" id="lab-back" type="button">Volver a la Academia</button>'; document.getElementById('lab-back').onclick = () => { lab = null; renderHome(); }; return; }
  for (const mo of lab.moments) { try { const info = await engine().evaluate(game.fens[mo.ply], 12); mo.best = info && info.best; } catch (e) {} }
  showMoment(0);
}

function showMoment(i) {
  lab.idx = i;
  const mo = lab.moments[i], meta = LAB_LINES[mo.type], game = lab.game;
  renderPhaseDots(lab.moments.length, i);
  lab.board.reset(game.fens[mo.ply], game.humanColor, game.humanColor);
  lab.board.clearOverlays();
  const played = game.lastMoves[mo.ply];
  if (played) lab.board.arrow(played.from, played.to, mo.type === 'good' ? 'good' : 'idea');
  if (mo.best && mo.type !== 'good') lab.board.arrow(mo.best.slice(0, 2), mo.best.slice(2, 4), 'good');
  const moveNo = Math.floor(mo.ply / 2) + 1;
  const sub = mo.type === 'good' ? 'Jugaste ' + mo.san + '. Mantén ese criterio.' :
    'Jugaste ' + mo.san + (mo.best ? '; la flecha dorada muestra una idea mejor.' : '.');
  setAxiom(meta.state, meta.say, sub);
  const g2 = document.getElementById('ac-goal'); if (g2) g2.textContent = meta.title + ' · jugada ' + moveNo;
  const acts = document.getElementById('ac-actions');
  const prev = i > 0 ? '<button class="ac-btn ghost" id="lab-prev" type="button">← Anterior</button>' : '';
  const next = i < lab.moments.length - 1 ? '<button class="ac-btn primary" id="lab-next" type="button">Siguiente →</button>' : '<button class="ac-btn primary" id="lab-done" type="button">Terminar revisión</button>';
  acts.innerHTML = prev + next;
  if (document.getElementById('lab-prev')) document.getElementById('lab-prev').onclick = () => showMoment(i - 1);
  if (document.getElementById('lab-next')) document.getElementById('lab-next').onclick = () => showMoment(i + 1);
  if (document.getElementById('lab-done')) document.getElementById('lab-done').onclick = () => { lab = null; renderHome(); };
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
