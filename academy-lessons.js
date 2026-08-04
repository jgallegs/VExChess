// ============================================================
//  VEXCHESS · Lecciones de la Academia (AXIOM)
//  Cada lección entrena UNA idea con el bucle
//  Observa → Predice → Juega → Explica.
//  Todo el ajedrez sale de FEN + jugadas legales (UCI), nunca de
//  una imagen. Las soluciones están verificadas por chess.js.
// ============================================================

// Ruta de aprendizaje (blueprint de AXIOM). Los niveles sin lección
// todavía se muestran como "próximamente".
export const PATH = [
  { level: 0, name: 'Primer contacto', desc: 'Tablero, turnos, coordenadas y objetivo.' },
  { level: 1, name: 'Las seis voces', desc: 'Cómo se mueve y cuánto vale cada pieza.' },
  { level: 2, name: 'Rey bajo presión', desc: 'Jaque, mate, ahogado, enroque y promoción.' },
  { level: 3, name: 'Mirar antes de mover', desc: 'Capturas, amenazas, defensores y piezas colgadas.' },
  { level: 4, name: 'Patrones de combate', desc: 'Horquilla, clavada, enfilada, descubierta y desviación.' },
  { level: 5, name: 'Construir una posición', desc: 'Centro, desarrollo, seguridad del rey y estructura.' },
  { level: 6, name: 'Convertir ventajas', desc: 'Finales elementales, oposición y peones pasados.' },
  { level: 7, name: 'Tu propia partida', desc: 'Revisión guiada de tus partidas y plan personal.' },
];

export const LESSONS = [
  {
    id: 'knight-l',
    level: 1,
    concept: 'knight-move',
    title: 'El salto del caballo',
    subtitle: 'La única pieza que salta',
    intro: 'El caballo no viaja en línea: salta en L, dos casillas y una, y puede pasar por encima de las demás.',
    steps: [
      {
        fen: '6k1/8/2r5/4N3/8/8/8/6K1 w - - 0 1',
        orientation: 'w', playerColor: 'w',
        observe: 'Observa el caballo blanco en e5. ¿Qué pieza negra podría capturar con un salto en L?',
        goal: 'Captura la torre con el caballo.',
        expected: ['e5c6'],
        hints: [
          '¿Qué pieza negra no tiene quien la defienda?',
          'Mira la torre en c6.',
          'El caballo puede alcanzar c6 en un solo salto.',
          'El caballo salta en L: dos casillas y una. Desde e5, c6 es exactamente ese salto.',
          'Ce5×c6: el caballo salta en L y captura la torre; ninguna pieza la defendía.',
        ],
        showArrows: [['e5', 'c6', 'idea']],
        explain: 'El caballo se mueve en L y salta por encima de todo. Aquí atrapa una torre que nadie defendía: primero mira qué está sin defensa, luego encuentra el salto.',
        wrong: 'Ese salto es legal, pero deja la torre libre. Busca la L que llega a c6.',
      },
    ],
  },
  {
    id: 'hanging-queen',
    level: 3,
    concept: 'hanging-piece',
    title: 'Una pieza sin defensor',
    subtitle: 'Material gratis',
    intro: 'Antes de mover, busca piezas rivales sin quien las proteja. Una pieza sin defensor en tu línea es material regalado.',
    steps: [
      {
        fen: '6k1/4q3/8/8/8/8/8/4R1K1 w - - 0 1',
        orientation: 'w', playerColor: 'w',
        observe: 'Tu torre y la dama negra comparten la columna e, que está abierta. ¿Quién defiende a la dama?',
        goal: 'Captura la dama negra.',
        expected: ['e1e7'],
        hints: [
          '¿Hay alguna pieza negra sin quien la proteja?',
          'Fíjate en la dama de e7.',
          'Tu torre y la dama están en la misma columna, y no hay nada entre ellas.',
          'Es una pieza colgada: la dama no tiene defensor en una columna abierta.',
          'T×e7: la torre baja por la columna abierta y captura la dama, que nadie defendía.',
        ],
        showArrows: [['e1', 'e7', 'idea']],
        explain: 'Una pieza sin defensor en una columna o fila abierta es material gratis. El hábito clave es preguntar “¿quién la defiende?” antes de mover.',
        wrong: 'Jugada legal, pero dejas escapar la dama. Vuelve a mirar la columna e.',
      },
    ],
  },
  {
    id: 'back-rank',
    level: 4,
    concept: 'back-rank',
    title: 'Mate de última fila',
    subtitle: 'El rey encerrado por sus peones',
    intro: 'Tras el enroque, los peones que protegen al rey también pueden encerrarlo. Si no tiene salida, una torre o dama da mate en su fila.',
    steps: [
      {
        fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
        orientation: 'w', playerColor: 'w',
        observe: 'Mira al rey negro en g8. Sus peones f7, g7 y h7 le tapan la huida. ¿Puede escapar de su última fila?',
        goal: 'Da mate en la última fila.',
        expected: ['a1a8'],
        mustMate: true,
        hints: [
          '¿Tiene el rey negro alguna casilla para escapar de la octava fila?',
          'Sus propios peones f7-g7-h7 le cierran la salida hacia delante.',
          'Tu torre tiene la columna a libre hasta la octava fila.',
          'Es un mate de última fila: jaque en la fila del rey, sin escape posible.',
          'Ta8#: la torre llega a la octava dando jaque; el rey no puede salir porque sus peones lo encierran.',
        ],
        showArrows: [['a1', 'a8', 'idea']],
        explain: 'El mate de última fila castiga al rey que sus propios peones han encerrado. Por eso, en tus partidas, a veces conviene abrir un respiradero para el rey.',
        wrong: 'Esa no da mate: o el rey conserva una casilla, o el jaque no llega a la octava fila.',
      },
    ],
  },
];

export function lessonsForLevel(level) { return LESSONS.filter(l => l.level === level); }
export function lessonById(id) { return LESSONS.find(l => l.id === id) || null; }
