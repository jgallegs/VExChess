// ============================================================
//  VEXCHESS · Home — comportamiento de la portada.
//  · Tablero decorativo del hero (fichas Staunty, solo visual).
//  · Aparición al entrar en pantalla de los bloques [data-reveal].
//  · Año del footer.
//  Todo es progresivo: si algo falla, la home sigue siendo legible.
// ============================================================

// ---------- Año del footer ----------
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// ---------- Tablero del hero ----------
// Posición inicial con las fichas del set Staunty. Es decorativo:
// no hay reglas ni interacción, solo el tablero de la marca.
(function heroBoard() {
  const el = document.getElementById('hero-board');
  if (!el) return;
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const piece = (color, type) =>
    '<svg class="hpc" viewBox="0 0 40 40"><use href="assets/pieces/staunty.svg#' + color + type + '"></use></svg>';
  let html = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      let p = '';
      if (r === 0) p = piece('b', back[c]);
      else if (r === 1) p = piece('b', 'p');
      else if (r === 6) p = piece('w', 'p');
      else if (r === 7) p = piece('w', back[c]);
      html += '<div class="hsq ' + ((r + c) % 2 ? 'd' : 'l') + '">' + p + '</div>';
    }
  }
  el.innerHTML = html;
})();

// ---------- Aparición al hacer scroll ----------
// Con reduce-motion (o sin IntersectionObserver) todo se muestra ya.
(function reveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || typeof IntersectionObserver === 'undefined') {
    items.forEach(el => el.classList.add('in'));
    return;
  }

  // Dentro de una rejilla (.bento, .next-grid) las tarjetas que entran EN LA
  // MISMA tanda del observer se escalonan con un delay inline temporal (un
  // transition-delay permanente en CSS retrasaría también su hover). El
  // delay se limpia al acabar para no dejar rastro.
  const io = new IntersectionObserver((entries) => {
    const batch = entries.filter(e => e.isIntersecting).map(e => e.target);
    const perGrid = new Map(); // grid -> nº de tarjetas ya asignadas en esta tanda
    for (const el of batch) {
      const grid = el.closest('.bento, .next-grid');
      if (grid) {
        const i = perGrid.get(grid) || 0;
        perGrid.set(grid, i + 1);
        if (i > 0) {
          el.style.transitionDelay = (i * 70) + 'ms';
          setTimeout(() => { el.style.transitionDelay = ''; }, i * 70 + 700);
        }
      }
      el.classList.add('in');
      io.unobserve(el); // una sola vez: no reaparece al subir
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  items.forEach(el => io.observe(el));
})();
