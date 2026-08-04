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
// ============================================================
const KNIGHT = 'assets/knight-logo.svg';
const WORDMARK = 'assets/vexchess-wordmark.png';

function brandHTML(href) {
  return '<a class="nav-brand" href="' + href + '" aria-label="VEXCHESS · Inicio" title="Inicio">' +
      '<img class="brand-mark" src="' + KNIGHT + '" alt="">' +
      '<span class="brand-text">' +
        '<img class="wm-img" src="' + WORDMARK + '" alt="VEXCHESS">' +
        '<span class="tagline">THINK AHEAD.</span>' +
      '</span>' +
    '</a>';
}

// Enlaces del sitio (la CTA "Jugar" va aparte como botón).
function linksFor(isHome) {
  // Conjunto reducido para que la barra respire; el resto (Mis partidas,
  // Vexborn, perfil…) vive en el menú de la cuenta.
  if (isHome) return [
    ['#features', 'Características'],
    ['puzzles.html', 'Puzzles'],
    ['directo.html', 'En directo'],
    ['#roadmap', 'Roadmap'],
  ];
  return [
    ['puzzles.html', 'Puzzles'],
    ['directo.html', 'En directo'],
    ['partidas.html', 'Mis partidas'],
    ['comunidad.html', 'Comunidad'],
  ];
}

function currentPage() {
  const p = (location.pathname.split('/').pop() || 'index.html');
  return p === '' ? 'index.html' : p;
}

function siteHTML(ds) {
  const isHome = ds.home !== undefined;
  const here = currentPage();
  const links = linksFor(isHome).map(([href, label]) => {
    const active = (href === here) ? ' class="active"' : '';
    return '<a href="' + href + '"' + active + '>' + label + '</a>';
  }).join('');
  return '<div class="vxnav-inner">' +
      brandHTML(isHome ? '#top' : 'index.html') +
      '<div class="vxnav-menu">' +
        '<nav class="vxnav-links" aria-label="Navegación">' + links + '</nav>' +
        '<a class="btn-play" href="play.html">Jugar <span aria-hidden="true">→</span></a>' +
      '</div>' +
      '<div class="vxnav-bar">' +
        '<div class="vx-account"></div>' +
        '<button class="vxnav-burger" type="button" aria-label="Abrir menú" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '</div>' +
    '</div>';
}

function battleHTML(actionsHTML) {
  return '<div class="nav-scrim" aria-hidden="true"></div>' +
    brandHTML('index.html') +
    '<div class="nav-actions"><div class="vx-account"></div>' + (actionsHTML || '') + '</div>';
}

function wireSite(nav) {
  const burger = nav.querySelector('.vxnav-burger');
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  if (burger) burger.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  nav.querySelectorAll('.vxnav-menu a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  window.addEventListener('resize', () => { if (window.innerWidth > 960) setOpen(false); });
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
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
