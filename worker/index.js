// ============================================================
//  VEXCHESS · Worker (API + static assets)
//  - Sirve la web estática (binding ASSETS)
//  - API en /api/*  (auth, perfil, partidas, estadísticas, Elo)
//  - Persistencia en D1 (binding DB). Sin dependencias externas.
// ============================================================

import {
  challengeCreate, challengeList, challengeRespond, challengeCancel, challengePoll,
  queueJoin, queueLeave, rivalsList, pendingChallengeCount, gameInfo, gameWs,
} from './online.js';
export { GameRoom, Matchmaker } from './online.js';

const COOKIE = 'vex_session';
const SESSION_DAYS = 30;
const PBKDF2_ITER = 100000;
const K_FACTOR = 24;
const LEVEL_ELO = { principiante: 1320, facil: 1500, intermedio: 1800, avanzado: 2200, maximo: 3190 };

const RESERVED = new Set([
  'admin','administrator','root','moderator','mod','staff','support','help','helpdesk',
  'system','sistema','vexchess','vex','api','www','mail','email','official','oficial',
  'null','undefined','none','anonymous','anonimo','guest','invitado','bot','stockfish',
  'me','yo','owner','dueno','contact','contacto','about','login','register','logout',
  'settings','profile','perfil','user','usuario','users','play','puzzles','partidas','directo',
]);
// Bloqueo básico de nombres ofensivos (subcadena, es/en). Ampliable.
const BADWORDS = ['puta','puto','mierda','cabron','gilipol','joder','coño','polla','zorra',
  'maricon','fuck','shit','bitch','cunt','nigger','nazi','hitler','porn','porno','rape','viol'];

// ---------- utilidades ----------
const enc = new TextEncoder();
function bufToHex(buf) { const b = new Uint8Array(buf); let s = ''; for (const x of b) s += x.toString(16).padStart(2, '0'); return s; }
function hexToBuf(hex) { const a = new Uint8Array(hex.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16); return a; }
export function nowISO() { return new Date().toISOString(); }
function genToken() { return bufToHex(crypto.getRandomValues(new Uint8Array(32))); }

async function derive(password, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256);
  return bufToHex(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITER);
  return { hash, salt: bufToHex(salt), iter: PBKDF2_ITER };
}
async function verifyPassword(password, hashHex, saltHex, iter) {
  const h = await derive(password, hexToBuf(saltHex), iter || PBKDF2_ITER);
  if (h.length !== hashHex.length) return false;
  let r = 0; for (let i = 0; i < h.length; i++) r |= h.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return r === 0;
}

function parseCookies(req) {
  const h = req.headers.get('Cookie') || ''; const o = {};
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return o;
}
function sessionCookie(token, maxAge) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
export const errRes = (msg, status = 400, extra = {}) => json({ error: msg, ...extra }, status);

// ---------- validación ----------
function validateUsername(u) {
  if (typeof u !== 'string') return 'Nombre de usuario no válido.';
  u = u.trim();
  if (u.length < 3 || u.length > 20) return 'El usuario debe tener entre 3 y 20 caracteres.';
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(u)) return 'Usa solo letras, números y guion bajo; empieza por una letra.';
  const low = u.toLowerCase();
  if (RESERVED.has(low)) return 'Ese nombre de usuario no está disponible.';
  if (BADWORDS.some(w => low.includes(w))) return 'Ese nombre de usuario no está permitido.';
  return null;
}
function validateEmail(e) {
  if (typeof e !== 'string') return 'Email no válido.';
  e = e.trim();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Introduce un email válido.';
  return null;
}
function validatePassword(p) {
  if (typeof p !== 'string') return 'Contraseña no válida.';
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (p.length > 200) return 'La contraseña es demasiado larga.';
  return null;
}

// Insignias válidas del catálogo oficial (v2). El backend solo concede estas.
const BADGE_IDS = new Set([
  'creator', 'staff', 'champion', 'first-move', 'early-supporter', 'pioneer',
  'giant-slayer', 'veteran', 'mentor', 'tournament-host', 'builder',
  'translator', 'puzzle-author', 'bug-hunter', 'fair-play', 'tactician',
]);

// ---------- roles ----------
// Jerarquía de roles. `level` decide permisos: un actor solo puede tocar a
// alguien de nivel estrictamente inferior, y solo asignar roles por debajo del
// suyo. `owner` es único, no se concede ni se cambia desde el panel.
const ROLES = {
  owner:     { level: 100, label: 'Propietario' },
  admin:     { level: 80,  label: 'Administrador' },
  moderator: { level: 50,  label: 'Moderador' },
  member:    { level: 0,   label: 'Miembro' },
};
const STAFF_LEVEL = 50;   // nivel mínimo para acceder al panel
const ELO_LEVEL = 80;     // nivel mínimo para editar Elo
const ROLE_LEVEL = 80;    // nivel mínimo para cambiar roles
const roleOf = (u) => (u && ROLES[u.role]) ? u.role : 'member';
const roleLevel = (r) => (ROLES[r] ? ROLES[r].level : 0);

