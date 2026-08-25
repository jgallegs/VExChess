// ============================================================
//  VEXCHESS · Navbar reutilizable (componente)
//  Uso: coloca en la página
//     <header id="vx-nav" data-variant="site"></header>          (por defecto)
//     <header id="vx-nav" data-variant="site" data-home></header> (portada)
//     <header id="vx-nav" data-variant="battle">                  (partida)
//        <template data-slot="actions"> ...botones... </template>
//     </header>
//  Debe cargarse ANTES que auth.js para que el slot .vx-account exista
//  cuando auth.js pinte la cuenta.
//
//  Móvil/tablet (<= MOBILE_MQ): los enlaces + CTA + Ajustes se pliegan en un
//  panel desplegable con velo (scrim), bloqueo de scroll de fondo,
//  cierre con Escape / toque fuera / navegación y foco gestionado.
//  El idioma y el tema del tablero viven en ajustes.html.
// ============================================================
import { t } from './i18n.js?v=9';
import { closeAllAccountMenus } from './account-chip.js?v=13';

const KNIGHT = 'assets/knight-logo.svg';
const WORDMARK = 'assets/vexchess-wordmark.png';

// Punto de corte único para el modo móvil. DEBE coincidir con navbar.css.
const MOBILE_MQ = '(max-width: 74em)';

function brandHTML(href) {
  return '<a class="nav-brand" href="' + href + '" aria-label="VEXCHESS · ' + t('nav.home') + '" title="' + t('nav.home') + '">' +
      '<img class="brand-mark" src="' + KNIGHT + '" alt="">' +
      '<span class="brand-text">' +
        '<img class="wm-img" src="' + WORDMARK + '" alt="VEXCHESS">' +
        '<span class="tagline">THINK AHEAD.</span>' +
      '</span>' +
    '</a>';
}

// Enlaces del sitio: LOS MISMOS en todas las vistas (consistencia).
// La CTA "Jugar" va aparte como botón; perfil/Vexborn viven en el menú de cuenta.
const SITE_LINKS = [
  ['academia.html', 'academia'],
  ['puzzles.html', 'puzzles'],
  ['directo.html', 'directo'],
  ['partidas.html', 'partidas'],
  ['comunidad.html', 'comunidad'],
];

// Iconos del panel móvil (solo se ven plegado; en escritorio se ocultan por CSS).
// Trazo de 24x24, hereda color con currentColor.
const ICONS = {
  academia: '<path d="M12 6.6C10.5 5.1 8.5 4.6 5 4.6v12.8c3.5 0 5.5.5 7 2 1.5-1.5 3.5-2 7-2V4.6c-3.5 0-5.5.5-7 2z"/><path d="M12 6.6v12.8"/>',
  puzzles: '<path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9v.2h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z"/><path d="M9.6 18.5h4.8"/><path d="M10.4 21h3.2"/>',
  directo: '<circle cx="12" cy="12" r="2.4"/><path d="M7.9 7.9a5.8 5.8 0 0 0 0 8.2"/><path d="M16.1 16.1a5.8 5.8 0 0 0 0-8.2"/><path d="M5 5a9.9 9.9 0 0 0 0 14"/><path d="M19 19a9.9 9.9 0 0 0 0-14"/>',
  partidas: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.9"/>',
  comunidad: '<circle cx="9.2" cy="9" r="3.2"/><path d="M3.6 19.4a5.6 5.6 0 0 1 11.2 0"/><path d="M16.1 6.7a3.2 3.2 0 0 1 0 6.2"/><path d="M17.2 14.7a5.6 5.6 0 0 1 3.4 4.7"/>',
  ajustes: '<circle cx="12" cy="12" r="3.1"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>',
};

