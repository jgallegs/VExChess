// ============================================================
//  VEXCHESS · Catálogo de Vexborn (personajes cosméticos)
//  Los Vexborn NO afectan a reglas, Elo, emparejamiento ni IA.
//  Assets en assets/vexborn/<key>/ (splash, card, banner, avatares).
// ============================================================

// Rarezas (solo presentación, nunca jugabilidad).
export const RARITY = {
  origin:        { label: 'Originario',  color: '#F6C453', order: 3 },
  mythic:        { label: 'Mítico',      color: '#914FE8', order: 2 },
  distinguished: { label: 'Distinguido', color: '#21CCE5', order: 1 },
  legacy:        { label: 'Legado',      color: '#FF3B47', order: 4 },
};
export function rarityMeta(r) { return RARITY[r] || RARITY.distinguished; }

// Colecciones.
export const COLLECTIONS = {
  origins:     { label: 'Vexborn Origins', desc: 'Los primeros seres que despertaron sobre el tablero.' },
  expansion01: { label: 'Expansión 01',    desc: 'Nuevos Vexborn nacidos de tácticas y leyendas.' },
};

// key: usado en rutas de assets y como avatar equipado (avatar = 'vexborn:<key>').
export const VEXBORN = [
  // ---------------- ORIGINS (los 8 avatares originales) ----------------
  {
    key: 'kael', name: 'Kael', title: 'El Primer Movimiento', collection: 'origins', rarity: 'origin',
    piece: 'Caballo', archetype: 'Iniciativa', color: 'Rojo VEX', avatarSrc: 'vex-knight',
    quote: 'El tablero no despierta hasta que alguien se atreve a mover.',
    desc: 'Kael fue la primera pieza que abandonó su casilla cuando el tablero aún estaba vacío. No sirve a ningún jinete: es el impulso que convierte una posición inmóvil en una partida. La estrella de su pecho se enciende cada vez que alguien toma la iniciativa sin conocer todavía el resultado.',
    personality: 'Valiente, directo, inquieto y contagiosamente competitivo.',
  },
  {
    key: 'aurelia', name: 'Aurelia', title: 'La Corona Silente', collection: 'origins', rarity: 'origin',
    piece: 'Reina', archetype: 'Cálculo', color: 'Marfil y oro', avatarSrc: 'ivory-queen',
    quote: 'La jugada más fuerte no necesita ser anunciada.',
    desc: 'Aurelia contempla el tablero con los ojos cerrados porque afirma que las piezas revelan más cuando no se las mira. Sus fragmentos dorados orbitan cada posibilidad y se detienen únicamente cuando existe una secuencia perfecta. Nunca celebra un jaque mate; para ella, la partida terminó mucho antes.',
    personality: 'Serena, elegante, exigente y absolutamente segura.',
  },
  {
    key: 'bastion', name: 'Bastion', title: 'El Último Muro', collection: 'origins', rarity: 'origin',
    piece: 'Torre', archetype: 'Defensa conectada', color: 'Cobalto', avatarSrc: 'cobalt-rook',
    quote: 'Mientras una línea permanezca unida, nadie está solo.',
    desc: 'Bastion despertó como una torre aislada, pero descubrió que podía enlazar sus nodos con cada fortaleza del tablero. Sus barreras no protegen únicamente casillas: crean rutas seguras entre aliados. Cuando todas las defensas caen, su red mantiene encendida la última línea.',
    personality: 'Leal, técnico, protector y algo demasiado literal.',
  },
  {
    key: 'nyra', name: 'Nyra', title: 'La Diagonal Velada', collection: 'origins', rarity: 'origin',
    piece: 'Alfil', archetype: 'Infiltración', color: 'Violeta', avatarSrc: 'violet-bishop',
    quote: 'Nunca estuve delante de ti. Estuve en el ángulo que olvidaste.',
    desc: 'Nyra camina por una diagonal situada entre el tablero visible y su reflejo. La abertura luminosa de su máscara le permite cruzar ambas superficies y aparecer donde una línea parecía bloqueada. Nadie conoce su rostro, quizá porque debajo de la máscara solamente exista otra diagonal.',
    personality: 'Reservada, precisa, irónica y difícil de sorprender.',
  },
  {
    key: 'pip', name: 'Pip', title: 'La Primera Casilla', collection: 'origins', rarity: 'origin',
    piece: 'Peón', archetype: 'Descubrimiento', color: 'Cian', avatarSrc: 'teal-pawn',
    quote: 'Todo el tablero cabe delante de una primera casilla.',
    desc: 'Pip todavía no ha alcanzado la última fila y no tiene prisa por hacerlo. Quiere conocer cada casilla, cada rival y cada forma posible de avanzar. Su pequeña estrella aparece cuando encuentra una ruta nueva; por eso suele ser el primero en entrar en lugares que las piezas importantes consideran insignificantes.',
    personality: 'Curioso, optimista, perseverante y más valiente de lo que cree.',
  },
  {
    key: 'ordan', name: 'Ordan', title: 'El Rey Eterno', collection: 'origins', rarity: 'origin',
    piece: 'Rey', archetype: 'Supervivencia', color: 'Oro', avatarSrc: 'golden-king',
    quote: 'La eternidad consiste en encontrar una casilla más.',
    desc: 'Ordan recuerda finales jugados antes de que existieran los relojes. Las constelaciones de su corona representan jaques de los que consiguió escapar, no victorias. Su poder no procede de conquistar el tablero, sino de comprender que incluso un rey debe inclinarse ante la posición correcta.',
    personality: 'Sabio, severo, paciente y protector con los jugadores nuevos.',
  },
  {
    key: 'noctis', name: 'Noctis', title: 'La Horquilla Negra', collection: 'origins', rarity: 'origin',
    piece: 'Caballo', archetype: 'Táctica doble', color: 'Grafito y cian', avatarSrc: 'shadow-knight',
    quote: 'Si puedes verme, ya estás defendiendo la pieza equivocada.',
    desc: 'Noctis no atraviesa la oscuridad: la divide. Cada salto deja dos sombras atacando objetivos diferentes, mientras su verdadero cuerpo permanece en la única casilla que nadie vigilaba. Su ojo cian calcula el instante exacto en que una amenaza se convierte en dos.',
    personality: 'Silencioso, astuto, independiente y ferozmente preciso.',
  },
  {
    key: 'eira-vhal', name: 'Eira & Vhal', title: 'Rivales del Nexo', collection: 'origins', rarity: 'mythic',
    piece: 'Caballos', archetype: 'Rivalidad', color: 'Marfil y cobalto', avatarSrc: 'rival-duo',
    quote: 'No corremos para derrotarnos. Corremos para descubrir quién seremos al llegar.',
    desc: 'Eira nació de la luz del tablero y Vhal de la tormenta que apareció en su reflejo. Ambos persiguen el mismo nexo dorado siguiendo caminos opuestos. Han empatado tantas veces que su rivalidad se convirtió en amistad, aunque ninguno de los dos aceptaría pronunciar esa palabra delante del otro.',
    personality: 'Eira es disciplinada y serena; Vhal, impulsivo y orgulloso. Juntos son inseparables.',
  },

  // ---------------- EXPANSIÓN 01 (8 personajes nuevos) ----------------
  {
    key: 'rhazek', name: 'Rhazek', title: 'El Gambito Carmesí', collection: 'expansion01', rarity: 'distinguished',
    piece: 'Caballo', archetype: 'Atacante / sacrificio', color: 'Rojo táctico', avatarSrc: 'rhazek',
    quote: 'Una pieza es un precio pequeño por todo el tablero.',
    desc: 'Rhazek jamás busca una casilla segura. Nació de la primera pieza sacrificada voluntariamente y aprendió que una derrota aparente puede abrir el único camino hacia la victoria. Su armadura conserva la marca de cada gambito que nadie se atrevió a aceptar.',
    personality: 'Audaz, provocador, brillante y peligrosamente impaciente.',
  },
  {
    key: 'oryn', name: 'Oryn', title: 'Guardián de la Última Columna', collection: 'expansion01', rarity: 'distinguished',
    piece: 'Torre', archetype: 'Archivista / control', color: 'Marfil y cobalto', avatarSrc: 'oryn',
    quote: 'Toda partida deja una verdad en la última columna.',
    desc: 'Oryn custodia el archivo de las partidas olvidadas. Sus cintas contienen posiciones que ya no existen y sus torres almacenan decisiones que ningún jugador recuerda haber tomado. Cuando una columna queda abierta, él es quien decide si conduce a la victoria o al vacío.',
    personality: 'Solemne, paciente, imparcial y obsesionado con conservar cada jugada.',
  },
  {
    key: 'vesra', name: 'Vesra', title: 'Reina del Zugzwang', collection: 'expansion01', rarity: 'mythic',
    piece: 'Reina', archetype: 'Control / manipulación', color: 'Violeta', avatarSrc: 'vesra',
    quote: 'Puedes elegir cualquier movimiento. Todos me pertenecen.',
    desc: 'Vesra no inmoviliza a sus enemigos: les concede posibilidades. Cada alternativa forma parte de una red calculada mucho antes de que comience la partida. Sus manos espectrales no mueven piezas; retiran las salidas que nunca fueron reales.',
    personality: 'Serena, majestuosa, cerebral e inquietantemente cortés.',
  },
  {
    key: 'brakkon', name: 'Brakkon', title: 'La Fortaleza Viviente', collection: 'expansion01', rarity: 'distinguished',
    piece: 'Torre', archetype: 'Guardián / resistencia', color: 'Cobalto', avatarSrc: 'brakkon',
    quote: 'Que avance todo el reino. Yo seguiré aquí.',
    desc: 'Brakkon no habita una fortaleza: él es la fortaleza. Despertó cuando un reino entero se refugió tras la última torre que quedaba en pie. Cada impacto añade una piedra nueva a sus murallas y cada aliado protegido alimenta el núcleo que arde bajo sus almenas.',
    personality: 'Protector, silencioso, leal y absolutamente inamovible.',
  },
  {
    key: 'ilyra', name: 'Ilyra', title: 'Alfil de Cristal', collection: 'expansion01', rarity: 'mythic',
    piece: 'Alfil', archetype: 'Precisión / refracción', color: 'Cian y marfil', avatarSrc: 'ilyra',
    quote: 'Una diagonal basta cuando la luz encuentra el ángulo correcto.',
    desc: 'Ilyra contempla el tablero como una estructura de luz. Puede atravesar largas diagonales, dividir una amenaza en reflejos inofensivos y descubrir líneas invisibles para los demás. Cada grieta de su cuerpo conserva el recuerdo de un cálculo perfecto.',
    personality: 'Precisa, distante, curiosa y sorprendentemente compasiva.',
  },
  {
    key: 'tikk', name: 'Tikk', title: 'El Corredor del Reloj', collection: 'expansion01', rarity: 'distinguished',
    piece: 'Peón', archetype: 'Velocidad / ingenio', color: 'Cian', avatarSrc: 'tikk',
    quote: 'No necesito más tiempo. Solo necesito tu último segundo.',
    desc: 'Tikk fue construido para pulsar un reloj, pero decidió correr antes de que nadie pudiera darle cuerda. Cruza posiciones congeladas, roba instantes perdidos y siempre llega a la octava fila una fracción antes de lo imposible. Nadie sabe si el enorme reloj de su espalda está roto o simplemente va por delante.',
    personality: 'Travieso, rápido, optimista y ferozmente competitivo.',
  },
  {
    key: 'malrec', name: 'Malrec', title: 'El Rey sin Corona', collection: 'expansion01', rarity: 'mythic',
    piece: 'Rey', archetype: 'Supervivencia / exilio', color: 'Grafito y oro', avatarSrc: 'malrec',
    quote: 'Un reino puede caer. El rey todavía debe mover.',
    desc: 'Malrec perdió su ejército, su trono y hasta el derecho a portar una corona completa. Solo conservó un peón marfil y la obligación de mantenerlo con vida. Las cadenas que arrastra están formadas por las casillas de su antiguo reino; cada una recuerda una retirada que se negó a llamar derrota.',
    personality: 'Austero, melancólico, estratégico y mucho más peligroso de lo que aparenta.',
  },
  {
    key: 'solenne', name: 'Solenne', title: 'El Octavo Paso', collection: 'expansion01', rarity: 'distinguished',
    piece: 'Peón ascendido a reina', archetype: 'Progreso / superación', color: 'Oro y marfil', avatarSrc: 'solenne',
    quote: 'No nací con una corona. Crucé el tablero para ganármela.',
    desc: 'Solenne comenzó como la pieza más pequeña de una fila anónima. Avanzó una casilla cada vez, sobrevivió a siete líneas imposibles y alcanzó el extremo opuesto sin olvidar de dónde venía. Su transformación nunca termina: la base de peón permanece visible bajo una corona construida paso a paso.',
    personality: 'Determinada, humilde, inspiradora y resistente.',
  },
];

const BY_KEY = Object.fromEntries(VEXBORN.map(v => [v.key, v]));
export function vexbornByKey(key) { return BY_KEY[key] || null; }

// ¿Tiene arte disponible? Los Origins usan los avatares que ya están en el
// proyecto; los de la Expansión llegan cuando se añada su splash art.
export function vexbornAvailable(v) { return !!(v && v.avatarSrc); }
// Retrato del personaje (por ahora, su avatar de identidad).
export function vexbornPortrait(v) { return v && v.avatarSrc ? 'assets/social/avatars/' + v.avatarSrc + '.png' : null; }
// Avatar equipable (encaja con el sistema de avatares img:<nombre>).
export function vexbornAvatar(v) { return v && v.avatarSrc ? 'img:' + v.avatarSrc : null; }
// Splash cinematográfico (arte completo del personaje) para la ficha.
export function vexbornSplash(v) { return v ? 'assets/vexborn/splash/' + v.key + '.webp' : null; }
