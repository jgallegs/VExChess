// ============================================================
//  VEXCHESS · Lecciones de la Academia (AXIOM)
//  Guía completa de cero a buen nivel. Cada lección entrena UNA
//  idea con el bucle Observa → Predice → Juega → Explica.
//  Todo el ajedrez sale de FEN + jugadas legales (UCI); las
//  soluciones están verificadas por chess.js.
//  Formato de un paso:
//   { fen, orientation, playerColor, observe, goal, expected:[uci],
//     hints:[...], explain, wrong, mustMate?, showArrows?, demo?[] }
//  Si no hay `demo`, el runner genera una demostración por defecto
//  (intro → flecha de la idea → jugarla).
// ============================================================

export const PATH = [
  { level: 0, name: 'Primer contacto', desc: 'El tablero, las coordenadas y cómo mover.' },
  { level: 1, name: 'Las seis voces', desc: 'Cómo se mueve y cuánto vale cada pieza.' },
  { level: 2, name: 'Rey bajo presión', desc: 'Jaque, mate, ahogado, enroque y coronación.' },
  { level: 3, name: 'Mirar antes de mover', desc: 'Capturas, defensores y piezas colgadas.' },
  { level: 4, name: 'Patrones de combate', desc: 'Horquilla, clavada y mate de última fila.' },
  { level: 5, name: 'Construir una posición', desc: 'Centro, desarrollo y seguridad del rey.' },
  { level: 6, name: 'Convertir ventajas', desc: 'Coronar y dar mate con material de más.' },
  { level: 7, name: 'Tu propia partida', desc: 'Revisión guiada de tus partidas (Laboratorio).' },
];

