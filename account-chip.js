// ============================================================
//  VEXCHESS · Componente de cuenta (chip que se despliega) reutilizable
//  ------------------------------------------------------------
//  · UN SOLO elemento que crece: el propio chip (avatar · nombre ·
//    Elo) ES la cabecera del panel. Al abrir, la superficie se
//    expande hacia abajo con animación "liquid glass" y revela solo
//    los enlaces. Sin repetir foto/nombre/Elo.
//  · Presentacional y DESACOPLADO del estado: auth.js pasa el modelo
//    y un contexto con helpers (avatarHTML, roleMeta, badgeIcon) +
//    manejadores (login, signout).
//  · Preferencias de visualización por dispositivo:
//      display.pc     = 'both' | 'name' | 'elo'   (≥600px)
//      display.mobile = 'name' | 'elo'            (<600px)
//    El avatar y el desplegable se muestran siempre.
//  · Se auto-inyecta sus estilos una sola vez (sin tocar HTML).
//
//  API pública:
//    eloTier(elo)                        → clave de rango ('novice'…)
//    accountChipHTML(model, ctx)         → string de markup
//    mountAccountChip(slot, model, ctx)  → pinta + cablea un slot
//    closeAllAccountMenus()              → cierra menús abiertos
// ============================================================
import { t } from './i18n.js';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- escala de rango por Elo ----------
const ELO_TIERS = [[2200, 'master'], [1800, 'expert'], [1500, 'advanced'], [1200, 'skilled'], [0, 'novice']];
export function eloTier(elo) {
  const e = Number(elo) || 0;
  for (const [min, key] of ELO_TIERS) if (e >= min) return key;
  return 'novice';
}

// ---------- preferencias de visualización ----------
function normDisplay(d) {
  d = d || {};
  return {
    pc: ['both', 'name', 'elo'].includes(d.pc) ? d.pc : 'both',
    mobile: ['name', 'elo'].includes(d.mobile) ? d.mobile : 'elo',
  };
}

// ---------- enlaces del menú (data-driven → escalable) ----------
function menuLinks(user) {
  const L = [
    ['perfil.html',    t('auth.menu.profile')],
    ['academia.html',  t('auth.menu.academy')],
    ['online.html',    t('auth.menu.playOnline'), 'challenges'],
    ['comunidad.html', t('auth.menu.community'),  'incoming'],
    ['partidas.html',  t('auth.menu.myGames')],
    ['vexborn.html',   'Vexborn'],
  ];
  if (user && user.is_admin) {
    L.push(['insignias.html', t('auth.menu.badgesInventory')]);
    L.push(['admin.html', t('auth.menu.adminPanel'), null, 'vxa-mi-admin']);
  }
  return L;
}