function iconHTML(key) {
  const d = ICONS[key];
  if (!d) return '';
  return '<svg class="vxnav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}

function currentPage() {
  const p = (location.pathname.split('/').pop() || 'index.html');
  return p === '' ? 'index.html' : p;
}

function siteHTML(ds, actionsHTML) {
  const isHome = ds.home !== undefined;
  const here = currentPage();
  const links = SITE_LINKS.map(([href, key]) => {
    const active = (href === here);
    return '<a href="' + href + '"' + (active ? ' class="active" aria-current="page"' : '') + '>' +
        iconHTML(key) + '<span class="vxnav-label">' + t('nav.' + key) + '</span>' +
      '</a>';
  }).join('');
  return '<div class="vxnav-inner">' +
      '<button class="vxnav-burger" type="button" aria-controls="vxnav-menu" aria-expanded="false" ' +
        'aria-label="' + t('nav.openMenu') + '"><span></span><span></span><span></span></button>' +
      brandHTML(isHome ? '#top' : 'index.html') +
      '<div class="vxnav-menu" id="vxnav-menu">' +
        '<nav class="vxnav-links" aria-label="' + t('nav.menu') + '">' + links + '</nav>' +
        '<a class="btn-play" href="play.html">' + t('nav.play') + ' <span aria-hidden="true">→</span></a>' +
        '<a class="vxnav-settings' + (here === 'ajustes.html' ? ' active' : '') + '" href="ajustes.html" ' +
          'title="' + t('nav.settings') + '"' + (here === 'ajustes.html' ? ' aria-current="page"' : '') + '>' +
          iconHTML('ajustes') + '<span class="vxnav-label">' + t('nav.settings') + '</span>' +
        '</a>' +
      '</div>' +
      '<div class="vxnav-bar">' +
        (actionsHTML ? '<div class="vxnav-actions">' + actionsHTML + '</div>' : '') +
        '<div class="vx-account"></div>' +
      '</div>' +
    '</div>' +
    '<div class="vxnav-scrim" aria-hidden="true"></div>';
}

function battleHTML(actionsHTML) {
  return '<div class="nav-scrim" aria-hidden="true"></div>' +
    brandHTML('index.html') +
    '<div class="nav-actions"><div class="vx-account"></div>' + (actionsHTML || '') + '</div>';
}

// El bloqueo del scroll de fondo NO usa overflow:hidden: en html o body
// convierte al documento/body en otro contenedor de scroll y la barra sticky
// "desaparece" (se pega al tope del documento, fuera de pantalla si había
// scroll). En su lugar se bloquea la interacción: cualquier gesto de scroll
// (toque o rueda) fuera del panel se cancela mientras el menú está abierto.

function wireSite(nav) {
  const burger = nav.querySelector('.vxnav-burger');
  const menu = nav.querySelector('.vxnav-menu');
  const scrim = nav.querySelector('.vxnav-scrim'); // visibilidad y toque los controla la clase .open
  const mq = window.matchMedia(MOBILE_MQ);

  const isOpen = () => nav.classList.contains('open');

  const setOpen = (open, opts) => {
    const focusBack = !opts || opts.focusBack !== false;
    if (open === isOpen()) return;
    nav.classList.toggle('open', open);
    scrollBlocked = open && mq.matches;
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', t(open ? 'nav.closeMenu' : 'nav.openMenu'));
    }
    if (open) {
      closeAllAccountMenus(); // nunca dos superficies abiertas a la vez
      // El foco entra al panel: primer enlace navegable.
      const first = menu && menu.querySelector('a, select, button');
      if (first) requestAnimationFrame(() => { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } });
    } else if (focusBack && burger && mq.matches) {
      try { burger.focus({ preventScroll: true }); } catch (e) {}
    }
  };

  if (burger) burger.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!isOpen()); });
  if (scrim) scrim.addEventListener('click', () => setOpen(false));

  // Gestos de scroll con el panel abierto: dentro del menú sí (tiene su propio
  // scroll), en el resto del documento no.
  let scrollBlocked = false;
  const blockScroll = (e) => {
    if (scrollBlocked && menu && !menu.contains(e.target)) e.preventDefault();
  };
  document.addEventListener('touchmove', blockScroll, { passive: false });
  document.addEventListener('wheel', blockScroll, { passive: false });

  // Al navegar desde el panel se cierra sin devolver el foco (cambia la página).
  nav.querySelectorAll('.vxnav-menu a').forEach(a => a.addEventListener('click', () => setOpen(false, { focusBack: false })));

  // Abrir la cuenta cierra el panel (y al revés): una sola capa a la vez.
  // En fase de captura: el chip corta la propagación en burbujeo y este
  // listener nunca llegaba a enterarse.
  nav.addEventListener('click', (e) => {
    if (isOpen() && e.target.closest && e.target.closest('.vx-account')) setOpen(false, { focusBack: false });
  }, true);

  // Escape cierra desde cualquier sitio.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false); });

  // Toque/clic fuera de la barra.
  document.addEventListener('click', (e) => { if (isOpen() && !nav.contains(e.target)) setOpen(false, { focusBack: false }); });

  // Al pasar a escritorio el panel deja de tener sentido.
  const onMQ = () => { if (!mq.matches) setOpen(false, { focusBack: false }); else scrollBlocked = isOpen(); };
  if (mq.addEventListener) mq.addEventListener('change', onMQ);
  else if (mq.addListener) mq.addListener(onMQ); // Safari antiguo

  // Barra compacta al bajar (gana alto útil en móvil).
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      nav.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset || 0) > 8);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Animación del logo (solo en battle): el caballo entra y el logo vuela a la barra.
function injectIntro() {
  if (document.getElementById('intro')) { runIntro(document.getElementById('intro')); return; }
  const el = document.createElement('div');
  el.className = 'intro'; el.id = 'intro';
  el.innerHTML = '<div class="intro-logo">' +
      '<img class="brand-mark" src="' + KNIGHT + '" alt="">' +
      '<div class="brand-text"><img class="wm-img" src="' + WORDMARK + '" alt="VEXCHESS"><span class="tagline">THINK AHEAD.</span></div>' +
    '</div>';
  document.body.appendChild(el);
  runIntro(el);
}
function runIntro(el) {
  requestAnimationFrame(() => el.classList.add('play'));
  setTimeout(() => el.classList.add('exit'), 2350);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 3350);
}

(function mount() {
  const node = document.getElementById('vx-nav');
  if (!node) return;
  const variant = node.dataset.variant || 'site';
  // Botones propios de la página (p. ej. la ayuda del juego): mismo slot
  // en ambas variantes; en site van junto al chip de cuenta.
  const slot = node.querySelector('[data-slot="actions"]');
  const actions = slot ? slot.innerHTML : '';
  if (variant === 'battle') {
    node.className = 'navbar';
    node.removeAttribute('data-variant');
    node.innerHTML = battleHTML(actions);
    injectIntro();
  } else {
    const wantIntro = node.dataset.intro !== undefined;
    node.className = 'vxnav';
    node.innerHTML = siteHTML(node.dataset, actions);
    wireSite(node);
    if (wantIntro) injectIntro();
  }
})();
