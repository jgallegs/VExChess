// ============================================================
//  VEXCHESS · Motion — mejoras de movimiento con JS (progresivas).
//  Hoy: el "thumb" deslizante de los segmented (patrón tabs de
//  transitions.dev): una única superficie persigue a la pestaña
//  activa en vez de apagarse una y encenderse otra.
//  Si este script no corre, la UI queda exactamente como estaba
//  (el activo con su fondo elevado de ui.css): cero dependencias.
//  El chip de cuenta tiene su propia animación: aquí no se toca.
// ============================================================

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Contenedores de tabs conocidos → selector de su opción activa.
const TAB_SETS = [
  ['.cm-tabs', '.cm-tab.active'],
  ['.pf-seg', '.pf-seg-btn.active'],
];

function placeThumb(box, thumb, active) {
  if (!active) { thumb.style.width = '0px'; return; }
  // offsetLeft/Top relativos al box (position:relative): inmunes al
  // scroll horizontal del propio contenedor de pestañas.
  thumb.style.width = active.offsetWidth + 'px';
  thumb.style.height = active.offsetHeight + 'px';
  thumb.style.transform = 'translate(' + active.offsetLeft + 'px,' + active.offsetTop + 'px)';
}

function wireTabs(box, activeSel) {
  if (box.dataset.vxThumb) return;      // ya cableado
  box.dataset.vxThumb = '1';
  box.classList.add('has-tab-thumb');
  const thumb = document.createElement('span');
  thumb.className = 'vx-tab-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  box.prepend(thumb);

  const sync = () => placeThumb(box, thumb, box.querySelector(activeSel));
  // primer posicionamiento sin transición (que no "vuele" desde la esquina)
  thumb.style.transition = 'none';
  sync();
  requestAnimationFrame(() => { thumb.style.transition = ''; });

  // la clase .active la mueve el código de cada página: seguimos el cambio
  new MutationObserver(sync).observe(box, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.addEventListener('resize', sync);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync).catch(() => {});
}

function scan(root) {
  if (!root.querySelectorAll) return;
  for (const [boxSel, activeSel] of TAB_SETS) {
    root.querySelectorAll(boxSel).forEach(b => wireTabs(b, activeSel));
  }
}

if (!REDUCED && typeof document !== 'undefined') {
  const boot = () => {
    scan(document);
    // Las páginas montan su UI tras cargar datos: vigilamos nodos nuevos.
    new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          for (const [boxSel, activeSel] of TAB_SETS) {
            if (n.matches && n.matches(boxSel)) wireTabs(n, activeSel);
          }
          scan(n);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
