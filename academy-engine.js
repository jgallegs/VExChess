// ============================================================
//  VEXCHESS · Academia — Envoltorio de Stockfish
//  Un único worker, peticiones serializadas (jugar + evaluar).
//  Reutiliza el mismo binario que la página de juego.
// ============================================================
export function createEngine() {
  let worker = null, ready = false, current = null, lastScore = null;
  const queue = [];

  function onMsg(e) {
    const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
    if (line === 'uciok') { worker.postMessage('isready'); return; }
    if (line === 'readyok') { ready = true; pump(); return; }
    if (line.startsWith('info') && line.includes(' score ')) {
      const m = line.match(/score (cp|mate) (-?\d+)/);
      if (m) lastScore = m[1] === 'mate' ? { mate: parseInt(m[2], 10) } : { cp: parseInt(m[2], 10) };
      return;
    }
    if (line.startsWith('bestmove')) {
      const uci = line.split(' ')[1];
      if (current) {
        const c = current; current = null;
        const best = (uci && uci !== '(none)') ? uci : null;
        c.resolve(c.kind === 'eval' ? Object.assign({ best }, lastScore) : best);
        pump();
      }
    }
  }
  function ensure() {
    if (worker) return;
    worker = new Worker('./engine/stockfish-18-lite-single.js');
    worker.onmessage = onMsg;
    worker.onerror = () => {};
    worker.postMessage('uci');
  }
  function pump() {
    if (!ready || current || !queue.length) return;
    current = queue.shift();
    lastScore = null;
    for (const cmd of current.cmds) worker.postMessage(cmd);
  }
  function enqueue(kind, cmds) {
    ensure();
    return new Promise((resolve) => { queue.push({ kind, cmds, resolve }); pump(); });
  }

  return {
    // Mejor jugada a fuerza limitada (rival amable). Devuelve UCI o null.
    bestMove(fen, opts = {}) {
      const cmds = [];
      cmds.push('setoption name UCI_LimitStrength value ' + (opts.elo ? 'true' : 'false'));
      if (opts.elo) cmds.push('setoption name UCI_Elo value ' + opts.elo);
      cmds.push('position fen ' + fen);
      cmds.push('go movetime ' + (opts.movetime || 500));
      return enqueue('move', cmds);
    },
    // Evaluación a fuerza plena. Devuelve {cp} o {mate} (desde el lado que mueve).
    evaluate(fen, depth = 11) {
      return enqueue('eval', ['setoption name UCI_LimitStrength value false', 'position fen ' + fen, 'go depth ' + depth]);
    },
    isReady() { return ready; },
    warmup() { ensure(); },
    terminate() { if (worker) { try { worker.terminate(); } catch (e) {} worker = null; ready = false; queue.length = 0; current = null; } },
  };
}
