// ============================================================
//  VEXCHESS · Senda de Maestría (Vexborn)
//  Cada campeón enseña su concepto de ajedrez en 5 capítulos
//  (4 lecciones guiadas + 1 Trial), sube el Vínculo y desbloquea
//  su Crónica. Sin ventaja competitiva: aprendizaje + narrativa.
//  Los capítulos reutilizan el formato de paso de la Academia
//  (FEN + jugada esperada en UCI); todo verificado con chess.js.
// ============================================================
import { t } from './i18n.js';

// Niveles de Vínculo (0-100).
export const VINCULO_LEVELS = [
  { min: 0, key: 'iniciado' }, { min: 20, key: 'aprendiz' }, { min: 40, key: 'adepto' },
  { min: 60, key: 'experto' }, { min: 80, key: 'maestro' }, { min: 100, key: 'pleno' },
];
export function vinculoLevel(v) { let r = VINCULO_LEVELS[0]; for (const l of VINCULO_LEVELS) if ((v || 0) >= l.min) r = l; return r; }
export function vinculoLevelName(v) { return t('vm.level.' + vinculoLevel(v).key); }

// Color de acento por campeón (identidad visual de su Senda).
export const SENDA_ACCENT = {
  kael: '#FF3B47', aurelia: '#F4C763', bastion: '#3478F6', nyra: '#914FE8',
  pip: '#21CCE5', ordan: '#F6C453', noctis: '#39D5FF', 'eira-vhal': '#9FB4D8',
  rhazek: '#FF3B47', oryn: '#Dfe6f0', vesra: '#914FE8', brakkon: '#3478F6',
  ilyra: '#21CCE5', tikk: '#21CCE5', malrec: '#B9A06a', solenne: '#F4C763',
};