// ---------- VEX ID ----------
// Alfabeto sin caracteres ambiguos (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genConnectCode() {
  const a = crypto.getRandomValues(new Uint8Array(6));
  let s = ''; for (const x of a) s += CODE_ALPHABET[x % CODE_ALPHABET.length];
  return s;
}
async function allocConnectCode(env) {
  for (let i = 0; i < 10; i++) {
    const c = genConnectCode();
    const dup = await env.DB.prepare('SELECT 1 AS x FROM users WHERE connect_code = ?').bind(c).first();
    if (!dup) return c;
  }
  return genConnectCode();
}
// Asigna número VEX + código de conexión si faltan (cuentas antiguas).
async function ensureVexId(env, u) {
  const fields = [], vals = [];
  if (!u.member_no) { const n = (await env.DB.prepare('SELECT COALESCE(MAX(member_no),0)+1 AS n FROM users').first()).n; fields.push('member_no = ?'); vals.push(n); }
  if (!u.connect_code) { fields.push('connect_code = ?'); vals.push(await allocConnectCode(env)); }
  if (fields.length) {
    vals.push(u.id);
    await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
    return await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(u.id).first();
  }
  return u;
}
// Reputación en 5 tramos (alineada con el Social Identity Pack).
function reputationOf(games) {
  const g = games || 0;
  if (g >= 100) return 'exemplary';
  if (g >= 30) return 'respected';
  if (g >= 10) return 'trusted';
  if (g >= 1) return 'good-standing';
  return 'unrated';
}
// Avatares de imagen permitidos (además de los knight:<color> clásicos).
const AVATAR_IMAGES = new Set([
  'vex-knight', 'ivory-queen', 'cobalt-rook', 'violet-bishop', 'teal-pawn', 'golden-king', 'shadow-knight', 'rival-duo',
  // Expansión 01 (cada Vexborn usa su propio avatar).
  'rhazek', 'oryn', 'vesra', 'brakkon', 'ilyra', 'tikk', 'malrec', 'solenne',
]);
// Vexborn equipables -> avatar de identidad. Cosmético.
const VEXBORN_AVATAR = {
  // Origins (usan los 8 avatares originales).
  kael: 'vex-knight', aurelia: 'ivory-queen', bastion: 'cobalt-rook', nyra: 'violet-bishop',
  pip: 'teal-pawn', ordan: 'golden-king', noctis: 'shadow-knight', 'eira-vhal': 'rival-duo',
  // Expansión 01 (avatar propio con el mismo nombre de clave).
  rhazek: 'rhazek', oryn: 'oryn', vesra: 'vesra', brakkon: 'brakkon',
  ilyra: 'ilyra', tikk: 'tikk', malrec: 'malrec', solenne: 'solenne',
};
function isValidAvatar(a) {
  if (typeof a !== 'string') return false;
  const m = a.match(/^([a-z]+):([a-z0-9-]+)$/);
  if (!m) return false;
  if (m[1] === 'knight' && /^[a-z]+$/.test(m[2])) return true;
  if (m[1] === 'img' && AVATAR_IMAGES.has(m[2])) return true;
  return false;
}
// Presencia a partir de la última actividad.
function presenceOf(lastSeen) {
  if (!lastSeen) return 'offline';
  const d = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (d < 90) return 'online';
  if (d < 300) return 'away';
  return 'offline';
}
async function touchPresence(env, userId) {
  try { await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(nowISO(), userId).run(); } catch (e) {}
}

// ---------- modelo ----------
function publicUser(u, opts) {
  const role = roleOf(u);
  const level = roleLevel(role);
  const out = {
    id: u.id, username: u.username, email: u.email, avatar: u.avatar,
    country: u.country || null, elo: u.elo, created_at: u.created_at,
    role, role_level: level, is_admin: level >= STAFF_LEVEL,
    member_no: u.member_no || null, online_elo: u.online_elo || 1200, vexborn: u.vexborn || null,
    data: safeJson(u.data, {}),
  };
  if (opts && opts.self) out.connect_code = u.connect_code || null;
  return out;
}
function safeJson(s, def) { try { return JSON.parse(s); } catch (e) { return def; } }

// ---------- amistades ----------
function pairOf(x, y) { return x < y ? [x, y] : [y, x]; }
export async function getFriendship(env, x, y) {
  const [a, b] = pairOf(x, y);
  return await env.DB.prepare('SELECT * FROM friendships WHERE a_id = ? AND b_id = ?').bind(a, b).first();
}
function relStatus(fr, meId) {
  if (!fr) return 'none';
  if (fr.status === 'accepted') return 'friends';
  return fr.requested_by === meId ? 'pending_out' : 'pending_in';
}
async function friendIds(env, meId) {
  const { results } = await env.DB.prepare("SELECT a_id, b_id FROM friendships WHERE status = 'accepted' AND (a_id = ? OR b_id = ?)").bind(meId, meId).all();
  return (results || []).map(r => (r.a_id === meId ? r.b_id : r.a_id));
}
async function mutualCount(env, meId, otherId) {
  const mine = new Set(await friendIds(env, meId));
  let n = 0; for (const id of await friendIds(env, otherId)) if (mine.has(id)) n++;
  return n;
}
async function gamesCountOf(env, userId) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ?').bind(userId).first();
  return r ? r.n : 0;
}
// Mini-perfil público para comunidad (sin email).
async function miniProfile(env, u, meId) {
  const games = await gamesCountOf(env, u.id);
  const out = {
    id: u.id, username: u.username, avatar: u.avatar, elo: u.elo,
    member_no: u.member_no || null, reputation: reputationOf(games),
    badges: await getBadges(env, u.id),
  };
  if (meId && meId !== u.id) {
    out.status = relStatus(await getFriendship(env, meId, u.id), meId);
    out.mutual = await mutualCount(env, meId, u.id);
  } else if (meId === u.id) { out.status = 'self'; }
  return out;
}

export async function getSession(req, env) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT s.token AS s_token, s.expires_at AS s_expires, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).bind(token).first();
  if (!row) return null;
  if (new Date(row.s_expires).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return { token, user: row };
}
async function createSession(env, userId, req) {
  const token = genToken();
  const created = nowISO();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  const ua = (req.headers.get('User-Agent') || '').slice(0, 300);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at, user_agent) VALUES (?,?,?,?,?)')
    .bind(token, userId, created, expires, ua).run();
  return token;
}
async function getStats(env, userId) {
  const s = await env.DB.prepare('SELECT * FROM user_stats WHERE user_id = ?').bind(userId).first();
  if (!s) return { played: 0, wins: 0, losses: 0, draws: 0, streak: 0, best_streak: 0, by_level: {} };
  return { played: s.played, wins: s.wins, losses: s.losses, draws: s.draws, streak: s.streak, best_streak: s.best_streak, by_level: safeJson(s.by_level, {}) };
}
async function getBadges(env, userId) {
  const { results } = await env.DB.prepare(
    'SELECT badge, granted_at, detail, pinned, featured FROM user_badges WHERE user_id = ? ORDER BY featured DESC, pinned DESC, granted_at ASC'
  ).bind(userId).all();
  return (results || []).map(b => ({ badge: b.badge, granted_at: b.granted_at, detail: safeJson(b.detail, {}), pinned: !!b.pinned, featured: !!b.featured }));
}

