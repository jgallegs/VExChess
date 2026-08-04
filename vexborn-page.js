// ============================================================
//  VEXCHESS · Códice Vexborn
//  Galería narrativa por expansión · timeline del universo ·
//  ficha con lore, concepto de ajedrez y Senda de Maestría ·
//  teaser de NULL. Equipar cambia solo cosmética (sin ventaja).
// ============================================================
import { t } from './i18n.js?v=9';
import { onAuth, getUser, api, isAuthResolved, openAuth } from './auth.js?v=16';
import {
  VEXBORN, EXPANSIONS, expansions, rarityMeta, vexbornByKey, vexbornByCollection,
  vexbornAvailable, vexbornPortrait, vexbornCard, vexbornSplash, vexbornBanner,
} from './vexborn.js?v=4';

const root = document.getElementById('vexborn-root');
let user = null;
let equipping = false;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pieceEmoji(v) {
  const p = (v.piece || '').toLowerCase();
  if (p.includes('reina') || p.includes('dama') || p.includes('queen')) return '♛';
  if (p.includes('rey') || p.includes('king')) return '♚';
  if (p.includes('torre') || p.includes('rook')) return '♜';
  if (p.includes('alfil') || p.includes('bishop')) return '♝';
  if (p.includes('caballo') || p.includes('knight')) return '♞';
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
    codexIntroHTML() +
    timelineHTML() +
    expansions().map(expansionHTML).join('') +
    footerNoteHTML();

  wireCards();
  const unEq = root.querySelector('.vb-hero-unequip');
  if (unEq) unEq.addEventListener('click', () => doEquip(null));
}

function loadingHTML() {
  return '<div class="vb-loading"><div class="vb-ring"></div><p>' + t('vexborn.loading') + '</p></div>';
}
function guestHTML() {
  return '<section class="vb-guest">' +
      '<div class="vb-guest-icon">✦</div>' +
      '<h1>' + t('vexborn.codex.title') + '</h1>' +
      '<p>' + t('vexborn.guest.desc') + '</p>' +
      '<button class="vb-btn primary" type="button" id="vb-login">' + t('vexborn.guest.login') + '</button>' +
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
        '<div class="vb-hero-bg" style="background-image:url(' + esc(vexbornBanner(eq)) + ')"></div>' +
        '<div class="vb-hero-art"><img src="' + esc(vexbornSplash(eq)) + '" alt="" loading="lazy"></div>' +
        '<div class="vb-hero-body">' +
          '<span class="vb-eyebrow">' + t('vexborn.hero.equippedEyebrow') + '</span>' +
          '<h1 class="vb-hero-name">' + esc(eq.name) + '</h1>' +
          '<p class="vb-hero-title">' + esc(eq.title) + '</p>' +
          '<p class="vb-hero-quote">“' + esc(eq.quote) + '”</p>' +
          '<div class="vb-hero-meta">' +
            '<span class="vb-rar" style="--rar:' + rm.color + '">' + esc(rm.label) + '</span>' +
            '<span class="vb-chip-piece">' + pieceEmoji(eq) + ' ' + esc(eq.piece) + '</span>' +
            '<span class="vb-chip-concept">' + esc(eq.concept) + '</span>' +
          '</div>' +
          '<button class="vb-btn ghost vb-hero-unequip" type="button">' + t('vexborn.hero.unequip') + '</button>' +
        '</div>' +
      '</section>';
  }
  return '<section class="vb-hero codex">' +
      '<div class="vb-hero-body wide">' +
        '<span class="vb-eyebrow">' + t('vexborn.codex.eyebrow') + '</span>' +
        '<h1 class="vb-hero-name">' + t('vexborn.codex.title') + '</h1>' +
        '<p class="vb-hero-hint">' + t('vexborn.codex.intro') + '</p>' +
      '</div>' +
    '</section>';
}

