// ============================================================
//  VEXCHESS · Compañero Vexborn en partida (presencia cosmética)
//  El campeón equipado aparece en la partida y reacciona en los
//  momentos clave. Sin ventaja: solo voz, retrato e inmersión.
//  Nunca revela evaluaciones, jugadas candidatas ni amenazas.
// ============================================================
import { onAuth, getUser } from './auth.js?v=32';
import { t } from './i18n.js?v=9';
import { vexbornByKey, vexbornPortrait } from './vexborn.js?v=5';

let el = null, champ = null, hidden = false;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function ensureStyles() {
  if (document.getElementById('vxc-style')) return;
  const s = document.createElement('style'); s.id = 'vxc-style';
  s.textContent = [
    '.vxc{position:fixed;left:1rem;bottom:1rem;z-index:120;display:flex;align-items:center;gap:.6rem;max-width:20rem;',
    'background:rgba(13,17,23,.92);border:1px solid rgba(57,213,255,.35);border-radius:.9rem;padding:.5rem .7rem;',
    'box-shadow:0 .6rem 1.6rem rgba(0,0,0,.5);backdrop-filter:blur(6px);transform:translateY(1.4rem);opacity:0;',
    'transition:opacity .3s,transform .3s;pointer-events:auto;font-family:Inter,system-ui,sans-serif}',
    '.vxc.show{opacity:1;transform:none}',
    '.vxc-av{width:2.8rem;height:2.8rem;border-radius:.6rem;object-fit:cover;flex:none;border:1px solid rgba(57,213,255,.5)}',
    '.vxc-body{min-width:0}',
    '.vxc-name{font:800 .82rem Oxanium,sans-serif;color:#39D5FF;display:block;line-height:1.1}',
    '.vxc-say{margin:.15rem 0 0;font-size:.8rem;color:#e7ecf3;line-height:1.35}',
    '.vxc-x{position:absolute;top:.2rem;right:.35rem;background:none;border:none;color:#7d8592;font-size:1rem;cursor:pointer;line-height:1}',
    '.vxc-x:hover{color:#fff}',
    '.vxc.pulse{animation:vxcPulse .8s ease}',
    '@keyframes vxcPulse{0%,100%{box-shadow:0 .6rem 1.6rem rgba(0,0,0,.5)}50%{box-shadow:0 0 1.8rem rgba(57,213,255,.55)}}',
    /* si la página tiene dock (partida contra la IA), el compañero flota ENCIMA */
    'body:has(.dock) .vxc{bottom:5.8rem}',
    '@media(max-width:960px){.vxc{left:.6rem;bottom:.6rem;max-width:15rem}',
    'body:has(.dock) .vxc{bottom:calc(7.6rem + env(safe-area-inset-bottom, 0px))}}',
    '@media(prefers-reduced-motion:reduce){.vxc,.vxc.pulse{transition:none;animation:none}}',
  ].join('');
  document.head.appendChild(s);
}

function pulse() { if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
function render(text, isQuote) {
  if (!el) return;
  const s = el.querySelector('.vxc-say');
  if (s) s.textContent = isQuote ? ('“' + text + '”') : text;
  el.classList.add('show'); pulse();
}

// Monta (o re-monta) el compañero según el campeón equipado del usuario.
export function mountCompanion() {
  const u = getUser();
  if (!u || !u.vexborn) { if (el) { el.remove(); el = null; champ = null; } return; }
  const v = vexbornByKey(u.vexborn);
  if (!v) return;
  champ = v; ensureStyles();
  if (el) el.remove();
  el = document.createElement('div'); el.className = 'vxc';
  el.innerHTML =
    '<img class="vxc-av" src="' + esc(vexbornPortrait({ key: v.key })) + '" alt="" onerror="this.style.display=\'none\'">' +
    '<div class="vxc-body"><b class="vxc-name">' + esc(v.name) + '</b><p class="vxc-say"></p></div>' +
    '<button class="vxc-x" type="button" aria-label="cerrar">×</button>';
  document.body.appendChild(el);
  el.querySelector('.vxc-x').onclick = () => { hidden = true; el.classList.remove('show'); };
  if (!hidden) requestAnimationFrame(() => render(v.quote, true));
}

// Reacción en un momento de la partida: 'win' | 'lose' | 'draw' | 'check' | 'thinking'.
export function companionSay(kind) {
  if (!el || !champ || hidden) return;
  const line = t('vm.presence.' + kind);
  if (typeof line === 'string') render(line, false);
}

// Se re-monta cuando cambia la sesión (login/logout o cambio de campeón).
onAuth(() => { hidden = false; mountCompanion(); });
