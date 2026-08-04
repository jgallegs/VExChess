// ============================================================
//  VEXCHESS · Academia — Chat con AXIOM (multiidioma)
//  Dos cerebros:
//   1) Determinista: intents + glosario bilingüe (ES/EN) + memoria
//      del jugador. Siempre disponible, instantáneo, sin descargas.
//   2) IA local (opcional): modelo compilado a WebAssembly/WebGPU
//      (academy-llm.js). Responde en el idioma del usuario. Si no
//      hay WebGPU o falla, se cae con elegancia al determinista.
//  "No memorices la jugada. Entiende por qué existe."
// ============================================================
import { conceptName } from './axiom.js?v=2';
import { poseFor, sceneFor } from './axiom-scene.js?v=2';
import { llmSupported, loadLLM, llmReady, llmChat, LLM_MODEL_NAME } from './academy-llm.js?v=1';

const AV = 'assets/axiom/avatar-128.png';

// ---------- Idiomas ----------
export const CHAT_LANGS = [['auto', 'Auto'], ['es', 'Español'], ['en', 'English']];

function browserLang() {
  try { return (navigator.language || 'es').slice(0, 2).toLowerCase(); } catch (e) { return 'es'; }
}
function norm(s) { return ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + ' '; }

// Detecta ES vs EN por palabras frecuentes. (El resto de idiomas: la IA.)
function detectLang(text, pref) {
  if (pref && pref !== 'auto') return pref;
  const t = norm(text);
  let es = 0, en = 0;
  ['que', 'como', 'por que', 'porque', 'jugar', 'ajedrez', 'peon', 'caballo', 'alfil', 'torre', 'dama', 'reina', 'rey', 'tablero', ' el ', ' la ', ' de ', ' un ', ' una ', ' y ', 'hola', 'gracias', 'quiero', 'puedo', 'mejorar', 'jaque']
    .forEach(w => { if (t.includes(w)) es++; });
  ['what', 'how', 'why', 'play', 'chess', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'board', ' the ', ' and ', ' to ', ' a ', 'hello', ' hi ', 'thanks', 'want', 'can ', 'improve', 'check']
    .forEach(w => { if (t.includes(w)) en++; });
  if (en === es) { const b = browserLang(); return b === 'en' ? 'en' : 'es'; }
  return en > es ? 'en' : 'es';
}

