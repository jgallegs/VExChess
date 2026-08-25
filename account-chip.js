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
import { t } from './i18n.js?v=9';

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
export function mountAccountChip(slot, model, ctx) {
  if (!slot) return;
  ensureStyles();
  slot.innerHTML = accountChipHTML(model, ctx);
  mounted.add(slot);

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
      const open = vxa.classList.toggle('open');
      chip.setAttribute('aria-expanded', open ? 'true' : 'false');
      syncWidth(vxa);
    });
    surface.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && vxa.classList.contains('open')) {
        vxa.classList.remove('open'); chip.setAttribute('aria-expanded', 'false'); syncWidth(vxa); chip.focus();
      }
    });
  }
  const so = slot.querySelector('.vxa-signout');
  if (so && ctx.onSignout) so.addEventListener('click', ctx.onSignout);
}

// La superficie es absoluta (para no empujar la navbar al crecer); el fantasma
// mantiene el hueco. Aquí igualamos el ancho de la superficie: colapsado = el
// del chip; abierto = un panel cómodo. Siempre en px → transición fluida.
function syncWidth(vxa) {
  const ghost = vxa.querySelector('.vxa-ghost');
  const surface = vxa.querySelector('.vxa-surface');
  if (!ghost || !surface) return;
  const w0 = Math.ceil(ghost.getBoundingClientRect().width);
  if (!w0) return;
  const open = vxa.classList.contains('open');
  // Mínimo del panel abierto en rem (el rem del documento es fluido)
  const minOpen = 15 * parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
  surface.style.width = (open ? Math.max(w0, minOpen) : w0) + 'px';
}

