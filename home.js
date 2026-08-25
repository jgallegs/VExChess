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

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target); // una sola vez: no reaparece al subir
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  items.forEach(el => io.observe(el));
})();