// ---------- Base de conocimiento bilingüe ----------
const PIECES = {
  es: {
    pawn: ['peon', 'peones'], knight: ['caballo', 'caballos'], bishop: ['alfil', 'alfiles'],
    rook: ['torre', 'torres'], queen: ['dama', 'reina'], king: ['rey'],
  },
  en: {
    pawn: ['pawn'], knight: ['knight'], bishop: ['bishop'],
    rook: ['rook'], queen: ['queen'], king: ['king'],
  },
};
const PIECE_TEXT = {
  es: {
    pawn: 'El peón avanza recto una casilla (o dos en su primer salto) y captura en diagonal. Nunca retrocede. Si llega a la última fila, corona en la pieza que elijas (casi siempre dama).',
    knight: 'El caballo se mueve en forma de L: dos casillas en una dirección y una perpendicular. Es la única pieza que salta por encima de otras. Vale unos 3 puntos.',
    bishop: 'El alfil se mueve en diagonal, tantas casillas como quiera. Cada alfil vive siempre en un color. Vale unos 3 puntos; la pareja de alfiles es un arma potente.',
    rook: 'La torre se mueve en línea recta: filas y columnas, cuantas casillas quiera. Vale 5 puntos y brilla en columnas abiertas y en los finales.',
    queen: 'La dama combina torre y alfil: recto y diagonal, cuantas casillas quiera. Es la pieza más fuerte (9 puntos), pero justo por eso no la saques demasiado pronto.',
    king: 'El rey se mueve una casilla en cualquier dirección. No puede ir a una casilla atacada. Nunca se captura: si no puede escapar de un jaque, es mate. Protégelo enrocando.',
  },
  en: {
    pawn: 'The pawn moves straight ahead one square (or two on its first move) and captures diagonally. It never moves backward. Reaching the last rank, it promotes — usually to a queen.',
    knight: 'The knight moves in an L: two squares one way, one square perpendicular. It is the only piece that jumps over others. Worth about 3 points.',
    bishop: 'The bishop moves diagonally, any number of squares. Each bishop stays on one color forever. Worth about 3 points; the bishop pair is a strong weapon.',
    rook: 'The rook moves in straight lines — ranks and files — any number of squares. Worth 5 points and shines on open files and in endgames.',
    queen: 'The queen combines rook and bishop: straight and diagonal, any distance. The strongest piece (9 points) — which is exactly why you should not bring her out too early.',
    king: 'The king moves one square in any direction and can never step onto an attacked square. It is never captured: if it cannot escape check, that is checkmate. Keep it safe by castling.',
  },
};
// Glosario de conceptos: [claves de búsqueda], texto.
const TERMS = {
  es: [
    [['horquilla', 'tenedor', 'doble ataque'], 'Una horquilla es atacar dos piezas a la vez con una sola jugada. El rival solo puede salvar una. El caballo es el rey de las horquillas.'],
    [['clavada', 'clavar'], 'Una clavada inmoviliza una pieza: si se mueve, deja expuesta a otra más valiosa (o al rey). Aprovecha para atacar la pieza clavada, que no puede huir.'],
    [['jaque mate', 'mate'], 'El jaque mate es el objetivo del juego: el rey está atacado y no tiene forma legal de salvarse. Ahí termina la partida.'],
    [['jaque'], 'El jaque es un ataque al rey. Estás obligado a responder: mover el rey, tapar el ataque o capturar a quien lo da.'],
    [['ahogado', 'rey ahogado', 'stalemate'], 'El ahogado son tablas: el jugador en turno no está en jaque pero no tiene ninguna jugada legal. Ojo con esto cuando vas ganando: no ahogues al rey rival.'],
    [['enroque', 'enrocar'], 'El enroque mueve rey y torre a la vez para poner al rey a salvo en la esquina. Requiere que ni rey ni torre se hayan movido y que el camino esté libre y sin jaques.'],
    [['coronar', 'coronacion', 'promocion', 'promocionar'], 'Coronar es convertir un peón que llega a la última fila en otra pieza, casi siempre una dama. Por eso un peón pasado puede decidir la partida.'],
    [['centro'], 'El centro (casillas d4, e4, d5, e5) es terreno clave: desde ahí tus piezas alcanzan más casillas. Controlarlo al principio da libertad de movimiento.'],
    [['desarrollo', 'desarrollar'], 'Desarrollar es sacar tus piezas (caballos y alfiles) a casillas activas al principio de la partida, en vez de mover muchas veces la misma. Rey a salvo cuanto antes.'],
    [['seguridad del rey', 'rey seguro'], 'La seguridad del rey es lo primero: la mayoría de derrotas rápidas vienen de un rey en el centro. Enroca y no debilites sus peones sin motivo.'],
    [['peon pasado'], 'Un peón pasado es aquel al que ningún peón rival puede frenar en su camino a coronar. En los finales, empújalo: vale su peso en oro.'],
    [['colgada', 'colgado', 'pieza sin defensa', 'gratis'], 'Una pieza colgada está atacada y sin defensor: se puede capturar gratis. Antes de mover, comprueba siempre qué piezas tuyas quedan sin defensa.'],
    [['valor', 'valen', 'puntos', 'cuanto vale'], 'Valores de referencia: peón 1, caballo y alfil 3, torre 5, dama 9. El rey no tiene valor: es infinito. Úsalos para decidir cambios.'],
    [['apertura', 'aperturas'], 'En la apertura no memorices líneas: ocupa el centro, saca caballos y alfiles, y enroca. Con esos tres principios sales bien de casi cualquier apertura.'],
  ],
  en: [
    [['fork', 'double attack'], 'A fork attacks two pieces at once with a single move — the opponent can only save one. The knight is the king of forks.'],
    [['pin'], 'A pin freezes a piece: if it moves, it exposes something more valuable behind it (or the king). Pile up on the pinned piece — it cannot run.'],
    [['checkmate', 'mate'], 'Checkmate is the goal of the game: the king is attacked and has no legal way out. The game ends right there.'],
    [['check'], 'A check is an attack on the king. You must respond: move the king, block the attack, or capture the attacker.'],
    [['stalemate'], 'Stalemate is a draw: the side to move is not in check but has no legal move. Watch for it when winning — do not stalemate the enemy king.'],
    [['castle', 'castling'], 'Castling moves king and rook together to tuck the king safely in the corner. Neither piece may have moved, and the path must be clear and not through check.'],
    [['promote', 'promotion', 'queening'], 'Promotion turns a pawn that reaches the last rank into another piece, almost always a queen. That is why a passed pawn can decide the game.'],
    [['center', 'centre'], 'The center (d4, e4, d5, e5) is key ground: from there your pieces reach more squares. Controlling it early gives you freedom of movement.'],
    [['development', 'develop'], 'Development means bringing your pieces (knights and bishops) to active squares early, instead of moving the same one repeatedly. Get your king safe fast.'],
    [['king safety'], 'King safety comes first: most quick losses come from a king stuck in the center. Castle, and do not weaken its pawns without reason.'],
    [['passed pawn'], 'A passed pawn is one no enemy pawn can stop on its way to promotion. In endgames, push it — it is worth its weight in gold.'],
    [['hanging', 'undefended', 'free piece'], 'A hanging piece is attacked and undefended — it can be captured for free. Before every move, check which of your pieces are left undefended.'],
    [['value', 'worth', 'points'], 'Reference values: pawn 1, knight and bishop 3, rook 5, queen 9. The king is priceless. Use these to judge trades.'],
    [['opening', 'openings'], 'In the opening, do not memorize lines: take the center, develop knights and bishops, and castle. Those three ideas carry you through almost any opening.'],
  ],
};