// Contenido de la fila-cabecera (idéntico en el chip real y en el "fantasma"
// que reserva el espacio en el layout). Así ambos miden EXACTAMENTE lo mismo.
function chipInner(user, ctx, model) {
  const avatarHTML = ctx.avatarHTML, roleMeta = ctx.roleMeta, badgeIcon = ctx.badgeIcon;
  const incoming = model.notifCount || 0, challenges = model.challengeCount || 0;
  const total = incoming + challenges;
  const rm = roleMeta ? roleMeta(user.role) : { color: '#8b97a9' };
  const roleColor = rm.color || '#8b97a9';
  const isStaff = user.role && user.role !== 'member';
  const tier = eloTier(user.elo);
  const featured = (model.badges || []).find(b => b.featured);
  const dot = total > 0
    ? '<span class="vxa-dot" title="' + (total === 1
        ? t('auth.chip.notificationsTitle', { count: total })
        : t('auth.chip.notificationsTitlePlural', { count: total })) + '"></span>'
    : '';
  return '' +
    '<span class="vxa-av' + (isStaff ? ' is-staff' : '') + '" style="--role:' + roleColor + '">' +
      (avatarHTML ? avatarHTML(user.avatar) : '') + dot +
    '</span>' +
    '<span class="vxa-id">' +
      '<span class="vxa-name">' + esc(user.username) + '</span>' +
      (featured && badgeIcon ? badgeIcon(featured.badge, 'chip') : '') +
    '</span>' +
    '<span class="vxa-elo" data-tier="' + tier + '" aria-label="' + esc(t('auth.chip.ratingAria', { elo: user.elo })) + '">' +
      '<i class="vxa-elo-mark" aria-hidden="true"></i><b class="vxa-elo-num">' + esc(user.elo) + '</b>' +
    '</span>' +
    '<svg class="vxa-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ---------- markup ----------
export function accountChipHTML(model, ctx) {
  const user = model && model.user;
  // Sesión aún sin resolver: hueco invisible — ni un "Entrar" falso que
  // parpadee antes de la píldora, ni ningún disco de carga a la vista.
  if (user === undefined) return '<span class="vxa-skel" aria-hidden="true"></span>';
  if (!user) return '<button class="vxa-login" type="button">' + t('auth.chip.login') + '</button>';

  const d = normDisplay(model.display);
  const incoming = model.notifCount || 0, challenges = model.challengeCount || 0;
  const inner = chipInner(user, ctx, model);

  const links = menuLinks(user).map(([href, label, notifKey, extraCls]) => {
    let badge = '';
    if (notifKey === 'incoming' && incoming > 0) badge = '<span class="vxa-mi-dot">' + incoming + '</span>';
    else if (notifKey === 'challenges' && challenges > 0) badge = '<span class="vxa-mi-dot">' + challenges + '</span>';
    return '<a href="' + href + '"' + (extraCls ? ' class="' + extraCls + '"' : '') + ' role="menuitem">' +
      '<span>' + esc(label) + '</span>' + badge + '</a>';
  }).join('');

  return '<div class="vxa" data-pc="' + d.pc + '" data-mobile="' + d.mobile + '">' +
      // fantasma: reserva el hueco del chip colapsado en el layout
      '<span class="vxa-chip vxa-ghost" aria-hidden="true">' + inner + '</span>' +
      // superficie única que se expande
      '<div class="vxa-surface">' +
        '<button class="vxa-chip" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="' + esc(t('auth.chip.menuAria')) + '">' + inner + '</button>' +
        '<div class="vxa-drawer" role="menu"><div class="vxa-drawer-in">' +
          '<div class="vxa-links">' + links + '</div>' +
          '<button type="button" class="vxa-signout" role="menuitem">' + t('auth.menu.signout') + '</button>' +
        '</div></div>' +
      '</div>' +
    '</div>';
}

// ---------- montaje + cableado ----------
const mounted = new Set();
// La entrada suena solo al aparecer por primera vez. Ojo: justo tras /me
// llegan los contadores y el chip se RE-monta a los pocos ms — por eso la
// guarda es una VENTANA desde la primera aparición, no un flag de un solo
// uso (el re-montaje pisaba la clase y se perdía la animación).
let enterAt = 0;
export function mountAccountChip(slot, model, ctx) {
  if (!slot) return;
  ensureStyles();
  slot.innerHTML = accountChipHTML(model, ctx);
  mounted.add(slot);

  if (model && model.user !== undefined) {
    if (!enterAt) enterAt = Date.now();
    if (Date.now() - enterAt < 1200) {
      const first = slot.querySelector('.vxa, .vxa-login');
      if (first) {
        first.classList.add('vxa-enter');
        // cinturón: al aterrizar el muelle, re-mide el ancho de la superficie
        first.addEventListener('animationend', (e) => {
          if (e.target === first && first.classList.contains('vxa')) syncWidth(first);
        }, { once: true });
        // la entrada es UN momento: pasada, la clase se retira y no deja
        // rastro (ni destello ni estados que interfieran con abrir/cerrar)
        setTimeout(() => first.classList.remove('vxa-enter'), 1450);
      }
    }
  }

  const login = slot.querySelector('.vxa-login');
  if (login && ctx.onLogin) login.addEventListener('click', ctx.onLogin);

  const vxa = slot.querySelector('.vxa');
  const chip = slot.querySelector('.vxa-surface > .vxa-chip');
  const surface = slot.querySelector('.vxa-surface');
  if (vxa && chip && surface) {
    syncWidth(vxa);
    // Re-medir cuando el layout se estabiliza: fuente web cargada, imagen del
    // avatar dimensionada y siguiente frame. Evita que la superficie (con
    // overflow:hidden) recorte el Elo/chevron por medir demasiado pronto.
    requestAnimationFrame(() => syncWidth(vxa));
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => syncWidth(vxa)).catch(() => {});
    }
    const av = slot.querySelector('.vxa-ghost img');
    if (av && !av.complete) av.addEventListener('load', () => syncWidth(vxa), { once: true });
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (vxa._closing) return;
      if (vxa.classList.contains('open')) { closeChip(vxa); return; }
      flipOpen(vxa, () => {
        vxa.classList.add('open');
        chip.setAttribute('aria-expanded', 'true');
        syncWidth(vxa);
      });
    });
    surface.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && vxa.classList.contains('open')) {
        closeChip(vxa);
        chip.focus();
      }
    });
    // Navegar desde el menú NO colapsa la ficha: el click burbujeaba hasta
    // el cierre global y la tarjeta se desordenaba justo antes de cambiar
    // de página. El menú se queda quieto, la opción elegida se marca y el
    // resto cede protagonismo mientras carga el destino.
    slot.querySelectorAll('.vxa-drawer a').forEach(a => a.addEventListener('click', (e) => {
      e.stopPropagation();
      vxa.classList.add('is-nav');
      a.classList.add('is-going');
    }));
  }
  const so = slot.querySelector('.vxa-signout');
  if (so && ctx.onSignout) so.addEventListener('click', ctx.onSignout);
}