// Cada capítulo: { k, trial, fen, orientation, playerColor, expected:[uci], from, to }.
// El texto (title/teach/observe/goal/hints/explain/wrong) vive en i18n: vm.<champ>.<k>.*
// La Crónica y la recompensa: vm.<champ>.chron[0..4] y vm.<champ>.reward.
export const SENDAS = {
  noctis: {
    champion: 'noctis', concept: 'fork',
    chapters: [
      { k: 'c1', trial: false, fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d5c7"], from: 'd5', to: 'c7' },
      { k: 'c2', trial: false, fen: '2q1k3/8/8/8/4N3/8/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e4d6"], from: 'e4', to: 'd6' },
      { k: 'c3', trial: false, fen: '4k1q1/8/8/8/6N1/8/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g4f6"], from: 'g4', to: 'f6' },
      { k: 'c4', trial: false, fen: '2q3k1/8/6N1/8/8/8/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g6e7"], from: 'g6', to: 'e7' },
      { k: 'c5', trial: true, fen: '3r1r2/8/7k/2N5/8/8/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["c5e6"], from: 'c5', to: 'e6' },
    ],
  },
  kael: {
    champion: 'kael', concept: 'initiative',
    chapters: [
      { k: 'c1', trial: false, fen: '6k1/8/2q5/5N2/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["f5e7"], from: 'f5', to: 'e7' },
      { k: 'c2', trial: false, fen: 'k3r3/8/8/1N6/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b5c7"], from: 'b5', to: 'c7' },
      { k: 'c3', trial: false, fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g5f7"], from: 'g5', to: 'f7' },
      { k: 'c4', trial: false, fen: '8/4k3/8/8/1q1N4/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d4c6"], from: 'd4', to: 'c6' },
      { k: 'c5', trial: true, fen: '2k5/1p6/p7/5q2/4N3/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e4d6"], from: 'e4', to: 'd6' },
    ],
  },
  aurelia: {
    champion: 'aurelia', concept: 'calculation',
    chapters: [
      { k: 'c1', trial: false, fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g1g7"], from: 'g1', to: 'g7' },
      { k: 'c2', trial: false, fen: '6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d1d8"], from: 'd1', to: 'd8' },
      { k: 'c3', trial: false, fen: '5k2/7P/5K2/8/8/8/8/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["h7h8q"], from: 'h7', to: 'h8' },
      { k: 'c4', trial: false, fen: '3q3k/8/8/8/8/8/8/3Q2K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d1d8"], from: 'd1', to: 'd8' },
      { k: 'c5', trial: true, fen: '7k/8/8/7N/3Q4/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d4g7"], from: 'd4', to: 'g7' },
    ],
  },
  bastion: {
    champion: 'bastion', concept: 'rook-coordination',
    chapters: [
      { k: 'c1', trial: false, fen: '6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b1b8"], from: 'b1', to: 'b8' },
      { k: 'c2', trial: false, fen: '6k1/r7/8/8/8/8/8/R5K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1a7"], from: 'a1', to: 'a7' },
      { k: 'c3', trial: false, fen: 'k7/p7/8/8/8/8/8/1RR4K w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["c1c8"], from: 'c1', to: 'c8' },
      { k: 'c4', trial: false, fen: 'q7/8/8/8/k7/8/7K/7R w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["h1a1"], from: 'h1', to: 'a1' },
      { k: 'c5', trial: true, fen: '4r3/8/8/4k3/8/8/8/R5K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1e1"], from: 'a1', to: 'e1' },
    ],
  },
  nyra: {
    champion: 'nyra', concept: 'pin',
    chapters: [
      { k: 'c1', trial: false, fen: 'k7/6r1/8/8/8/2B5/4P3/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["c3g7"], from: 'c3', to: 'g7' },
      { k: 'c2', trial: false, fen: '6k1/1q6/8/8/8/8/4P1B1/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g2b7"], from: 'g2', to: 'b7' },
      { k: 'c3', trial: false, fen: '4k3/6r1/4n3/8/8/8/8/B3R1K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1g7"], from: 'a1', to: 'g7' },
      { k: 'c4', trial: false, fen: 'k7/n7/2q5/8/8/5B2/8/R5K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["f3c6"], from: 'f3', to: 'c6' },
      { k: 'c5', trial: true, fen: 'q7/8/2k5/5B2/8/4P3/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["f5e4"], from: 'f5', to: 'e4' },
    ],
  },
  pip: {
    champion: 'pip', concept: 'promotion',
    chapters: [
      { k: 'c1', trial: false, fen: '8/P7/k7/8/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a7a8q"], from: 'a7', to: 'a8' },
      { k: 'c2', trial: false, fen: '1r4k1/P7/8/8/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a7b8q"], from: 'a7', to: 'b8' },
      { k: 'c3', trial: false, fen: '4k3/P1P5/4b3/8/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a7a8q"], from: 'a7', to: 'a8' },
      { k: 'c4', trial: false, fen: '7k/5P2/6P1/8/8/8/8/K7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["f7f8q"], from: 'f7', to: 'f8' },
      { k: 'c5', trial: true, fen: '7k/3P4/8/r7/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d7d8q"], from: 'd7', to: 'd8' },
    ],
  },
  ordan: {
    champion: 'ordan', concept: 'king-endgame',
    chapters: [
      { k: 'c1', trial: false, fen: '6k1/8/6K1/8/8/8/8/1R6 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b1b8"], from: 'b1', to: 'b8' },
      { k: 'c2', trial: false, fen: '7k/5R2/6K1/8/8/8/8/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["f7f8"], from: 'f7', to: 'f8' },
      { k: 'c3', trial: false, fen: '7k/5K2/8/8/8/8/8/1Q6 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b1h1"], from: 'b1', to: 'h1' },
      { k: 'c4', trial: false, fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g1g7"], from: 'g1', to: 'g7' },
      { k: 'c5', trial: true, fen: '4k3/8/4K3/8/8/8/8/1Q6 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b1b8"], from: 'b1', to: 'b8' },
    ],
  },
  "eira-vhal": {
    champion: 'eira-vhal', concept: 'candidate-moves',
    chapters: [
      { k: 'c1', trial: false, fen: '7k/8/8/6q1/4N3/2r5/8/K7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e4g5"], from: 'e4', to: 'g5' },
      { k: 'c2', trial: false, fen: '4k3/1q5r/8/8/4N3/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e4d6"], from: 'e4', to: 'd6' },
      { k: 'c3', trial: false, fen: '6k1/3q4/8/6r1/4N3/8/8/K7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e4f6"], from: 'e4', to: 'f6' },
      { k: 'c4', trial: false, fen: '2k5/8/5rq1/3N4/8/8/8/K7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d5e7"], from: 'd5', to: 'e7' },
      { k: 'c5', trial: true, fen: '8/8/3q4/8/3kr3/2N5/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["c3b5"], from: 'c3', to: 'b5' },
    ],
  },
  rhazek: {
    champion: 'rhazek', concept: 'sacrifice',
    chapters: [
      { k: 'c1', trial: false, fen: '4k3/5p2/6q1/4N3/8/8/8/4R2K w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e5g6"], from: 'e5', to: 'g6' },
      { k: 'c2', trial: false, fen: '6k1/5ppp/8/3N4/8/8/3Q4/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d5e7"], from: 'd5', to: 'e7' },
      { k: 'c3', trial: false, fen: '7k/6pp/8/4N3/8/8/8/4Q1K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e5f7"], from: 'e5', to: 'f7' },
      { k: 'c4', trial: false, fen: '5r1k/6pp/8/6N1/2Q5/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g5f7"], from: 'g5', to: 'f7' },
      { k: 'c5', trial: true, fen: '4k3/8/8/1p2N3/2q5/8/8/4R1K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e5c4"], from: 'e5', to: 'c4' },
    ],
  },
  oryn: {
    champion: 'oryn', concept: 'open-file',
    chapters: [
      { k: 'c1', trial: false, fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1a8"], from: 'a1', to: 'a8' },
      { k: 'c2', trial: false, fen: '4q2k/8/8/8/8/8/8/4R1K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e1e8"], from: 'e1', to: 'e8' },
      { k: 'c3', trial: false, fen: '4q3/8/8/4k3/8/6K1/8/R7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1e1"], from: 'a1', to: 'e1' },
      { k: 'c4', trial: false, fen: '7k/5K2/8/8/8/8/8/R7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1h1"], from: 'a1', to: 'h1' },
      { k: 'c5', trial: true, fen: '8/8/8/8/3k3q/8/8/R5K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1a4"], from: 'a1', to: 'a4' },
    ],
  },
  vesra: {
    champion: 'vesra', concept: 'zugzwang',
    chapters: [
      { k: 'c1', trial: false, fen: '7k/8/5K2/8/8/8/6Q1/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g2g7"], from: 'g2', to: 'g7' },
      { k: 'c2', trial: false, fen: '7k/5K2/8/8/8/8/Q7/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a2h2"], from: 'a2', to: 'h2' },
      { k: 'c3', trial: false, fen: '3q3k/8/8/8/8/8/8/3Q2K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d1d8"], from: 'd1', to: 'd8' },
      { k: 'c4', trial: false, fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b1b8"], from: 'b1', to: 'b8' },
      { k: 'c5', trial: true, fen: '8/8/8/r3k3/4p3/8/8/1K5Q w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["h1h5"], from: 'h1', to: 'h5' },
    ],
  },
  brakkon: {
    champion: 'brakkon', concept: 'defense',
    chapters: [
      { k: 'c1', trial: false, fen: '6k1/8/8/8/8/8/5PPP/R3r2K w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a1e1"], from: 'a1', to: 'e1' },
      { k: 'c2', trial: false, fen: '6k1/8/8/8/8/8/R3n1PP/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a2e2"], from: 'a2', to: 'e2' },
      { k: 'c3', trial: false, fen: '6k1/8/8/8/8/8/5PPP/1R2q2K w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b1e1"], from: 'b1', to: 'e1' },
      { k: 'c4', trial: false, fen: '7k/3R4/8/8/8/8/5PPP/3q2K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d7d1"], from: 'd7', to: 'd1' },
      { k: 'c5', trial: true, fen: '6k1/8/8/8/4q3/8/4RPPP/5bK1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e2e4"], from: 'e2', to: 'e4' },
    ],
  },
  ilyra: {
    champion: 'ilyra', concept: 'xray',
    chapters: [
      { k: 'c1', trial: false, fen: 'k6q/8/8/8/8/8/1B4PP/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b2h8"], from: 'b2', to: 'h8' },
      { k: 'c2', trial: false, fen: '7q/6k1/8/8/8/4B3/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e3d4"], from: 'e3', to: 'd4' },
      { k: 'c3', trial: false, fen: '6k1/5ppp/q7/8/8/8/6PP/5BK1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["f1a6"], from: 'f1', to: 'a6' },
      { k: 'c4', trial: false, fen: '8/1q6/2k3B1/8/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g6e4"], from: 'g6', to: 'e4' },
      { k: 'c5', trial: true, fen: 'r7/8/2k3B1/8/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g6e4"], from: 'g6', to: 'e4' },
    ],
  },
  tikk: {
    champion: 'tikk', concept: 'tempo',
    chapters: [
      { k: 'c1', trial: false, fen: '8/1P6/3k4/8/r7/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b7b8q"], from: 'b7', to: 'b8' },
      { k: 'c2', trial: false, fen: '2n5/1P6/4k3/8/8/8/7K/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b7c8q"], from: 'b7', to: 'c8' },
      { k: 'c3', trial: false, fen: '8/6P1/8/r2k4/8/8/8/2K5 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g7g8q"], from: 'g7', to: 'g8' },
      { k: 'c4', trial: false, fen: '6r1/7P/4k3/8/8/8/8/K7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["h7g8q"], from: 'h7', to: 'g8' },
      { k: 'c5', trial: true, fen: '8/1P1k4/q6P/8/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b7b8n"], from: 'b7', to: 'b8' },
    ],
  },
  malrec: {
    champion: 'malrec', concept: 'survival',
    chapters: [
      { k: 'c1', trial: false, fen: '8/8/6kp/2n5/3K4/8/P7/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d4c5"], from: 'd4', to: 'c5' },
      { k: 'c2', trial: false, fen: '8/1k3p2/3r4/4K3/8/8/6P1/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["e5d6"], from: 'e5', to: 'd6' },
      { k: 'c3', trial: false, fen: '8/6kp/8/2q5/3K4/8/P7/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["d4c5"], from: 'd4', to: 'c5' },
      { k: 'c4', trial: false, fen: 'k7/8/K7/8/5B2/8/8/R7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["a6b6"], from: 'a6', to: 'b6' },
      { k: 'c5', trial: true, fen: '8/7k/7p/1r6/2K3P1/8/8/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["c4b5"], from: 'c4', to: 'b5' },
    ],
  },
  solenne: {
    champion: 'solenne', concept: 'passed-pawn',
    chapters: [
      { k: 'c1', trial: false, fen: '8/1P6/3k4/8/r7/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b7b8q"], from: 'b7', to: 'b8' },
      { k: 'c2', trial: false, fen: '2n5/1P6/4k3/8/8/8/7K/8 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b7c8q"], from: 'b7', to: 'c8' },
      { k: 'c3', trial: false, fen: '8/6P1/8/r2k4/8/8/8/2K5 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["g7g8q"], from: 'g7', to: 'g8' },
      { k: 'c4', trial: false, fen: '6r1/7P/4k3/8/8/8/8/K7 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["h7g8q"], from: 'h7', to: 'g8' },
      { k: 'c5', trial: true, fen: '8/1P1k4/q6P/8/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w', expected: ["b7b8n"], from: 'b7', to: 'b8' },
    ],
  },
};

export function sendaFor(champ) { return SENDAS[champ] || null; }
export function sendaAvailable(champ) { return !!SENDAS[champ]; }
export function sendaAccent(champ) { return SENDA_ACCENT[champ] || '#39D5FF'; }

// Texto de un campo de capítulo desde i18n.
export function chapterText(champ, k, field) { return t('vm.' + champ + '.' + k + '.' + field); }
// Crónica (array) y recompensa.
export function chronicleOf(champ) { const c = t('vm.' + champ + '.chron'); return Array.isArray(c) ? c : []; }
export function rewardOf(champ) { return t('vm.' + champ + '.reward'); }
export function sendaIntro(champ) { return t('vm.' + champ + '.intro'); }
