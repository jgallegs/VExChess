// ============================================================
//  VEXCHESS · Tema del tablero (colores). Se recuerda en local.
//  Se incluye en todas las páginas para que el tablero sea
//  consistente; el selector solo aparece donde exista #theme-pop.
// ============================================================
export const THEMES = {
  madera: { light: '#f0d9b5', dark: '#b58863', name: 'Madera' },
  verde:  { light: '#eeeed2', dark: '#6f9350', name: 'Verde' },
  azul:   { light: '#dfe6ec', dark: '#7a97b3', name: 'Azul' },
  gris:   { light: '#e6e6e6', dark: '#8a93a2', name: 'Mármol' },
};
const KEY = 'vexchess:theme';

export function getTheme() {
  try { const s = localStorage.getItem(KEY); if (s && THEMES[s]) return s; } catch (e) {}
  return 'madera';
}
export function applyTheme(id) {
  const th = THEMES[id] || THEMES.madera;
  const r = document.documentElement.style;
  r.setProperty('--light', th.light);
  r.setProperty('--dark', th.dark);
  try { localStorage.setItem(KEY, id); } catch (e) {}
  document.querySelectorAll('.theme-sw').forEach(el =>
    el.classList.toggle('active', el.dataset.theme === id));
}

// Aplica el tema guardado nada más cargar (en cualquier página)
applyTheme(getTheme());

// Construye el selector y su popover si existen en la página
(function picker() {
  const list = document.getElementById('theme-sw-list');
  if (list) {
    list.innerHTML = Object.entries(THEMES).map(([id, th]) =>
      '<button class="theme-sw" data-theme="' + id + '" title="' + th.name + '" aria-label="' + th.name +
      '" style="--sw-l:' + th.light + ';--sw-d:' + th.dark + '"></button>').join('');
    list.querySelectorAll('.theme-sw').forEach(b =>
      b.addEventListener('click', () => applyTheme(b.dataset.theme)));
    applyTheme(getTheme());   // marca el activo
  }
  const btn = document.getElementById('theme-btn');
  const pop = document.getElementById('theme-pop');
  if (btn && pop) {
    btn.addEventListener('click', (e) => { e.stopPropagation(); pop.classList.toggle('open'); });
    document.addEventListener('click', (e) => {
      if (pop.classList.contains('open') && !pop.contains(e.target) && !btn.contains(e.target))
        pop.classList.remove('open');
    });
  }
})();
