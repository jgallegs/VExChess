// ============================================================
//  VEXCHESS · Comunidad
//  Amigos · Solicitudes · Buscar · Mi VEX ID (tarjeta + QR)
// ============================================================
import { t } from './i18n.js?v=9';
import { api, getUser, isAuthResolved, onAuth, openAuth, avatarHTML, repChipHTML, presenceHTML } from './auth.js?v=30';
import { badgeIcon, badgeMeta } from './badges.js?v=3';
import qrcode from './assets/vendor/qrcode.mjs?v=1';

const root = document.getElementById('comunidad-root');
const TABS = [['amigos', t('comunidad.tabs.amigos')], ['solicitudes', t('comunidad.tabs.solicitudes')], ['buscar', t('comunidad.tabs.buscar')], ['vexid', t('comunidad.tabs.vexid')]];
let tab = 'amigos', mounted = false, reqCount = 0, searchTimer = null, lastSearch = '';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function vexId(no) { return no ? 'VEX-' + String(no).padStart(4, '0') : 'VEX-—'; }
function repChip(rep) { return repChipHTML(rep); }

// ---------- toast ----------
let toastEl = null;
function toast(msg, ok) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'cm-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.className = 'cm-toast show' + (ok ? ' ok' : ' err');
  clearTimeout(toastEl._t); toastEl._t = setTimeout(() => { toastEl.className = 'cm-toast'; }, 2600);
}

// ---------- estado ----------
function stateHTML(inner) { return '<section class="cm-state">' + inner + '</section>'; }
function render() {
  if (!isAuthResolved()) { root.innerHTML = stateHTML('<div class="cm-ring"></div><p>' + t('comunidad.loading') + '</p>'); mounted = false; return; }
  const u = getUser();
  if (!u) {
    root.innerHTML = stateHTML('<img class="cm-state-logo" src="assets/knight-logo.svg" alt=""><h1>' + t('comunidad.loggedOut.title') + '</h1>' +
      '<p>' + t('comunidad.loggedOut.desc') + '</p>' +
      '<button class="btn-play" id="cm-login">' + t('comunidad.loggedOut.cta') + ' <span aria-hidden="true">→</span></button>');
    mounted = false;
    const lb = document.getElementById('cm-login'); if (lb) lb.addEventListener('click', () => openAuth('login'));
    return;
  }
  if (!mounted) { mountShell(); mounted = true; refreshReqCount(); loadTab(); }
}