// FLIP de la cabecera: al abrir/cerrar, avatar, nombre, Elo y chevron VIAJAN
// de su sitio en la píldora a su sitio en la ficha (y a la inversa) en vez
// de recomponerse de golpe. Se miden las posiciones antes y después del
// cambio de clase y se anima la diferencia solo con transform (WAAPI).
// Los elementos que estaban ocultos (display:none en anchos estrechos)
// no tienen "antes": entran con un fundido + subida corta.
const FLIP_PARTS = ['.vxa-av', '.vxa-id', '.vxa-elo', '.vxa-caret'];
const FLIP_EASE = 'cubic-bezier(.22,1,.36,1)';
const noMotion = () => (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) ||
  typeof Element === 'undefined' || !Element.prototype.animate;

// APERTURA (FLIP clásico): se cambia el estado y los elementos viajan desde
// donde estaban. Funciona porque las posiciones destino son medibles al
// instante (la rejilla de la ficha no depende de transiciones en curso).
function flipOpen(vxa, apply) {
  if (noMotion()) { apply(); return; }
  const parts = FLIP_PARTS.map(sel => vxa.querySelector('.vxa-surface ' + sel)).filter(Boolean);
  const before = parts.map(el => el.getBoundingClientRect());
  apply();
  parts.forEach((el, i) => {
    const b = before[i], a = el.getBoundingClientRect();
    if (!a.width && !a.height) return;                 // sigue oculto
    if (!b.width && !b.height) {                       // aparece de nuevas
      el.animate([{ opacity: 0, transform: 'translateY(.3rem)' }, { opacity: 1, transform: 'none' }],
        { duration: 300, delay: 90, easing: FLIP_EASE, fill: 'backwards' });
      return;
    }
    const dx = b.left - a.left, dy = b.top - a.top;
    const sx = a.width ? b.width / a.width : 1, sy = a.height ? b.height / a.height : 1;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) return;
    el.style.transformOrigin = '0 0';
    const anim = el.animate(
      [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transform: 'none' }],
      { duration: 380, easing: FLIP_EASE });
    anim.finished.then(() => { el.style.transformOrigin = ''; }).catch(() => {});
  });
}

