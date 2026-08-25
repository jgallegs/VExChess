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
//  Móvil/tablet (<= MOBILE_MQ): los enlaces + CTA + idioma se pliegan en un
//  panel desplegable con velo (scrim), bloqueo de scroll de fondo,
//  cierre con Escape / toque fuera / navegación y foco gestionado.
// ============================================================
import { t, langSelectHTML, wireLangSelect } from './i18n.js?v=9';
import { closeAllAccountMenus } from './account-chip.js?v=6';

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

function siteHTML(ds) {
  const isHome = ds.home !== undefined;
  const here = currentPage();
  const links = SITE_LINKS.map(([href, key]) => {
    const active = (href === here);
    return '<a href="' + href + '"' + (active ? ' class="active" aria-current="page"' : '') + '>' +
        iconHTML(key) + '<span class="vxnav-label">' + t('nav.' + key) + '</span>' +
      '</a>';
  }).join('');
  return '<div class="vxnav-inner">' +
      brandHTML(isHome ? '#top' : 'index.html') +
      '<div class="vxnav-menu" id="vxnav-menu">' +
        '<nav class="vxnav-links" aria-label="' + t('nav.menu') + '">' + links + '</nav>' +
        '<a class="btn-play" href="play.html">' + t('nav.play') + ' <span aria-hidden="true">→</span></a>' +
        '<label class="vxnav-lang">' +
          '<span class="vxnav-lang-label">' + t('nav.language') + '</span>' +
          langSelectHTML('vx-lang', '') +
        '</label>' +
      '</div>' +
      '<div class="vxnav-bar">' +
        '<div class="vx-account"></div>' +
        '<button class="vxnav-burger" type="button" aria-controls="vxnav-menu" aria-expanded="false" ' +
          'aria-label="' + t('nav.openMenu') + '"><span></span><span></span><span></span></button>' +
      '</div>' +
    '</div>' +
    '<div class="vxnav-scrim" aria-hidden="true"></div>';
}

function battleHTML(actionsHTML) {
  return '<div class="nav-scrim" aria-hidden="true"></div>' +
    brandHTML('index.html') +
    '<div class="nav-actions"><div class="vx-account"></div>' + (actionsHTML || '') + '</div>';
}

// ---------- bloqueo del scroll de fondo mientras el panel está abierto ----------
function lockScroll(on) {
  document.documentElement.classList.toggle('vxnav-locked', !!on);
}

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
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', t(open ? 'nav.closeMenu' : 'nav.openMenu'));
    }
    lockScroll(open && mq.matches);
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

  // Al navegar desde el panel se cierra sin devolver el foco (cambia la página).
  nav.querySelectorAll('.vxnav-menu a').forEach(a => a.addEventListener('click', () => setOpen(false, { focusBack: false })));

  // Abrir la cuenta cierra el panel (y al revés): una sola capa a la vez.
  nav.addEventListener('click', (e) => {
    if (isOpen() && e.target.closest && e.target.closest('.vx-account')) setOpen(false, { focusBack: false });
  });

  // Escape cierra desde cualquier sitio.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false); });

  // Toque/clic fuera de la barra.
  document.addEventListener('click', (e) => { if (isOpen() && !nav.contains(e.target)) setOpen(false, { focusBack: false }); });

  // Al pasar a escritorio el panel deja de tener sentido.
  const onMQ = () => { if (!mq.matches) setOpen(false, { focusBack: false }); else lockScroll(isOpen()); };
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

  wireLangSelect(nav.querySelector('#vx-lang'));
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
  if (variant === 'battle') {
    const slot = node.querySelector('[data-slot="actions"]');
    const actions = slot ? slot.innerHTML : '';
    node.className = 'navbar';
    node.removeAttribute('data-variant');
    node.innerHTML = battleHTML(actions);
    injectIntro();
  } else {
    node.className = 'vxnav';
    node.innerHTML = siteHTML(node.dataset);
    wireSite(node);
  }
})();