// ---------- Cerebro determinista ----------
const UI = {
  es: {
    placeholder: 'Escribe tu pregunta…', send: 'Enviar', back: '← Academia',
    title: 'Habla con AXIOM', sub: 'Tu entrenador. Pregúntale lo que quieras, en tu idioma.',
    aiOff: 'Modo IA', aiThinking: 'AXIOM está pensando…', aiLoading: 'Cargando modelo de IA',
    aiUnsupported: 'Tu navegador no admite el modo IA (hace falta WebGPU). El chat funciona igual sin él.',
    aiOn: 'Modo IA activo (' + LLM_MODEL_NAME + ')', aiFail: 'No pude cargar la IA; sigo respondiendo yo.',
    greetTitle: '¡Hola! Soy AXIOM.', hintsLabel: 'Prueba a preguntarme:',
    starters: ['¿Cómo se mueve el caballo?', '¿Qué es una horquilla?', '¿Cómo voy?', '¿Qué me conviene practicar?'],
  },
  en: {
    placeholder: 'Type your question…', send: 'Send', back: '← Academy',
    title: 'Talk to AXIOM', sub: 'Your coach. Ask anything, in your language.',
    aiOff: 'AI mode', aiThinking: 'AXIOM is thinking…', aiLoading: 'Loading AI model',
    aiUnsupported: 'Your browser does not support AI mode (WebGPU needed). The chat works fine without it.',
    aiOn: 'AI mode on (' + LLM_MODEL_NAME + ')', aiFail: 'Could not load the AI; I will keep answering myself.',
    greetTitle: 'Hi! I am AXIOM.', hintsLabel: 'Try asking me:',
    starters: ['How does the knight move?', 'What is a fork?', 'How am I doing?', 'What should I practice?'],
  },
};

function findPiece(t, lang) {
  const map = PIECES[lang] || PIECES.es;
  for (const key of Object.keys(map)) for (const w of map[key]) if (t.includes(' ' + w) || t.includes(w + ' ')) return key;
  return null;
}
function findTerm(t, lang) {
  const list = TERMS[lang] || TERMS.es;
  for (const [keys, text] of list) for (const k of keys) if (t.includes(k)) return text;
  return null;
}

