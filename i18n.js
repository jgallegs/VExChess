/* ============================================================
   i18n — TODOS los textos de la interfaz en un solo sitio.
   Para añadir un idioma nuevo: copia el bloque "en" y tradúcelo.
   ============================================================ */

// Metadatos compartidos entre idiomas (no se traducen)
export const PIECE_META = [
  { t: 'p', valor: '1' }, { t: 'n', valor: '3' }, { t: 'b', valor: '3' },
  { t: 'r', valor: '5' }, { t: 'q', valor: '9' }, { t: 'k', valor: '∞' },
];
export const CONCEPT_ICONS = ['📊', '🎯', '♚', '✨', '⚖️', '💡'];

export const MESSAGES = {
  // ======================= ESPAÑOL =======================
  es: {
    title: 'Ajedrez · rival con red neuronal',
    appName: 'Ajedrez', appSub: 'rival IA · NNUE',
    engineLoading: 'Cargando motor…', engineReady: 'Motor listo · Stockfish 18 (NNUE)', engineError: 'Error del motor: ',
    loaderText: 'Cargando el motor…', coachLoading: 'Cargando entrenador…',
    langLabel: 'Idioma', levelLabel: 'Nivel del rival',
    colorLabel: 'Tu color', colorWhite: 'Blancas', colorBlack: 'Negras', colorRandom: 'Aleatorio',
    drawTitle: 'Sorteo de color', drawPick: 'Elige una mano', drawSkip: 'Saltar',
    drawWhite: 'Juegas con blancas. Tu movimiento.', drawBlack: 'Juegas con negras. Stockfish comienza.',
    confirmRestart: 'Esto reiniciará la partida en curso. ¿Continuar?', confirmOk: 'Reiniciar', confirmCancel: 'Cancelar',
    undo: 'Deshacer', flip: 'Girar', newGame: 'Nueva',
    coachToggle: 'Modo entrenador', coachToggleSub: '(te sugiere la jugada)',
    dangerToggle: 'Avisar de piezas en peligro',
    helpBtn: 'Guía y conceptos', helpTitle: 'Guía del ajedrez',
    conceptsTitle: 'Conceptos básicos', piecesTitle: 'Las piezas',
    thinking: 'El rival está pensando…', suggestion: 'Sugerencia',
    you: 'Tú', white: 'blancas', black: 'negras', max: 'MÁX',
    historyEmpty: 'Sin jugadas todavía',
    evalLabel: 'Evaluación', advWhite: 'ventaja blancas', advBlack: 'ventaja negras', even: 'igualada',
    checkmateWin: '🏆 ¡Jaque mate! Has ganado.', checkmateLose: '💀 Jaque mate. Gana el rival.',
    stalemate: 'Tablas por rey ahogado.', draw: 'Tablas.', check: '¡Jaque!',
    queenDanger: '¡Tu reina está en peligro!',
    piecesDanger1: 'Tienes 1 pieza amenazada.', piecesDangerN: 'Tienes {n} piezas amenazadas.',
    reasons: {
      castle: 'enroca y pone el rey a salvo', mate: '¡es jaque mate!', check: 'da jaque',
      promote: 'corona un peón', capture: 'captura material', develop: 'desarrolla una pieza',
      space: 'gana espacio', improve: 'mejora tu posición',
    },
    levels: {
      principiante: 'Principiante (~1320)', facil: 'Fácil (~1500)', intermedio: 'Intermedio (~1800)',
      avanzado: 'Avanzado (~2200)', maximo: 'Máximo (imparable)',
    },
    pieceNames: { k: 'rey', q: 'dama', r: 'torre', b: 'alfil', n: 'caballo', p: 'peón' },
    concepts: [
      { nombre: '¿Qué son los números? (Elo)', texto: 'El número junto al rival (300, 1320, 1800, 3190…) es su <b>Elo</b>: una medida de fuerza de juego. Cuanto más alto, mejor juega. Como referencia: ~300 principiante absoluto, ~800–1200 vas aprendiendo, ~1500 aficionado de club, ~2000 muy fuerte, ~2500 Gran Maestro y ~2800+ campeones del mundo. El nivel que eliges aquí fija ese número y con él la fuerza de Stockfish.' },
      { nombre: 'Objetivo del juego', texto: 'Ganar dando <b>jaque mate</b>: atacar al rey rival de modo que no pueda escapar. El rey nunca se captura; se acorrala. También puedes ganar si el rival abandona.' },
      { nombre: 'Jaque, mate y tablas', texto: '<b>Jaque</b>: el rey está atacado y debes salvarlo en la siguiente jugada. <b>Jaque mate</b>: está atacado y no hay forma de salvarlo (fin de la partida). <b>Tablas</b> (empate): por ejemplo el <i>ahogado</i> (no estás en jaque pero no tienes ninguna jugada legal), por repetición de la posición o por falta de material para dar mate.' },
      { nombre: 'Jugadas especiales', texto: '<b>Enroque</b>: el rey y una torre se mueven a la vez para poner el rey a salvo. <b>Captura al paso</b>: un peón puede capturar a otro que acaba de avanzar dos casillas quedando a su lado. <b>Coronación</b>: un peón que llega a la última fila se transforma en otra pieza (casi siempre en dama).' },
      { nombre: 'El valor de las piezas', texto: 'Sirve para decidir si un cambio te conviene: peón <b>1</b>, caballo <b>3</b>, alfil <b>3</b>, torre <b>5</b>, dama <b>9</b>. El rey no tiene valor numérico porque es el objetivo. El <b>+N</b> verde de las barras es la diferencia de material capturado.' },
      { nombre: 'Consejos para empezar', texto: 'Controla el centro con los peones; saca pronto caballos y alfiles (<i>desarrolla</i>); enroca para proteger al rey; no saques la dama demasiado pronto; y antes de cada jugada pregúntate: “¿alguna pieza mía queda en peligro?”. Activa el <b>modo entrenador</b> para ver la jugada recomendada.' },
    ],
    pieces: {
      p: { nombre: 'Peón', mueve: 'Avanza una casilla en línea recta (o dos en su primer movimiento) y captura en diagonal, nunca de frente. Tiene dos jugadas especiales: la captura al paso y la coronación.', historia: 'Representa a la infantería. Es la única pieza que no puede retroceder. Si llega a la última fila, "corona" y se transforma en la pieza que elijas: ¡un simple peón puede convertirse en dama!', objetivos: 'Controla el centro y forma cadenas de peones. Un "peón pasado" (sin peones rivales que lo frenen) puede decidir la partida al correr a coronar.' },
      n: { nombre: 'Caballo', mueve: 'Salta en forma de "L": dos casillas en una dirección y una en perpendicular. Es la única pieza que salta por encima de las demás.', historia: 'Representa la caballería. Su salto lo hace impredecible: puede atacar a dos piezas a la vez con una "horquilla". Brilla en posiciones cerradas donde las piezas de largo alcance se ahogan.', objetivos: 'Busca casillas fuertes cerca del centro donde ningún peón pueda expulsarlo. Un caballo bien plantado en campo rival vale oro.' },
      b: { nombre: 'Alfil', mueve: 'Se desliza en diagonal cualquier número de casillas. Cada alfil vive siempre en casillas de un solo color.', historia: 'Su nombre viene del árabe "al-fil", que significa "el elefante". Conservar los dos alfiles (la "pareja de alfiles") es una ventaja apreciada, sobre todo en posiciones abiertas.', objetivos: 'Abre diagonales largas y apunta hacia el rey enemigo. Los dos alfiles se complementan cubriendo cada uno un color.' },
      r: { nombre: 'Torre', mueve: 'Se mueve en línea recta, horizontal o vertical, cualquier número de casillas. Participa con el rey en el enroque.', historia: 'Representa un carro de guerra o una torre de asedio. Es una pieza "pesada" que despliega toda su fuerza cuando el tablero se abre, en el final de la partida.', objetivos: 'Domina las columnas abiertas y colócala en la séptima fila, donde atrapa peones. Dos torres conectadas son demoledoras.' },
      q: { nombre: 'Dama (Reina)', mueve: 'La pieza más poderosa: combina la torre y el alfil. Se desliza en recta y en diagonal cualquier número de casillas.', historia: 'Al principio era débil (un "visir" que movía una sola casilla). En la Europa del siglo XV se volvió tan fuerte que a esa variante la llamaron "ajedrez de la dama loca".', objetivos: 'No la saques demasiado pronto o el rival ganará tiempo persiguiéndola. Coordinada con otras piezas, es letal en el ataque.' },
      k: { nombre: 'Rey', mueve: 'Se mueve una sola casilla en cualquier dirección. Tiene una jugada especial junto a la torre: el enroque, que lo pone a salvo.', historia: 'Es el corazón del juego: la partida acaba cuando el rey no puede escapar del jaque (jaque mate). Nunca se captura; se acorrala.', objetivos: 'En la apertura, ponlo a salvo (normalmente enrocando). En el final, con pocas piezas, se convierte en una pieza activa que ayuda a coronar peones.' },
    },
  },

  // ======================= ENGLISH =======================
  en: {
    title: 'Chess · neural-network rival',
    appName: 'Chess', appSub: 'AI rival · NNUE',
    engineLoading: 'Loading engine…', engineReady: 'Engine ready · Stockfish 18 (NNUE)', engineError: 'Engine error: ',
    loaderText: 'Loading the engine…', coachLoading: 'Loading coach…',
    langLabel: 'Language', levelLabel: 'Rival level',
    colorLabel: 'Your color', colorWhite: 'White', colorBlack: 'Black', colorRandom: 'Random',
    drawTitle: 'Color draw', drawPick: 'Pick a hand', drawSkip: 'Skip',
    drawWhite: 'You play White. Your move.', drawBlack: 'You play Black. Stockfish starts.',
    confirmRestart: 'This will restart the current game. Continue?', confirmOk: 'Restart', confirmCancel: 'Cancel',
    undo: 'Undo', flip: 'Flip', newGame: 'New',
    coachToggle: 'Coach mode', coachToggleSub: '(suggests your move)',
    dangerToggle: 'Warn about hanging pieces',
    helpBtn: 'Guide & concepts', helpTitle: 'Chess guide',
    conceptsTitle: 'Basics', piecesTitle: 'The pieces',
    thinking: 'The rival is thinking…', suggestion: 'Suggestion',
    you: 'You', white: 'White', black: 'Black', max: 'MAX',
    historyEmpty: 'No moves yet',
    evalLabel: 'Evaluation', advWhite: 'White is better', advBlack: 'Black is better', even: 'equal',
    checkmateWin: '🏆 Checkmate! You win.', checkmateLose: '💀 Checkmate. The rival wins.',
    stalemate: 'Draw by stalemate.', draw: 'Draw.', check: 'Check!',
    queenDanger: 'Your queen is in danger!',
    piecesDanger1: 'You have 1 piece under attack.', piecesDangerN: 'You have {n} pieces under attack.',
    reasons: {
      castle: 'castles and brings the king to safety', mate: "it's checkmate!", check: 'gives check',
      promote: 'promotes a pawn', capture: 'wins material', develop: 'develops a piece',
      space: 'gains space', improve: 'improves your position',
    },
    levels: {
      principiante: 'Beginner (~1320)', facil: 'Easy (~1500)', intermedio: 'Intermediate (~1800)',
      avanzado: 'Advanced (~2200)', maximo: 'Maximum (unbeatable)',
    },
    pieceNames: { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' },
    concepts: [
      { nombre: 'What do the numbers mean? (Elo)', texto: 'The number next to your rival (300, 1320, 1800, 3190…) is its <b>Elo</b>: a measure of playing strength. The higher, the better it plays. For reference: ~300 absolute beginner, ~800–1200 still learning, ~1500 club amateur, ~2000 very strong, ~2500 Grandmaster and ~2800+ world champions. The level you pick here sets that number and with it Stockfish\'s strength.' },
      { nombre: 'Goal of the game', texto: 'Win by delivering <b>checkmate</b>: attacking the enemy king so that it cannot escape. The king is never captured; it is cornered. You also win if your opponent resigns.' },
      { nombre: 'Check, mate and draws', texto: '<b>Check</b>: the king is under attack and you must save it on your next move. <b>Checkmate</b>: it is under attack and there is no way to save it (the game ends). <b>Draw</b> (tie): for example <i>stalemate</i> (you are not in check but have no legal move), by repetition of the position, or by insufficient material to checkmate.' },
      { nombre: 'Special moves', texto: '<b>Castling</b>: the king and a rook move at once to bring the king to safety. <b>En passant</b>: a pawn can capture another that has just advanced two squares beside it. <b>Promotion</b>: a pawn that reaches the last rank turns into another piece (almost always a queen).' },
      { nombre: 'The value of the pieces', texto: 'It helps you decide whether a trade is worth it: pawn <b>1</b>, knight <b>3</b>, bishop <b>3</b>, rook <b>5</b>, queen <b>9</b>. The king has no numeric value because it is the goal. The green <b>+N</b> in the bars is the difference in captured material.' },
      { nombre: 'Tips to get started', texto: 'Control the center with your pawns; develop your knights and bishops early; castle to protect your king; don\'t bring your queen out too soon; and before each move ask yourself: “is any of my pieces hanging?”. Turn on <b>coach mode</b> to see the recommended move.' },
    ],
    pieces: {
      p: { nombre: 'Pawn', mueve: 'Moves one square straight forward (or two on its first move) and captures diagonally, never straight ahead. It has two special moves: en passant and promotion.', historia: 'It represents the infantry. It is the only piece that can never move backward. If it reaches the last rank it "promotes" and becomes any piece you choose: a humble pawn can turn into a queen!', objetivos: 'Control the center and build pawn chains. A "passed pawn" (with no enemy pawns to stop it) can decide the game by racing to promote.' },
      n: { nombre: 'Knight', mueve: 'Jumps in an "L" shape: two squares one way and one square perpendicular. It is the only piece that jumps over others.', historia: 'It represents the cavalry. Its jump makes it tricky: it can attack two pieces at once with a "fork". It shines in closed positions where long-range pieces get stuck.', objetivos: 'Look for strong squares near the center where no pawn can kick it away. A well-placed knight in enemy territory is worth gold.' },
      b: { nombre: 'Bishop', mueve: 'Slides diagonally any number of squares. Each bishop always lives on squares of a single color.', historia: 'Its name comes from the Arabic "al-fil", meaning "the elephant". Keeping both bishops (the "bishop pair") is a valued advantage, especially in open positions.', objetivos: 'Open long diagonals and aim at the enemy king. The two bishops complement each other, each covering one color.' },
      r: { nombre: 'Rook', mueve: 'Moves in a straight line, horizontally or vertically, any number of squares. It takes part in castling with the king.', historia: 'It represents a war chariot or a siege tower. It is a "heavy" piece that unleashes its power when the board opens up, in the endgame.', objetivos: 'Dominate open files and place it on the seventh rank, where it traps pawns. Two connected rooks are devastating.' },
      q: { nombre: 'Queen', mueve: 'The most powerful piece: it combines the rook and the bishop. It slides in straight lines and diagonals any number of squares.', historia: 'It was originally weak (a "vizier" that moved a single square). In 15th-century Europe it became so strong that the new variant was called "mad queen chess".', objetivos: "Don't bring it out too early or your opponent will gain time chasing it. Coordinated with other pieces, it is deadly in attack." },
      k: { nombre: 'King', mueve: 'Moves a single square in any direction. It has a special move with the rook: castling, which brings it to safety.', historia: 'It is the heart of the game: the game ends when the king cannot escape check (checkmate). It is never captured; it is cornered.', objetivos: 'In the opening, keep it safe (usually by castling). In the endgame, with few pieces, it becomes an active piece that helps promote pawns.' },
    },
  },
};