// CIERRE (coreografía en dos tiempos): el FLIP clásico no sirve al cerrar —
// el ancho/alto de la superficie están en plena transición al medir el
// "después" y los deltas salen nulos (los elementos se teletransportaban).
// En su lugar, la DIANA es el fantasma: siempre está en el layout de píldora
// final. 1) la cabecera viaja y ESCALA hasta encajar en la píldora;
// 2) al aterrizar se suelta el estado y el cajón se pliega debajo.
function closeChip(vxa) {
  if (!vxa.classList.contains('open') || vxa._closing) return;
  const chip = vxa.querySelector('.vxa-surface > .vxa-chip');
  const finish = () => {
    vxa.classList.remove('open');
    if (chip) chip.setAttribute('aria-expanded', 'false');
    syncWidth(vxa);
  };
  if (noMotion()) { finish(); return; }
  vxa._closing = true;
  vxa.classList.add('closing');
  const anims = [];
  // El FONDO encoge A LA VEZ que el contenido viaja, recortándolo con
  // clip-path (solo pintura, cero reflow). Animar el ancho real era un bug:
  // la superficie ancla a la derecha, el borde izquierdo se movía y el
  // reflow ARRASTRABA la cabecera, que además llevaba su propio viaje —
  // doble desplazamiento y la foto se pasaba de largo por la derecha.
  const surface = vxa.querySelector('.vxa-surface');
  const ghost = vxa.querySelector('.vxa-ghost');
  const drawer = vxa.querySelector('.vxa-drawer');
  const drawerIn = vxa.querySelector('.vxa-drawer-in');
  if (surface && ghost) {
    const s = surface.getBoundingClientRect();
    const gw = ghost.offsetWidth, gh = ghost.offsetHeight;
    const cs = getComputedStyle(surface);
    const rad = cs.borderTopLeftRadius + ' ' + cs.borderTopRightRadius + ' ' +
      cs.borderBottomRightRadius + ' ' + cs.borderBottomLeftRadius;
    anims.push(surface.animate(
      [{ clipPath: 'inset(0 0 0 0 round ' + rad + ')' },
       { clipPath: 'inset(0 0 ' + Math.max(0, s.height - gh) + 'px ' + Math.max(0, s.width - gw) + 'px round ' + (gh / 2) + 'px)' }],
      { duration: 250, easing: FLIP_EASE, fill: 'forwards' }));
  }
  FLIP_PARTS.forEach(sel => {
    const el = vxa.querySelector('.vxa-surface ' + sel);
    const gh = vxa.querySelector('.vxa-ghost ' + sel);
    if (!el) return;
    const a = el.getBoundingClientRect();
    if (!a.width && !a.height) return;
    const g = gh ? gh.getBoundingClientRect() : null;
    if (!g || (!g.width && !g.height)) {               // en la píldora no existe: se funde
      anims.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: 'ease', fill: 'forwards' }));
      return;
    }
    const dx = g.left - a.left, dy = g.top - a.top;
    const sx = a.width ? g.width / a.width : 1, sy = a.height ? g.height / a.height : 1;
    el.style.transformOrigin = '0 0';
    anims.push(el.animate(
      [{ transform: 'none' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }],
      { duration: 250, easing: FLIP_EASE, fill: 'forwards' }));
  });
  const unlatch = () => {
    // El estado final se aplica SIN transiciones: ya lo hemos animado
    // nosotros. Si no, al soltar .open las transiciones CSS re-animarían
    // ancho/cajón desde el tamaño de ficha y se vería un doble movimiento.
    const frozen = [surface, drawer, drawerIn].filter(Boolean);
    frozen.forEach(el => { el.style.transition = 'none'; });
    finish();
    if (surface) void surface.offsetWidth;   // reflow con el estado final
    anims.forEach(x => { try { x.cancel(); } catch (e) {} });
    FLIP_PARTS.forEach(sel => { const el = vxa.querySelector('.vxa-surface ' + sel); if (el) el.style.transformOrigin = ''; });
    vxa.classList.remove('closing');
    vxa._closing = false;
    requestAnimationFrame(() => requestAnimationFrame(() => frozen.forEach(el => { el.style.transition = ''; })));
  };
  if (!anims.length) { unlatch(); return; }
  setTimeout(unlatch, 255);
}

// Volver con atrás/adelante (bfcache) revivía la página tal cual quedó:
// ficha abierta, opción marcada, navegación congelada. Se resetea en dos
// puntos: al ESCONDERSE la página (pagehide — así la foto que guarda
// bfcache ya es la píldora cerrada) y al restaurarse (pageshow persisted,
// cinturón por si el motor guardó antes). Sin animaciones: es un estado,
// no una interacción — de ahí las transiciones congeladas un frame.
function resetChip(vxa) {
  vxa.classList.remove('is-nav', 'closing');
  vxa._closing = false;
  vxa.querySelectorAll('.is-going').forEach(a => a.classList.remove('is-going'));
  const surface = vxa.querySelector('.vxa-surface');
  const frozen = [surface, vxa.querySelector('.vxa-drawer'), vxa.querySelector('.vxa-drawer-in')].filter(Boolean);
  frozen.forEach(el => { el.style.transition = 'none'; });
  if (vxa.getAnimations) { try { vxa.getAnimations({ subtree: true }).forEach(a => a.cancel()); } catch (e) {} }
  FLIP_PARTS.forEach(sel => { const el = vxa.querySelector('.vxa-surface ' + sel); if (el) el.style.transformOrigin = ''; });
  if (vxa.classList.contains('open')) {
    vxa.classList.remove('open');
    const c = vxa.querySelector('.vxa-surface > .vxa-chip');
    if (c) c.setAttribute('aria-expanded', 'false');
  }
  syncWidth(vxa);
  if (surface) void surface.offsetWidth;
  requestAnimationFrame(() => requestAnimationFrame(() => frozen.forEach(el => { el.style.transition = ''; })));
}
if (typeof window !== 'undefined') {
  const resetAll = () => document.querySelectorAll('.vxa').forEach(resetChip);
  window.addEventListener('pagehide', resetAll);
  window.addEventListener('pageshow', (e) => { if (e.persisted) resetAll(); });
}

