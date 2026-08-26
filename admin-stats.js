// ============================================================
//  VEXCHESS · Panel de administración — pantalla de Analíticas.
//  Todo son datos REALES de D1 (endpoint /api/admin/analytics):
//  nada estimado, nada inventado. Gráficas SVG hechas a mano,
//  sin dependencias, siguiendo la guía de dataviz de la casa:
//  · un solo hue de datos (#3E8EE8), marcas finas, rejilla hairline;
//  · área al 10% de opacidad, línea de 2px, marcador con aro de superficie;
//  · escala de estado (verde/gris/rojo) SOLO para victoria/tablas/derrota,
//    con el gris neutro siempre en medio (verde↔rojo colapsan bajo CVD)
//    y cada tramo con etiqueta + cifra visibles;
//  · tooltip + crosshair con soporte de teclado, y vista de tabla gemela;
//  · el mapa: silueta del mundo en puntos (generada en build) con
//    marcadores por país y su top debajo — mismos datos, dos lecturas.
// ============================================================
import { t, getLang } from './i18n.js';
import { MAP_COLS, MAP_ROWS, MAP_DOTS, MAP_CENTROIDS } from './world-map.js';

const HUE = '#3E8EE8';                      // único hue de datos
const ST = { win: '#2CA95D', draw: '#9aa6b5', loss: '#F2545E' };
const SURFACE = '#202938';                  // var(--panel): aros y huecos de superficie

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = () => new Intl.NumberFormat(getLang());
const fmtN = (n) => nf().format(n || 0);

// ---------- series diarias: huecos a 0 y recorte por rango ----------
function seriesDays(rows, days) {
  const by = new Map((rows || []).map(r => [r.d, r.n]));
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(now.getTime() - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    out.push({ d: key, n: by.get(key) || 0 });
  }
  return out;
}
const fmtDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(getLang(), { day: 'numeric', month: 'short' });

// techo "limpio" para el eje Y — mantisas finas para no dejar media
// gráfica vacía (55 → 60, no 100), siempre divisible en 4 tramos
function niceMax(v) {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// ---------- gráfica de área (una serie) ----------
// SVG con rejilla hairline + capa de hover (crosshair, marcador con aro
// de superficie y tooltip HTML). Teclado: flechas mueven el punto activo.
export function areaChart(points, opts) {
  // compact: viewBox estrecho para móvil — con 720 escalado a ~360px los
  // textos de los ejes quedaban ilegibles (anti-patrón de la guía)
  const W = opts.compact ? 400 : 720, H = 230, L = 44, R = 10, T = 12, B = 26;
  const max = niceMax(Math.max(1, ...points.map(p => p.n)));
  const iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (points.length === 1 ? iw / 2 : i * iw / (points.length - 1));
  const y = (v) => T + ih - v * ih / max;
  const line = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.n).toFixed(1)).join('');
  const area = line + 'L' + x(points.length - 1).toFixed(1) + ' ' + (T + ih) + 'L' + L + ' ' + (T + ih) + 'Z';
  let grid = '', ticks = '';
  for (let g = 0; g <= 4; g++) {
    const v = max * g / 4, gy = y(v);
    grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/>';
    ticks += '<text x="' + (L - 7) + '" y="' + (gy + 3.5) + '" text-anchor="end">' + fmtN(v) + '</text>';
  }
  let xt = '';
  const step = Math.max(1, Math.round(points.length / (opts.compact ? 4 : 6)));
  for (let i = 0; i < points.length; i += step) {
    xt += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + fmtDay(points[i].d) + '</text>';
  }
  const id = 'ac' + Math.random().toString(36).slice(2, 7);
  const html =
    '<div class="ast-chart" data-chart="' + id + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label) + '" tabindex="0">' +
        '<g class="ast-grid">' + grid + '</g>' +
        '<g class="ast-ticks">' + ticks + xt + '</g>' +
        '<path class="ast-area" d="' + area + '"/>' +
        '<path class="ast-line" d="' + line + '"/>' +
        '<g class="ast-hover" hidden><line y1="' + T + '" y2="' + (T + ih) + '"/><circle r="5"/></g>' +
      '</svg>' +
      '<div class="ast-tip" hidden></div>' +
    '</div>';
  return { html, wire(container) {
    const box = container.querySelector('[data-chart="' + id + '"]');
    const svg = box.querySelector('svg'), tip = box.querySelector('.ast-tip');
    const hov = svg.querySelector('.ast-hover');
    const lineEl = hov.querySelector('line'), dot = hov.querySelector('circle');
    let idx = -1;
    const show = (i) => {
      idx = Math.max(0, Math.min(points.length - 1, i));
      const p = points[idx], px = x(idx), py = y(p.n);
      hov.hidden = false;
      lineEl.setAttribute('x1', px); lineEl.setAttribute('x2', px);
      dot.setAttribute('cx', px); dot.setAttribute('cy', py);
      tip.hidden = false;
      tip.innerHTML = '<b>' + fmtN(p.n) + '</b> ' + esc(opts.unit) + '<span>' + esc(fmtDay(p.d)) + '</span>';
      const bw = box.clientWidth, fx = px / W * bw;
      tip.style.left = Math.max(4, Math.min(bw - tip.offsetWidth - 4, fx - tip.offsetWidth / 2)) + 'px';
      tip.style.top = (py / H * box.clientHeight - tip.offsetHeight - 10) + 'px';
    };
    const hide = () => { hov.hidden = true; tip.hidden = true; idx = -1; };
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      show(Math.round((e.clientX - r.left) / r.width * W > L ? ((e.clientX - r.left) / r.width * W - L) / iw * (points.length - 1) : 0));
    });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { show(idx < 0 ? points.length - 1 : idx + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { show(idx < 0 ? points.length - 1 : idx - 1); e.preventDefault(); }
      else if (e.key === 'Escape') hide();
    });
    svg.addEventListener('blur', hide);
  } };
}