export function closeAllAccountMenus() {
  document.querySelectorAll('.vxa.open').forEach(vxa => {
    vxa.classList.remove('open');
    const c = vxa.querySelector('.vxa-surface > .vxa-chip');
    if (c) c.setAttribute('aria-expanded', 'false');
    syncWidth(vxa);
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

/* Botón "Entrar" (sin sesión) */
.vxa-login{background:var(--panel-2);color:var(--text);border:var(--hair,1px) solid var(--border);
  border-radius:.6rem;padding:.5rem 1rem;font:700 .85rem 'Inter',sans-serif;cursor:pointer;
  transition:background .14s,border-color .14s,transform .1s}
.vxa-login:hover{background:#33405a;border-color:var(--vex-muted,#3a4a63)}
.vxa-login:active{transform:translateY(.05rem)}

/* Fantasma: ocupa el hueco del chip colapsado (invisible, sin interacción) */
.vxa-ghost{visibility:hidden;pointer-events:none}

/* Superficie única que crece (liquid glass) */
.vxa-surface{position:absolute;top:0;right:0;z-index:70;display:flex;flex-direction:column;
  border-radius:calc(var(--chip-h)/2);
  background:linear-gradient(180deg,rgba(38,48,64,.80),rgba(20,26,35,.86));
  -webkit-backdrop-filter:blur(1.2rem) saturate(1.4);backdrop-filter:blur(1.2rem) saturate(1.4);
  border:none;
  box-shadow:inset 0 0 0 .07rem rgba(255,255,255,.06),0 .35rem .9rem rgba(0,0,0,.22);
  transition:width .42s cubic-bezier(.22,1,.36,1),border-radius .42s cubic-bezier(.22,1,.36,1),
    box-shadow .34s ease,background .34s ease}
.vxa:not(.open) .vxa-surface:hover{box-shadow:inset 0 0 0 .07rem rgba(255,255,255,.12),0 .35rem .9rem rgba(0,0,0,.22);
  background:linear-gradient(180deg,rgba(48,60,78,.82),rgba(28,35,47,.88))}
.vxa.open .vxa-surface{border-radius:calc(var(--chip-h)/2) calc(var(--chip-h)/2) 1.05rem 1.05rem;
  box-shadow:inset 0 0 0 .07rem rgba(255,255,255,.12),0 1.8rem 4rem rgba(0,0,0,.6)}
.vxa-surface:has(.vxa-chip:focus-visible){box-shadow:inset 0 0 0 .07rem rgba(255,255,255,.06),0 0 0 .16rem rgba(57,213,255,.5)}

/* Chip (fila cabecera) — transparente: la glass la pone la superficie */
.vxa-chip{display:flex;align-items:center;gap:.55rem;height:var(--chip-h);box-sizing:border-box;
  background:none;border:none;padding:.3rem .72rem .3rem .44rem;cursor:pointer;color:var(--text);
  max-width:100%;white-space:nowrap;font-family:inherit}
.vxa-chip:focus{outline:none}

/* Avatar con anillo de rol */
.vxa-av{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;align-self:center}
.vxa-av .vx-avatar{width:1.9rem;height:1.9rem;box-shadow:0 0 0 .13rem transparent;transition:width .3s cubic-bezier(.22,1,.36,1),height .3s cubic-bezier(.22,1,.36,1)}
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
.vxa-elo{display:inline-flex;align-items:center;justify-content:center;gap:.3rem;flex:0 0 auto;height:1.5rem;
  box-sizing:border-box;font:800 .74rem/1 'Oxanium',sans-serif;letter-spacing:.01em;
  padding:0 .55rem;border-radius:.5rem;font-variant-numeric:tabular-nums;
  color:var(--tc,#cbd5e1);background:var(--tbg,rgba(148,163,184,.16))}
.vxa-elo-num{font:inherit;translate:0 var(--elo-nudge,.19em)}
.vxa-elo-mark{display:block;width:.4rem;height:.4rem;border-radius:.07rem;flex:0 0 auto;background:currentColor;transform:rotate(45deg);opacity:.9}
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
  column-gap:.7rem;row-gap:.28rem;padding:.85rem 1.15rem;
  animation:vxa-head-in .34s ease both}
@keyframes vxa-head-in{from{opacity:.35}to{opacity:1}}
.vxa.open .vxa-surface .vxa-av{grid-area:av}
.vxa.open .vxa-surface .vxa-av .vx-avatar{width:2.5rem;height:2.5rem}
.vxa.open .vxa-surface .vxa-id{grid-area:id;display:inline-flex!important;justify-self:start;min-width:0}
.vxa.open .vxa-surface .vxa-name{display:inline-block!important;font:700 .95rem/1.3 'Inter',sans-serif;max-width:10.5rem}
.vxa.open .vxa-surface .vxa-elo{grid-area:elo;display:inline-flex!important;justify-self:start}
.vxa.open .vxa-surface .vxa-caret{grid-area:caret;display:block!important;align-self:center}

/* Chevron */
.vxa-caret{display:block;width:.85rem;height:.85rem;flex:0 0 auto;align-self:center;color:var(--muted,#8b97a9);
  transition:transform .32s cubic-bezier(.22,1,.36,1),color .2s}
.vxa.open .vxa-caret{transform:rotate(180deg);color:var(--text)}

/* Cajón desplegable — crece con grid-rows (muy suave) */
.vxa-drawer{display:grid;grid-template-rows:0fr;transition:grid-template-rows .42s cubic-bezier(.22,1,.36,1)}
.vxa.open .vxa-drawer{grid-template-rows:1fr}
.vxa-drawer-in{overflow:hidden;min-height:0;display:flex;flex-direction:column;padding:0 .45rem;
  border-top:0 solid transparent;margin-top:0;
  transition:padding .42s cubic-bezier(.22,1,.36,1),border-top-width .42s,margin-top .42s,border-top-color .08s}
.vxa.open .vxa-drawer-in{padding-bottom:.45rem;border-top-width:.07rem;border-top-color:rgba(255,255,255,.08);margin-top:.1rem;
  transition:padding .42s cubic-bezier(.22,1,.36,1),border-top-width .42s,margin-top .42s,border-top-color .25s .12s}
.vxa-links{display:flex;flex-direction:column;padding-top:.35rem}
.vxa-menu-note{display:none}

/* Enlaces + salir */
.vxa-drawer a,.vxa-signout{display:flex;align-items:center;justify-content:space-between;gap:.6rem;
  text-align:left;background:none;border:none;color:var(--text);font:600 .85rem/1 'Inter',sans-serif;
  padding:.62rem .7rem;border-radius:.5rem;cursor:pointer;text-decoration:none;white-space:nowrap;
  opacity:0;transform:translateY(.4rem);
  transition:opacity .3s ease,transform .34s cubic-bezier(.22,1,.36,1),background .12s}
.vxa.open .vxa-drawer a,.vxa.open .vxa-signout{opacity:1;transform:none}
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
.vxa-signout{color:#ff9ea4;margin-top:.2rem;border-top:.07rem solid rgba(255,255,255,.07);border-radius:0 0 .5rem .5rem}
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

@media(prefers-reduced-motion:reduce){
  .vxa-surface,.vxa-drawer,.vxa-caret,.vxa-drawer a,.vxa-signout{transition:none}
  .vxa-dot,.vxa-dot::after,.vxa-mi-dot{animation:none}
}
`;
