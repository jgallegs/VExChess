// ============================================================
//  VEXCHESS · AXIOM — Renderizador de escenas cinematográficas
//  Compone capas (fondo + FX + pose) según scenes.json del pack v3,
//  con parallax y movimiento contenido (respiración, no locomoción).
//  Orden de capas: fondo → parallax ambiental → FX pedagógico → AXIOM.
//  Cada capa = wrapper (posición + parallax) con img interna (motion),
//  para no mezclar transforms.
// ============================================================

const BG = (n) => 'assets/axiom/bg/' + n + '.webp';
const POSE = (n) => 'assets/axiom/poses/' + n + '.webp';
const FX = (n) => 'assets/axiom/fx/' + n + '.webp';

// Mapa de escenas (scenes.json del AXIOM Cinematic Scene Kit v3).
export const SCENES = {
  welcome:   { bg: 'academy-atrium', pose: { id: 'welcome-invite', x: 78, y: 54, w: 38, m: 'axiomFloat' }, layers: [{ id: 'cyan-motes', x: 53, y: 48, w: 34, m: 'motesDrift', depth: 'near' }], safe: 'left' },
  explain:   { bg: 'lesson-chamber', pose: { id: 'explain-point', x: 78, y: 54, w: 38, m: 'axiomFloat' }, layers: [{ id: 'holo-board-empty', x: 27, y: 53, w: 38, m: 'boardBreathe', depth: 'far' }, { id: 'focus-reticle', x: 34, y: 46, w: 14, m: 'reticlePulse', depth: 'near' }], safe: 'left' },
  listening: { bg: 'lesson-chamber', pose: { id: 'idle-listening', x: 21, y: 54, w: 36, m: 'axiomFloat' }, layers: [{ id: 'knowledge-constellation', x: 74, y: 43, w: 27, m: 'constellationDrift', depth: 'far' }], safe: 'right' },
  hint:      { bg: 'calculation-vault', pose: { id: 'hint-question', x: 79, y: 54, w: 37, m: 'axiomFloat' }, layers: [{ id: 'candidate-squares', x: 24, y: 58, w: 30, m: 'candidatePulse', depth: 'far' }, { id: 'knight-l-ribbon', x: 42, y: 32, w: 20, m: 'hintTrace', depth: 'near' }], safe: 'left' },
  warning:   { bg: 'tactical-arena', pose: { id: 'warning-pause', x: 78, y: 54, w: 38, m: 'warningHold' }, layers: [{ id: 'threat-beam', x: 25, y: 57, w: 39, m: 'threatFlash', depth: 'far' }, { id: 'protective-arc', x: 53, y: 56, w: 25, m: 'shieldPulse', depth: 'near' }], safe: 'left' },
  thinking:  { bg: 'endgame-sanctum', pose: { id: 'think-calculate', x: 22, y: 54, w: 36, m: 'axiomFloat' }, layers: [{ id: 'calculation-ring', x: 74, y: 53, w: 28, m: 'calculationSpin', depth: 'far' }, { id: 'cyan-motes', x: 76, y: 35, w: 23, m: 'motesDrift', depth: 'near' }], safe: 'right' },
  analysis:  { bg: 'variation-observatory', pose: { id: 'analyze-compare', x: 77, y: 54, w: 37, m: 'axiomFloat' }, layers: [{ id: 'variation-branches', x: 24, y: 34, w: 36, m: 'branchReveal', depth: 'far' }, { id: 'board-stack', x: 34, y: 70, w: 28, m: 'boardBreathe', depth: 'near' }], safe: 'left' },
  challenge: { bg: 'tactical-arena', pose: { id: 'challenge-focus', x: 22, y: 54, w: 38, m: 'warningHold' }, layers: [{ id: 'scan-arcs', x: 75, y: 54, w: 31, m: 'calculationSpin', depth: 'far' }, { id: 'crystal-fragments', x: 76, y: 30, w: 23, m: 'shardsDrift', depth: 'near' }], safe: 'right' },
  correct:   { bg: 'calculation-vault', pose: { id: 'correct-approval', x: 79, y: 54, w: 37, m: 'axiomFloat' }, layers: [{ id: 'mastery-star', x: 24, y: 43, w: 17, m: 'masteryReveal', depth: 'near' }, { id: 'cyan-motes', x: 27, y: 66, w: 30, m: 'motesDrift', depth: 'far' }], safe: 'left' },
  recovery:  { bg: 'memory-archive', pose: { id: 'encourage-recover', x: 78, y: 54, w: 38, m: 'axiomFloat' }, layers: [{ id: 'light-shaft', x: 27, y: 56, w: 14, m: 'lightBreathe', depth: 'far' }, { id: 'crystal-fragments', x: 24, y: 32, w: 20, m: 'shardsDrift', depth: 'near' }], safe: 'left' },
  reward:    { bg: 'strategy-gallery', pose: { id: 'reveal-present', x: 78, y: 54, w: 37, m: 'axiomFloat' }, layers: [{ id: 'progress-path', x: 25, y: 59, w: 33, m: 'branchReveal', depth: 'far' }, { id: 'focus-reticle', x: 38, y: 35, w: 16, m: 'reticlePulse', depth: 'near' }], safe: 'left' },
  complete:  { bg: 'mastery-hall', pose: { id: 'complete-salute', x: 78, y: 54, w: 39, m: 'axiomFloat' }, layers: [{ id: 'mastery-star', x: 26, y: 42, w: 25, m: 'masteryReveal', depth: 'near' }, { id: 'cyan-motes', x: 51, y: 67, w: 37, m: 'motesDrift', depth: 'far' }], safe: 'left' },
};

