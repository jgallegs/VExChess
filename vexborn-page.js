// ============================================================
//  VEXCHESS · Página Vexborn (roster de personajes cosméticos)
//  Galería por colección · ficha cinematográfica · equipar.
// ============================================================
import { onAuth, getUser, api, isAuthResolved, openAuth } from './auth.js?v=15';
import {
  VEXBORN, COLLECTIONS, rarityMeta, vexbornByKey,
  vexbornAvailable, vexbornPortrait,
} from './vexborn.js?v=1';

const root = document.getElementById('vexborn-root');
let user = null;
let equipping = false;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pieceEmoji(v) {
  const p = (v.piece || '').toLowerCase();
  if (p.includes('reina') || p.includes('reina')) return '♛';
  if (p.includes('rey')) return '♚';
  if (p.includes('torre')) return '♜';
  if (p.includes('alfil')) return '♝';
  if (p.includes('caballo')) return '♞';
  if (p.includes('peón') || p.includes('peon')) return '♟';
  return '♟';
}
function equippedKey() { return user && user.vexborn ? user.vexborn : null; }

// ---------- render principal ----------
function render() {
  if (!isAuthResolved()) { root.innerHTML = loadingHTML(); return; }
  if (!user) { root.innerHTML = guestHTML(); wireGuest(); return; }

  const eqKey = equippedKey();
  const eq = eqKey ? vexbornByKey(eqKey) : null;

  root.innerHTML =
    heroHTML(eq) +
    Object.keys(COLLECTIONS).map(cid => collectionHTML(cid)).join('') +
    footerNoteHTML();

  wireCards();
  const unEq = root.querySelector('.vb-hero-unequip');
  if (unEq) unEq.addEventListener('click', () => doEquip(null));
}

function loadingHTML() {
  return '<div class="vb-loading"><div class="vb-ring"></div><p>Cargando Vexborn…</p></div>';
}
function guestHTML() {
  return '<section class="vb-guest">' +
      '<div class="vb-guest-icon">✦</div>' +
      '<h1>Vexborn</h1>' +
      '<p>Los personajes de VEXCHESS. Inicia sesión para ver el roster y equipar el tuyo.</p>' +
      '<button class="vb-btn primary" type="button" id="vb-login">Entrar</button>' +
    '</section>';
}
function wireGuest() {
  const b = document.getElementById('vb-login');
  if (b) b.addEventListener('click', () => openAuth('login'));
}

// ---------- héroe (equipado actual) ----------
function heroHTML(eq) {
  if (eq && vexbornAvailable(eq)) {
    const rm = rarityMeta(eq.rarity);
    return '<section class="vb-hero equipped" style="--rar:' + rm.color + '">' +
        '<div class="vb-hero-art"><img src="' + esc(vexbornPortrait(eq)) + '" alt=""></div>' +
        '<div class="vb-hero-body">' +
          '<span class="vb-eyebrow">Vexborn equipado</span>' +
          '<h1 class="vb-hero-name">' + esc(eq.name) + '</h1>' +
          '<p class="vb-hero-title">' + esc(eq.title) + '</p>' +
          '<p class="vb-hero-quote">“' + esc(eq.quote) + '”</p>' +
          '<div class="vb-hero-meta">' +
            '<span class="vb-rar" style="--rar:' + rm.color + '">' + esc(rm.label) + '</span>' +
            '<span class="vb-chip-piece">' + pieceEmoji(eq) + ' ' + esc(eq.piece) + '</span>' +
            '<span class="vb-chip-piece">' + esc(eq.archetype) + '</span>' +
          '</div>' +
          '<button class="vb-btn ghost vb-hero-unequip" type="button">Desequipar</button>' +
        '</div>' +
      '</section>';
  }
  return '<section class="vb-hero empty">' +
      '<div class="vb-hero-art placeholder"><span>✦</span></div>' +
      '<div class="vb-hero-body">' +
        '<span class="vb-eyebrow">Vexborn</span>' +
        '<h1 class="vb-hero-name">Elige tu Vexborn</h1>' +
        '<p class="vb-hero-title">Un personaje que representa tu identidad en el tablero. Solo cosmético: no cambia reglas, Elo ni emparejamiento.</p>' +
        '<p class="vb-hero-hint">Toca una carta para ver su historia y equiparla.</p>' +
      '</div>' +
    '</section>';
}

// ---------- colecciones ----------
function collectionHTML(cid) {
  const col = COLLECTIONS[cid];
  const list = VEXBORN.filter(v => v.collection === cid);
  const soon = list.every(v => !vexbornAvailable(v));
  return '<section class="vb-collection">' +
      '<header class="vb-col-head">' +
        '<div><h2>' + esc(col.label) + '</h2><p>' + esc(col.desc) + '</p></div>' +
        (soon ? '<span class="vb-soon-tag">Próximamente</span>' : '<span class="vb-count">' + list.length + ' personajes</span>') +
      '</header>' +
      '<div class="vb-grid">' + list.map(cardHTML).join('') + '</div>' +
    '</section>';
}