// outcome desde el punto de vista del humano
function outcomeOf(result, color) {
  if (result === '1/2-1/2') return 'draw';
  const humanWon = (result === '1-0' && color === 'w') || (result === '0-1' && color === 'b');
  return humanWon ? 'win' : 'loss';
}
function eloAfter(userElo, level, outcome) {
  const opp = LEVEL_ELO[level] || 1500;
  const S = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0;
  const E = 1 / (1 + Math.pow(10, (opp - userElo) / 400));
  let delta = Math.round(K_FACTOR * (S - E));
  if (outcome === 'draw' && delta === 0) delta = 0;
  let next = Math.max(100, Math.min(3500, userElo + delta));
  return { delta: next - userElo, next };
}

// ---------- endpoints ----------
async function register(req, env) {
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const username = (b.username || '').trim();
  const email = (b.email || '').trim().toLowerCase();
  const password = b.password || '';
  let v;
  if ((v = validateUsername(username))) return errRes(v);
  if ((v = validateEmail(email))) return errRes(v);
  if ((v = validatePassword(password))) return errRes(v);
  const low = username.toLowerCase();

  const dupe = await env.DB.prepare('SELECT username_lower, email FROM users WHERE username_lower = ? OR email = ?').bind(low, email).first();
  if (dupe) {
    if (dupe.username_lower === low) return errRes('Ese nombre de usuario ya está en uso.', 409);
    return errRes('Ya existe una cuenta con ese email.', 409);
  }
  const { hash, salt, iter } = await hashPassword(password);
  const id = crypto.randomUUID();
  const ts = nowISO();
  const memberNo = (await env.DB.prepare('SELECT COALESCE(MAX(member_no),0)+1 AS n FROM users').first()).n;
  const connectCode = await allocConnectCode(env);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, username, username_lower, email, password_hash, password_salt, password_iter, avatar, elo, member_no, connect_code, created_at, updated_at, data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, username, low, email, hash, salt, iter, 'knight:red', 1200, memberNo, connectCode, ts, ts, '{}'),
    env.DB.prepare('INSERT INTO user_stats (user_id, updated_at) VALUES (?, ?)').bind(id, ts),
  ]);
  const token = await createSession(env, id, req);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return json({ user: publicUser(user, { self: true }), stats: await getStats(env, id), badges: [] }, 201, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
}

async function checkUsername(req, env) {
  const u = (new URL(req.url).searchParams.get('u') || '').trim();
  const invalid = validateUsername(u);
  if (invalid) return json({ valid: false, available: false, reason: invalid });
  const dupe = await env.DB.prepare('SELECT 1 AS x FROM users WHERE username_lower = ?').bind(u.toLowerCase()).first();
  return json({ valid: true, available: !dupe, reason: dupe ? 'Ese nombre ya está en uso.' : null });
}