function layerWrap(cls, src, x, y, w, motion) {
  return '<div class="axs-layer ' + cls + '" style="left:' + x + '%;top:' + y + '%;width:' + w + '%">' +
    '<img class="axm-' + motion + '" src="' + src + '" alt="" aria-hidden="true"></div>';
}

// Monta una escena en `container`. Devuelve { setScene, destroy }.
export function mountScene(container, sceneId, opts = {}) {
  container.classList.add('axs-stage');
  container.setAttribute('aria-hidden', 'true');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build(id) {
    const s = SCENES[id] || SCENES.welcome;
    let html = '<div class="axs-bg" style="background-image:url(' + BG(s.bg) + ')"></div>';
    for (const L of s.layers) html += layerWrap('axs-fx ' + (L.depth || 'far'), FX(L.id), L.x, L.y, L.w, L.m);
    html += layerWrap('axs-pose', POSE(s.pose.id), s.pose.x, s.pose.y, s.pose.w, s.pose.m);
    container.innerHTML = html;
    container.dataset.safe = s.safe;
    container.classList.toggle('axs-still', !!reduce);
  }
  build(sceneId);

  let raf = null, tx = 0, ty = 0;
  function onMove(e) {
    const r = container.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(apply);
  }
  function apply() {
    raf = null;
    const bg = container.querySelector('.axs-bg');
    if (bg) { bg.style.setProperty('--px', (tx * 5).toFixed(1) + 'px'); bg.style.setProperty('--py', (ty * 5).toFixed(1) + 'px'); }
    container.querySelectorAll('.axs-fx').forEach(el => {
      const d = el.classList.contains('near') ? 14 : 8;
      el.style.setProperty('--px', (tx * d).toFixed(1) + 'px'); el.style.setProperty('--py', (ty * d).toFixed(1) + 'px');
    });
    const pose = container.querySelector('.axs-pose');
    if (pose) { pose.style.setProperty('--px', (tx * 3).toFixed(1) + 'px'); pose.style.setProperty('--py', (ty * 3).toFixed(1) + 'px'); }
  }
  if (opts.parallax !== false && !reduce) container.addEventListener('mousemove', onMove);

  return {
    setScene(id) { build(id); },
    destroy() { container.removeEventListener('mousemove', onMove); container.innerHTML = ''; },
  };
}