// La superficie es absoluta (para no empujar la navbar al crecer); el fantasma
// mantiene el hueco. Aquí igualamos el ancho de la superficie: colapsado = el
// del chip; abierto = un panel cómodo. Siempre en px → transición fluida.
function syncWidth(vxa) {
  const ghost = vxa.querySelector('.vxa-ghost');
  const surface = vxa.querySelector('.vxa-surface');
  if (!ghost || !surface) return;
  // getBoundingClientRect se contrae con el scale de la animación de entrada
  // (medía la píldora encogida y la superficie quedaba corta por la
  // izquierda hasta el siguiente re-sync). Se descuenta el factor de escala
  // del contenedor para medir el ancho REAL de layout, con subpíxel.
  const scale = vxa.offsetWidth ? (vxa.getBoundingClientRect().width / vxa.offsetWidth) : 1;
  const w0 = Math.ceil(ghost.getBoundingClientRect().width / (scale > 0 ? scale : 1));
  if (!w0) return;
  const open = vxa.classList.contains('open');
  // Mínimo del panel abierto en rem (el rem del documento es fluido)
  const minOpen = 15 * parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
  surface.style.width = (open ? Math.max(w0, minOpen) : w0) + 'px';
}

export function closeAllAccountMenus() {
  document.querySelectorAll('.vxa.open').forEach(vxa => {
    if (vxa.classList.contains('is-nav')) return; // navegando: no desmontar la ficha
    closeChip(vxa);
  });
}

// Reajusta anchos al cambiar el viewport (los breakpoints ocultan nombre/Elo).
let rAF = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (rAF) return;
    rAF = requestAnimationFrame(() => {
      rAF = 0;
      document.querySelectorAll('.vxa').forEach(syncWidth);
    });
  });
}

// ---------- estilos (auto-inyectados una vez) ----------
let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || document.getElementById('vxa-style')) { stylesInjected = true; return; }
  const s = document.createElement('style');
  s.id = 'vxa-style';
  s.textContent = ACCOUNT_CSS;
  document.head.appendChild(s);
  stylesInjected = true;
}

