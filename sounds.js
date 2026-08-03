// ============================================================
//  VEXCHESS · Efectos de sonido sintetizados (Web Audio API)
//  Sin archivos externos: funciona offline y no pesa nada.
//  La preferencia de silencio se guarda en localStorage.
// ============================================================

let ctx = null;
let muted = false;
try { muted = localStorage.getItem('vexchess:muted') === '1'; } catch (e) {}

function ac() {
  if (ctx) return ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  return ctx;
}
// Los navegadores exigen un gesto del usuario para arrancar el audio.
function unlock() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

// Un "toc" de madera: ruido filtrado (percusión) + golpe grave (cuerpo).
function knock(c, t, { freq = 220, dur = 0.11, gain = 0.5, low = 900 } = {}) {
  // Capa de ruido con envolvente descendente
  const n = c.createBufferSource();
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  n.buffer = buf;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = low;
  const ng = c.createGain();
  ng.gain.setValueAtTime(gain * 0.6, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(lp).connect(ng).connect(c.destination);
  n.start(t); n.stop(t + dur);
  // Capa tonal grave que cae de tono
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  const og = c.createGain();
  og.gain.setValueAtTime(gain, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(og).connect(c.destination);
  o.start(t); o.stop(t + dur);
}
// Un tono limpio (para avisos y melodías cortas).
function tone(c, t, { freq = 660, dur = 0.12, gain = 0.26, type = 'triangle' } = {}) {
  const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur);
}

function play(fn) {
  if (muted) return;
  const c = ac(); if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try { fn(c, c.currentTime); } catch (e) {}
}

export const sfx = {
  get muted() { return muted; },
  setMuted(v) {
    muted = !!v;
    try { localStorage.setItem('vexchess:muted', muted ? '1' : '0'); } catch (e) {}
    if (!muted) unlock();
  },
  toggle() { this.setMuted(!muted); return muted; },
  unlock,
  move()    { play((c, t) => knock(c, t, { freq: 210, dur: 0.10, gain: 0.42, low: 850 })); },
  capture() { play((c, t) => { knock(c, t, { freq: 150, dur: 0.13, gain: 0.55, low: 1300 }); knock(c, t + 0.02, { freq: 330, dur: 0.06, gain: 0.22, low: 2400 }); }); },
  castle()  { play((c, t) => { knock(c, t, { freq: 200, dur: 0.09, gain: 0.4 }); knock(c, t + 0.10, { freq: 200, dur: 0.09, gain: 0.4 }); }); },
  check()   { play((c, t) => { tone(c, t, { freq: 720, dur: 0.10, gain: 0.22 }); tone(c, t + 0.10, { freq: 980, dur: 0.12, gain: 0.22 }); }); },
  promote() { play((c, t) => [523, 659, 784, 1046].forEach((f, i) => tone(c, t + i * 0.07, { freq: f, dur: 0.14, gain: 0.18 }))); },
  win()     { play((c, t) => [523, 659, 784, 1046].forEach((f, i) => tone(c, t + i * 0.10, { freq: f, dur: 0.22, gain: 0.2, type: 'sine' }))); },
  lose()    { play((c, t) => [523, 440, 349, 262].forEach((f, i) => tone(c, t + i * 0.12, { freq: f, dur: 0.24, gain: 0.18, type: 'sine' }))); },
  draw()    { play((c, t) => { tone(c, t, { freq: 440, dur: 0.2, gain: 0.18 }); tone(c, t + 0.12, { freq: 440, dur: 0.24, gain: 0.16 }); }); },
  wrong()   { play((c, t) => tone(c, t, { freq: 180, dur: 0.18, gain: 0.22, type: 'sawtooth' })); },
  ui()      { play((c, t) => tone(c, t, { freq: 520, dur: 0.05, gain: 0.12, type: 'sine' })); },
};
