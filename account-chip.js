// ============================================================
//  VEXCHESS · Componente de cuenta (chip + menú) reutilizable
//  ------------------------------------------------------------
//  Presentacional y DESACOPLADO del estado:
//    - No conoce el API ni la sesión. auth.js le pasa el modelo
//      (usuario, avisos, insignias) y un contexto con helpers
//      (avatarHTML, roleMeta, badgeIcon) + manejadores (login,
//      signout).
//    - Se auto-inyecta sus estilos una sola vez (sin tocar HTML).
//    - Mobile-first y adaptable por variante: el mismo componente
//      sirve para la navbar del sitio y la de partida.
//
//  API pública:
//    eloTier(elo)                     → clave de rango ('novice'…)
//    accountChipHTML(model, ctx)      → string de markup
//    mountAccountChip(slot, model, ctx)  pinta + cablea un slot
// ============================================================
import { t } from './i18n.js?v=9';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- escala de rango por Elo ----------
// Determina color e identidad visual del pill de puntuación.
// Umbrales de ajedrez habituales; ampliable sin tocar el CSS (data-tier).
const ELO_TIERS = [
  [2200, 'master'],
  [1800, 'expert'],
  [1500, 'advanced'],
  [1200, 'skilled'],
  [0,    'novice'],
];
export function eloTier(elo) {
  const e = Number(elo) || 0;
  for (const [min, key] of ELO_TIERS) if (e >= min) return key;
  return 'novice';
}

// ---------- enlaces del menú de cuenta (data-driven → escalable) ----------
// [href, i18nKey|texto, claveDeAviso?]  ·  la clave de aviso mapea a un
// contador del modelo (incoming / challenges) para pintar el badge.
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

// ---------- markup ----------
export function accountChipHTML(model, ctx) {
  const user = model && model.user;
  if (!user) {
    return '<button class="vxa-login" type="button">' + t('auth.chip.login') + '</button>';
  }
  const avatarHTML = ctx.avatarHTML;
  const roleMeta = ctx.roleMeta;
  const badgeIcon = ctx.badgeIcon;

  const incoming = model.notifCount || 0;
  const challenges = model.challengeCount || 0;
  const total = incoming + challenges;

  const rm = (roleMeta ? roleMeta(user.role) : { label: '', color: '#8b97a9' });
  const roleColor = rm.color || '#8b97a9';
  const isStaff = user.role && user.role !== 'member';
  const tier = eloTier(user.elo);
  const featured = (model.badges || []).find(b => b.featured);

  const dot = total > 0
    ? '<span class="vxa-dot" title="' + (total === 1
        ? t('auth.chip.notificationsTitle', { count: total })
        : t('auth.chip.notificationsTitlePlural', { count: total })) + '"></span>'
    : '';

  // Avatar con anillo de rol (color por rango de la cuenta)
  const avatar =
    '<span class="vxa-av' + (isStaff ? ' is-staff' : '') + '" style="--role:' + roleColor + '">' +
      (avatarHTML ? avatarHTML(user.avatar) : '') + dot +
    '</span>';

  const eloPill =
    '<span class="vxa-elo" data-tier="' + tier + '" aria-label="' +
      esc(t('auth.chip.ratingAria', { elo: user.elo })) + '">' +
      '<i class="vxa-elo-mark" aria-hidden="true"></i>' + esc(user.elo) +
    '</span>';

  const chip =
    '<button class="vxa-chip" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="' +
        esc(t('auth.chip.menuAria')) + '">' +
      avatar +
      '<span class="vxa-id">' +
        '<span class="vxa-name">' + esc(user.username) + '</span>' +
        (featured && badgeIcon ? badgeIcon(featured.badge, 'chip') : '') +
      '</span>' +
      eloPill +
      '<svg class="vxa-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</button>';

  // Cabecera del menú: identidad completa (visible aun con chip compacto en móvil)
  const head =
    '<div class="vxa-head">' +
      '<span class="vxa-head-av' + (isStaff ? ' is-staff' : '') + '" style="--role:' + roleColor + '">' +
        (avatarHTML ? avatarHTML(user.avatar) : '') +
      '</span>' +
      '<span class="vxa-head-id">' +
        '<b class="vxa-head-name">' + esc(user.username) + '</b>' +
        '<span class="vxa-head-meta">' +
          (rm.label ? '<span class="vxa-role" style="--role:' + roleColor + '">' + esc(rm.label) + '</span>' : '') +
          '<span class="vxa-elo" data-tier="' + tier + '"><i class="vxa-elo-mark" aria-hidden="true"></i>' + esc(user.elo) + '</span>' +
        '</span>' +
      '</span>' +
    '</div>';

  const links = menuLinks(user).map(([href, label, notifKey, extraCls]) => {
    let badge = '';
    if (notifKey === 'incoming' && incoming > 0) badge = '<span class="vxa-mi-dot">' + incoming + '</span>';
    else if (notifKey === 'challenges' && challenges > 0) badge = '<span class="vxa-mi-dot">' + challenges + '</span>';
    return '<a href="' + href + '"' + (extraCls ? ' class="' + extraCls + '"' : '') + ' role="menuitem">' +
      esc(label) + badge + '</a>';
  }).join('');

  const menu =
    '<div class="vxa-menu" role="menu">' +
      head +
      '<div class="vxa-links">' + links + '</div>' +
      '<button type="button" class="vxa-signout" role="menuitem">' + t('auth.menu.signout') + '</button>' +
    '</div>';

  return '<div class="vxa">' + chip + menu + '</div>';
}