const ACCOUNT_CSS = `
.vx-account{display:inline-flex;align-items:center}
.vxa{position:relative;display:inline-flex;align-items:center;font-family:'Inter',system-ui,sans-serif;--chip-h:2.75rem;line-height:1}

/* Sesión sin resolver: hueco INVISIBLE. Nada de discos ni esqueletos a la
   vista — no se ve nada hasta que aparece la píldora o el botón de entrar.
   Conserva el alto del chip para que la barra no cambie de tamaño. */
.vxa-skel{display:inline-block;width:0;height:2.75rem;visibility:hidden}

/* Botón "Entrar" (sin sesión) */
.vxa-login{background:var(--panel-2);color:var(--text);border:var(--hair,1px) solid var(--border);
  border-radius:.6rem;padding:.5rem 1rem;font:700 .85rem 'Inter',sans-serif;cursor:pointer;
  transition:background .14s,border-color .14s,transform .1s}
.vxa-login:hover{background:#33405a;border-color:var(--vex-muted,#3a4a63)}
.vxa-login:active{transform:translateY(.05rem)}

/* Fantasma: ocupa el hueco del chip colapsado (invisible, sin interacción) */
.vxa-ghost{visibility:hidden;pointer-events:none}

/* Superficie única que crece (liquid glass). MISMO fondo y sin borde en
   reposo y expandido: cualquier estilo que difiera entre estados se
   convierte en un click visual al abrir/cerrar (el anillo interior que
   hacía de borde reaparecía en seco al aterrizar el cierre). Entre estados
   solo cambian radio y sombra, y siempre transicionados. */
.vxa-surface{position:absolute;top:0;right:0;z-index:70;display:flex;flex-direction:column;
  border-radius:calc(var(--chip-h)/2);
  background:linear-gradient(180deg,rgba(38,48,64,.80),rgba(20,26,35,.86));
  -webkit-backdrop-filter:blur(1.2rem) saturate(1.4);backdrop-filter:blur(1.2rem) saturate(1.4);
  border:none;
  box-shadow:0 .35rem .9rem rgba(0,0,0,.22);
  transition:width .42s cubic-bezier(.22,1,.36,1),border-radius .42s cubic-bezier(.22,1,.36,1),
    box-shadow .34s ease}
.vxa.open .vxa-surface{border-radius:calc(var(--chip-h)/2) calc(var(--chip-h)/2) 1.05rem 1.05rem;
  box-shadow:0 1.8rem 4rem rgba(0,0,0,.6)}
.vxa-surface:has(.vxa-chip:focus-visible){box-shadow:0 0 0 .16rem rgba(57,213,255,.5)}

/* Chip (fila cabecera) — transparente: la glass la pone la superficie.
   El hover vive AQUÍ, en una capa hija sobre el cristal: la superficie no
   cambia con el hover y abrir/cerrar con el cursor encima ya no da saltos
   de fondo (el hover se desvanece por su propio carril). */
.vxa-chip{display:flex;align-items:center;gap:.55rem;height:var(--chip-h);box-sizing:border-box;
  background:none;border:none;padding:.3rem .72rem .3rem .44rem;cursor:pointer;color:var(--text);
  max-width:100%;white-space:nowrap;font-family:inherit;
  border-radius:calc(var(--chip-h)/2);transition:background .18s ease}
.vxa:not(.open) .vxa-surface>.vxa-chip:hover{background:rgba(255,255,255,.05)}
.vxa-chip:focus{outline:none}

/* Avatar con anillo de rol */
.vxa-av{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;align-self:center}
/* Sin transición de tamaño: el morphing lo anima el FLIP (una transición CSS
   aquí re-encogía la foto DESPUÉS de aterrizar el cierre — doble movimiento) */
.vxa-av .vx-avatar{width:1.9rem;height:1.9rem;box-shadow:0 0 0 .13rem transparent}
.vxa-av.is-staff .vx-avatar{box-shadow:0 0 0 .12rem rgba(20,26,35,.9),0 0 0 .2rem var(--role)}
.vxa-dot{position:absolute;top:-.1rem;right:-.1rem;width:.6rem;height:.6rem;border-radius:50%;
  background:var(--accent,#FF3B47);border:.12rem solid #171d27;z-index:2;box-shadow:0 0 .35rem rgba(255,59,71,.85);
  animation:vxa-dot-in .32s cubic-bezier(.34,1.56,.64,1) backwards}
/* anillo de "ping" que se expande una vez al aparecer (no pisa el glow fijo) */
.vxa-dot::after{content:'';position:absolute;inset:-.12rem;border-radius:50%;
  animation:vx-ping .7s cubic-bezier(.22,1,.36,1) .26s 1 backwards}
@keyframes vxa-dot-in{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}

/* Nombre + insignia */
.vxa-id{display:inline-flex;align-items:center;gap:.35rem;min-width:0}
.vxa-id:empty{display:none}
.vxa-name{font:700 .85rem/1.3 'Inter',sans-serif;max-width:9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vxa-id .vx-badge-ico.chip{margin:0;flex:0 0 auto}

/* Pill de Elo — color por rango, alto contraste, verticalmente centrado */
.vxa-elo{display:inline-flex;align-items:center;justify-content:center;gap:.26rem;flex:0 0 auto;height:1.3rem;
  box-sizing:border-box;font:800 .72rem/1 'Oxanium',sans-serif;letter-spacing:.01em;
  padding:0 .52rem;border-radius:99rem;font-variant-numeric:tabular-nums;
  color:var(--tc,#cbd5e1);background:var(--tbg,rgba(148,163,184,.16))}
.vxa-elo-num{font:inherit;translate:0 var(--elo-nudge,.06em)}
.vxa-elo-mark{display:block;width:.36rem;height:.36rem;border-radius:.07rem;flex:0 0 auto;background:currentColor;transform:rotate(45deg);opacity:.9}
.vxa-elo[data-tier=novice]  {--tc:#cbd5e1;--tbg:rgba(148,163,184,.16)}
.vxa-elo[data-tier=skilled] {--tc:#5fe0a0;--tbg:rgba(58,213,150,.14)}
.vxa-elo[data-tier=advanced]{--tc:#5cd8ff;--tbg:rgba(57,213,255,.14)}
.vxa-elo[data-tier=expert]  {--tc:#c4a2ff;--tbg:rgba(139,92,246,.18)}
.vxa-elo[data-tier=master]  {--tc:#f4c763;--tbg:rgba(244,199,99,.15)}

/* ---------- Ficha de usuario (cabecera del panel abierto) ----------
   El mismo botón-cabecera se re-compone en rejilla de dos filas: avatar
   grande a la izquierda; nombre+insignia arriba; el Elo (y lo que oculten
   las preferencias del chip) SIEMPRE visible debajo. El padding horizontal
   (.85rem) casa con el de las opciones del menú (.45rem del cajón + .7rem
   del propio enlace ≈ mismo arranque visual). */
.vxa.open .vxa-surface>.vxa-chip{
  height:auto;display:grid;grid-template-columns:auto 1fr auto;align-items:center;
  grid-template-areas:'av id caret' 'av elo caret';
  column-gap:.7rem;row-gap:.28rem;padding:.85rem 1.15rem}
/* (la recomposición la anima el FLIP de JS: los elementos VIAJAN a su sitio) */
.vxa.open .vxa-surface .vxa-av{grid-area:av}
.vxa.open .vxa-surface .vxa-av .vx-avatar{width:2.5rem;height:2.5rem}
.vxa.open .vxa-surface .vxa-id{grid-area:id;display:inline-flex!important;justify-self:start;min-width:0}
.vxa.open .vxa-surface .vxa-name{display:inline-block!important;font:700 .95rem/1.3 'Inter',sans-serif;max-width:10.5rem}
.vxa.open .vxa-surface .vxa-elo{grid-area:elo;display:inline-flex!important;justify-self:start}
.vxa.open .vxa-surface .vxa-caret{grid-area:caret;display:block!important;align-self:center}

/* Chevron — la rotación vive en el PATH interno, no en el propio .vxa-caret:
   el FLIP anima el transform del caret (WAAPI lo pisa) y la flecha cambiaba
   de dirección de golpe al terminar el viaje. En elementos separados, cada
   movimiento va por su carril y la rotación gira suave y en paralelo. */
.vxa-caret{display:block;width:.85rem;height:.85rem;flex:0 0 auto;align-self:center;color:var(--muted,#8b97a9);
  transition:color .2s}
.vxa-caret path{transform-box:view-box;transform-origin:center;transition:transform .32s cubic-bezier(.22,1,.36,1)}
.vxa.open .vxa-caret{color:var(--text)}
.vxa.open .vxa-caret path{transform:rotate(180deg)}
.vxa.closing .vxa-caret path{transform:rotate(0deg)}

/* Cajón desplegable — crece con grid-rows (muy suave) */
.vxa-drawer{display:grid;grid-template-rows:0fr;transition:grid-template-rows .42s cubic-bezier(.22,1,.36,1)}
.vxa.open .vxa-drawer{grid-template-rows:1fr}
.vxa-drawer-in{overflow:hidden;min-height:0;display:flex;flex-direction:column;padding:0 .45rem;margin-top:0;
  transition:padding .42s cubic-bezier(.22,1,.36,1),margin-top .42s}
.vxa.open .vxa-drawer-in{padding-bottom:.5rem;margin-top:.05rem}
.vxa-links{display:flex;flex-direction:column;padding-top:.35rem}
.vxa-menu-note{display:none}

/* Enlaces + salir */
.vxa-drawer a,.vxa-signout{display:flex;align-items:center;justify-content:space-between;gap:.6rem;
  text-align:left;background:none;border:none;color:var(--text);font:600 .85rem/1 'Inter',sans-serif;
  padding:.62rem .7rem;border-radius:.5rem;cursor:pointer;text-decoration:none;white-space:nowrap;
  opacity:0;transform:translateY(.4rem);
  transition:opacity .3s ease,transform .34s cubic-bezier(.22,1,.36,1),background .12s}
.vxa.open .vxa-drawer a,.vxa.open .vxa-signout{opacity:1;transform:none}
/* Cerrando: la superficie recorta (el cajón desaparece con ella al encoger)
   y las opciones se desvanecen mientras la cabecera viaja a la píldora */
.vxa.closing .vxa-drawer a,.vxa.closing .vxa-signout{opacity:0!important;transition:opacity .16s ease!important;transition-delay:0s!important}

/* Navegando desde el menú: la ficha se queda quieta, la opción elegida
   brilla y el resto cede protagonismo hasta que carga el destino */
.vxa.is-nav .vxa-drawer a,.vxa.is-nav .vxa-signout{opacity:.4;transition:opacity .25s ease}
.vxa.is-nav .vxa-drawer a.is-going{opacity:1;background:rgba(255,255,255,.1)}
.vxa.open .vxa-drawer a:nth-child(1){transition-delay:.05s}
.vxa.open .vxa-drawer a:nth-child(2){transition-delay:.08s}
.vxa.open .vxa-drawer a:nth-child(3){transition-delay:.11s}
.vxa.open .vxa-drawer a:nth-child(4){transition-delay:.14s}
.vxa.open .vxa-drawer a:nth-child(5){transition-delay:.17s}
.vxa.open .vxa-drawer a:nth-child(6){transition-delay:.20s}
.vxa.open .vxa-drawer a:nth-child(7){transition-delay:.23s}
.vxa.open .vxa-drawer a:nth-child(8){transition-delay:.26s}
.vxa.open .vxa-signout{transition-delay:.29s}
.vxa-drawer a:hover,.vxa-signout:hover{background:rgba(255,255,255,.06)}
.vxa-drawer a:focus-visible,.vxa-signout:focus-visible{outline:none;background:rgba(255,255,255,.08);box-shadow:0 0 0 .14rem rgba(57,213,255,.45)}
.vxa-mi-admin{color:#ffcf7a}
.vxa-mi-dot{display:inline-flex;align-items:center;justify-content:center;min-width:1.15rem;height:1.15rem;
  padding:0 .32rem;font:800 .64rem/1 'Oxanium',sans-serif;color:#fff;background:var(--accent,#FF3B47);border-radius:1rem;flex:0 0 auto;
  animation:vxa-dot-in .32s cubic-bezier(.34,1.56,.64,1) backwards}
.vxa-signout{color:#ff9ea4;margin-top:.35rem;border-radius:.5rem}
.vxa-signout:hover{background:rgba(255,59,71,.12);color:#ffc4c8}

/* ---------- Preferencias de visualización ---------- */
/* Móvil primero (<600px): controlado por data-mobile. Nombre y Elo ocultos por
   defecto; se muestra el elegido. Avatar y chevron siempre visibles. */
.vxa-name{display:none}
.vxa-elo{display:none}
@media(max-width:37.49em){
  .vxa[data-mobile="name"] .vxa-name{display:inline-flex}
  .vxa[data-mobile="elo"]  .vxa-elo{display:inline-flex}
}
@media(min-width:600px){
  .vxa[data-pc="both"] .vxa-name,.vxa[data-pc="name"] .vxa-name{display:inline-flex}
  .vxa[data-pc="both"] .vxa-elo,.vxa[data-pc="elo"]  .vxa-elo{display:inline-flex}
}
/* Variante compacta explícita (p.ej. navbar de partida): sin nombre */
.vx-account[data-compact] .vxa-name{display:none!important}

/* En móvil el chevron sobra (todo el chip abre el menú) y ahorra ancho */
@media(max-width:37.49em){ .vxa-caret{display:none} }

/* ---------- Entrada de la píldora (primera aparición tras resolver sesión).
   El contenedor anima SOLO transform: cualquier opacity/filter en un
   ancestro del cristal crea un backdrop root y apaga el blur (medido).
   El contenido (descendientes del cristal) sí puede fundirse en cascada. */
.vxa.vxa-enter{animation:vxa-in .58s cubic-bezier(.34,1.45,.64,1) backwards;
  transform-origin:calc(100% - var(--chip-h)/2) 50%}
html[dir="rtl"] .vxa.vxa-enter{transform-origin:calc(var(--chip-h)/2) 50%}
@keyframes vxa-in{from{transform:scale(.62) translateY(-.3rem)}}
.vxa-enter .vxa-av{animation:vxa-e-pop .5s cubic-bezier(.34,1.56,.64,1) .08s backwards}
.vxa-enter .vxa-name{animation:vxa-e-shift .45s cubic-bezier(.22,1,.36,1) .16s backwards}
.vxa-enter .vxa-elo{animation:vxa-e-pop .5s cubic-bezier(.34,1.56,.64,1) .22s backwards}
.vxa-enter .vxa-caret{animation:vxa-e-shift .45s cubic-bezier(.22,1,.36,1) .3s backwards}
@keyframes vxa-e-pop{from{opacity:0;transform:scale(.3)}}
@keyframes vxa-e-shift{from{opacity:0;transform:translateX(-.35rem)}}
@keyframes vxa-e-shift-r{from{opacity:0;transform:translateX(.35rem)}}
html[dir="rtl"] .vxa-enter .vxa-name,html[dir="rtl"] .vxa-enter .vxa-caret{animation-name:vxa-e-shift-r}
/* destello único que recorre la píldora al posarse. Radio EXPLÍCITO de
   píldora (el botón no tiene radio propio: heredar daba esquinas cuadradas)
   y jamás en el panel abierto. La clase .vxa-enter se retira sola al
   terminar la entrada, así que este pseudo no sobrevive a la animación. */
.vxa-enter .vxa-surface>.vxa-chip{position:relative}
.vxa-enter:not(.open) .vxa-surface>.vxa-chip::after{content:'';position:absolute;inset:0;
  border-radius:calc(var(--chip-h)/2);pointer-events:none;
  background:linear-gradient(105deg,transparent 34%,rgba(255,255,255,.13) 50%,transparent 66%) no-repeat;
  background-size:250% 100%;background-position:-150% 0;
  animation:vxa-e-sheen .85s ease-out .32s forwards}
@keyframes vxa-e-sheen{to{background-position:150% 0}}
/* el botón Entrar aterriza con la misma suavidad (sin cristal: opacity ok) */
.vxa-login.vxa-enter{animation:vxa-e-login .45s cubic-bezier(.22,1,.36,1) backwards}
@keyframes vxa-e-login{from{opacity:0;transform:translateY(-.3rem) scale(.94)}}

@media(prefers-reduced-motion:reduce){
  .vxa-surface,.vxa-drawer,.vxa-caret,.vxa-caret path,.vxa-drawer a,.vxa-signout{transition:none}
  .vxa-dot,.vxa-dot::after,.vxa-mi-dot{animation:none}
  .vxa.vxa-enter,.vxa-enter .vxa-av,.vxa-enter .vxa-name,.vxa-enter .vxa-elo,.vxa-enter .vxa-caret,.vxa-login.vxa-enter{animation:none}
  .vxa-enter .vxa-surface>.vxa-chip::after{display:none}
}
`;
