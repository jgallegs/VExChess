// ============================================================
//  VEXCHESS · Academia — Lógica del coach (pura, testable)
//  Clasifica jugadas del jugador y elige los momentos del
//  Laboratorio. No toca el DOM ni el motor: solo números.
// ============================================================

const CLAMP = 2000;
export function scoreToCp(info) {
  if (!info) return 0;
  if (info.mate != null) return info.mate > 0 ? (CLAMP - info.mate) : (-CLAMP - info.mate);
  return Math.max(-CLAMP, Math.min(CLAMP, info.cp || 0));
}

// Clasifica la jugada del jugador comparando la mejor evaluación (antes,
// desde su perspectiva) con la evaluación tras su jugada (ya desde su perspectiva).
export function classifyLoss(bestCp, afterCp) {
  const loss = Math.max(0, bestCp - afterCp);
  let tag = 'ok';
  if (loss >= 300) tag = 'blunder';
  else if (loss >= 150) tag = 'mistake';
  else if (loss >= 60) tag = 'inacc';
  else if (loss <= 15) tag = 'good';
  return { loss, tag };
}

// ¿AXIOM debe intervenir en el sparring? Solo en momentos pedagógicos:
// errores serios (protege) y, de vez en cuando, un buen acierto en posición viva.
export function sparReaction(cls, ctx = {}) {
  const t = cls.tag;
  if (t === 'blunder') return { intervene: true, state: 'mistake', takeback: true,
    line: 'Espera. Esa jugada regala material o permite algo fuerte. ¿La reconsideramos?', sub: 'Comprueba jaques, capturas y amenazas antes de soltarla.' };
  if (t === 'mistake') return { intervene: true, state: 'mistake', takeback: true,
    line: 'Cuidado: hay una réplica incómoda para ti. Mira si puedes evitarla.', sub: 'Puedes rehacer la jugada si quieres.' };
  if (t === 'good' && ctx.sharp) return { intervene: true, state: 'correct', takeback: false,
    line: 'Bien. Esa era la idea de la posición.', sub: '' };
  return { intervene: false };
}

// Reacción del rival: comenta brevemente tras la jugada del motor (opcional).
export function threatNote(hangsForPlayer) {
  if (hangsForPlayer && hangsForPlayer.length) {
    return { state: 'warning', line: 'Ojo: tras mi jugada, algo tuyo se ha quedado sin defensa.', sub: 'Antes de mover, mira ' + hangsForPlayer.join(', ') + '.' };
  }
  return null;
}

// -------- Laboratorio: elegir hasta 3 momentos --------
// evalCP: array de centipawns en POV de blancas por posición (índice = ply).
// sans: jugadas SAN. humanColor: 'w' | 'b'. Devuelve momentos ordenados.
export function pickMoments(evalCP, sans, humanColor) {
  if (!evalCP || evalCP.length < 2) return [];
  const sign = humanColor === 'w' ? 1 : -1;
  const moves = [];
  for (let ply = 0; ply < sans.length; ply++) {
    const mover = (ply % 2 === 0) ? 'w' : 'b';
    if (mover !== humanColor) continue;
    const before = evalCP[ply] * sign;      // POV del jugador antes de su jugada
    const after = evalCP[ply + 1] * sign;    // POV del jugador después
    if (before == null || after == null) continue;
    const delta = after - before;            // + mejora, − empeora
    moves.push({ ply, san: sans[ply], before, after, delta });
  }
  if (!moves.length) return [];

  const out = [];
  // 1) El peor error comprensible (mayor caída).
  const worst = moves.slice().sort((a, b) => a.delta - b.delta)[0];
  if (worst && worst.delta <= -120) out.push({ type: 'mistake', ...worst });
  // 2) Una alternativa importante: caída media en una posición aún jugable (no la misma).
  const alt = moves.filter(m => m !== worst && m.delta <= -70 && Math.abs(m.before) < 600)
    .sort((a, b) => a.delta - b.delta)[0];
  if (alt) out.push({ type: 'alternative', ...alt });
  // 3) Una buena decisión: mantuvo o mejoró en una posición viva (no trivial).
  const good = moves.filter(m => !out.includes(m) && m.delta >= -15 && Math.abs(m.before) < 500 && Math.abs(m.before) > 40)
    .sort((a, b) => b.delta - a.delta)[0]
    || moves.filter(m => !out.includes(m) && m.delta >= -15).sort((a, b) => b.delta - a.delta)[0];
  if (good) out.push({ type: 'good', ...good });

  // Ordenar por aparición en la partida.
  return out.filter(Boolean).sort((a, b) => a.ply - b.ply).slice(0, 3);
}

export const LAB_LINES = {
  good: { state: 'correct', title: 'Una buena decisión', say: 'Aquí elegiste bien: mantuviste la posición sólida.' },
  mistake: { state: 'mistake', title: 'Un error comprensible', say: 'Este momento nos costó. No para lamentarlo: para reconocerlo la próxima vez.' },
  alternative: { state: 'analyze', title: 'Una alternativa importante', say: 'Había una idea mejor aquí. Compárala con lo que jugaste.' },
};