function cardHTML(v) {
  const rm = rarityMeta(v.rarity);
  const avail = vexbornAvailable(v);
  const isEq = equippedKey() === v.key;
  const art = avail
    ? '<img src="' + esc(vexbornPortrait(v)) + '" alt="">'
    : '<span class="vb-card-silhouette">' + pieceEmoji(v) + '</span>';
  return '<button class="vb-card' + (avail ? '' : ' locked') + (isEq ? ' equipped' : '') + '" type="button"' +
      ' data-key="' + esc(v.key) + '" style="--rar:' + rm.color + '">' +
      '<span class="vb-card-rar" style="--rar:' + rm.color + '">' + esc(rm.label) + '</span>' +
      (isEq ? '<span class="vb-card-eqtag">Equipado</span>' : '') +
      '<span class="vb-card-art">' + art + '</span>' +
      '<span class="vb-card-info">' +
        '<b class="vb-card-name">' + esc(v.name) + '</b>' +
        '<span class="vb-card-title">' + esc(v.title) + '</span>' +
        '<span class="vb-card-piece">' + pieceEmoji(v) + ' ' + esc(v.piece) + '</span>' +
      '</span>' +
      (avail ? '' : '<span class="vb-card-lock">Próximamente</span>') +
    '</button>';
}

function footerNoteHTML() {
  return '<p class="vb-legal">Los Vexborn son puramente cosméticos. No otorgan ninguna ventaja en la partida ni afectan al emparejamiento, al Elo o a la IA.</p>';
}

// ---------- ficha (detalle) ----------
function openFicha(key) {
  const v = vexbornByKey(key);
  if (!v) return;
  const rm = rarityMeta(v.rarity);
  const avail = vexbornAvailable(v);
  const isEq = equippedKey() === v.key;

  const art = avail
    ? '<img src="' + esc(vexbornPortrait(v)) + '" alt="">'
    : '<span class="vb-fi-silhouette">' + pieceEmoji(v) + '</span>';

  let action;
  if (!avail) action = '<div class="vb-fi-soon">Este Vexborn llegará pronto. Su arte todavía está en el taller.</div>';
  else if (isEq) action = '<button class="vb-btn ghost" type="button" data-equip="">Desequipar</button>';
  else action = '<button class="vb-btn primary" type="button" data-equip="' + esc(v.key) + '">Equipar Vexborn</button>';

  const wrap = document.createElement('div');
  wrap.className = 'vb-modal';
  wrap.innerHTML =
    '<div class="vb-modal-scrim"></div>' +
    '<div class="vb-fi" style="--rar:' + rm.color + '" role="dialog" aria-modal="true">' +
      '<button class="vb-fi-close" type="button" aria-label="Cerrar">✕</button>' +
      '<div class="vb-fi-art' + (avail ? '' : ' placeholder') + '">' + art +
        '<span class="vb-fi-rar" style="--rar:' + rm.color + '">' + esc(rm.label) + '</span>' +
      '</div>' +
      '<div class="vb-fi-body">' +
        '<span class="vb-fi-eyebrow">' + esc(COLLECTIONS[v.collection].label) + '</span>' +
        '<h2 class="vb-fi-name">' + esc(v.name) + '</h2>' +
        '<p class="vb-fi-title">' + esc(v.title) + '</p>' +
        '<p class="vb-fi-quote">“' + esc(v.quote) + '”</p>' +
        '<div class="vb-fi-stats">' +
          '<div><span>Pieza</span><b>' + pieceEmoji(v) + ' ' + esc(v.piece) + '</b></div>' +
          '<div><span>Arquetipo</span><b>' + esc(v.archetype) + '</b></div>' +
          '<div><span>Color</span><b>' + esc(v.color) + '</b></div>' +
        '</div>' +
        '<p class="vb-fi-desc">' + esc(v.desc) + '</p>' +
        '<div class="vb-fi-pers"><span>Personalidad</span><p>' + esc(v.personality) + '</p></div>' +
        '<div class="vb-fi-actions">' + action + '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));

  const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 200); };
  wrap.querySelector('.vb-fi-close').addEventListener('click', close);
  wrap.querySelector('.vb-modal-scrim').addEventListener('click', close);
  const eqBtn = wrap.querySelector('[data-equip]');
  if (eqBtn) eqBtn.addEventListener('click', () => {
    const k = eqBtn.getAttribute('data-equip');
    close();
    doEquip(k || null);
  });
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

// ---------- equipar ----------
async function doEquip(key) {
  if (equipping) return;
  equipping = true;
  try {
    const out = await api.updateProfile({ vexborn: key });
    user = out.user;
    if (key) {
      const v = vexbornByKey(key);
      if (v) revealAnimation(v);
    }
    render();
  } catch (e) {
    toast('No se pudo equipar. Inténtalo de nuevo.');
  } finally {
    equipping = false;
  }
}

function revealAnimation(v) {
  const rm = rarityMeta(v.rarity);
  const el = document.createElement('div');
  el.className = 'vb-reveal';
  el.style.setProperty('--rar', rm.color);
  el.innerHTML =
    '<div class="vb-reveal-burst"></div>' +
    '<div class="vb-reveal-card">' +
      '<div class="vb-reveal-art"><img src="' + esc(vexbornPortrait(v)) + '" alt=""></div>' +
      '<span class="vb-reveal-rar" style="--rar:' + rm.color + '">' + esc(rm.label) + '</span>' +
      '<b class="vb-reveal-name">' + esc(v.name) + '</b>' +
      '<span class="vb-reveal-title">' + esc(v.title) + '</span>' +
      '<span class="vb-reveal-eq">Vexborn equipado</span>' +
    '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 350); };
  el.addEventListener('click', kill);
  setTimeout(kill, 2600);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'vb-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 250); }, 2400);
}

function wireCards() {
  root.querySelectorAll('.vb-card').forEach(c => {
    c.addEventListener('click', () => openFicha(c.getAttribute('data-key')));
  });
}

// ---------- init ----------
onAuth(u => { user = u; render(); });
render();