// ---------- histograma de columnas (Elo) ----------
export function columnChart(buckets, opts) {
  // viewBox pensado para tarjetas a MITAD de ancho: con 720 el texto
  // encogía al escalar; 440 mantiene la letra legible.
  const W = 440, H = 210, L = 40, R = 8, T = 12, B = 26;
  const max = niceMax(Math.max(1, ...buckets.map(b => b.n)));
  const iw = W - L - R, ih = H - T - B;
  const bw = Math.min(24, iw / buckets.length - 4);
  const x = (i) => L + (i + 0.5) * iw / buckets.length;
  const y = (v) => T + ih - v * ih / max;
  let grid = '', ticks = '';
  for (let g = 0; g <= 4; g++) {
    const gy = y(max * g / 4);
    grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/>';
    ticks += '<text x="' + (L - 7) + '" y="' + (gy + 3.5) + '" text-anchor="end">' + fmtN(max * g / 4) + '</text>';
  }
  let cols = '', xt = '';
  buckets.forEach((b, i) => {
    const h = Math.max(b.n > 0 ? 3 : 0, ih * b.n / max);
    cols += '<path class="ast-col" data-i="' + i + '" d="' + roundedCol(x(i) - bw / 2, T + ih - h, bw, h) + '"><title>' + esc(b.label) + ': ' + fmtN(b.n) + ' ' + esc(opts.unit) + '</title></path>';
    if (i % Math.ceil(buckets.length / 7) === 0) xt += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(b.label) + '</text>';
  });
  return '<div class="ast-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label) + '">' +
    '<g class="ast-grid">' + grid + '</g><g class="ast-ticks">' + ticks + xt + '</g>' + cols + '</svg></div>';
}
// columna con la punta redondeada (4px) y base cuadrada
function roundedCol(x, y, w, h) {
  if (h <= 0) return 'M0 0';
  const r = Math.min(4, w / 2, h);
  return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
    'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
}

// ---------- sparkline (12 puntos, para los KPI) ----------
export function sparkline(points) {
  const W = 96, H = 28, P = 3;
  const max = Math.max(1, ...points);
  const x = (i) => P + i * (W - 2 * P) / (points.length - 1);
  const y = (v) => H - P - v * (H - 2 * P) / max;
  const d = points.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
  const lx = x(points.length - 1).toFixed(1), ly = y(points[points.length - 1]).toFixed(1);
  return '<svg class="ast-spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
    '<path d="' + d + '"/><circle cx="' + lx + '" cy="' + ly + '" r="3"/></svg>';
}