// Conceptos "no didácticos" que no deben mostrarse como dominio del jugador.
const HIDDEN_CONCEPTS = new Set(['chess-intro']);
function realConcept(c) { return c && !HIDDEN_CONCEPTS.has(c); }

function progressLine(ctx, lang) {
  const es = lang === 'es';
  if (!ctx.user) return es ? 'Aún no has entrado, así que no guardo tu progreso. Si inicias sesión, recuerdo qué conceptos dominas día a día.' : 'You are not signed in, so I do not track your progress. Sign in and I will remember which concepts you master, day by day.';
  const mem = ctx.memory || {};
  const prog = ctx.progressByConcept || {};
  const concepts = Object.values(prog).filter(p => realConcept(p.concept));
  const mastered = concepts.filter(p => p.mastery >= 70);
  const streak = mem.streak || 0;
  const parts = [];
  if (streak >= 2) parts.push(es ? ('Llevas una racha de ' + streak + ' días. La constancia enseña más que la intensidad.') : ('You are on a ' + streak + '-day streak. Consistency teaches more than intensity.'));
  else parts.push(es ? 'Vamos poco a poco, y está bien.' : 'We are going step by step, and that is fine.');
  if (mastered.length) parts.push(es ? ('Dominas ' + mastered.length + ' conceptos, entre ellos ' + mastered.slice(0, 3).map(p => conceptName(p.concept)).join(', ') + '.') : ('You have mastered ' + mastered.length + ' concepts, including ' + mastered.slice(0, 3).map(p => conceptName(p.concept)).join(', ') + '.'));
  else parts.push(es ? 'Aún no hay ningún concepto dominado del todo: entrena una lección y sube ese número.' : 'No concept fully mastered yet — train a lesson and push that number up.');
  return parts.join(' ');
}

function recommendLine(ctx, lang) {
  const es = lang === 'es';
  const mem = ctx.memory || {};
  const due = (mem.dueConcepts || []).filter(realConcept);
  if (due.length) {
    const names = due.map(conceptName).join(', ');
    return { text: es ? ('Hoy toca repasar: ' + names + '. El repaso espaciado es lo que fija de verdad lo aprendido.') : ('Time to review today: ' + names + '. Spaced review is what really locks learning in.'), action: 'due' };
  }
  if (realConcept(mem.weakestConcept)) {
    return { text: es ? (conceptName(mem.weakestConcept) + ' aún se te resiste un poco. Yo afianzaría eso antes de seguir.') : (conceptName(mem.weakestConcept) + ' is still a bit shaky. I would shore that up before moving on.'), action: 'weak' };
  }
  if (!ctx.user || !(mem.lessonsDone || []).length) {
    return { text: es ? 'Empieza por lo básico: “¿Qué es el ajedrez?” y luego el tablero. Sin prisa.' : 'Start from the basics: "What is chess?" and then the board. No rush.', action: 'start' };
  }
  return { text: es ? 'Vas bien. Sigue el camino por donde lo dejaste o juega un sparring para aplicar lo aprendido.' : 'You are doing well. Continue the path where you left off, or play a sparring game to apply what you learned.', action: 'spar' };
}