async function login(req, env) {
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const loginId = (b.login || '').trim();
  const password = b.password || '';
  if (!loginId || !password) return errRes('Introduce tu usuario/email y contraseña.');
  const byEmail = loginId.includes('@');
  const row = byEmail
    ? await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(loginId.toLowerCase()).first()
    : await env.DB.prepare('SELECT * FROM users WHERE username_lower = ?').bind(loginId.toLowerCase()).first();
  // Respuesta genérica para no revelar si la cuenta existe
  const ok = row && await verifyPassword(password, row.password_hash, row.password_salt, row.password_iter);
  if (!ok) return errRes('Usuario o contraseña incorrectos.', 401);
  const token = await createSession(env, row.id, req);
  const u = await ensureVexId(env, row);
  return json({ user: publicUser(u, { self: true }), stats: await getStats(env, u.id), badges: await getBadges(env, u.id) }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
}

async function logout(req, env) {
  const token = parseCookies(req)[COOKIE];
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` });
}

async function me(req, env) {
  const s = await getSession(req, env);
  if (!s) return json({ user: null });
  const u = await ensureVexId(env, s.user);
  await touchPresence(env, u.id);
  return json({ user: publicUser(u, { self: true }), stats: await getStats(env, u.id), badges: await getBadges(env, u.id) });
}

async function updateBadges(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const owned = new Set((await getBadges(env, s.user.id)).map(x => x.badge));
  const pinned = (Array.isArray(b.pinned) ? b.pinned : []).filter(x => owned.has(x)).slice(0, 3);
  const featured = (typeof b.featured === 'string' && owned.has(b.featured)) ? b.featured : null;
  const ops = [env.DB.prepare('UPDATE user_badges SET pinned = 0, featured = 0 WHERE user_id = ?').bind(s.user.id)];
  for (const bid of pinned) ops.push(env.DB.prepare('UPDATE user_badges SET pinned = 1 WHERE user_id = ? AND badge = ?').bind(s.user.id, bid));
  if (featured) ops.push(env.DB.prepare('UPDATE user_badges SET featured = 1 WHERE user_id = ? AND badge = ?').bind(s.user.id, featured));
  await env.DB.batch(ops);
  return json({ badges: await getBadges(env, s.user.id) });
}

async function updateProfile(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const fields = [], vals = [];
  if (typeof b.avatar === 'string' && isValidAvatar(b.avatar)) { fields.push('avatar = ?'); vals.push(b.avatar); }
  if (typeof b.country === 'string') { fields.push('country = ?'); vals.push(b.country.slice(0, 3).toUpperCase() || null); }
  // Vexborn (personaje cosmético). Equipar cambia también el avatar de identidad; desequipar lo deja como estaba.
  if ('vexborn' in b) {
    if (b.vexborn == null || b.vexborn === '') {
      fields.push('vexborn = ?'); vals.push(null);
    } else if (typeof b.vexborn === 'string' && VEXBORN_AVATAR[b.vexborn]) {
      fields.push('vexborn = ?'); vals.push(b.vexborn);
      fields.push('avatar = ?'); vals.push('img:' + VEXBORN_AVATAR[b.vexborn]);
    } else {
      return errRes('Vexborn no válido.');
    }
  }
  if (!fields.length) return errRes('Nada que actualizar.');
  fields.push('updated_at = ?'); vals.push(nowISO());
  vals.push(s.user.id);
  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(s.user.id).first();
  return json({ user: publicUser(user) });
}

// ---------- Academia (modo entrenamiento con AXIOM) ----------
function dayStr(d) { return (d || new Date()).toISOString().slice(0, 10); }
function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function clamp100(n) { return Math.max(0, Math.min(100, Math.round(n))); }

async function academyState(env, userId) {
  let prof = await env.DB.prepare('SELECT * FROM academy_profile WHERE user_id = ?').bind(userId).first();
  if (!prof) prof = { streak: 0, best_streak: 0, last_day: null, total_sessions: 0, data: '{}' };
  const { results } = await env.DB.prepare('SELECT concept, mastery, confidence, attempts, contexts_solved, max_hint, last_attempt, next_review, error_tag FROM academy_progress WHERE user_id = ?').bind(userId).all();
  const progress = results || [];
  const today = dayStr();
  // ¿racha viva? (hoy o ayer). Si el último día es anterior a ayer, se muestra rota.
  let streak = prof.streak || 0;
  if (prof.last_day && prof.last_day !== today && prof.last_day !== addDays(today, -1)) streak = 0;
  const due = progress.filter(p => p.next_review && p.next_review <= today).map(p => p.concept);
  const attempted = progress.filter(p => p.attempts > 0);
  let weakest = null;
  for (const p of attempted) { if (!weakest || p.mastery < weakest.mastery) weakest = p; }
  return {
    profile: { streak, best_streak: prof.best_streak || 0, last_day: prof.last_day || null, total_sessions: prof.total_sessions || 0, data: safeJson(prof.data, {}) },
    progress,
    memory: {
      today, streak, dueConcepts: due,
      weakestConcept: weakest ? weakest.concept : null,
      lessonsDone: Object.keys(safeJson(prof.data, {}).lessons || {}),
      isNewDay: prof.last_day !== today,
    },
  };
}

async function academyGet(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  return json(await academyState(env, s.user.id));
}

async function academyResult(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const concept = typeof b.concept === 'string' ? b.concept.slice(0, 40) : '';
  const lesson = typeof b.lesson === 'string' ? b.lesson.slice(0, 60) : '';
  if (!concept) return errRes('Falta el concepto.');
  const correct = !!b.correct;
  const hint = Math.max(0, Math.min(4, (b.hintUsed | 0)));
  const now = nowISO(), today = dayStr();
  const uid = s.user.id;

  // --- progreso por concepto ---
  const row = await env.DB.prepare('SELECT * FROM academy_progress WHERE user_id = ? AND concept = ?').bind(uid, concept).first();
  let mastery = row ? row.mastery : 0, confidence = row ? row.confidence : 0;
  let attempts = (row ? row.attempts : 0) + 1;
  let contexts = row ? row.contexts_solved : 0;
  let maxHint = Math.max(row ? row.max_hint : 0, hint);
  let errorTag = row ? row.error_tag : null;
  if (correct) {
    contexts += 1;
    const mGain = hint <= 1 ? 18 : hint === 2 ? 14 : 10;
    const cGain = hint <= 1 ? 15 : hint === 2 ? 6 : 2;
    mastery = clamp100(mastery + mGain);
    confidence = clamp100(confidence + cGain);
    errorTag = null;
  } else {
    confidence = clamp100(confidence - 8); // no penaliza el dominio; baja la confianza
    errorTag = typeof b.errorTag === 'string' ? b.errorTag.slice(0, 40) : 'conceptual';
  }
  const interval = !correct ? 1 : (confidence >= 80 ? 7 : confidence >= 50 ? 3 : 1);
  const nextReview = addDays(today, interval);
  await env.DB.prepare(
    `INSERT INTO academy_progress (user_id, concept, mastery, confidence, attempts, contexts_solved, max_hint, last_attempt, next_review, error_tag, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id, concept) DO UPDATE SET mastery=excluded.mastery, confidence=excluded.confidence, attempts=excluded.attempts,
       contexts_solved=excluded.contexts_solved, max_hint=excluded.max_hint, last_attempt=excluded.last_attempt,
       next_review=excluded.next_review, error_tag=excluded.error_tag, updated_at=excluded.updated_at`
  ).bind(uid, concept, mastery, confidence, attempts, contexts, maxHint, now, nextReview, errorTag, now).run();

  // --- perfil: racha + lección completada ---
  let prof = await env.DB.prepare('SELECT * FROM academy_profile WHERE user_id = ?').bind(uid).first();
  let streak = prof ? prof.streak : 0, best = prof ? prof.best_streak : 0;
  let lastDay = prof ? prof.last_day : null, sessions = prof ? prof.total_sessions : 0;
  const data = safeJson(prof ? prof.data : '{}', {});
  if (lastDay !== today) {
    streak = (lastDay === addDays(today, -1)) ? streak + 1 : 1;
    lastDay = today; sessions += 1;
  }
  best = Math.max(best, streak);
  if (correct && lesson) {
    data.lessons = data.lessons || {};
    const prev = data.lessons[lesson] || {};
    data.lessons[lesson] = { done: true, bestHint: Math.min(prev.bestHint != null ? prev.bestHint : 9, hint), ts: now };
  }
  await env.DB.prepare(
    `INSERT INTO academy_profile (user_id, streak, best_streak, last_day, total_sessions, data, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET streak=excluded.streak, best_streak=excluded.best_streak, last_day=excluded.last_day,
       total_sessions=excluded.total_sessions, data=excluded.data, updated_at=excluded.updated_at`
  ).bind(uid, streak, best, lastDay, sessions, JSON.stringify(data), now).run();

  return json(await academyState(env, uid));
}

// ============================================================
//  VEXBORN · Senda de Maestría (progreso por campeón, sin ventaja)
// ============================================================
async function vexbornMasteryState(env, uid) {
  const { results } = await env.DB.prepare(
    'SELECT champion, chapters, vinculo, best_hint, attempts FROM vexborn_mastery WHERE user_id = ?'
  ).bind(uid).all();
  const champions = {};
  for (const r of results || []) {
    champions[r.champion] = { chapters: safeJson(r.chapters, []), vinculo: r.vinculo, bestHint: r.best_hint, attempts: r.attempts };
  }
  return { champions };
}

async function vexbornMasteryGet(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  return json(await vexbornMasteryState(env, s.user.id));
}

async function vexbornMasteryProgress(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const champion = typeof b.champion === 'string' ? b.champion.slice(0, 40) : '';
  const chapter = typeof b.chapter === 'string' ? b.chapter.slice(0, 60) : '';
  if (!champion || !chapter) return errRes('Faltan datos.');
  const correct = !!b.correct;
  const hint = Math.max(0, Math.min(4, (b.hintUsed | 0)));
  const total = Math.max(1, Math.min(20, (b.totalChapters | 0) || 5));
  const now = nowISO(), uid = s.user.id;

  const row = await env.DB.prepare('SELECT * FROM vexborn_mastery WHERE user_id = ? AND champion = ?').bind(uid, champion).first();
  let chapters = safeJson(row ? row.chapters : '[]', []);
  let vinculo = row ? row.vinculo : 0;
  let bestHint = Math.max(row ? row.best_hint : 0, hint);
  let attempts = (row ? row.attempts : 0) + 1;
  // El progreso solo cuenta cuando la idea se resuelve correctamente (validado en cliente por chess.js).
  if (correct && !chapters.includes(chapter)) {
    chapters.push(chapter);
    vinculo = Math.min(100, Math.round(chapters.length / total * 100));
  }
  await env.DB.prepare(
    `INSERT INTO vexborn_mastery (user_id, champion, chapters, vinculo, best_hint, attempts, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id, champion) DO UPDATE SET chapters=excluded.chapters, vinculo=excluded.vinculo,
       best_hint=excluded.best_hint, attempts=excluded.attempts, updated_at=excluded.updated_at`
  ).bind(uid, champion, JSON.stringify(chapters), vinculo, bestHint, attempts, now).run();
  return json(await vexbornMasteryState(env, uid));
}

async function listGames(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
  const { results } = await env.DB.prepare(
    'SELECT id, pgn, result, human_color, level, plies, outcome, elo_delta, played_at FROM games WHERE user_id = ? ORDER BY played_at DESC LIMIT ? OFFSET ?'
  ).bind(s.user.id, limit, offset).all();
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ?').bind(s.user.id).first();
  return json({ games: results || [], total: total ? total.n : 0 });
}

function normGame(b) {
  const result = b.result;
  if (!['1-0', '0-1', '1/2-1/2'].includes(result)) return null;
  const color = b.human_color === 'b' ? 'b' : 'w';
  const pgn = typeof b.pgn === 'string' ? b.pgn.slice(0, 20000) : '';
  if (!pgn) return null;
  const level = typeof b.level === 'string' ? b.level.slice(0, 20) : null;
  const plies = Number.isFinite(b.plies) ? (b.plies | 0) : null;
  const played_at = (typeof b.played_at === 'string' && b.played_at) ? b.played_at : nowISO();
  return { result, color, pgn, level, plies, played_at };
}
function applyStats(stats, outcome, level) {
  stats.played += 1;
  if (outcome === 'win') { stats.wins += 1; stats.streak = stats.streak >= 0 ? stats.streak + 1 : 1; }
  else if (outcome === 'loss') { stats.losses += 1; stats.streak = stats.streak <= 0 ? stats.streak - 1 : -1; }
  else { stats.draws += 1; stats.streak = 0; }
  if (stats.streak > stats.best_streak) stats.best_streak = stats.streak;
  const bl = stats.by_level[level || 'desconocido'] || { played: 0, wins: 0, losses: 0, draws: 0 };
  bl.played += 1; if (outcome === 'win') bl.wins += 1; else if (outcome === 'loss') bl.losses += 1; else bl.draws += 1;
  stats.by_level[level || 'desconocido'] = bl;
  return stats;
}

async function saveGame(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const g = normGame(b);
  if (!g) return errRes('Datos de la partida no válidos.');
  const outcome = outcomeOf(g.result, g.color);
  const { delta, next } = eloAfter(s.user.elo, g.level, outcome);
  const stats = applyStats(await getStats(env, s.user.id), outcome, g.level);
  const gameId = crypto.randomUUID();
  const ts = nowISO();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO games (id, user_id, pgn, result, human_color, level, plies, outcome, elo_delta, played_at, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(gameId, s.user.id, g.pgn, g.result, g.color, g.level, g.plies, outcome, delta, g.played_at, '{}'),
    env.DB.prepare('UPDATE users SET elo = ?, updated_at = ? WHERE id = ?').bind(next, ts, s.user.id),
    env.DB.prepare('UPDATE user_stats SET played=?, wins=?, losses=?, draws=?, streak=?, best_streak=?, by_level=?, updated_at=? WHERE user_id=?')
      .bind(stats.played, stats.wins, stats.losses, stats.draws, stats.streak, stats.best_streak, JSON.stringify(stats.by_level), ts, s.user.id),
  ]);
  return json({ id: gameId, outcome, elo_delta: delta, elo: next, stats }, 201);
}

// Importar varias partidas (migración desde localStorage). Recalcula stats/elo.
async function importGames(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const arr = Array.isArray(b.games) ? b.games.slice(0, 200) : null;
  if (!arr) return errRes('Formato no válido.');
  let userElo = s.user.elo;
  let stats = await getStats(env, s.user.id);
  const ops = [];
  let imported = 0;
  // orden cronológico ascendente para que el Elo evolucione bien
  arr.sort((a, b2) => String(a.played_at || '').localeCompare(String(b2.played_at || '')));
  const ts = nowISO();
  for (const raw of arr) {
    const g = normGame(raw);
    if (!g) continue;
    const outcome = outcomeOf(g.result, g.color);
    const { delta, next } = eloAfter(userElo, g.level, outcome);
    userElo = next;
    stats = applyStats(stats, outcome, g.level);
    ops.push(env.DB.prepare('INSERT INTO games (id, user_id, pgn, result, human_color, level, plies, outcome, elo_delta, played_at, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), s.user.id, g.pgn, g.result, g.color, g.level, g.plies, outcome, delta, g.played_at, '{}'));
    imported++;
  }
  ops.push(env.DB.prepare('UPDATE users SET elo = ?, updated_at = ? WHERE id = ?').bind(userElo, ts, s.user.id));
  ops.push(env.DB.prepare('UPDATE user_stats SET played=?, wins=?, losses=?, draws=?, streak=?, best_streak=?, by_level=?, updated_at=? WHERE user_id=?')
    .bind(stats.played, stats.wins, stats.losses, stats.draws, stats.streak, stats.best_streak, JSON.stringify(stats.by_level), ts, s.user.id));
  if (ops.length) await env.DB.batch(ops);
  return json({ imported, elo: userElo, stats });
}

async function deleteGame(req, env, id) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  await env.DB.prepare('DELETE FROM games WHERE id = ? AND user_id = ?').bind(id, s.user.id).run();
  return json({ ok: true });
}

async function publicProfile(req, env, username) {
  const row = await env.DB.prepare('SELECT id, username, avatar, country, elo, created_at FROM users WHERE username_lower = ?')
    .bind(String(username).toLowerCase()).first();
  if (!row) return errRes('Perfil no encontrado.', 404);
  return json({ profile: { username: row.username, avatar: row.avatar, country: row.country, elo: row.elo, created_at: row.created_at, stats: await getStats(env, row.id), badges: await getBadges(env, row.id) } });
}

// ---------- admin ----------
// Devuelve la sesión solo si el usuario tiene al menos `minLevel`; si no, null.
async function getStaff(req, env, minLevel = STAFF_LEVEL) {
  const s = await getSession(req, env);
  if (!s || roleLevel(roleOf(s.user)) < minLevel) return null;
  return s;
}

async function adminOverview(req, env) {
  if (!await getStaff(req, env)) return errRes('No autorizado.', 403);
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  const games = await env.DB.prepare('SELECT COUNT(*) AS n FROM games').first();
  const grants = await env.DB.prepare('SELECT COUNT(*) AS n FROM user_badges').first();
  const { results: roleRows } = await env.DB.prepare('SELECT role, COUNT(*) AS n FROM users GROUP BY role').all();
  const { results: badgeRows } = await env.DB.prepare('SELECT badge, COUNT(*) AS n FROM user_badges GROUP BY badge').all();
  const roles = {}; (roleRows || []).forEach(r => { roles[r.role || 'member'] = r.n; });
  const badge_dist = {}; (badgeRows || []).forEach(r => { badge_dist[r.badge] = r.n; });
  const staff = (roles.owner || 0) + (roles.admin || 0) + (roles.moderator || 0);
  return json({
    total_users: total ? total.n : 0,
    total_games: games ? games.n : 0,
    badges_granted: grants ? grants.n : 0,
    staff, roles, badge_dist,
  });
}

async function adminListUsers(req, env) {
  if (!await getStaff(req, env)) return errRes('No autorizado.', 403);
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const roleF = (url.searchParams.get('role') || 'all').trim();
  const sort = (url.searchParams.get('sort') || 'recent').trim();
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

  const conds = [], cargs = [];
  if (q) {
    const like = '%' + q.replace(/[%_\\]/g, m => '\\' + m) + '%';
    conds.push("(u.username_lower LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')");
    cargs.push(like, like);
  }
  if (roleF === 'staff') conds.push("u.role IN ('owner','admin','moderator')");
  else if (ROLES[roleF]) { conds.push('u.role = ?'); cargs.push(roleF); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const order = ({
    recent: 'u.created_at DESC', oldest: 'u.created_at ASC',
    elo_desc: 'u.elo DESC', elo_asc: 'u.elo ASC', name: 'u.username_lower ASC',
  })[sort] || 'u.created_at DESC';

  const { results } = await env.DB.prepare(
    `SELECT u.id, u.username, u.email, u.avatar, u.elo, u.role, u.created_at,
       (SELECT COUNT(*) FROM user_badges b WHERE b.user_id = u.id) AS badge_count,
       (SELECT COUNT(*) FROM games g WHERE g.user_id = u.id) AS games_count
     FROM users u ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
  ).bind(...cargs, limit, offset).all();
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users u ${where}`).bind(...cargs).first();
  const users = (results || []).map(u => ({
    id: u.id, username: u.username, email: u.email, avatar: u.avatar,
    elo: u.elo, role: roleOf(u), role_level: roleLevel(roleOf(u)), is_admin: roleLevel(roleOf(u)) >= STAFF_LEVEL,
    created_at: u.created_at, badge_count: u.badge_count, games_count: u.games_count,
  }));
  return json({ users, total: totalRow ? totalRow.n : users.length, limit, offset, sort, role: roleF });
}

async function adminGetUser(req, env, id) {
  if (!await getStaff(req, env)) return errRes('No autorizado.', 403);
  const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!u) return errRes('Usuario no encontrado.', 404);
  return json({ user: publicUser(u), stats: await getStats(env, id), badges: await getBadges(env, id) });
}

async function adminGrantBadge(req, env, id) {
  if (!await getStaff(req, env)) return errRes('No autorizado.', 403);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const badge = typeof b.badge === 'string' ? b.badge : '';
  if (!BADGE_IDS.has(badge)) return errRes('Insignia no válida.');
  const u = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (!u) return errRes('Usuario no encontrado.', 404);
  await env.DB.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge, granted_at, detail, pinned, featured) VALUES (?,?,?,?,0,0)')
    .bind(id, badge, nowISO(), '{}').run();
  return json({ badges: await getBadges(env, id) });
}

async function adminRevokeBadge(req, env, id, badge) {
  if (!await getStaff(req, env)) return errRes('No autorizado.', 403);
  await env.DB.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge = ?').bind(id, badge).run();
  return json({ badges: await getBadges(env, id) });
}

async function adminUpdateUser(req, env, id) {
  const actor = await getStaff(req, env);
  if (!actor) return errRes('No autorizado.', 403);
  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!target) return errRes('Usuario no encontrado.', 404);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }

  const actorLevel = roleLevel(roleOf(actor.user));
  const targetRole = roleOf(target);
  const targetLevel = roleLevel(targetRole);
  const fields = [], vals = [];

  // --- Elo ---
  if (b.elo != null) {
    if (actorLevel < ELO_LEVEL) return errRes('No tienes permiso para cambiar el Elo.', 403);
    const elo = parseInt(b.elo, 10);
    if (!Number.isFinite(elo) || elo < 100 || elo > 3500) return errRes('Elo fuera de rango (100–3500).');
    fields.push('elo = ?'); vals.push(elo);
  }

  // --- Rol ---
  if (typeof b.role === 'string') {
    const newRole = b.role;
    if (!ROLES[newRole]) return errRes('Rol no válido.');
    if (actorLevel < ROLE_LEVEL) return errRes('No tienes permiso para cambiar roles.', 403);
    if (id === actor.user.id) return errRes('No puedes cambiar tu propio rol.');
    if (targetRole === 'owner') return errRes('No se puede modificar al propietario.');
    if (newRole === 'owner') return errRes('El rol de propietario no se asigna desde el panel.');
    if (actorLevel <= targetLevel) return errRes('No puedes modificar a alguien de tu mismo nivel o superior.', 403);
    if (actorLevel <= roleLevel(newRole)) return errRes('No puedes asignar un rol igual o superior al tuyo.', 403);
    fields.push('role = ?'); vals.push(newRole);
    // Mantener is_admin sincronizado (acceso al panel = staff).
    fields.push('is_admin = ?'); vals.push(roleLevel(newRole) >= STAFF_LEVEL ? 1 : 0);
  }

  if (!fields.length) return errRes('Nada que actualizar.');
  fields.push('updated_at = ?'); vals.push(nowISO());
  vals.push(id);
  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  const out = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return json({ user: publicUser(out) });
}

// ---------- comunidad / amigos ----------
async function commSearch(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) return json({ results: [] });
  const like = '%' + q.replace(/[%_\\]/g, m => '\\' + m) + '%';
  const { results } = await env.DB.prepare(
    "SELECT id, username, avatar, elo, member_no FROM users WHERE (username_lower LIKE ? ESCAPE '\\') AND id != ? ORDER BY username_lower ASC LIMIT 20"
  ).bind(like, s.user.id).all();
  const out = [];
  for (const u of (results || [])) {
    out.push({
      id: u.id, username: u.username, avatar: u.avatar, elo: u.elo, member_no: u.member_no || null,
      reputation: reputationOf(await gamesCountOf(env, u.id)),
      mutual: await mutualCount(env, s.user.id, u.id),
      status: relStatus(await getFriendship(env, s.user.id, u.id), s.user.id),
    });
  }
  return json({ results: out });
}

// Resumen ligero para el aviso del navbar: nº de solicitudes recibidas.
async function commSummary(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const r = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM friendships WHERE status = 'pending' AND requested_by != ? AND (a_id = ? OR b_id = ?)"
  ).bind(s.user.id, s.user.id, s.user.id).first();
  const challenges = await pendingChallengeCount(env, s.user.id);
  await touchPresence(env, s.user.id);
  return json({ incoming: r ? r.n : 0, challenges });
}

async function commFriends(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const { results } = await env.DB.prepare(
    "SELECT a_id, b_id, updated_at FROM friendships WHERE status = 'accepted' AND (a_id = ? OR b_id = ?) ORDER BY updated_at DESC"
  ).bind(s.user.id, s.user.id).all();
  const friends = [];
  for (const r of (results || [])) {
    const otherId = r.a_id === s.user.id ? r.b_id : r.a_id;
    const u = await env.DB.prepare('SELECT id, username, avatar, elo, member_no, last_seen FROM users WHERE id = ?').bind(otherId).first();
    if (u) friends.push({
      id: u.id, username: u.username, avatar: u.avatar, elo: u.elo, member_no: u.member_no || null,
      reputation: reputationOf(await gamesCountOf(env, u.id)), presence: presenceOf(u.last_seen), since: r.updated_at,
    });
  }
  return json({ friends });
}

async function commRequests(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const { results } = await env.DB.prepare(
    "SELECT a_id, b_id, requested_by, created_at FROM friendships WHERE status = 'pending' AND (a_id = ? OR b_id = ?) ORDER BY created_at DESC"
  ).bind(s.user.id, s.user.id).all();
  const incoming = [], outgoing = [];
  for (const r of (results || [])) {
    const otherId = r.a_id === s.user.id ? r.b_id : r.a_id;
    const u = await env.DB.prepare('SELECT id, username, avatar, elo, member_no FROM users WHERE id = ?').bind(otherId).first();
    if (!u) continue;
    const item = { id: u.id, username: u.username, avatar: u.avatar, elo: u.elo, member_no: u.member_no || null,
      reputation: reputationOf(await gamesCountOf(env, u.id)), mutual: await mutualCount(env, s.user.id, u.id), since: r.created_at };
    if (r.requested_by === s.user.id) outgoing.push(item); else incoming.push(item);
  }
  return json({ incoming, outgoing });
}

// Crea/acepta una solicitud hacia `otherId`.
async function sendFriendRequest(env, meId, otherId) {
  if (otherId === meId) return errRes('No puedes añadirte a ti mismo.');
  const other = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(otherId).first();
  if (!other) return errRes('Usuario no encontrado.', 404);
  const fr = await getFriendship(env, meId, otherId);
  const ts = nowISO();
  if (fr) {
    if (fr.status === 'accepted') return errRes('Ya sois amigos.', 409);
    if (fr.requested_by === meId) return json({ status: 'pending_out' });   // ya enviada
    // Existe una solicitud entrante: aceptarla equivale a confirmar.
    await env.DB.prepare('UPDATE friendships SET status = ?, updated_at = ? WHERE a_id = ? AND b_id = ?')
      .bind('accepted', ts, fr.a_id, fr.b_id).run();
    return json({ status: 'friends' });
  }
  const [a, b] = pairOf(meId, otherId);
  await env.DB.prepare('INSERT INTO friendships (a_id, b_id, status, requested_by, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .bind(a, b, 'pending', meId, ts, ts).run();
  return json({ status: 'pending_out' });
}

async function commRequest(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  if (typeof b.to !== 'string') return errRes('Falta el destinatario.');
  return await sendFriendRequest(env, s.user.id, b.to);
}

async function commRespond(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const otherId = b.user_id, action = b.action;
  const fr = await getFriendship(env, s.user.id, otherId);
  if (!fr || fr.status !== 'pending') return errRes('No hay ninguna solicitud pendiente.', 404);
  if (fr.requested_by === s.user.id) return errRes('Esa solicitud la enviaste tú.', 400);
  if (action === 'accept') {
    await env.DB.prepare('UPDATE friendships SET status = ?, updated_at = ? WHERE a_id = ? AND b_id = ?').bind('accepted', nowISO(), fr.a_id, fr.b_id).run();
    return json({ status: 'friends' });
  }
  await env.DB.prepare('DELETE FROM friendships WHERE a_id = ? AND b_id = ?').bind(fr.a_id, fr.b_id).run();
  return json({ status: 'none' });
}

async function commRemove(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const [a, bb] = pairOf(s.user.id, b.user_id || '');
  await env.DB.prepare('DELETE FROM friendships WHERE a_id = ? AND b_id = ?').bind(a, bb).run();
  return json({ status: 'none' });
}

async function commConnect(req, env, code) {
  const u = await env.DB.prepare('SELECT * FROM users WHERE connect_code = ?').bind(String(code || '').toUpperCase()).first();
  if (!u) return errRes('Código de conexión no válido.', 404);
  const s = await getSession(req, env);
  return json({ profile: await miniProfile(env, u, s ? s.user.id : null) });
}

async function commConnectAdd(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const u = await env.DB.prepare('SELECT id FROM users WHERE connect_code = ?').bind(String(b.code || '').toUpperCase()).first();
  if (!u) return errRes('Código de conexión no válido.', 404);
  return await sendFriendRequest(env, s.user.id, u.id);
}

// ---------- router ----------
async function handleApi(req, env) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/api';
  const m = req.method;
  try {
    if (path === '/api/health') return json({ ok: true, ts: nowISO() });
    if (path === '/api/auth/register' && m === 'POST') return await register(req, env);
    if (path === '/api/auth/check-username' && m === 'GET') return await checkUsername(req, env);
    if (path === '/api/auth/login' && m === 'POST') return await login(req, env);
    if (path === '/api/auth/logout' && m === 'POST') return await logout(req, env);
    if (path === '/api/auth/me' && m === 'GET') return await me(req, env);
    if (path === '/api/profile' && m === 'PUT') return await updateProfile(req, env);
    if (path === '/api/academy' && m === 'GET') return await academyGet(req, env);
    if (path === '/api/academy/result' && m === 'POST') return await academyResult(req, env);
    if (path === '/api/vexborn/mastery' && m === 'GET') return await vexbornMasteryGet(req, env);
    if (path === '/api/vexborn/mastery/progress' && m === 'POST') return await vexbornMasteryProgress(req, env);
    if (path === '/api/profile/badges' && m === 'PUT') return await updateBadges(req, env);
    if (path === '/api/games' && m === 'GET') return await listGames(req, env);
    if (path === '/api/games' && m === 'POST') return await saveGame(req, env);
    if (path === '/api/games/import' && m === 'POST') return await importGames(req, env);
    const dg = path.match(/^\/api\/games\/([A-Za-z0-9-]+)$/);
    if (dg && m === 'DELETE') return await deleteGame(req, env, dg[1]);
    if (path === '/api/stats' && m === 'GET') { const s = await getSession(req, env); return s ? json({ stats: await getStats(env, s.user.id), elo: s.user.elo }) : errRes('No has iniciado sesión.', 401); }
    const pu = path.match(/^\/api\/u\/([A-Za-z0-9_]+)$/);
    if (pu && m === 'GET') return await publicProfile(req, env, pu[1]);
    // --- comunidad ---
    if (path === '/api/community/search' && m === 'GET') return await commSearch(req, env);
    if (path === '/api/community/summary' && m === 'GET') return await commSummary(req, env);
    if (path === '/api/community/friends' && m === 'GET') return await commFriends(req, env);
    if (path === '/api/community/requests' && m === 'GET') return await commRequests(req, env);
    if (path === '/api/community/request' && m === 'POST') return await commRequest(req, env);
    if (path === '/api/community/respond' && m === 'POST') return await commRespond(req, env);
    if (path === '/api/community/remove' && m === 'POST') return await commRemove(req, env);
    if (path === '/api/community/connect' && m === 'POST') return await commConnectAdd(req, env);
    const cc = path.match(/^\/api\/connect\/([A-Za-z0-9]+)$/);
    if (cc && m === 'GET') return await commConnect(req, env, cc[1]);
    // --- multijugador online ---
    if (path === '/api/play/challenge' && m === 'POST') return await challengeCreate(req, env);
    if (path === '/api/play/challenges' && m === 'GET') return await challengeList(req, env);
    if (path === '/api/play/challenge/respond' && m === 'POST') return await challengeRespond(req, env);
    if (path === '/api/play/challenge/cancel' && m === 'POST') return await challengeCancel(req, env);
    const chp = path.match(/^\/api\/play\/challenge\/([A-Za-z0-9-]+)$/);
    if (chp && m === 'GET') return await challengePoll(req, env, chp[1]);
    if (path === '/api/play/queue' && m === 'POST') return await queueJoin(req, env);
    if (path === '/api/play/queue' && m === 'DELETE') return await queueLeave(req, env);
    if (path === '/api/play/rivals' && m === 'GET') return await rivalsList(req, env);
    const gWs = path.match(/^\/api\/game\/([A-Za-z0-9-]+)\/ws$/);
    // Cualquiera puede conectarse; solo los dos jugadores (por su cuenta) pueden actuar.
    if (gWs) { const s = await getSession(req, env); return await gameWs(req, env, gWs[1], s ? s.user.id : ''); }
    const gIn = path.match(/^\/api\/game\/([A-Za-z0-9-]+)$/);
    if (gIn && m === 'GET') return await gameInfo(env, gIn[1]);
    // --- admin ---
    if (path === '/api/admin/overview' && m === 'GET') return await adminOverview(req, env);
    if (path === '/api/admin/users' && m === 'GET') return await adminListUsers(req, env);
    const auBadge = path.match(/^\/api\/admin\/users\/([A-Za-z0-9-]+)\/badges\/([a-z-]+)$/);
    if (auBadge && m === 'DELETE') return await adminRevokeBadge(req, env, auBadge[1], auBadge[2]);
    const auBadges = path.match(/^\/api\/admin\/users\/([A-Za-z0-9-]+)\/badges$/);
    if (auBadges && m === 'POST') return await adminGrantBadge(req, env, auBadges[1]);
    const au = path.match(/^\/api\/admin\/users\/([A-Za-z0-9-]+)$/);
    if (au && m === 'GET') return await adminGetUser(req, env, au[1]);
    if (au && m === 'PUT') return await adminUpdateUser(req, env, au[1]);
    return errRes('Ruta no encontrada.', 404);
  } catch (e) {
    return errRes('Error interno del servidor.', 500, { detail: String(e && e.message || e) });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env);
    // Enlaces bonitos de conexión: /connect/CÓDIGO -> sirve connect.html
    if (/^\/connect\/[A-Za-z0-9]+\/?$/.test(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL('/connect.html', url), req));
    }
    // Partida online: /game/ID -> sirve game.html
    if (/^\/game\/[A-Za-z0-9-]+\/?$/.test(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL('/game.html', url), req));
    }
    // Resto: servir la web estática
    return env.ASSETS.fetch(req);
  },
};