function mountShell() {
  root.innerHTML =
    '<div class="cm-head"><span class="eyebrow">' + t('comunidad.head.eyebrow') + '</span><h1 class="cm-title">' + t('comunidad.head.title') + '</h1></div>' +
    '<div class="cm-tabs" id="cm-tabs">' + TABS.map(([id, label]) =>
      '<button class="cm-tab' + (id === tab ? ' active' : '') + '" data-tab="' + id + '">' + label +
        (id === 'solicitudes' ? '<span class="cm-tab-badge" id="cm-reqbadge" hidden></span>' : '') + '</button>').join('') + '</div>' +
    '<div class="cm-panel" id="cm-panel"></div>';
  document.querySelectorAll('.cm-tab').forEach(t => t.addEventListener('click', () => {
    tab = t.dataset.tab;
    document.querySelectorAll('.cm-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
    loadTab();
  }));
}

async function refreshReqCount() {
  try {
    const r = await api.commRequests();
    reqCount = (r.incoming || []).length;
    const badge = document.getElementById('cm-reqbadge');
    if (badge) { badge.textContent = reqCount; badge.hidden = reqCount === 0; }
  } catch (e) {}
}

function loadTab() {
  const panel = document.getElementById('cm-panel');
  panel.innerHTML = '<div class="cm-loading">' + t('comunidad.loading') + '</div>';
  if (tab === 'amigos') return loadFriends(panel);
  if (tab === 'solicitudes') return loadRequests(panel);
  if (tab === 'buscar') return loadSearch(panel);
  if (tab === 'vexid') return loadVexId(panel);
}

// ---------- tarjeta de persona ----------
function personCard(u, ctx) {
  const actions = [];
  const ico = (n) => '<img class="cm-btn-ico" src="assets/social/actions/' + n + '.svg" alt="">';
  if (ctx === 'search') {
    if (u.status === 'friends') actions.push('<button class="cm-btn ghost" disabled>' + ico('friends') + t('comunidad.person.friendsDisabled') + '</button>');
    else if (u.status === 'pending_out') actions.push('<button class="cm-btn ghost" disabled>' + ico('request-pending') + t('comunidad.person.sent') + '</button>');
    else if (u.status === 'pending_in') actions.push('<button class="cm-btn primary" data-act="accept" data-id="' + u.id + '">' + t('comunidad.person.accept') + '</button>');
    else actions.push('<button class="cm-btn primary" data-act="add" data-id="' + u.id + '">' + ico('add-friend') + t('comunidad.person.add') + '</button>');
  } else if (ctx === 'friend') {
    actions.push('<button class="cm-btn primary" data-act="challenge" data-id="' + u.id + '" data-username="' + esc(u.username) + '">' + ico('challenge') + t('comunidad.person.challenge') + '</button>');
    actions.push('<button class="cm-btn danger" data-act="remove" data-id="' + u.id + '">' + t('comunidad.person.remove') + '</button>');
  } else if (ctx === 'incoming') {
    actions.push('<button class="cm-btn primary" data-act="accept" data-id="' + u.id + '">' + t('comunidad.person.accept') + '</button>');
    actions.push('<button class="cm-btn ghost" data-act="decline" data-id="' + u.id + '">' + t('comunidad.person.decline') + '</button>');
  } else if (ctx === 'outgoing') {
    actions.push('<button class="cm-btn ghost" data-act="cancel" data-id="' + u.id + '">' + t('comunidad.person.cancel') + '</button>');
  }
  const mutual = (u.mutual != null && u.mutual > 0) ? '<span class="cm-mutual">' + t('comunidad.person.mutual', { count: u.mutual }) + '</span>' : '';
  return '<div class="cm-person" data-user="' + u.id + '" data-username="' + esc(u.username) + '">' +
      '<button class="cm-person-main" data-act="profile" data-username="' + esc(u.username) + '">' +
        '<span class="cm-av-wrap">' + avatarHTML(u.avatar, 'md') + presenceHTML(u.presence) + '</span>' +
        '<span class="cm-person-info"><span class="cm-person-name">' + esc(u.username) + repChip(u.reputation) + '</span>' +
          '<span class="cm-person-sub">' + t('comunidad.person.subLine', { vexId: vexId(u.member_no), elo: u.elo }) + (mutual ? ' · ' + mutual : '') + '</span></span>' +
      '</button>' +
      '<div class="cm-person-actions">' + actions.join('') + '</div>' +
    '</div>';
}

function wirePanel(panel) {
  panel.querySelectorAll('[data-act]').forEach(el => {
    const act = el.dataset.act;
    el.addEventListener('click', async (e) => {
      if (act === 'profile') { openProfile(el.dataset.username); return; }
      if (act === 'challenge') { openChallenge(el.dataset.id, el.dataset.username); return; }
      const id = el.dataset.id;
      try {
        if (act === 'add') { await api.commRequest(id); toast(t('comunidad.toast.requestSent'), true); }
        else if (act === 'accept') { await api.commRespond(id, 'accept'); toast(t('comunidad.toast.friendsNow'), true); }
        else if (act === 'decline') { await api.commRespond(id, 'decline'); toast(t('comunidad.toast.requestDeclined'), true); }
        else if (act === 'cancel') { await api.commRemove(id); toast(t('comunidad.toast.requestCancelled'), true); }
        else if (act === 'remove') { await api.commRemove(id); toast(t('comunidad.toast.friendRemoved'), true); }
        refreshReqCount(); loadTab();
      } catch (err) { toast(err.message || t('comunidad.toast.error'), false); }
    });
  });
}

// ---------- Amigos ----------
async function loadFriends(panel) {
  try {
    const r = await api.commFriends();
    const list = r.friends || [];
    panel.innerHTML = list.length
      ? '<div class="cm-list">' + list.map(u => personCard(u, 'friend')).join('') + '</div>'
      : emptyHTML(t('comunidad.friends.emptyTitle'), t('comunidad.friends.emptySub'));
    wirePanel(panel);
  } catch (e) { panel.innerHTML = '<div class="cm-error">' + esc(e.message) + '</div>'; }
}

// ---------- Solicitudes ----------
async function loadRequests(panel) {
  try {
    const r = await api.commRequests();
    const inc = r.incoming || [], out = r.outgoing || [];
    let html = '';
    html += '<h3 class="cm-sub">' + t('comunidad.requests.received') + ' <span class="cm-count">' + inc.length + '</span></h3>';
    html += inc.length ? '<div class="cm-list">' + inc.map(u => personCard(u, 'incoming')).join('') + '</div>' : '<p class="cm-muted">' + t('comunidad.requests.emptyIncoming') + '</p>';
    html += '<h3 class="cm-sub">' + t('comunidad.requests.sent') + ' <span class="cm-count">' + out.length + '</span></h3>';
    html += out.length ? '<div class="cm-list">' + out.map(u => personCard(u, 'outgoing')).join('') + '</div>' : '<p class="cm-muted">' + t('comunidad.requests.emptyOutgoing') + '</p>';
    panel.innerHTML = html;
    wirePanel(panel);
  } catch (e) { panel.innerHTML = '<div class="cm-error">' + esc(e.message) + '</div>'; }
}

// ---------- Buscar ----------
function loadSearch(panel) {
  panel.innerHTML =
    '<div class="cm-search"><svg viewBox="0 0 24 24" width="1rem" height="1rem" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input id="cm-q" type="search" placeholder="' + esc(t('comunidad.search.placeholder')) + '" autocomplete="off" value="' + esc(lastSearch) + '"></div>' +
    '<div id="cm-results"><p class="cm-muted">' + t('comunidad.search.hint') + '</p></div>';
  const q = document.getElementById('cm-q');
  q.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => doSearch(q.value.trim()), 250); });
  q.focus();
  if (lastSearch.length >= 2) doSearch(lastSearch);
}
async function doSearch(q) {
  lastSearch = q;
  const box = document.getElementById('cm-results');
  if (!box) return;
  if (q.length < 2) { box.innerHTML = '<p class="cm-muted">' + t('comunidad.search.hint') + '</p>'; return; }
  box.innerHTML = '<div class="cm-loading">' + t('comunidad.search.searching') + '</div>';
  try {
    const r = await api.commSearch(q);
    const list = r.results || [];
    box.innerHTML = list.length ? '<div class="cm-list">' + list.map(u => personCard(u, 'search')).join('') + '</div>'
      : '<p class="cm-muted">' + t('comunidad.search.noResults', { q: esc(q) }) + '</p>';
    wirePanel(box);
  } catch (e) { box.innerHTML = '<div class="cm-error">' + esc(e.message) + '</div>'; }
}

