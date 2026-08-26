// ============================================================
//  VEXCHESS · Senda de Maestría — runner guiado por el campeón
//  Reutiliza el tablero holográfico de la Academia. Cada capítulo
//  enseña el concepto del campeón; al resolverlo sube el Vínculo y
//  desbloquea un fragmento de Crónica. El Trial final va sin pistas.
//  Sin ventaja competitiva: aprendizaje, narrativa y colección.
// ============================================================
import { t } from './i18n.js';
import { createBoard } from './academy-board.js';
import {
  sendaFor, chapterText, chronicleOf, rewardOf, sendaIntro,
  vinculoLevelName, sendaAccent,
} from './vexborn-mastery.js';
import { vexbornSplash, vexbornPortrait } from './vexborn.js';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmt(str, p) { return String(str).replace(/\{(\w+)\}/g, (m, k) => (p && p[k] != null ? p[k] : m)); }

async function postProgress(body) {
  const r = await fetch('/api/vexborn/mastery/progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

// ctx = { root, champ, name, mastery:{chapters,vinculo}, onExit(state) }
export function openSenda(ctx) {
  const senda = sendaFor(ctx.champ);
  if (!senda) return;
  const champ = ctx.champ;
  const acc = sendaAccent(champ);
  const total = senda.chapters.length;
  const done = new Set((ctx.mastery && ctx.mastery.chapters) || []);
  const chId = (ch) => champ + '-' + ch.k;
  // primer capítulo no completado (o el último si ya está todo)
  let start = senda.chapters.findIndex(ch => !done.has(chId(ch)));
  if (start < 0) start = 0;

  const s = {
    champ, senda, acc, total,
    completed: new Set([...done]),
    vinculo: (ctx.mastery && ctx.mastery.vinculo) || 0,
    idx: start, phase: 'teach', hintLevel: -1, board: null,
  };

  const root = ctx.root;
  root.innerHTML =
    '<section class="vm-runner" style="--acc:' + acc + '">' +
      '<div class="vm-top">' +
        '<button class="vm-back" id="vm-back" type="button">' + t('vm.ui.back') + '</button>' +
        '<div class="vm-id"><img src="' + esc(vexbornPortrait({ key: champ })) + '" alt="" onerror="this.style.display=\'none\'">' +
          '<div><b>' + esc(ctx.name) + '</b><span>' + t('vm.ui.sectionTitle') + '</span></div></div>' +
        '<div class="vm-vinculo"><div class="vm-vinculo-top"><b id="vm-lvl"></b><span id="vm-vpct"></span></div>' +
          '<div class="vm-bar"><i id="vm-vfill"></i></div></div>' +
      '</div>' +
      '<div class="vm-dots" id="vm-dots"></div>' +
      '<div class="vm-stage">' +
        '<div class="vm-board-col"><div class="vm-board" id="vm-board"></div><div class="vm-goal" id="vm-goal" hidden></div></div>' +
        '<div class="vm-coach">' +
          '<img class="vm-pose" src="' + esc(vexbornSplash({ key: champ })) + '" alt="" onerror="this.src=\'' + esc(vexbornPortrait({ key: champ })) + '\'">' +
          '<div class="vm-bubble"><span class="eyebrow" id="vm-eyebrow"></span><p class="vm-bubble-main" id="vm-say"></p><p class="vm-bubble-sub" id="vm-sub"></p>' +
            '<div class="vm-chronicle" id="vm-chron" hidden><span class="eyebrow">' + t('vm.ui.chronicleUnlocked') + '</span><p id="vm-chron-text"></p></div>' +
          '</div>' +
          '<div class="vm-actions" id="vm-actions"></div>' +
          '<div class="vm-hintbox" id="vm-hintbox" hidden></div>' +
        '</div>' +
      '</div>' +
    '</section>';

  document.getElementById('vm-back').onclick = () => exit();
  updateVinculo();
  renderDots();
  startChapter(s.idx);

  // ---- helpers ----
  function exit() { if (ctx.onExit) ctx.onExit({ chapters: [...s.completed], vinculo: s.vinculo }); }
  function updateVinculo() {
    const pct = Math.min(100, Math.round(s.completed.size / s.total * 100));
    s.vinculo = pct;
    const f = document.getElementById('vm-vfill'); if (f) f.style.width = pct + '%';
    const lvl = document.getElementById('vm-lvl'); if (lvl) lvl.textContent = vinculoLevelName(pct);
    const p = document.getElementById('vm-vpct'); if (p) p.textContent = t('vm.ui.vinculo') + ' ' + pct + '%';
  }
  function renderDots() {
    const el = document.getElementById('vm-dots'); if (!el) return;
    el.innerHTML = s.senda.chapters.map((ch, i) => {
      const cl = 'vm-dot' + (s.completed.has(chId(ch)) ? ' done' : '') + (i === s.idx ? ' on' : '') + (ch.trial ? ' trial' : '');
      return '<span class="' + cl + '"></span>';
    }).join('');
  }
  function setCoach(eyebrow, say, sub) {
    document.getElementById('vm-eyebrow').textContent = eyebrow || '';
    document.getElementById('vm-say').textContent = say || '';
    document.getElementById('vm-sub').textContent = sub || '';
  }
  function chapterField(ch, f) { return chapterText(champ, ch.k, f); }

  function startChapter(i) {
    s.idx = i; s.phase = 'teach'; s.hintLevel = -1;
    const ch = s.senda.chapters[i];
    renderDots();
    document.getElementById('vm-chron').hidden = true;
    document.getElementById('vm-hintbox').hidden = true;
    const goal = document.getElementById('vm-goal'); goal.hidden = true;
    // tablero: posición de la lección, no interactivo (vista previa)
    if (!s.board) s.board = createBoard(document.getElementById('vm-board'), { fen: ch.fen, orientation: ch.orientation, playerColor: ch.playerColor, holo: true, interactive: false, onAttempt });
    else s.board.reset(ch.fen, ch.orientation, ch.playerColor);
    s.board.setInteractive(false); s.board.lock();
    const eyebrow = fmt(t('vm.ui.chapter'), { n: i + 1, total: s.total }) + (ch.trial ? ' · ' + t('vm.ui.trialTag') : '');
    setCoach(eyebrow, chapterField(ch, 'title'), chapterField(ch, 'teach'));
    const acts = document.getElementById('vm-actions');
    acts.innerHTML = '<button class="vm-btn primary" id="vm-go" type="button">' + t('vm.ui.practice') + '</button>';
    document.getElementById('vm-go').onclick = () => startPractice();
  }

  function startPractice() {
    s.phase = 'practice'; s.hintLevel = -1;
    const ch = s.senda.chapters[s.idx];
    s.board.reset(ch.fen, ch.orientation, ch.playerColor);
    s.board.setInteractive(true); s.board.unlock();
    const goal = document.getElementById('vm-goal'); goal.hidden = false; goal.textContent = chapterField(ch, 'goal');
    document.getElementById('vm-chron').hidden = true;
    setCoach(t('vm.ui.observe'), chapterField(ch, 'observe'), ch.trial ? t('vm.ui.trialNoHints') : t('vm.ui.yourMove'));
    const acts = document.getElementById('vm-actions');
    if (ch.trial) { acts.innerHTML = ''; }
    else {
      acts.innerHTML = '<button class="vm-btn ghost" id="vm-hint" type="button">' + t('vm.ui.hint') + '</button>';
      document.getElementById('vm-hint').onclick = giveHint;
    }
    document.getElementById('vm-hintbox').hidden = true;
  }

  function giveHint() {
    const ch = s.senda.chapters[s.idx];
    const hints = chapterField(ch, 'hints'); const arr = Array.isArray(hints) ? hints : [];
    const maxLvl = Math.max(arr.length, 3);
    s.hintLevel = Math.min(maxLvl - 1, s.hintLevel + 1);
    const lvl = s.hintLevel;
    s.board.clearOverlays();
    if (arr.length) setCoach(t('vm.ui.observe'), arr[Math.min(lvl, arr.length - 1)], '');
    if (lvl >= 1) s.board.markSquare(ch.from, 'focus');
    if (lvl >= 2) s.board.markSquare(ch.to, 'cand');
    if (lvl >= maxLvl - 1) { s.board.arrow(ch.from, ch.to, 'good'); const hb = document.getElementById('vm-hint'); if (hb) hb.disabled = true; }
    const box = document.getElementById('vm-hintbox'); box.hidden = false;
    box.textContent = fmt(t('vm.ui.hintCount'), { n: lvl + 1, total: maxLvl }) + (lvl >= maxLvl - 1 ? ' · ' + t('vm.ui.lastHint') : '');
  }

  function onAttempt(uci, mv, api) {
    if (s.phase !== 'practice') return;
    const ch = s.senda.chapters[s.idx];
    if (ch.expected.includes(uci)) return onCorrect();
    // incorrecto: marca, deshace
    api.lock();
    setCoach(t('vm.ui.observe'), chapterField(ch, 'wrong'), '');
    api.flash(uci.slice(2, 4));
    setTimeout(() => { api.undoLast(); api.clearOverlays(); api.unlock(); }, 1200);
  }

  async function onCorrect() {
    const ch = s.senda.chapters[s.idx];
    s.board.lock(); s.board.setInteractive(false);
    s.board.clearOverlays(); s.board.arrow(ch.from, ch.to, 'good');
    setCoach(t('vm.ui.correct'), chapterField(ch, 'explain'), '');
    // Crónica del capítulo
    const chron = chronicleOf(champ);
    if (chron[s.idx]) { document.getElementById('vm-chron').hidden = false; document.getElementById('vm-chron-text').textContent = chron[s.idx]; }
    // persistir (solo si el jugador está logueado; si falla, seguimos localmente)
    const wasNew = !s.completed.has(chId(ch));
    s.completed.add(chId(ch));
    updateVinculo(); renderDots();
    if (wasNew) {
      const hintUsed = s.hintLevel < 0 ? 0 : Math.min(4, s.hintLevel + 1);
      try {
        const out = await postProgress({ champion: champ, chapter: chId(ch), correct: true, hintUsed, totalChapters: s.total });
        if (out && out.champions && out.champions[champ]) { s.vinculo = out.champions[champ].vinculo; updateVinculo(); }
      } catch (e) { /* offline / invitado: progreso local */ }
    }
    const acts = document.getElementById('vm-actions');
    const last = s.idx >= s.total - 1;
    acts.innerHTML = '<button class="vm-btn primary" id="vm-next" type="button">' + (last ? t('vm.ui.finishChapter') : t('vm.ui.next')) + '</button>';
    document.getElementById('vm-next').onclick = () => { if (last) renderComplete(); else startChapter(s.idx + 1); };
    document.getElementById('vm-hintbox').hidden = true;
  }

  function renderComplete() {
    const chron = chronicleOf(champ);
    root.querySelector('.vm-runner').innerHTML =
      '<div class="vm-complete">' +
        '<img src="' + esc(vexbornSplash({ key: champ })) + '" alt="" onerror="this.src=\'' + esc(vexbornPortrait({ key: champ })) + '\'">' +
        '<span class="eyebrow" style="color:var(--acc);font:800 .7rem Oxanium,sans-serif;letter-spacing:.1em;text-transform:uppercase">' + t('vm.ui.sectionTitle') + '</span>' +
        '<h2>' + t('vm.ui.completeTitle') + '</h2>' +
        '<p style="color:var(--muted);max-width:34rem">' + t('vm.ui.completeMsg') + '</p>' +
        '<span class="vm-reward">★ ' + esc(rewardOf(champ)) + '</span>' +
        '<ul class="vm-chron-list">' + chron.map(c => '<li>“' + esc(c) + '”</li>').join('') + '</ul>' +
        '<div class="vm-actions" style="justify-content:center;margin-top:.6rem"><button class="vm-btn primary" id="vm-done" type="button">' + t('vm.ui.back') + '</button></div>' +
      '</div>';
    document.getElementById('vm-done').onclick = () => exit();
  }
}
