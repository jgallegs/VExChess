// ============================================================
//  VEXCHESS · Catálogo de insignias (frontend) · v2
//  16 insignias. Textos canónicos del catálogo oficial.
//  Iconos en assets/badges/<id>.png. Ordenadas por prioridad.
// ============================================================
export const BADGE_CATALOG = {
  'creator': {
    name: 'Creador', color: '#FF3B47', family: 'Rol', priority: 100,
    desc: 'La persona que creó VEXCHESS.',
    howto: 'Insignia única y manual del creador del proyecto. No se concede por tener permisos de administrador. Permanente.',
  },
  'staff': {
    name: 'Equipo', color: '#3B82F6', family: 'Rol', priority: 90,
    desc: 'Estructura, protección y estabilidad: el equipo detrás de VEXCHESS.',
    howto: 'Vinculada al rol activo en staff, moderación, desarrollo o soporte. Se retira al dejar el equipo.',
  },
  'champion': {
    name: 'Campeón', color: '#E8EDF5', family: 'Competición', priority: 80,
    desc: 'Victoria en una competición oficial.',
    howto: 'Ganar un torneo, liga o evento oficial de VEXCHESS. Las victorias múltiples se cuentan en el detalle. Permanente.',
  },
  'first-move': {
    name: 'Primera Jugada', color: '#8B5CF6', family: 'Legado', priority: 70,
    desc: 'Aquí desde el primer movimiento de VEXCHESS.',
    howto: 'Cuentas creadas antes del lanzamiento público o durante los primeros 30 días. Permanente.',
  },
  'early-supporter': {
    name: 'Apoyo Inicial', color: '#FB7185', family: 'Legado', priority: 68,
    desc: 'Apostó por VEXCHESS cuando todavía era pequeño.',
    howto: 'Manual para colaboradores fundacionales, mecenas iniciales o compradores de una edición de fundador. No es una insignia de compra ordinaria. Permanente.',
  },
  'pioneer': {
    name: 'Pionero', color: '#22D3EE', family: 'Legado', priority: 60,
    desc: 'Probó el juego antes que el público y ayudó a abrir camino.',
    howto: 'Por participar de verdad en la beta cerrada (partidas o feedback), no solo por recibir la invitación. Permanente.',
  },
  'giant-slayer': {
    name: 'Matagigantes', color: '#F43F5E', family: 'Competición', priority: 58,
    desc: 'Una victoria improbable que invierte la jerarquía del tablero.',
    howto: 'Ganar una clasificada a un rival con al menos 400 puntos Elo más, o superar una IA máxima verificada. Se excluyen sandbagging y partidas no competitivas. Permanente salvo fraude.',
  },
  'veteran': {
    name: 'Veterano', color: '#EAB308', family: 'Legado', priority: 55,
    desc: 'Permanencia con participación real, no solo una cuenta antigua.',
    howto: 'Al menos un año desde el registro y un umbral de actividad significativa, por ejemplo 100 partidas completadas. Permanente.',
  },
  'mentor': {
    name: 'Mentor', color: '#14B8A6', family: 'Comunidad', priority: 50,
    desc: 'Guía a los jugadores nuevos hacia el progreso.',
    howto: 'Por revisión manual, por ayuda sostenida y constructiva a otros jugadores. Nunca por número de mensajes. Permanente.',
  },
  'tournament-host': {
    name: 'Organizador', color: '#F59E0B', family: 'Comunidad', priority: 48,
    desc: 'Convierte una idea en una competición real y cuidada.',
    howto: 'Manual tras organizar de principio a fin un torneo oficial o comunitario aprobado. Permanente.',
  },
  'builder': {
    name: 'Constructor', color: '#2DD4BF', family: 'Contribución', priority: 45,
    desc: 'Ayuda a construir la infraestructura, las herramientas o el producto.',
    howto: 'Manual por código, integraciones, herramientas, documentación técnica o infraestructura aceptada con impacto real. Permanente.',
  },
  'translator': {
    name: 'Traductor', color: '#0EA5E9', family: 'Contribución', priority: 44,
    desc: 'Hace que la misma partida se entienda en distintas lenguas.',
    howto: 'Manual por una aportación sustancial y aceptada a una localización. Una errata aislada recibe crédito, pero no la insignia. Permanente.',
  },
  'puzzle-author': {
    name: 'Compositor', color: '#A855F7', family: 'Contribución', priority: 43,
    desc: 'Crea posiciones que hacen pensar.',
    howto: 'Publicar una colección destacada o alcanzar, por ejemplo, 5 problemas aceptados mediante curación. Un envío sin revisar no cuenta. Permanente.',
  },
  'bug-hunter': {
    name: 'Cazador de errores', color: '#84CC16', family: 'Contribución', priority: 40,
    desc: 'Precisión a distancia: encontró un fallo real.',
    howto: 'El equipo valida un reporte reproducible y con impacto real. Duplicados, spam u opiniones visuales no cuentan. Permanente.',
  },
  'fair-play': {
    name: 'Juego Limpio', color: '#FBBF24', family: 'Comunidad', priority: 35,
    desc: 'Rivalidad como respeto entre iguales: conducta fiable.',
    howto: 'Muestra relevante de clasificatorias, buen historial de deportividad y sin sanciones verificadas. Revocable ante una sanción grave; recuperable por política pública.',
  },
  'tactician': {
    name: 'Táctico', color: '#EC4899', family: 'Competición', priority: 30,
    desc: 'Maestro del fork: cálculo táctico afilado.',
    howto: 'Por ejemplo, resolver 100 ejercicios tácticos con al menos un 85 % de acierto. Permanente salvo fraude.',
  },
};

export function badgeMeta(id) {
  return BADGE_CATALOG[id] || { name: id, color: '#8b97a9', desc: '', howto: '', family: '', priority: 0 };
}
export function badgeIcon(id, cls) {
  return '<img class="vx-badge-ico' + (cls ? ' ' + cls : '') + '" src="assets/badges/' + id + '.png" alt="" loading="lazy">';
}