// Devuelve { text, actions?[] }. actions: {label, kind:'ask'|'lesson'|'spar', value}
function brain(raw, lang, ctx) {
  const t = norm(raw);
  const es = lang === 'es';

  // Saludo
  if (/(^|\s)(hola|buenas|hey|hi|hello|holi|que tal|hola axiom)(\s|$)/.test(t))
    return { text: es ? '¡Hola! ¿Sobre qué quieres que hablemos? Puedo explicarte reglas, tácticas, o decirte cómo vas.' : 'Hi! What shall we talk about? I can explain rules, tactics, or tell you how you are doing.' };

  // Agradecimiento
  if (/(^|\s)(gracias|thanks|thank you|thx|genial|perfecto|perfect)(\s|$)/.test(t))
    return { text: es ? 'Para eso estoy. Cuando quieras seguir aprendiendo, aquí sigo.' : 'That is what I am here for. Whenever you want to keep learning, I am here.' };

  // Ayuda / qué puedes hacer
  if (/(que puedes hacer|para que sirves|ayuda|help|what can you do|como funciona|comandos)/.test(t))
    return { text: es ? 'Puedo: explicarte cómo se mueve cada pieza, aclararte tácticas (horquilla, clavada, mate…), contarte cómo vas y recomendarte qué practicar. Pregúntame con naturalidad.' : 'I can explain how each piece moves, clarify tactics (fork, pin, mate…), tell you how you are doing, and recommend what to practice. Just ask naturally.',
      actions: [
        { label: es ? '¿Cómo voy?' : 'How am I doing?', kind: 'ask', value: es ? '¿Cómo voy?' : 'How am I doing?' },
        { label: es ? '¿Qué practico?' : 'What should I practice?', kind: 'ask', value: es ? '¿Qué me conviene practicar?' : 'What should I practice?' },
      ] };

  // Progreso
  if (/(como voy|como lo llevo|mi progreso|como estoy|how am i|my progress|how i am doing|my stats|estadisticas)/.test(t))
    return { text: progressLine(ctx, lang) };

  // Recomendación / qué practicar
  if (/(que practico|que repaso|que hago|que me conviene|recomienda|recomiendame|what should i|what to practice|recommend|que aprendo)/.test(t)) {
    const r = recommendLine(ctx, lang);
    const acts = [];
    if (r.action === 'start') acts.push({ label: es ? 'Empezar por la historia' : 'Start with the history', kind: 'lesson', value: 'historia' });
    else acts.push({ label: es ? 'Jugar un sparring' : 'Play a sparring', kind: 'spar', value: '' });
    return { text: r.text, actions: acts };
  }

  // Quiero jugar / empezar / lección
  if (/(quiero jugar|jugar una partida|juguemos|play a game|let s play|empezar a jugar|sparring)/.test(t))
    return { text: es ? 'Vamos. Un sparring es una partida de verdad en la que solo intervengo en los momentos clave.' : 'Let us go. A sparring is a real game where I only step in at the key moments.',
      actions: [{ label: es ? 'Abrir sparring' : 'Open sparring', kind: 'spar', value: '' }] };

  // Movimiento de una pieza
  const piece = findPiece(t, lang) || findPiece(t, lang === 'es' ? 'en' : 'es');
  if (piece && /(mueve|movimiento|mover|how does|how do|move|se juega)/.test(t))
    return { text: (PIECE_TEXT[lang] || PIECE_TEXT.es)[piece] };
  // Nombre de pieza suelto → también explicar
  if (piece && t.trim().split(/\s+/).length <= 3)
    return { text: (PIECE_TEXT[lang] || PIECE_TEXT.es)[piece] };

  // Concepto / glosario
  const term = findTerm(t, lang) || findTerm(t, lang === 'es' ? 'en' : 'es');
  if (term) return { text: term };

  // Consejo genérico para mejorar
  if (/(mejorar|como mejoro|subir de nivel|get better|improve|get good|nivel)/.test(t))
    return { text: es ? 'Tres cosas te suben de nivel rápido: no regalar piezas (mira jaques, capturas y amenazas antes de mover), aprender los patrones tácticos, y revisar tus propias partidas. Lo demás llega solo.' : 'Three things level you up fast: stop hanging pieces (check for checks, captures and threats before moving), learn the tactical patterns, and review your own games. The rest follows.',
      actions: [{ label: es ? 'Ver el Laboratorio' : 'See the Lab', kind: 'lab', value: '' }] };

  return null; // sin intención clara → fallback (IA o mensaje genérico)
}

function fallback(lang) {
  const es = lang === 'es';
  return { text: es ? 'No estoy seguro de haberte entendido. Puedo explicarte reglas y tácticas, o decirte cómo vas. ¿Lo reformulas? (Si activas el Modo IA, puedo conversar de forma más libre.)' : 'I am not sure I understood. I can explain rules and tactics, or tell you how you are doing. Could you rephrase? (Turn on AI mode for freer conversation.)' };
}