// ---------- Mi VEX ID ----------
function loadVexId(panel) {
  const u = getUser();
  const code = u.connect_code || '';
  const url = location.origin + '/connect/' + code;
  let qrSvg = '';
  try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); qrSvg = qr.createSvgTag({ scalable: true, margin: 1 }); }
  catch (e) { qrSvg = '<div class="cm-qr-fail">' + t('comunidad.vexid.qrFail') + '</div>'; }

  panel.innerHTML =
    '<div class="cm-vex">' +
      '<div class="cm-card">' +
        '<div class="cm-card-glow"></div>' +
        '<div class="cm-card-top">' + avatarHTML(u.avatar, 'lg') +
          '<div class="cm-card-id"><div class="cm-card-name">' + esc(u.username) + '</div>' +
            '<div class="cm-card-handle">@' + esc(u.username.toLowerCase()) + '</div>' +
            '<div class="cm-card-meta"><span class="cm-vexno">' + vexId(u.member_no) + '</span>' + repChip(reputationFromStats()) + '</div></div>' +
        '</div>' +
        '<div class="cm-qr">' + qrSvg + '</div>' +
        '<div class="cm-code"><span class="cm-code-label">' + t('comunidad.vexid.codeLabel') + '</span><b>' + esc(fmtCode(code)) + '</b></div>' +
        '<button class="btn-play cm-share" id="cm-share">' + t('comunidad.vexid.share') + '</button>' +
      '</div>' +
      '<div class="cm-vex-side">' +
        '<h3 class="cm-sub">' + t('comunidad.vexid.addInPersonTitle') + '</h3>' +
        '<p class="cm-muted">' + t('comunidad.vexid.addInPersonDesc') + '</p>' +
        '<button class="btn-play cm-scan-btn" id="cm-scan"><img src="assets/icons/social/camera-scan-qr.svg" alt="" aria-hidden="true" style="width:1.1rem;height:1.1rem;vertical-align:-.2em;margin-right:.3rem;filter:brightness(0) invert(1)">' + t('comunidad.vexid.scanBtn') + '</button>' +
        '<p class="cm-or">' + t('comunidad.vexid.orAddByCode') + '</p>' +
        '<div class="cm-addcode"><input id="cm-addcode-in" placeholder="' + esc(t('comunidad.vexid.addCodePlaceholder')) + '" autocomplete="off" maxlength="7">' +
          '<button class="cm-btn primary" id="cm-addcode-btn">' + t('comunidad.person.add') + '</button></div>' +
        '<p class="cm-note">' + t('comunidad.vexid.note') + '</p>' +
      '</div>' +
    '</div>';

  document.getElementById('cm-share').addEventListener('click', () => shareVex(url));
  document.getElementById('cm-addcode-btn').addEventListener('click', addByCode);
  document.getElementById('cm-addcode-in').addEventListener('keydown', e => { if (e.key === 'Enter') addByCode(); });
  document.getElementById('cm-scan').addEventListener('click', openScanner);
}
function fmtCode(c) { c = (c || '').toUpperCase(); return c.length > 3 ? c.slice(0, 3) + '-' + c.slice(3) : c; }
function reputationFromStats() {
  // El backend ya calcula reputación; aquí aproximamos para la tarjeta propia.
  return 'Nuevo';
}
async function addByCode() {
  const inp = document.getElementById('cm-addcode-in');
  const code = (inp.value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (code.length < 6) { toast(t('comunidad.addByCode.invalid'), false); return; }
  try { const r = await api.commConnectAdd(code); toast(r.status === 'friends' ? t('comunidad.toast.friendsNow') : t('comunidad.toast.requestSent'), true); inp.value = ''; refreshReqCount(); }
  catch (e) { toast(e.message || t('comunidad.toast.error'), false); }
}
async function shareVex(url) {
  try { if (navigator.share) { await navigator.share({ title: t('comunidad.share.title'), text: t('comunidad.share.text'), url }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(url); toast(t('comunidad.share.linkCopied'), true); }
  catch (e) { toast(t('comunidad.share.copyLink', { url })); }
}

// ---------- retar a un amigo ----------
const CH_TCS = [['1+0', t('comunidad.challenge.tc.bullet')], ['3+0', t('comunidad.challenge.tc.blitz')], ['3+2', t('comunidad.challenge.tc.blitz')], ['5+0', t('comunidad.challenge.tc.blitz')], ['10+0', t('comunidad.challenge.tc.rapida')], ['15+10', t('comunidad.challenge.tc.rapida')]];
let chModal = null, chPoll = null;
function closeChallenge() { if (chPoll) { clearInterval(chPoll); chPoll = null; } if (chModal) chModal.classList.remove('open'); }
function openChallenge(userId, username) {
  if (!chModal) {
    chModal = document.createElement('div');
    chModal.className = 'cm-modal';
    chModal.innerHTML = '<div class="cm-modal-box"><button class="cm-modal-x" aria-label="' + esc(t('comunidad.modal.close')) + '">✕</button><div class="cm-ch-body"></div></div>';
    document.body.appendChild(chModal);
    chModal.querySelector('.cm-modal-x').addEventListener('click', closeChallenge);
    chModal.addEventListener('mousedown', e => { if (e.target === chModal) closeChallenge(); });
  }
  const body = chModal.querySelector('.cm-ch-body');
  body.innerHTML = '<h3 class="cm-ch-title">' + t('comunidad.challenge.title', { name: esc(username) }) + '</h3>' +
    '<p class="cm-muted">' + t('comunidad.challenge.chooseTc') + '</p>' +
    '<div class="cm-ch-tcs">' + CH_TCS.map(([v, f]) => '<button class="cm-ch-tc" data-tc="' + v + '"><b>' + v + '</b><span>' + f + '</span></button>').join('') + '</div>';
  body.querySelectorAll('.cm-ch-tc').forEach(b => b.addEventListener('click', () => sendChallenge(userId, username, b.dataset.tc)));
  chModal.classList.add('open');
}
async function sendChallenge(userId, username, tc) {
  const body = chModal.querySelector('.cm-ch-body');
  body.innerHTML = '<div class="cm-ch-wait"><img class="cm-ch-anim" src="assets/social/anim/challenge-incoming.svg" alt=""><h3 class="cm-ch-title">' + t('comunidad.challenge.waiting', { name: esc(username) }) + '</h3>' +
    '<p class="cm-muted">' + t('comunidad.challenge.waitingDesc', { tc: esc(tc) }) + '</p>' +
    '<button class="cm-btn ghost" id="cm-ch-cancel">' + t('comunidad.challenge.cancelBtn') + '</button></div>';
  let id;
  try { const r = await api.playChallenge(userId, tc); id = r.id; if (r.status === 'accepted' && r.game_id) { location.href = '/game.html?g=' + r.game_id; return; } }
  catch (e) { toast(e.message || t('comunidad.toast.error'), false); closeChallenge(); return; }
  document.getElementById('cm-ch-cancel').addEventListener('click', async () => { try { await api.playCancel(id); } catch (e) {} closeChallenge(); });
  chPoll = setInterval(async () => {
    try {
      const p = await api.playChallengePoll(id);
      if (p.status === 'accepted' && p.game_id) { clearInterval(chPoll); location.href = '/game.html?g=' + p.game_id; }
      else if (p.status === 'declined' || p.status === 'cancelled') { closeChallenge(); toast(t('comunidad.challenge.notCompleted'), false); }
    } catch (e) {}
  }, 2000);
}

// ---------- escáner de cámara (QR) ----------
let scanEl = null, scanStream = null, scanRAF = null;
function extractCode(text) {
  if (!text) return null;
  const m = String(text).match(/\/connect\/([A-Za-z0-9]{6,})/i);
  if (m) return m[1].toUpperCase();
  const t = String(text).trim().replace(/[^A-Za-z0-9]/g, '');
  if (/^[A-Za-z0-9]{6}$/.test(t)) return t.toUpperCase();
  return null;
}
function closeScanner() {
  if (scanRAF) cancelAnimationFrame(scanRAF), scanRAF = null;
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  if (scanEl) scanEl.classList.remove('open');
}
async function openScanner() {
  if (!window.jsQR) { toast(t('comunidad.scanner.unavailable'), false); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast(t('comunidad.scanner.noCamera'), false); return; }
  if (!scanEl) {
    scanEl = document.createElement('div');
    scanEl.className = 'cm-scan';
    scanEl.innerHTML = '<div class="cm-scan-box"><button class="cm-scan-x" aria-label="' + esc(t('comunidad.modal.close')) + '">✕</button>' +
      '<video class="cm-scan-video" playsinline muted></video><div class="cm-scan-frame"></div>' +
      '<div class="cm-scan-hint" id="cm-scan-hint">' + t('comunidad.scanner.hint') + '</div></div>';
    document.body.appendChild(scanEl);
    scanEl.querySelector('.cm-scan-x').addEventListener('click', closeScanner);
    scanEl.addEventListener('mousedown', e => { if (e.target === scanEl) closeScanner(); });
  }
  scanEl.classList.add('open');
  const video = scanEl.querySelector('.cm-scan-video');
  const hint = scanEl.querySelector('#cm-scan-hint');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = scanStream; await video.play();
  } catch (e) { hint.textContent = t('comunidad.scanner.cameraError'); return; }
  const tick = () => {
    if (!scanStream) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const res = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (res && res.data) {
          const code = extractCode(res.data);
          if (code) { hint.textContent = t('comunidad.scanner.found'); closeScanner(); location.href = 'connect/' + code; return; }
          hint.textContent = t('comunidad.scanner.notVexId');
        }
      } catch (e) {}
    }
    scanRAF = requestAnimationFrame(tick);
  };
  scanRAF = requestAnimationFrame(tick);
}

