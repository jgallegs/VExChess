// ============================================================
//  VEXCHESS · AXIOM — Maestro de las Variantes
//  Motor del entrenador: identidad, estados visuales, biblioteca
//  de diálogo (según su biblia) y ayudantes de coach con chess.js.
//  "No memorices la jugada. Entiende por qué existe."
// ============================================================
import { Chess } from './chess.js';

export const AXIOM = {
  id: 'axiom',
  name: 'AXIOM',
  title: 'Maestro de las Variantes',
  tagline: 'No memorices la jugada. Entiende por qué existe.',
  loop: ['observe', 'predict', 'play', 'explain'],
  palette: { void: '#0D1117', slate: '#202938', ivory: '#F5F7FA', vexRed: '#FF3B47', cobalt: '#1256C4', cyan: '#39D5FF', gold: '#F4C763' },
};

// Estados canónicos (axiom.json). Cada uno tiene retrato y escena.
const STATE_FILE = {
  welcome: 'welcome',
  explain: 'explain-movement',
  hint: 'hint',
  mistake: 'mistake-warning',
  correct: 'correct',
  analyze: 'analyze-variation',
  loss: 'encouragement-loss',
  complete: 'lesson-complete',
};
export const AX_STATES = Object.keys(STATE_FILE);
export function portraitOf(state) { return 'assets/axiom/portraits/' + (STATE_FILE[state] || 'welcome') + '.png'; }
export function sceneOf(state) {
  // Solo hay 2 escenas full en el proyecto; el resto cae a un fondo por CSS.
  const has = { welcome: 1, complete: 1 };
  return has[state] ? 'assets/axiom/scenes/' + STATE_FILE[state] + '.png' : null;
}
export const AX_AVATAR = 'assets/axiom/avatar-512.png';
export const AX_SPLASH = 'assets/axiom/splash.png';

// ---------- Biblioteca de diálogo (voz de AXIOM) ----------
// Contrato: una observación + una pregunta/acción + motivo breve opcional.
export const LINES = {
  // Escalera de ayuda (5 niveles). Fallback genérico si la lección no define uno.
  hint: [
    '¿Qué cambió con la última jugada?',
    'Mira con calma: ¿qué pieza está menos protegida?',
    'Hay una o dos casillas que resuelven la idea. Busca cerca de la acción.',
    'La idea es un patrón que ya conoces. Piensa en ataque doble, clavada o pieza sin defensor.',
    'Te muestro la línea y por qué funciona. Después vuelve a intentarlo tú.',
  ],
  correct: [
    'Exacto. No has encontrado una jugada: has encontrado la idea.',
    'Bien. Primero seguridad, después actividad.',
    'La jugada funciona. Ahora ya sabes por qué existe.',
    'Eso es. Has visto la amenaza antes de moverla.',
  ],
  mistake: [
    'Espera: esa jugada deja algo sin vigilar. Comprobemos jaques, capturas y amenazas.',
    'La intención era buena; el orden permite una captura intermedia.',
    'No pasa nada. Ahora conocemos la casilla que faltaba mirar.',
  ],
  loss: [
    'La partida terminó; el aprendizaje no. Hay un momento que merece la pena guardar.',
    'No revisaremos todo. Solo la decisión que puede ayudarte en la próxima.',
  ],
  complete: [
    'Has demostrado que entiendes la idea, no solo que la aciertas.',
    'Concepto dominado. La próxima vez lo reconocerás tú solo.',
  ],
  encourage: [
    'Piensa la intención antes de mover. La jugada vendrá sola.',
    'Observa. Predice. Juega. Explica. Ese es el orden.',
  ],
};

let _seed = 1;
export function pick(arr, seed) {
  if (!arr || !arr.length) return '';
  if (seed == null) { _seed = (_seed * 48271) % 2147483647; seed = _seed; }
  return arr[Math.abs(seed) % arr.length];
}

// ---------- Saludo con memoria (mentor) ----------
// Recibe el objeto memory del backend y compone la bienvenida de AXIOM.
export function greeting(memory, username) {
  const name = username ? username : 'jugador';
  if (!memory || memory.isNewDay === undefined) {
    return { line: 'Bienvenido a la Academia VEX. Aquí no memorizamos jugadas: entendemos por qué existen.', sub: 'Empieza cuando quieras.' };
  }
  const parts = [];
  let sub = '';
  if (memory.streak >= 2) parts.push('Racha de ' + memory.streak + ' días. La constancia enseña más que la intensidad.');
  else if (memory.streak === 1) parts.push('Segundo encuentro. Bien.');
  else parts.push('Bienvenido de nuevo, ' + name + '.');

  if (memory.dueConcepts && memory.dueConcepts.length) {
    sub = 'Hoy toca repasar: ' + memory.dueConcepts.map(conceptName).join(', ') + '.';
  } else if (memory.weakestConcept) {
    sub = conceptName(memory.weakestConcept) + ' aún nos cuesta un poco; podemos afianzarla.';
  } else if ((memory.lessonsDone || []).length === 0) {
    sub = 'Empezaremos por lo básico: observar antes de mover.';
  } else {
    sub = 'Sigue por donde lo dejamos, o repasa lo que quieras.';
  }
  return { line: parts.join(' '), sub };
}

export const CONCEPTS = {
  board: 'el tablero y las coordenadas',
  'pawn-move': 'el peón',
  'rook-move': 'la torre',
  'bishop-move': 'el alfil',
  'queen-move': 'la dama',
  'king-move': 'el rey',
  'knight-move': 'el salto del caballo',
  'piece-values': 'el valor de las piezas',
  check: 'el jaque',
  checkmate: 'el jaque mate',
  castling: 'el enroque',
  promotion: 'la coronación',
  'hanging-piece': 'las piezas sin defensor',
  defenders: 'contar los defensores',
  'back-rank': 'el mate de última fila',
  fork: 'la horquilla',
  pin: 'la clavada',
  center: 'el centro',
  development: 'el desarrollo',
  'king-safety': 'la seguridad del rey',
  'passed-pawn': 'el peón pasado',
  'rook-mate': 'el mate con torre',
};
export function conceptName(c) { return CONCEPTS[c] || c; }

// ---------- Ayudantes de coach (chess.js) ----------
export function uci(m) { return m.from + m.to + (m.promotion ? m.promotion : ''); }

// ¿Qué piezas de `color` quedan colgadas (atacadas por el rival y sin defensa)?
// Se usa para "mistake-warning": hacer visible la consecuencia sin regañar.
export function hangingSquares(fen, color) {
  const g = new Chess(fen);
  const board = g.board();
  const enemy = color === 'w' ? 'b' : 'w';
  const out = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = board[r][f];
    if (!p || p.color !== color || p.type === 'k') continue;
    const sq = 'abcdefgh'[f] + (8 - r);
    if (g.isAttacked(sq, enemy) && !g.isAttacked(sq, color)) out.push(sq);
  }
  return out;
}
