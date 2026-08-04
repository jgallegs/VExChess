// ============================================================
//  VEXCHESS · Catálogo de insignias (frontend)
//  Iconos en assets/badges/<id>.png. Ampliable en el futuro.
// ============================================================
export const BADGE_CATALOG = {
  'creator':    { name: 'Creador',            color: '#FF3B47', desc: 'El creador de VEXCHESS.',
                  howto: 'Insignia única del creador del proyecto. No se concede por tener permisos de administrador.' },
  'staff':      { name: 'Equipo',             color: '#3B82F6', desc: 'Miembro del equipo de VEXCHESS.',
                  howto: 'Se mantiene mientras se pertenezca activamente al equipo.' },
  'first-move': { name: 'Primera Jugada',     color: '#8B5CF6', desc: 'Aquí desde el primer movimiento.',
                  howto: 'Cuentas creadas antes del lanzamiento o en sus primeros 30 días. Permanente.' },
  'pioneer':    { name: 'Pionero',            color: '#22D3EE', desc: 'Abrió camino en la beta.',
                  howto: 'Para quienes participaron de verdad en la beta.' },
  'champion':   { name: 'Campeón',            color: '#E8EDF5', desc: 'Ganador de torneos o eventos oficiales.',
                  howto: 'Se concede al ganar un torneo o evento oficial. Varias victorias se recogen en el detalle.' },
  'tactician':  { name: 'Táctico',            color: '#EC4899', desc: 'Maestro del cálculo táctico.',
                  howto: 'Por ejemplo, resolviendo 100 ejercicios con un 85 % de acierto.' },
  'bug-hunter': { name: 'Cazador de errores', color: '#84CC16', desc: 'Encontró un fallo real y lo reportó.',
                  howto: 'Se concede manualmente por reportar un error reproducible que el equipo valide.' },
  'mentor':     { name: 'Mentor',             color: '#14B8A6', desc: 'Guía a los jugadores nuevos.',
                  howto: 'Se concede por revisión a quienes ayudan de forma constante a los novatos.' },
};

export function badgeMeta(id) {
  return BADGE_CATALOG[id] || { name: id, color: '#8b97a9', desc: '', howto: '' };
}
export function badgeIcon(id, cls) {
  return '<img class="vx-badge-ico' + (cls ? ' ' + cls : '') + '" src="assets/badges/' + id + '.png" alt="" loading="lazy">';
}