// ---------- intro del códice + timeline ----------
function codexIntroHTML() {
  if (!equippedKey()) return ''; // ya se muestra en el héroe vacío
  return '<p class="vb-codex-intro">' + t('vexborn.codex.intro') + '</p>';
}
function timelineHTML() {
  return '<section class="vb-timeline">' +
      '<h2 class="vb-tl-title">' + t('vexborn.timeline.title') + '</h2>' +
      '<ol class="vb-tl">' +
        '<li class="vb-tl-act on"><span class="vb-tl-dot"></span>' + esc(t('vexborn.timeline.act1')) + '</li>' +
        '<li class="vb-tl-act on"><span class="vb-tl-dot"></span>' + esc(t('vexborn.timeline.act2')) + '</li>' +
        '<li class="vb-tl-act future"><span class="vb-tl-dot"></span>' + esc(t('vexborn.timeline.act3')) + '</li>' +
      '</ol>' +
    '</section>';
}

// ---------- sección de expansión ----------
function expansionHTML(exp) {
  if (exp.key === 'nullvariation') return nullTeaserHTML(exp);
  const list = vexbornByCollection(exp.key);
  const bg = exp.keyart ? '<div class="vb-exp-bg" style="background-image:url(' + esc(exp.keyart) + ')"></div>' : '';
  return '<section class="vb-exp" style="--acc:' + exp.accent + '">' +
      '<header class="vb-exp-head">' + bg +
        '<div class="vb-exp-head-in">' +
          '<span class="vb-exp-status">' + esc(exp.status) + '</span>' +
          '<h2 class="vb-exp-name">' + esc(exp.name) + '</h2>' +
          '<p class="vb-exp-sub">' + esc(exp.subtitle) + '</p>' +
          '<p class="vb-exp-tag">“' + esc(exp.tagline) + '”</p>' +
        '</div>' +
      '</header>' +
      '<p class="vb-exp-premise">' + esc(exp.premise) + '</p>' +
      '<div class="vb-exp-count">' + t('vexborn.expChampions', { count: list.length }) + '</div>' +
      '<div class="vb-grid">' + list.map(cardHTML).join('') + '</div>' +
    '</section>';
}

function cardHTML(v) {
  const rm = rarityMeta(v.rarity);
  const isEq = equippedKey() === v.key;
  return '<button class="vb-card' + (isEq ? ' equipped' : '') + '" type="button"' +
      ' data-key="' + esc(v.key) + '" style="--rar:' + rm.color + '">' +
      '<span class="vb-card-rar" style="--rar:' + rm.color + '">' + esc(rm.label) + '</span>' +
      (isEq ? '<span class="vb-card-eqtag">' + t('vexborn.card.equipped') + '</span>' : '') +
      '<span class="vb-card-art"><img src="' + esc(vexbornPortrait(v)) + '" alt="" loading="lazy"></span>' +
      '<span class="vb-card-info">' +
        '<b class="vb-card-name">' + esc(v.name) + '</b>' +
        '<span class="vb-card-title">' + esc(v.title) + '</span>' +
        '<span class="vb-card-concept">' + pieceEmoji(v) + ' ' + esc(v.concept) + '</span>' +
      '</span>' +
    '</button>';
}

// ---------- teaser de NULL (tercera expansión) ----------
function nullTeaserHTML(exp) {
  return '<section class="vb-null">' +
      '<div class="vb-null-void" aria-hidden="true"><span class="vb-null-eval"></span></div>' +
      '<div class="vb-null-body">' +
        '<span class="vb-null-status">' + esc(exp.status) + '</span>' +
        '<h2 class="vb-null-name">' + esc(exp.name) + '</h2>' +
        '<p class="vb-null-sub">' + esc(exp.subtitle) + '</p>' +
        '<p class="vb-null-tag">“' + esc(exp.tagline) + '”</p>' +
        '<p class="vb-null-desc">' + t('vexborn.null.desc') + '</p>' +
        '<p class="vb-null-signal">' + t('vexborn.null.signal') + '</p>' +
      '</div>' +
    '</section>';
}

function footerNoteHTML() {
  return '<p class="vb-legal">' + t('vexborn.legal') + '</p>';
}