// Atajo para demos cortas.
const D = (state, say, ops, sub) => ({ state, say, sub, ops });

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const LESSONS = [
  // ================= EMPIEZA AQUÍ · Historia (solo demo) =================
  {
    id: 'historia', level: 0, concept: 'chess-intro', story: true, demoOnly: true,
    title: '¿Qué es el ajedrez?', subtitle: 'Un viaje de más de 1500 años',
    intro: 'Antes de mover una sola pieza, deja que te cuente de dónde viene todo esto.',
    steps: [{
      fen: START, orientation: 'w', playerColor: 'w', goal: '', expected: [],
      demo: [
        { state: 'welcome', say: 'Bienvenido. Antes de tocar una pieza, un poco de contexto: qué es esto que vas a aprender.', ops: [{ t: 'reset' }] },
        { state: 'explain', say: 'El ajedrez nació hace más de 1500 años en la India, con el nombre de chaturanga.', sub: 'Imitaba a un ejército: infantería, caballería, elefantes y carros.', ops: [] },
        { state: 'analyze', say: 'Viajó a Persia y al mundo árabe como shatranj, y de ahí llegó a Europa.', sub: 'En el siglo XV, en Europa, la dama y el alfil ganaron su movimiento actual: nació el ajedrez de hoy.', ops: [] },
        { state: 'thinking', say: 'Lo especial es que no hay dados ni azar. Solo dos mentes, la misma información y un tablero.', sub: 'Todo lo que ocurre en la partida lo decides tú.', ops: [] },
        { state: 'explain', say: 'Dos ejércitos de 16 piezas, un único objetivo: dar jaque mate al rey rival.', sub: 'Se aprende en una tarde y no se agota en toda una vida.', ops: [{ t: 'mark', sq: 'e1', cls: 'cand' }, { t: 'mark', sq: 'e8', cls: 'cand' }] },
        { state: 'complete', say: 'Hoy lo juegan millones de personas y hay campeones del mundo. Vas a empezar por lo más básico y, paso a paso, llegarás lejos.', sub: 'Mi único consejo, el de siempre: no memorices la jugada; entiende por qué existe.', ops: [{ t: 'clear' }] },
      ],
    }],
  },

  // ================= NIVEL 0 · Primer contacto =================
  {
    id: 'board', level: 0, concept: 'board', title: 'El tablero y las coordenadas', subtitle: 'Dónde está cada casilla',
    intro: 'El tablero tiene 64 casillas. Las columnas van de la a a la h; las filas, del 1 al 8. Así cada casilla tiene un nombre, como e4.',
    steps: [{
      fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'La casilla e4 está en la columna e, fila 4, justo en el centro. Lleva ahí tu peón.',
      goal: 'Mueve el peón de e2 a e4.', expected: ['e2e4'],
      hints: ['Busca la columna e y la fila 4.', 'El peón puede avanzar una o dos casillas en su primer salto.', 'e2 → e4.'],
      explain: 'Nombrar las casillas es el primer superpoder: te deja leer partidas, seguir lecciones y pensar en jugadas concretas.',
      wrong: 'Casi. Fíjate en la columna (letra) y la fila (número): queremos e4.',
      demo: [
        D('welcome', 'Este es el tablero: 8 columnas (a–h) y 8 filas (1–8).', [{ t: 'reset' }]),
        D('explain', 'La casilla e4 está en la columna e y la fila 4: el corazón del tablero.', [{ t: 'mark', sq: 'e4', cls: 'cand' }]),
        D('correct', 'Movemos el peón de e2 a e4. Ya sabes leer una casilla.', [{ t: 'clear' }, { t: 'arrow', from: 'e2', to: 'e4', cls: 'idea' }, { t: 'play', uci: 'e2e4' }]),
      ],
    }],
  },

  // ================= NIVEL 1 · Las seis voces =================
  {
    id: 'pawn', level: 1, concept: 'pawn-move', title: 'El peón', subtitle: 'Avanza recto, captura en diagonal',
    intro: 'El peón avanza en línea recta, una casilla (o dos en su primer salto), pero captura en diagonal. Nunca retrocede.',
    steps: [{
      fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu peón está en e4 y hay un peón negro en d5. El peón captura en diagonal: ¿lo ves?',
      goal: 'Captura el peón negro.', expected: ['e4d5'],
      hints: ['El peón captura en diagonal, nunca de frente.', 'El peón negro está en d5, en diagonal a tu e4.', 'e4 captura en d5.'],
      explain: 'Recuerda la doble personalidad del peón: avanza recto pero come en diagonal. Es la pieza que más despista al principio.',
      wrong: 'De frente no puede capturar. El peón come en diagonal.',
      demo: [
        D('welcome', 'El peón avanza recto: una casilla, o dos en su primer movimiento.', [{ t: 'reset' }, { t: 'arrow', from: 'e4', to: 'e5', cls: 'idea' }]),
        D('explain', 'Pero para capturar, va en diagonal.', [{ t: 'clear' }, { t: 'mark', sq: 'd5', cls: 'cand' }]),
        D('correct', 'e4 captura en d5. Recto para avanzar, diagonal para comer.', [{ t: 'clear' }, { t: 'arrow', from: 'e4', to: 'd5', cls: 'idea' }, { t: 'play', uci: 'e4d5' }]),
      ],
    }],
  },
  {
    id: 'rook', level: 1, concept: 'rook-move', title: 'La torre', subtitle: 'Filas y columnas',
    intro: 'La torre se mueve en línea recta: por su fila y por su columna, tantas casillas como quiera, mientras no haya piezas en medio.',
    steps: [{
      fen: '4k3/3b4/8/8/8/8/8/3RK3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu torre está en d1 y comparte la columna d con el alfil negro de d7. La columna está despejada.',
      goal: 'Captura el alfil con la torre.', expected: ['d1d7'],
      hints: ['La torre se mueve por columnas y filas.', 'El alfil está en d7, en tu misma columna.', 'd1 → d7.'],
      explain: 'La torre es una pieza de líneas: gana muchísimo valor en columnas abiertas, sin peones que la estorben.',
      wrong: 'La torre solo va en recto por su fila o su columna.',
      demo: [
        D('welcome', 'La torre se desplaza en línea recta: por su columna…', [{ t: 'reset' }, { t: 'arrow', from: 'd1', to: 'd7', cls: 'idea' }]),
        D('explain', '…y por su fila. Nunca en diagonal.', [{ t: 'clear' }, { t: 'arrow', from: 'd1', to: 'a1', cls: 'idea' }, { t: 'arrow', from: 'd1', to: 'g1', cls: 'idea' }]),
        D('correct', 'Baja por la columna d y captura el alfil.', [{ t: 'clear' }, { t: 'arrow', from: 'd1', to: 'd7', cls: 'idea' }, { t: 'play', uci: 'd1d7' }]),
      ],
    }],
  },
  {
    id: 'bishop', level: 1, concept: 'bishop-move', title: 'El alfil', subtitle: 'Las diagonales',
    intro: 'El alfil se mueve solo en diagonal, tantas casillas como quiera. Cada alfil vive siempre en las casillas de un color.',
    steps: [{
      fen: '4k3/8/7r/8/8/8/8/2B1K3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu alfil de c1 apunta por la gran diagonal hasta h6, donde hay una torre negra.',
      goal: 'Captura la torre con el alfil.', expected: ['c1h6'],
      hints: ['El alfil solo se mueve en diagonal.', 'Sigue la diagonal c1-d2-e3-f4-g5-h6.', 'c1 → h6.'],
      explain: 'El alfil es una pieza de largo alcance en diagonal. Dos alfiles que se complementan dominan casillas de ambos colores.',
      wrong: 'El alfil no va en recto: solo en diagonal.',
      demo: [
        D('welcome', 'El alfil viaja en diagonal, tanto como quiera.', [{ t: 'reset' }, { t: 'arrow', from: 'c1', to: 'h6', cls: 'idea' }]),
        D('explain', 'Siempre por casillas del mismo color.', [{ t: 'clear' }, { t: 'mark', sq: 'h6', cls: 'cand' }]),
        D('correct', 'Recorre la diagonal y captura la torre.', [{ t: 'clear' }, { t: 'arrow', from: 'c1', to: 'h6', cls: 'idea' }, { t: 'play', uci: 'c1h6' }]),
      ],
    }],
  },
  {
    id: 'queen', level: 1, concept: 'queen-move', title: 'La dama', subtitle: 'Torre y alfil a la vez',
    intro: 'La dama combina la torre y el alfil: se mueve en recto y en diagonal. Es la pieza más poderosa, por eso hay que cuidarla.',
    steps: [{
      fen: '4k2r/8/8/8/8/8/8/Q3K3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu dama en a1 controla la gran diagonal hasta h8, donde hay una torre negra sin defensa.',
      goal: 'Captura la torre con la dama.', expected: ['a1h8'],
      hints: ['La dama va en recto y en diagonal.', 'La torre h8 está en la diagonal de tu dama.', 'a1 → h8.'],
      explain: 'La dama lo hace casi todo, pero precisamente por su valor no conviene sacarla demasiado pronto: es fácil que la persigan.',
      wrong: 'Esa no captura la torre. Busca la diagonal a1-h8.',
      demo: [
        D('welcome', 'La dama se mueve como la torre…', [{ t: 'reset' }, { t: 'arrow', from: 'a1', to: 'a7', cls: 'idea' }, { t: 'arrow', from: 'a1', to: 'd1', cls: 'idea' }]),
        D('explain', '…y también como el alfil. Todo en uno.', [{ t: 'clear' }, { t: 'arrow', from: 'a1', to: 'h8', cls: 'idea' }]),
        D('correct', 'Por la diagonal, captura la torre.', [{ t: 'clear' }, { t: 'arrow', from: 'a1', to: 'h8', cls: 'idea' }, { t: 'play', uci: 'a1h8' }]),
      ],
    }],
  },
  {
    id: 'king', level: 1, concept: 'king-move', title: 'El rey', subtitle: 'Una casilla, con cuidado',
    intro: 'El rey se mueve una sola casilla en cualquier dirección. Es el más lento, pero es al que hay que proteger: si cae, se acaba la partida.',
    steps: [{
      fen: '4k3/8/8/4p3/4K3/8/8/8 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Hay un peón negro justo delante de tu rey, en e5, sin nadie que lo defienda.',
      goal: 'Captura el peón con el rey.', expected: ['e4e5'],
      hints: ['El rey se mueve una casilla en cualquier dirección.', 'El peón e5 está pegado a tu rey y sin defensa.', 'e4 → e5.'],
      explain: 'El rey también captura, pero solo una casilla y nunca a una pieza defendida (sería meterse en jaque). En los finales, además, se vuelve una pieza fuerte.',
      wrong: 'El rey solo avanza una casilla cada vez.',
      demo: [
        D('welcome', 'El rey da un paso en cualquier dirección: una casilla.', [{ t: 'reset' }, { t: 'mark', sq: 'e5', cls: 'cand' }]),
        D('correct', 'Captura el peón vecino. En los finales, el rey lucha.', [{ t: 'clear' }, { t: 'arrow', from: 'e4', to: 'e5', cls: 'idea' }, { t: 'play', uci: 'e4e5' }]),
      ],
    }],
  },
  {
    id: 'knight-l', level: 1, concept: 'knight-move', title: 'El caballo', subtitle: 'La única pieza que salta',
    intro: 'El caballo no viaja en línea: salta en L, dos casillas y una, y puede pasar por encima de las demás.',
    steps: [{
      fen: '6k1/8/2r5/4N3/8/8/8/6K1 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Observa el caballo blanco en e5. ¿Qué pieza negra podría capturar con un salto en L?',
      goal: 'Captura la torre con el caballo.', expected: ['e5c6'],
      hints: ['¿Qué pieza negra no tiene quien la defienda?', 'Mira la torre en c6.', 'El caballo puede alcanzar c6 en un solo salto.', 'El caballo salta en L: dos casillas y una. Desde e5, c6 es exactamente ese salto.', 'Ce5×c6: el caballo salta en L y captura la torre; ninguna pieza la defendía.'],
      showArrows: [['e5', 'c6', 'idea']],
      explain: 'El caballo se mueve en L y salta por encima de todo. Aquí atrapa una torre que nadie defendía: primero mira qué está sin defensa, luego encuentra el salto.',
      wrong: 'Ese salto es legal, pero deja la torre libre. Busca la L que llega a c6.',
      demo: [
        D('welcome', 'Mira el tablero. Solo hay un caballo blanco, en e5.', [{ t: 'reset' }]),
        D('explain', 'El caballo no viaja en línea recta. Salta en L: dos casillas y una.', [{ t: 'arrow', from: 'e5', to: 'f7', cls: 'idea' }, { t: 'arrow', from: 'e5', to: 'g6', cls: 'idea' }, { t: 'arrow', from: 'e5', to: 'g4', cls: 'idea' }, { t: 'arrow', from: 'e5', to: 'c4', cls: 'idea' }]),
        D('explain', 'Y puede saltar por encima de otras piezas: nada lo bloquea en el camino.', [{ t: 'clear' }]),
        D('hint', 'Ahora observa: la torre negra en c6 no tiene quien la defienda.', [{ t: 'mark', sq: 'c6', cls: 'cand' }]),
        D('correct', 'Ce5×c6. El caballo salta en L y captura la torre. Esa es la idea.', [{ t: 'clear' }, { t: 'arrow', from: 'e5', to: 'c6', cls: 'idea' }, { t: 'play', uci: 'e5c6' }]),
      ],
    }],
  },
  {
    id: 'values', level: 1, concept: 'piece-values', title: 'El valor de las piezas', subtitle: 'Peón 1, caballo/alfil 3, torre 5, dama 9',
    intro: 'Para decidir intercambios usamos valores aproximados: peón 1, caballo y alfil 3, torre 5, dama 9. El rey no tiene precio: es el objetivo.',
    steps: [{
      fen: '4k3/8/8/8/q3p3/2N5/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu caballo en c3 puede capturar el peón de e4 o la dama de a4. Ambos sin defensa. ¿Qué vale más?',
      goal: 'Captura la pieza más valiosa.', expected: ['c3a4'],
      hints: ['¿Vale más un peón (1) o una dama (9)?', 'La dama negra está en a4, a un salto de caballo.', 'Cc3 × a4: quédate con la dama.'],
      explain: 'Cuando puedas elegir, llévate lo más valioso. Estos números no son sagrados, pero te evitan regalar material o cambiar mal.',
      wrong: 'Ese es el peón (vale 1). Había algo mucho más valioso sin defensa.',
      demo: [
        D('welcome', 'Valores de referencia: peón 1, caballo y alfil 3, torre 5, dama 9.', [{ t: 'reset' }]),
        D('explain', 'Tu caballo alcanza dos piezas: el peón de e4… y la dama de a4.', [{ t: 'mark', sq: 'e4', cls: 'cand' }, { t: 'mark', sq: 'a4', cls: 'cand' }]),
        D('correct', 'Entre un peón y una dama, la elección está clara: Cxa4.', [{ t: 'clear' }, { t: 'arrow', from: 'c3', to: 'a4', cls: 'idea' }, { t: 'play', uci: 'c3a4' }]),
      ],
    }],
  },

  // ================= NIVEL 2 · Rey bajo presión =================
  {
    id: 'check', level: 2, concept: 'check', title: 'El jaque', subtitle: 'Atacar al rey',
    intro: 'Un jaque es un ataque directo al rey. No es opcional responder: hay que salir del jaque sí o sí, en la misma jugada.',
    steps: [{
      fen: '4k3/8/8/8/8/8/8/3RK3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu torre en d1 tiene la columna d libre. Si llega a d8, atacará al rey negro por su fila.',
      goal: 'Da jaque al rey negro.', expected: ['d1d8'],
      hints: ['Un jaque ataca directamente al rey.', 'Lleva la torre a la octava fila, donde está el rey.', 'd1 → d8: jaque.'],
      explain: 'Reconocer y dar jaques es básico: muchas tácticas empiezan con un jaque que gana tiempo. Pero jaque no es lo mismo que mate.',
      wrong: 'Eso no ataca al rey. Busca una jugada que lo ponga en jaque.',
    }],
  },
  {
    id: 'checkmate-1', level: 2, concept: 'checkmate', title: 'El jaque mate', subtitle: 'Jaque sin escapatoria',
    intro: 'El jaque mate es un jaque del que el rey no puede escapar: no puede moverse a una casilla segura, ni capturar al atacante, ni interponer una pieza. Ahí acaba la partida.',
    steps: [{
      fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'El rey negro en g8 está encerrado por sus peones f7, g7 y h7. Si das jaque en la octava fila, no tendrá salida.',
      goal: 'Da jaque mate.', expected: ['d1d8'], mustMate: true,
      hints: ['El rey no tiene casillas libres: sus peones lo tapan.', 'Da jaque en la octava fila con la dama.', 'Dd1-d8 es mate.'],
      explain: 'El mate es el objetivo del juego. Fíjate cómo los propios peones del rey le quitan las salidas: eso es lo que convierte el jaque en mate.',
      wrong: 'Es jaque, pero no mate: al rey le queda alguna escapatoria. Busca el jaque sin salida.',
    }],
  },
  {
    id: 'castling', level: 2, concept: 'castling', title: 'El enroque', subtitle: 'Pon a salvo a tu rey',
    intro: 'El enroque es la única jugada con dos piezas a la vez: el rey se desplaza dos casillas hacia la torre y la torre salta a su lado. Pone al rey a salvo y activa la torre.',
    steps: [{
      fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tienes el rey en e1 y la torre en h1, con las casillas f1 y g1 libres. Es el momento de enrocar corto.',
      goal: 'Enroca (lleva el rey a g1).', expected: ['e1g1'],
      hints: ['El enroque mueve el rey dos casillas hacia la torre.', 'Enroque corto: el rey va a g1.', 'Mueve el rey de e1 a g1.'],
      explain: 'Enrocar pronto suele ser de las mejores decisiones de la apertura: protege al rey tras sus peones y conecta las torres. Solo se puede si ni el rey ni la torre se han movido y no hay jaque de por medio.',
      wrong: 'Para enrocar corto, lleva el rey a g1.',
      demo: [
        D('welcome', 'El enroque mueve dos piezas a la vez: el rey y la torre.', [{ t: 'reset' }, { t: 'mark', sq: 'g1', cls: 'cand' }]),
        D('correct', 'El rey salta a g1 y la torre aparece a su lado, en f1. Rey a salvo.', [{ t: 'clear' }, { t: 'arrow', from: 'e1', to: 'g1', cls: 'idea' }, { t: 'play', uci: 'e1g1' }]),
      ],
    }],
  },
  {
    id: 'promotion', level: 2, concept: 'promotion', title: 'La coronación', subtitle: 'Un peón puede volverse dama',
    intro: 'Si un peón llega a la última fila, se transforma en la pieza que elijas: casi siempre una dama. Por eso un peón pasado vale su peso en oro.',
    steps: [{
      fen: '6k1/4P3/8/8/8/8/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu peón está en e7, a un paso de la octava fila. Corónalo.',
      goal: 'Corona el peón (hazlo dama).', expected: ['e7e8q'],
      hints: ['Lleva el peón a la última fila.', 'Al llegar a e8 se transforma; elige dama.', 'e7 → e8 = Dama.'],
      explain: 'Coronar cambia la partida: un peón (1 punto) se convierte en dama (9). En los finales, empujar un peón pasado hacia la coronación suele ser el plan ganador.',
      wrong: 'Empuja el peón hasta la octava fila para coronar.',
      demo: [
        D('welcome', 'Un peón que alcanza la última fila se transforma.', [{ t: 'reset' }, { t: 'mark', sq: 'e8', cls: 'cand' }]),
        D('correct', 'e8 = Dama. De valer 1 a valer 9 en una jugada.', [{ t: 'clear' }, { t: 'arrow', from: 'e7', to: 'e8', cls: 'idea' }, { t: 'play', uci: 'e7e8q' }]),
      ],
    }],
  },

  // ================= NIVEL 3 · Mirar antes de mover =================
  {
    id: 'hanging-queen', level: 3, concept: 'hanging-piece', title: 'Una pieza sin defensor', subtitle: 'Material gratis',
    intro: 'Antes de mover, busca piezas rivales sin quien las proteja. Una pieza sin defensor en tu línea es material regalado.',
    steps: [{
      fen: '6k1/4q3/8/8/8/8/8/4R1K1 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu torre y la dama negra comparten la columna e, que está abierta. ¿Quién defiende a la dama?',
      goal: 'Captura la dama negra.', expected: ['e1e7'],
      hints: ['¿Hay alguna pieza negra sin quien la proteja?', 'Fíjate en la dama de e7.', 'Tu torre y la dama están en la misma columna, y no hay nada entre ellas.', 'Es una pieza colgada: la dama no tiene defensor en una columna abierta.', 'T×e7: la torre baja por la columna abierta y captura la dama, que nadie defendía.'],
      showArrows: [['e1', 'e7', 'idea']],
      explain: 'Una pieza sin defensor en una columna o fila abierta es material gratis. El hábito clave es preguntar “¿quién la defiende?” antes de mover.',
      wrong: 'Jugada legal, pero dejas escapar la dama. Vuelve a mirar la columna e.',
      demo: [
        D('welcome', 'Antes de mover, siempre miramos qué piezas rivales están sin protección.', [{ t: 'reset' }]),
        D('explain', 'La dama negra está en e7. Pregúntate: ¿quién la defiende? Nadie.', [{ t: 'mark', sq: 'e7', cls: 'cand' }]),
        D('hint', 'Tu torre y la dama comparten la columna e, y está abierta: nada entre medias.', [{ t: 'arrow', from: 'e1', to: 'e7', cls: 'idea' }]),
        D('correct', 'T×e7. La torre baja por la columna abierta y se lleva la dama.', [{ t: 'clear' }, { t: 'play', uci: 'e1e7' }]),
      ],
    }],
  },
  {
    id: 'trade-safely', level: 3, concept: 'defenders', title: 'Cuenta los defensores', subtitle: 'No captures a lo tonto',
    intro: 'No toda captura es buena. Antes de comer, cuenta: ¿está defendida esa pieza? Si lo está, capturarla puede costarte más de lo que ganas.',
    steps: [{
      fen: '4k3/8/3p4/4p3/1b6/3N4/8/4K3 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu caballo en d3 puede capturar el alfil de b4 o el peón de e5. Pero el peón e5 está defendido por el peón d6.',
      goal: 'Captura la pieza que NO está defendida.', expected: ['d3b4'],
      hints: ['Una de las dos capturas te devuelven la pieza.', 'El peón e5 lo defiende el peón d6; el alfil b4 no tiene a nadie.', 'Cd3 × b4: captura el alfil sin defensa.'],
      explain: 'Capturar en e5 te haría perder el caballo (te recaptura d6). El alfil de b4, en cambio, es gratis. Contar atacantes y defensores evita la mitad de los errores.',
      wrong: 'Cuidado: esa pieza está defendida y te recapturan. Busca la que nadie protege.',
    }],
  },

  // ================= NIVEL 4 · Patrones de combate =================
  {
    id: 'back-rank', level: 4, concept: 'back-rank', title: 'Mate de última fila', subtitle: 'El rey encerrado por sus peones',
    intro: 'Tras el enroque, los peones que protegen al rey también pueden encerrarlo. Si no tiene salida, una torre o dama da mate en su fila.',
    steps: [{
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Mira al rey negro en g8. Sus peones f7, g7 y h7 le tapan la huida. ¿Puede escapar de su última fila?',
      goal: 'Da mate en la última fila.', expected: ['a1a8'], mustMate: true,
      hints: ['¿Tiene el rey negro alguna casilla para escapar de la octava fila?', 'Sus propios peones f7-g7-h7 le cierran la salida hacia delante.', 'Tu torre tiene la columna a libre hasta la octava fila.', 'Es un mate de última fila: jaque en la fila del rey, sin escape posible.', 'Ta8#: la torre llega a la octava dando jaque; el rey no puede salir porque sus peones lo encierran.'],
      showArrows: [['a1', 'a8', 'idea']],
      explain: 'El mate de última fila castiga al rey que sus propios peones han encerrado. Por eso, en tus partidas, a veces conviene abrir un respiradero para el rey.',
      wrong: 'Esa no da mate: o el rey conserva una casilla, o el jaque no llega a la octava fila.',
      demo: [
        D('welcome', 'Fíjate en el rey negro en g8, resguardado tras su enroque.', [{ t: 'reset' }]),
        D('explain', 'Pero sus propios peones f7, g7 y h7 le tapan la salida hacia delante.', [{ t: 'mark', sq: 'f7', cls: 'cand' }, { t: 'mark', sq: 'g7', cls: 'cand' }, { t: 'mark', sq: 'h7', cls: 'cand' }]),
        D('hint', 'El rey no tiene ninguna casilla libre en su propia fila para escapar.', [{ t: 'clear' }, { t: 'mark', sq: 'g8', cls: 'danger' }]),
        D('explain', 'Y tu torre tiene la columna a libre hasta la octava fila.', [{ t: 'clear' }, { t: 'arrow', from: 'a1', to: 'a8', cls: 'idea' }]),
        D('correct', 'Ta8#. Jaque en la octava; el rey está encerrado por sus peones. Mate.', [{ t: 'clear' }, { t: 'play', uci: 'a1a8' }]),
      ],
    }],
  },
  {
    id: 'fork', level: 4, concept: 'fork', title: 'La horquilla', subtitle: 'Atacar dos cosas a la vez',
    intro: 'Una horquilla es un ataque doble: una pieza amenaza dos objetivos a la vez, y el rival no puede salvar los dos. El caballo es el rey de las horquillas.',
    steps: [{
      fen: '8/8/8/8/1q6/2k5/8/K1N5 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu caballo en c1 puede saltar a una casilla desde la que ataque al rey y a la dama a la vez.',
      goal: 'Haz una horquilla al rey y la dama.', expected: ['c1a2'],
      hints: ['Busca un salto de caballo que ataque dos piezas negras.', 'Desde a2, el caballo da jaque al rey en c3 y ataca la dama en b4.', 'Cc1-a2: horquilla. El rey debe moverse y ganas la dama.'],
      explain: 'La horquilla de caballo al rey y la dama gana la pieza mayor: al ser jaque, el rey tiene que salir y entonces capturas la dama. Busca siempre saltos que ataquen dos cosas.',
      wrong: 'Ese salto no ataca a la vez al rey y a la dama. Busca la casilla que amenaza las dos.',
      demo: [
        D('welcome', 'Una horquilla ataca dos piezas a la vez. Aquí, con el caballo.', [{ t: 'reset' }]),
        D('explain', 'Desde a2, el caballo daría jaque al rey (c3) y atacaría la dama (b4).', [{ t: 'mark', sq: 'c3', cls: 'danger' }, { t: 'mark', sq: 'b4', cls: 'cand' }]),
        D('correct', 'Ca2+. El rey debe moverse y luego capturas la dama. Ataque doble.', [{ t: 'clear' }, { t: 'arrow', from: 'c1', to: 'a2', cls: 'idea' }, { t: 'play', uci: 'c1a2' }]),
      ],
    }],
  },
  {
    id: 'pin', level: 4, concept: 'pin', title: 'La clavada', subtitle: 'Inmovilizar una pieza',
    intro: 'Clavar es fijar una pieza rival contra algo más valioso detrás (el rey o la dama): esa pieza no puede moverse sin dejar al descubierto lo de atrás.',
    steps: [{
      fen: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'El caballo negro de c6 está en la diagonal que lleva hasta su rey en e8. Si pones tu alfil en esa diagonal, quedará clavado.',
      goal: 'Clava el caballo contra el rey.', expected: ['f1b5'],
      hints: ['Busca la diagonal b5-c6-d7-e8, que termina en el rey negro.', 'Coloca tu alfil en b5, detrás del caballo está el rey.', 'Af1-b5: el caballo queda clavado y no puede moverse.'],
      explain: 'Con el alfil en b5, el caballo de c6 queda clavado contra el rey: si se mueve, el alfil daría jaque. Una pieza clavada es una pieza a medias; luego puedes atacarla y ganarla.',
      wrong: 'Esa jugada no clava el caballo. Busca la diagonal que llega hasta el rey en e8.',
      demo: [
        D('welcome', 'Clavar es fijar una pieza contra algo valioso que tiene detrás.', [{ t: 'reset' }]),
        D('explain', 'El caballo de c6 tiene a su rey detrás, en la diagonal b5-c6-d7-e8.', [{ t: 'arrow', from: 'b5', to: 'e8', cls: 'idea' }]),
        D('correct', 'Ab5. El caballo queda clavado: no puede moverse sin exponer al rey.', [{ t: 'clear' }, { t: 'arrow', from: 'f1', to: 'b5', cls: 'idea' }, { t: 'play', uci: 'f1b5' }]),
      ],
    }],
  },

  // ================= NIVEL 5 · Construir una posición =================
  {
    id: 'center', level: 5, concept: 'center', title: 'El centro', subtitle: 'Manda quien controla el medio',
    intro: 'Las casillas centrales (e4, d4, e5, d5) son las más valiosas: desde el centro tus piezas alcanzan todo el tablero. Empieza casi siempre ocupando el centro.',
    steps: [{
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Es el inicio de la partida. Da el primer paso ocupando el centro con un peón.',
      goal: 'Ocupa el centro con un peón (e4 o d4).', expected: ['e2e4', 'd2d4'],
      hints: ['Las casillas fuertes son e4, d4, e5 y d5.', 'Adelanta el peón de e o el de d dos casillas.', 'e2-e4 (o d2-d4): ocupas el centro.'],
      explain: 'Con un peón en el centro, ganas espacio y abres líneas para tu alfil y tu dama. Controlar el centro es la primera regla de la apertura.',
      wrong: 'Esa no ocupa el centro. Adelanta el peón de e o el de d.',
    }],
  },
  {
    id: 'develop', level: 5, concept: 'development', title: 'El desarrollo', subtitle: 'Saca tus piezas pronto',
    intro: 'Desarrollar es sacar tus piezas menores (caballos y alfiles) a casillas activas cuanto antes. No muevas la misma pieza dos veces ni saques la dama demasiado pronto.',
    steps: [{
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', orientation: 'w', playerColor: 'w',
      observe: 'Ya tienes un peón en el centro. Ahora saca una pieza hacia el juego: un caballo hacia el centro es ideal.',
      goal: 'Desarrolla un caballo hacia el centro.', expected: ['g1f3', 'b1c3'],
      hints: ['Saca un caballo, no muevas más peones aún.', 'Los caballos van bien a f3 y c3, mirando al centro.', 'Cg1-f3 (o Cb1-c3): desarrollo.'],
      explain: 'Cg1-f3 ataca el peón e5 y prepara el enroque. La receta de la apertura: peón al centro, caballos y alfiles fuera, y enrocar. Piezas dormidas no ganan partidas.',
      wrong: 'Céntrate en sacar una pieza menor hacia el centro (un caballo a f3 o c3).',
    }],
  },
  {
    id: 'king-safety', level: 5, concept: 'king-safety', title: 'Seguridad del rey', subtitle: 'Enroca antes de atacar',
    intro: 'Antes de lanzarte al ataque, pon a salvo a tu propio rey. La mayoría de las derrotas rápidas vienen de un rey que se quedó en el centro.',
    steps: [{
      fen: 'rnbqk2r/ppppbppp/5n2/4p3/4P3/5N2/PPPPBPPP/RNBQK2R w KQkq - 4 4', orientation: 'w', playerColor: 'w',
      observe: 'Tienes las piezas desarrolladas y el camino libre para enrocar. Es el momento de proteger a tu rey.',
      goal: 'Enroca corto.', expected: ['e1g1'],
      hints: ['El rey estará más seguro en la esquina, tras sus peones.', 'Enroque corto: rey a g1.', 'Enroca: e1-g1.'],
      explain: 'Con el rey enrocado y las torres conectadas, ya puedes pensar en atacar sin miedo a que te devuelvan el golpe en el centro. Primero seguridad, después actividad.',
      wrong: 'Aún no. Primero pon a salvo al rey: enroca corto (rey a g1).',
    }],
  },

  // ================= NIVEL 6 · Convertir ventajas =================
  {
    id: 'push-pawn', level: 6, concept: 'passed-pawn', title: 'El peón pasado', subtitle: 'Empújalo a coronar',
    intro: 'Un peón pasado es aquel al que ningún peón rival puede frenar. En los finales, empujarlo hacia la coronación suele decidir la partida.',
    steps: [{
      fen: '8/4k3/8/2P5/8/8/6K1/8 w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'Tu peón de c5 no tiene ningún peón enemigo que lo detenga. El rey negro está lejos. Empújalo.',
      goal: 'Avanza el peón pasado.', expected: ['c5c6'],
      hints: ['El peón de c5 está pasado: nada lo frena.', 'El rey negro no llega a tiempo; avanza.', 'c5-c6, camino a coronar.'],
      explain: 'En los finales, un peón pasado apoyado por su rey es oro. La regla práctica: los peones pasados hay que empujarlos. Cada paso lo acerca a convertirse en dama.',
      wrong: 'Céntrate en el peón pasado: avánzalo hacia la coronación.',
    }],
  },
  {
    id: 'kr-mate', level: 6, concept: 'rook-mate', title: 'Mate con torre', subtitle: 'El rey empuja, la torre corta',
    intro: 'Con rey y torre contra rey solo se da mate llevando al rey enemigo al borde: tu rey lo acorrala y la torre da el jaque final por la fila o columna del borde.',
    steps: [{
      fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', orientation: 'w', playerColor: 'w',
      observe: 'El rey negro está en el borde, en a8, y tu rey en b6 le quita todas las casillas de escape. Solo falta el jaque.',
      goal: 'Da mate con la torre.', expected: ['h1h8'], mustMate: true,
      hints: ['Tu rey ya controla a7, b7 y b8: el rey negro no puede salir.', 'Da jaque por la octava fila con la torre.', 'Th1-h8 es mate.'],
      explain: 'Este es el patrón del mate de torre: tu rey hace el trabajo sucio (quita casillas) y la torre remata desde lejos. Recuerda: al rey rival se le da mate en el borde, nunca en el centro.',
      wrong: 'Aún no es mate: asegúrate de que el rey no tenga escape antes de dar el jaque por la octava.',
    }],
  },
];

export function lessonsForLevel(level) { return LESSONS.filter(l => l.level === level); }
export function lessonById(id) { return LESSONS.find(l => l.id === id) || null; }
