// ============================================================
//  VEXCHESS · Esqueletos de carga (skeleton screens).
//  Sustituyen al spinner en las cargas de PANTALLA: cajas con la
//  silueta del contenido real y un barrido de luz sutil (se apaga
//  con prefers-reduced-motion). Estilos en ui.css (.vx-sk*).
//  Cada página compone aquí su silueta para que la carga ya
//  "enseñe" el layout que viene.
// ============================================================
import { t } from './i18n.js?v=9';

const b = (cls, style) => '<span class="vx-sk' + (cls ? ' ' + cls : '') + '"' + (style ? ' style="' + style + '"' : '') + '></span>';
const line = (w, h) => b('', 'width:' + w + ';height:' + (h || '0.8rem'));
const box = (h, style) => b('', 'height:' + h + (style ? ';' + style : ''));
const circle = (d) => b('r-full', 'flex:0 0 auto;width:' + d + ';height:' + d);
const row = (inner, style) => '<div class="vx-sk-row"' + (style ? ' style="' + style + '"' : '') + '>' + inner + '</div>';
const col = (inner, style) => '<div class="vx-sk-col"' + (style ? ' style="' + style + '"' : '') + '>' + inner + '</div>';
const grid = (cols, inner, minCol) => '<div class="vx-sk-grid" style="grid-template-columns:repeat(' + cols + ',minmax(' + (minCol || '0') + ',1fr))">' + inner + '</div>';
const rep = (n, html) => Array.from({ length: n }, () => html).join('');

// contenedor: anuncia "cargando" a lectores; lo visual va aria-hidden
function wrap(inner, maxW) {
  return '<div class="vx-sk-page" style="max-width:' + (maxW || '70rem') + '" role="status" aria-label="' + t('common.loading') + '">' +
    '<div aria-hidden="true" class="vx-sk-stack">' + inner + '</div></div>';
}

// cabecera de página: eyebrow + título + subtítulo
const header = () => col(line('6.5rem', '0.65rem') + line('17rem', '1.7rem') + line('24rem', '0.75rem'), 'gap:0.6rem');
// fila de un listado: avatar + dos líneas + valor
const listRow = () => row(circle('2.6rem') + col(line('9rem') + line('13rem', '0.6rem')) + line('3.2rem', '1.1rem'));

// ---------- composiciones por pantalla ----------
export function skProfile() {
  return wrap(
    row(circle('5.2rem') + col(line('11rem', '1.4rem') + line('16rem', '0.7rem')), 'gap:1.1rem') +
    grid(4, rep(4, box('4.6rem')), '7rem') +
    box('16rem') + box('10rem'), '62rem');
}
export function skOnline() {
  return wrap(
    col(line('6.5rem', '0.65rem') + line('15rem', '1.7rem'), 'gap:0.6rem') +
    row(rep(3, box('9.4rem', 'flex:1 1 0;min-width:0')), 'gap:0.75rem') +
    box('9.5rem') +
    grid(2, rep(2, box('13rem')), '14rem'), '64rem');
}
export function skGame() {
  return wrap(
    row(circle('2.8rem') + col(line('8rem') + line('5rem', '0.6rem'))) +
    box('min(78vw, 30rem)', 'width:min(78vw, 30rem);aspect-ratio:1/1;height:auto;margin:0 auto') +
    row(circle('2.8rem') + col(line('8rem') + line('5rem', '0.6rem'))), '34rem');
}
export function skAdmin() {
  return wrap(
    header() +
    grid(4, rep(4, box('5rem')), '8rem') +
    rep(6, listRow()), '70rem');
}
export function skAcademy() {
  return wrap(header() + box('8rem') + grid(3, rep(6, box('9rem')), '12rem'), '68rem');
}
export function skCommunity() {
  return wrap(header() + line('20rem', '2.4rem') + rep(7, listRow()), '58rem');
}
export function skVexborn() {
  return wrap(box('15rem') + grid(4, rep(8, box('12rem')), '9rem'), '68rem');
}
export function skBadges() {
  return wrap(header() + grid(4, rep(8, box('8.5rem')), '10rem'), '64rem');
}