// ---------- barra apilada de resultados (estado, no categórica) ----------
export function outcomesBar(rows) {
  const get = (k) => { const r = (rows || []).find(o => o.outcome === k); return r ? r.n : 0; };
  const win = get('win'), draw = get('draw'), loss = get('loss');
  const total = win + draw + loss;
  // orden fijo: victoria | tablas | derrota — el gris neutro separa verde y
  // rojo, que bajo deuteranopia son casi idénticos (ΔE 1.7 medido).
  const segs = [
    { k: 'win', n: win, c: ST.win, label: t('admin.st.win') },
    { k: 'draw', n: draw, c: ST.draw, label: t('admin.st.draw') },
    { k: 'loss', n: loss, c: ST.loss, label: t('admin.st.loss') },
  ];
  let bar = '';
  if (total > 0) {
    bar = '<div class="ast-stack" role="img" aria-label="' + esc(t('admin.st.outcomes')) + '">' +
      segs.filter(s => s.n > 0).map(s =>
        '<i style="flex-grow:' + s.n + ';background:' + s.c + '" title="' + esc(s.label) + ': ' + fmtN(s.n) + '"></i>').join('') +
      '</div>';
  } else {
    bar = '<p class="ast-empty">' + esc(t('admin.st.empty')) + '</p>';
  }
  const legend = '<div class="ast-legend">' + segs.map(s =>
    '<span class="ast-leg"><i style="background:' + s.c + '"></i>' + esc(s.label) +
    ' <b>' + fmtN(s.n) + '</b><em>' + (total ? Math.round(s.n * 100 / total) + '%' : '—') + '</em></span>').join('') + '</div>';
  return bar + legend;
}

// ---------- lista con barras (países, ritmos, navegadores…) ----------
export function barList(items, opts) {
  if (!items.length) return '<p class="ast-empty">' + esc(t('admin.st.empty')) + '</p>';
  const max = Math.max(...items.map(i => i.n), 1);
  return '<div class="ast-list">' + items.map(it =>
    '<div class="ast-row">' +
      '<span class="ast-row-l">' + (it.icon || '') + esc(it.label) + '</span>' +
      '<span class="ast-row-bar"><i style="width:' + Math.max(2, it.n * 100 / max) + '%"></i></span>' +
      '<b class="ast-row-v">' + fmtN(it.n) + '</b>' +
    '</div>').join('') + '</div>';
}

// ---------- mapa-mundi de puntos ----------
const flagEmoji = (cc) => cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1A5 + c.charCodeAt(0))) : '';
function countryName(cc) {
  try { return new Intl.DisplayNames([getLang()], { type: 'region' }).of(cc) || cc; } catch (e) { return cc; }
}
export function worldMap(countries) {
  const dots = MAP_DOTS.split(';').map(p => p.split(','));
  let bg = '';
  for (const [c, r] of dots) bg += '<circle cx="' + (+c + 0.5) + '" cy="' + (+r + 0.5) + '" r="0.42"/>';
  const max = Math.max(1, ...countries.map(c => c.n));
  let marks = '';
  for (const { c, n } of countries) {
    const pos = MAP_CENTROIDS[c];
    if (!pos) continue;
    const r = 1.15 + 1.5 * Math.sqrt(n / max);
    marks += '<g class="ast-mk" tabindex="0" aria-label="' + esc(countryName(c)) + ': ' + fmtN(n) + '">' +
      '<circle class="ast-mk-halo" cx="' + pos[0] + '" cy="' + pos[1] + '" r="' + (r + 0.9) + '"/>' +
      '<circle class="ast-mk-dot" cx="' + pos[0] + '" cy="' + pos[1] + '" r="' + r + '"/>' +
      '<title>' + esc(countryName(c)) + ' · ' + fmtN(n) + '</title></g>';
  }
  return '<svg class="ast-map" viewBox="0 0 ' + MAP_COLS + ' ' + MAP_ROWS + '" role="img" aria-label="' + esc(t('admin.st.map')) + '">' +
    '<g class="ast-map-dots">' + bg + '</g>' + marks + '</svg>';
}
export function countryList(countries, limit) {
  return barList(countries.slice(0, limit || 8).map(({ c, n }) => ({
    label: countryName(c), n, icon: '<em class="ast-flag">' + flagEmoji(c) + '</em>',
  })));
}

// ---------- tabla gemela (accesibilidad: los valores sin el chart) ----------
export function tableTwin(points, unit) {
  return '<table class="ast-table"><thead><tr><th>' + esc(t('admin.st.date')) + '</th><th>' + esc(unit) + '</th></tr></thead><tbody>' +
    points.map(p => '<tr><td>' + esc(fmtDay(p.d)) + '</td><td>' + fmtN(p.n) + '</td></tr>').join('') +
    '</tbody></table>';
}
export function tableTwinLabeled(rows, head, unit) {
  return '<table class="ast-table"><thead><tr><th>' + esc(head) + '</th><th>' + esc(unit) + '</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td>' + esc(r.label) + '</td><td>' + fmtN(r.n) + '</td></tr>').join('') +
    '</tbody></table>';
}

export { seriesDays, fmtN, HUE, ST };