// ---------- montaje + cableado ----------
export function mountAccountChip(slot, model, ctx) {
  if (!slot) return;
  ensureStyles();
  slot.innerHTML = accountChipHTML(model, ctx);

  const login = slot.querySelector('.vxa-login');
  if (login && ctx.onLogin) login.addEventListener('click', ctx.onLogin);

  const root = slot.querySelector('.vxa');
  const chip = slot.querySelector('.vxa-chip');
  if (chip && root) {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = root.classList.toggle('open');
      chip.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  const so = slot.querySelector('.vxa-signout');
  if (so && ctx.onSignout) so.addEventListener('click', ctx.onSignout);
}

// Cierra cualquier menú abierto (para el listener global de auth.js).
export function closeAllAccountMenus() {
  document.querySelectorAll('.vxa.open').forEach(a => {
    a.classList.remove('open');
    const c = a.querySelector('.vxa-chip');
    if (c) c.setAttribute('aria-expanded', 'false');
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
.vxa{position:relative;display:inline-flex;align-items:center;font-family:'Inter',system-ui,sans-serif}

/* Botón "Entrar" (sin sesión) */
.vxa-login{background:var(--panel-2);color:var(--text);border:var(--hair,1px) solid var(--border);
  border-radius:.6rem;padding:.5rem 1rem;font:700 .85rem 'Inter',sans-serif;cursor:pointer;
  transition:background .14s,border-color .14s,transform .1s}
.vxa-login:hover{background:#33405a;border-color:var(--vex-muted,#3a4a63)}
.vxa-login:active{transform:translateY(.05rem)}

/* Chip */
.vxa-chip{display:inline-flex;align-items:center;gap:.5rem;min-height:2.4rem;
  background:var(--panel-2);border:var(--hair,1px) solid var(--border);border-radius:2rem;
  padding:.28rem .6rem .28rem .32rem;cursor:pointer;color:var(--text);max-width:100%;
  transition:border-color .14s,background .14s,box-shadow .14s}
.vxa-chip:hover{border-color:var(--vex-muted,#3a4a63);background:#2b3547}
.vxa-chip:focus-visible{outline:none;box-shadow:0 0 0 .16rem rgba(57,213,255,.5)}
.vxa.open .vxa-chip{border-color:var(--vex-muted,#3a4a63);background:#2b3547}

/* Avatar con anillo de rol */
.vxa-av{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;border-radius:50%}
.vxa-av .vx-avatar{width:1.9rem;height:1.9rem;box-shadow:0 0 0 .13rem var(--panel-2),0 0 0 .16rem transparent}
.vxa-av.is-staff .vx-avatar{box-shadow:0 0 0 .13rem var(--panel-2),0 0 0 .22rem var(--role)}
.vxa-dot{position:absolute;top:-.12rem;right:-.12rem;width:.62rem;height:.62rem;border-radius:50%;
  background:var(--accent,#FF3B47);border:.12rem solid var(--panel-2);z-index:2;
  box-shadow:0 0 .35rem rgba(255,59,71,.85)}

/* Nombre + insignia */
.vxa-id{display:inline-flex;align-items:center;gap:.35rem;min-width:0}
.vxa-name{font:700 .85rem 'Inter',sans-serif;line-height:1;max-width:9rem;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vxa-id .vx-badge-ico.chip{margin:0}

/* Pill de puntuación (Elo) — color por rango, alto contraste sobre fondo oscuro */
.vxa-elo{display:inline-flex;align-items:center;gap:.28rem;flex:0 0 auto;
  font:800 .74rem 'Oxanium',sans-serif;letter-spacing:.01em;line-height:1;
  padding:.26rem .5rem;border-radius:.55rem;border:1px solid transparent;
  font-variant-numeric:tabular-nums;color:var(--tc,#cbd5e1);
  background:var(--tbg,rgba(148,163,184,.16));border-color:var(--tbd,rgba(148,163,184,.34))}
.vxa-elo-mark{width:.42rem;height:.42rem;border-radius:1px;flex:0 0 auto;
  background:currentColor;transform:rotate(45deg);opacity:.9}
.vxa-elo[data-tier=novice]  {--tc:#cbd5e1;--tbg:rgba(148,163,184,.16);--tbd:rgba(148,163,184,.36)}
.vxa-elo[data-tier=skilled] {--tc:#5fe0a0;--tbg:rgba(58,213,150,.14);--tbd:rgba(58,213,150,.34)}
.vxa-elo[data-tier=advanced]{--tc:#5cd8ff;--tbg:rgba(57,213,255,.14);--tbd:rgba(57,213,255,.36)}
.vxa-elo[data-tier=expert]  {--tc:#c4a2ff;--tbg:rgba(139,92,246,.18);--tbd:rgba(139,92,246,.40)}
.vxa-elo[data-tier=master]  {--tc:#f4c763;--tbg:rgba(244,199,99,.15);--tbd:rgba(244,199,99,.42)}

/* Chevron */
.vxa-caret{width:.85rem;height:.85rem;flex:0 0 auto;color:var(--muted,#8b97a9);
  transition:transform .18s ease,color .14s}
.vxa.open .vxa-caret{transform:rotate(180deg);color:var(--text)}

/* Menú desplegable */
.vxa-menu{position:absolute;right:0;top:calc(100% + .55rem);z-index:90;display:none;flex-direction:column;
  width:15rem;max-width:calc(100vw - 1.5rem);background:var(--panel);
  border:var(--hair,1px) solid var(--border);border-radius:.85rem;padding:.45rem;
  box-shadow:0 1.2rem 3rem rgba(0,0,0,.55)}
.vxa.open .vxa-menu{display:flex;animation:vxa-in .16s ease both}
@keyframes vxa-in{from{opacity:0;transform:translateY(-.3rem)}to{opacity:1;transform:none}}

/* Cabecera del menú (identidad completa) */
.vxa-head{display:flex;align-items:center;gap:.6rem;padding:.5rem .55rem .6rem;
  border-bottom:var(--hair,1px) solid var(--border);margin-bottom:.35rem}
.vxa-head-av{display:inline-grid;place-items:center;flex:0 0 auto}
.vxa-head-av .vx-avatar{width:2.5rem;height:2.5rem;box-shadow:0 0 0 .14rem var(--panel),0 0 0 .17rem transparent}
.vxa-head-av.is-staff .vx-avatar{box-shadow:0 0 0 .14rem var(--panel),0 0 0 .24rem var(--role)}
.vxa-head-id{display:flex;flex-direction:column;gap:.28rem;min-width:0}
.vxa-head-name{font:800 .95rem 'Inter',sans-serif;line-height:1;max-width:9.5rem;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vxa-head-meta{display:inline-flex;align-items:center;gap:.4rem;flex-wrap:wrap}
.vxa-role{font:800 .58rem 'Oxanium',sans-serif;letter-spacing:.06em;text-transform:uppercase;
  color:var(--role);padding:.18rem .42rem;border-radius:.35rem;line-height:1;
  background:color-mix(in srgb,var(--role) 16%,transparent);
  border:1px solid color-mix(in srgb,var(--role) 34%,transparent)}
@supports not (background:color-mix(in srgb,red,blue)){
  .vxa-role{background:rgba(139,151,169,.16);border:1px solid rgba(139,151,169,.34)}
}

/* Enlaces */
.vxa-links{display:flex;flex-direction:column}
.vxa-menu a,.vxa-signout{display:flex;align-items:center;justify-content:space-between;
  text-align:left;background:none;border:none;color:var(--text);
  font:600 .85rem 'Inter',sans-serif;padding:.6rem .7rem;border-radius:.5rem;
  cursor:pointer;text-decoration:none;transition:background .12s,color .12s}
.vxa-menu a:hover,.vxa-signout:hover{background:var(--panel-2)}
.vxa-menu a:focus-visible,.vxa-signout:focus-visible{outline:none;background:var(--panel-2);
  box-shadow:0 0 0 .14rem rgba(57,213,255,.45)}
.vxa-mi-admin{color:#ffcf7a}
.vxa-mi-dot{display:inline-flex;align-items:center;justify-content:center;min-width:1.15rem;
  height:1.15rem;padding:0 .32rem;font:800 .64rem 'Oxanium',sans-serif;color:#fff;
  background:var(--accent,#FF3B47);border-radius:1rem}
.vxa-signout{color:#ff9ea4;margin-top:.25rem;border-top:var(--hair,1px) solid var(--border);
  border-radius:0 0 .5rem .5rem}
.vxa-signout:hover{background:rgba(255,59,71,.12);color:#ffc4c8}

/* ---------- Responsive / variantes ----------
   Móvil primero: se oculta el nombre (queda avatar + Elo, compacto);
   la identidad completa vive en la cabecera del menú. */
.vxa-name{display:none}
@media(min-width:600px){.vxa-name{display:inline}}

/* Variante compacta explícita (p.ej. navbar de partida): siempre sin nombre */
.vx-account[data-compact] .vxa-name{display:none}

/* En pantallas muy estrechas mantenemos un ancho contenido y anclado a la
   derecha; max-width evita cualquier desbordamiento sea cual sea la posición. */
@media(max-width:420px){
  .vxa-menu{width:14rem}
}
@media(prefers-reduced-motion:reduce){
  .vxa-menu,.vxa-caret{animation:none;transition:none}
}
`;