// ---------- modal perfil ----------
let modal = null;
function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'cm-modal';
  modal.innerHTML = '<div class="cm-modal-box"><button class="cm-modal-x" aria-label="' + esc(t('comunidad.modal.close')) + '">✕</button><div class="cm-modal-body"></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.cm-modal-x').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('mousedown', e => { if (e.target === modal) modal.classList.remove('open'); });
  return modal;
}
async function openProfile(username) {
  const m = ensureModal();
  m.querySelector('.cm-modal-body').innerHTML = '<div class="cm-loading">' + t('comunidad.profile.loading') + '</div>';
  m.classList.add('open');
  try {
    const r = await api.publicProfile(username);
    const p = r.profile;
    const played = (p.stats && p.stats.played) || 0;
    const badges = (p.badges || []).slice(0, 6);
    m.querySelector('.cm-modal-body').innerHTML =
      '<div class="cm-modal-head">' + avatarHTML(p.avatar, 'lg') +
        '<div><div class="cm-modal-name">' + esc(p.username) + '</div>' +
          '<div class="cm-modal-handle">' + t('comunidad.profile.subLine', { handle: esc(p.username.toLowerCase()), elo: p.elo }) + '</div></div></div>' +
      '<div class="cm-modal-stats">' +
        cmStat(t('comunidad.profile.statPartidas'), played) + cmStat(t('comunidad.profile.statVictorias'), (p.stats && p.stats.wins) || 0) + cmStat(t('comunidad.profile.statDerrotas'), (p.stats && p.stats.losses) || 0) +
      '</div>' +
      (badges.length ? '<div class="cm-modal-badges">' + badges.map(b => '<span class="cm-mb" title="' + esc(badgeMeta(b.badge).name) + '">' + badgeIcon(b.badge, 'mb') + '</span>').join('') + '</div>' : '');
  } catch (e) {
    m.querySelector('.cm-modal-body').innerHTML = '<p class="cm-error">' + esc(e.message || t('comunidad.profile.loadError')) + '</p>';
  }
}
function cmStat(label, v) { return '<div class="cm-modal-stat"><b>' + v + '</b><span>' + label + '</span></div>'; }

function emptyHTML(title, sub, illo) {
  const img = '<img class="vex-empty-state" src="assets/empty-states/' + (illo || 'no-friends') + '.svg" alt="" aria-hidden="true">';
  return '<div class="cm-empty"><div class="cm-empty-ico">' + img + '</div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></div>';
}

onAuth(render);