// ---------- Puente con la IA local ----------
function systemPrompt(ctx, lang) {
  const mem = ctx.memory || {};
  const prog = ctx.progressByConcept || {};
  const mastered = Object.values(prog).filter(p => p.mastery >= 70 && realConcept(p.concept)).map(p => conceptName(p.concept));
  const ctxLine = ctx.user
    ? `The player is signed in. Streak: ${mem.streak || 0} days. Mastered concepts: ${mastered.join(', ') || 'none yet'}. Due for review: ${(mem.dueConcepts || []).filter(realConcept).map(conceptName).join(', ') || 'nothing'}.`
    : 'The player is not signed in; no saved progress.';
  return [
    'You are AXIOM, the warm and concise chess coach of the VEXCHESS academy.',
    'Reply in the SAME language the user writes in. Keep answers short: 2-4 sentences, one idea at a time.',
    'Teach understanding, not memorization. Your motto: "do not memorize the move, understand why it exists."',
    'You can explain rules, tactics, endgames and give practice advice. If the user asks something unrelated to chess or the academy, gently steer back to chess.',
    'Do not invent app features or claim to perform actions. Never give unsafe or off-topic content.',
    ctxLine,
  ].join(' ');
}

// ============================================================
//  UI
// ============================================================
export function mountChat(root, ctx) {
  let lang = 'auto';
  let aiOn = false;
  const history = []; // {role:'user'|'assistant', content}
  const t = () => UI[detectLang('', lang === 'auto' ? browserLang() : lang)] || UI.es;
  const uiLang = () => (lang === 'auto' ? (browserLang() === 'en' ? 'en' : 'es') : lang);

  function paint() {
    const L = UI[uiLang()];
    root.innerHTML =
      '<section class="ac-chat">' +
        '<div class="ac-chat-head">' +
          '<button class="ac-back" id="ch-back" type="button">' + L.back + '</button>' +
          '<div class="ac-chat-id"><img src="' + AV + '" alt="AXIOM" onerror="this.style.display=\'none\'"><div><b>AXIOM</b><span>' + L.sub + '</span></div></div>' +
          '<div class="ac-chat-tools">' +
            '<select class="ac-chat-lang" id="ch-lang" title="Idioma / Language">' +
              CHAT_LANGS.map(([v, n]) => '<option value="' + v + '"' + (v === lang ? ' selected' : '') + '>' + n + '</option>').join('') +
            '</select>' +
            '<button class="ac-chat-ai' + (aiOn ? ' on' : '') + '" id="ch-ai" type="button" title="' + (llmSupported() ? '' : L.aiUnsupported) + '">' + L.aiOff + (aiOn ? ' ●' : '') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="ac-chat-log" id="ch-log"></div>' +
        '<div class="ac-chat-status" id="ch-status"></div>' +
        '<form class="ac-chat-input" id="ch-form">' +
          '<input type="text" id="ch-text" autocomplete="off" placeholder="' + L.placeholder + '">' +
          '<button class="ac-btn primary" type="submit">' + L.send + '</button>' +
        '</form>' +
      '</section>';

    document.getElementById('ch-back').onclick = () => ctx.onBack && ctx.onBack();
    document.getElementById('ch-lang').onchange = (e) => { lang = e.target.value; paint(); };
    document.getElementById('ch-ai').onclick = toggleAI;
    document.getElementById('ch-form').onsubmit = (e) => { e.preventDefault(); const el = document.getElementById('ch-text'); const v = el.value.trim(); if (v) { el.value = ''; onUser(v); } };
    renderLog();
    const inp = document.getElementById('ch-text'); if (inp) inp.focus();
  }

  const log = []; // {role:'axiom'|'user', text, actions?}
  function renderLog() {
    const box = document.getElementById('ch-log'); if (!box) return;
    if (!log.length) { box.innerHTML = greetingBlock(); wireChips(box); return; }
    box.innerHTML = log.map(m => bubble(m)).join('');
    wireChips(box);
    box.scrollTop = box.scrollHeight;
  }
  function greetingBlock() {
    const L = UI[uiLang()];
    return '<div class="ac-ch-greet">' +
        '<img class="ac-ch-face" src="' + poseFor(sceneFor('welcome')) + '" alt="AXIOM">' +
        '<h3>' + L.greetTitle + '</h3><p>' + L.sub + '</p>' +
        '<span class="ac-ch-hint">' + L.hintsLabel + '</span>' +
        '<div class="ac-ch-chips">' + L.starters.map(s => '<button class="ac-ch-chip" data-send="' + esc(s) + '" type="button">' + esc(s) + '</button>').join('') + '</div>' +
      '</div>';
  }
  function bubble(m) {
    if (m.role === 'user') return '<div class="ac-ch-row user"><div class="ac-ch-bubble">' + esc(m.text) + '</div></div>';
    const acts = (m.actions && m.actions.length)
      ? '<div class="ac-ch-acts">' + m.actions.map((a, i) => '<button class="ac-ch-chip" data-act="' + i + '" type="button">' + esc(a.label) + '</button>').join('') + '</div>'
      : '';
    return '<div class="ac-ch-row axiom"><img class="ac-ch-av" src="' + AV + '" alt="" onerror="this.style.display=\'none\'"><div class="ac-ch-bubble">' + esc(m.text).replace(/\n/g, '<br>') + acts + '</div></div>';
  }
  function wireChips(box) {
    box.querySelectorAll('[data-send]').forEach(b => b.onclick = () => onUser(b.getAttribute('data-send')));
    box.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const row = b.closest('.ac-ch-row'); const idx = [...document.querySelectorAll('.ac-ch-row.axiom')].indexOf(row);
      // localizar la acción por el último mensaje con acciones (simple y robusto)
      const msg = [...log].reverse().find(m => m.role === 'axiom' && m.actions && m.actions[+b.getAttribute('data-act')]);
      const a = msg && msg.actions[+b.getAttribute('data-act')];
      if (!a) return;
      if (a.kind === 'ask') onUser(a.value);
      else if (a.kind === 'lesson') ctx.onStartLesson && ctx.onStartLesson(a.value);
      else if (a.kind === 'spar') ctx.onSparring && ctx.onSparring();
      else if (a.kind === 'lab') ctx.onLab && ctx.onLab();
    });
  }

  function setStatus(txt, spin) {
    const el = document.getElementById('ch-status'); if (!el) return;
    el.innerHTML = txt ? ((spin ? '<span class="ac-ch-spin"></span>' : '') + esc(txt)) : '';
  }

  async function toggleAI() {
    const L = UI[uiLang()];
    if (aiOn) { aiOn = false; paint(); setStatus(''); return; }
    if (!llmSupported()) { pushAxiom({ text: L.aiUnsupported }); return; }
    setStatus(L.aiLoading + '… 0%', true);
    try {
      await loadLLM((r) => { const pct = r && r.progress != null ? Math.round(r.progress * 100) : null; setStatus(L.aiLoading + (pct != null ? '… ' + pct + '%' : '…'), true); });
      aiOn = true; setStatus(''); paint(); pushAxiom({ text: L.aiOn });
    } catch (e) { aiOn = false; setStatus(''); pushAxiom({ text: L.aiFail }); }
  }

  function pushUser(text) { log.push({ role: 'user', text }); renderLog(); }
  function pushAxiom(m) { log.push({ role: 'axiom', text: m.text, actions: m.actions }); renderLog(); }

  async function onUser(text) {
    pushUser(text);
    const lg = detectLang(text, lang);
    // 1) intento determinista
    const det = brain(text, lg, ctx);
    if (det && !aiOn) { pushAxiom(det); return; }
    // 2) IA local si está activa
    if (aiOn && llmReady()) {
      setStatus(UI[uiLang()].aiThinking, true);
      history.push({ role: 'user', content: text });
      try {
        const messages = [{ role: 'system', content: systemPrompt(ctx, lg) }, ...history.slice(-8)];
        const reply = await llmChat(messages, { max_tokens: 280 });
        history.push({ role: 'assistant', content: reply });
        setStatus('');
        pushAxiom({ text: reply || fallback(lg).text });
      } catch (e) { setStatus(''); pushAxiom(det || fallback(lg)); }
      return;
    }
    // 3) determinista con intención, o fallback
    pushAxiom(det || fallback(lg));
  }

  paint();
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