// ---------- ficha (detalle) ----------
function openFicha(key) {
  const v = vexbornByKey(key);
  if (!v) return;
  const rm = rarityMeta(v.rarity);
  const isEq = equippedKey() === v.key;
  const exp = EXPANSIONS[v.collection];

  const action = isEq
    ? '<button class="vb-btn ghost" type="button" data-equip="">' + t('vexborn.hero.unequip') + '</button>'
    : '<button class="vb-btn primary" type="button" data-equip="' + esc(v.key) + '">' + t('vexborn.ficha.equip') + '</button>';

  const fragmentRow = v.fragment
    ? '<div class="vb-fi-fragment"><span>' + t('vexborn.fragmentLabel') + '</span><b>◆ ' + esc(v.fragment) + '</b></div>' : '';

  const wrap = document.createElement('div');
  wrap.className = 'vb-modal';
  wrap.innerHTML =
    '<div class="vb-modal-scrim"></div>' +
    '<div class="vb-fi" style="--rar:' + rm.color + '" role="dialog" aria-modal="true">' +
      '<button class="vb-fi-close" type="button" aria-label="' + t('vexborn.ficha.close') + '">✕</button>' +
      '<div class="vb-fi-art"><img src="' + esc(vexbornSplash(v)) + '" alt="" loading="lazy">' +
        '<span class="vb-fi-rar" style="--rar:' + rm.color + '">' + esc(rm.label) + '</span>' +
      '</div>' +
      '<div class="vb-fi-body">' +
        '<span class="vb-fi-eyebrow">' + esc(exp ? exp.name : '') + '</span>' +
        '<h2 class="vb-fi-name">' + esc(v.name) + '</h2>' +
        '<p class="vb-fi-title">' + esc(v.title) + '</p>' +
        '<p class="vb-fi-quote">“' + esc(v.quote) + '”</p>' +
        '<div class="vb-fi-concept"><span>' + t('vexborn.concept.label') + '</span><b>' + pieceEmoji(v) + ' ' + esc(v.concept) + '</b></div>' +
        fragmentRow +
        '<div class="vb-fi-stats">' +
          '<div><span>' + t('vexborn.ficha.statPiece') + '</span><b>' + esc(v.piece) + '</b></div>' +
          '<div><span>' + t('vexborn.ficha.statArchetype') + '</span><b>' + esc(v.archetype) + '</b></div>' +
          '<div><span>' + t('vexborn.ficha.statColor') + '</span><b>' + esc(v.color) + '</b></div>' +
        '</div>' +
        '<div class="vb-fi-block"><span>' + t('vexborn.chronicleLabel') + '</span><p>' + esc(v.desc) + '</p></div>' +
        '<div class="vb-fi-block"><span>' + t('vexborn.ficha.personality') + '</span><p>' + esc(v.personality) + '</p></div>' +
        '<div class="vb-fi-mastery"><b>' + t('vexborn.mastery.label') + '</b><span>' + t('vexborn.mastery.teaser') + '</span><small>' + t('vexborn.mastery.note') + '</small></div>' +
        '<div class="vb-fi-actions">' + action + '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));

  const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 200); };
  wrap.querySelector('.vb-fi-close').addEventListener('click', close);
  wrap.querySelector('.vb-modal-scrim').addEventListener('click', close);
  const eqBtn = wrap.querySelector('[data-equip]');
  if (eqBtn) eqBtn.addEventListener('click', () => { const k = eqBtn.getAttribute('data-equip'); close(); doEquip(k || null); });
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
    if (key) { const v = vexbornByKey(key); if (v) revealAnimation(v); }
    render();
  } catch (e) {
    toast(t('vexborn.toast.equipError'));
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
      '<span class="vb-reveal-eq">' + t('vexborn.hero.equippedEyebrow') + '</span>' +
    '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 350); };
  el.addEventListener('click', kill);
  setTimeout(kill, 2600);
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'vb-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); }, 2400);
}

function wireCards() {
  root.querySelectorAll('.vb-card').forEach(c => {
    c.addEventListener('click', () => openFicha(c.getAttribute('data-key')));
  });
}

// ---------- init ----------
onAuth(u => { user = u; render(); });
render();
