// ============================================================
//  VEXCHESS · Worker (API + static assets)
//  - Sirve la web estática (binding ASSETS)
//  - API en /api/*  (auth, perfil, partidas, estadísticas, Elo)
//  - Persistencia en D1 (binding DB). Sin dependencias externas.
// ============================================================

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
function nowISO() { return new Date().toISOString(); }
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
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
const errRes = (msg, status = 400, extra = {}) => json({ error: msg, ...extra }, status);

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

// ---------- modelo ----------
function publicUser(u) {
  return {
    id: u.id, username: u.username, email: u.email, avatar: u.avatar,
    country: u.country || null, elo: u.elo, created_at: u.created_at,
    data: safeJson(u.data, {}),
  };
}
function safeJson(s, def) { try { return JSON.parse(s); } catch (e) { return def; } }

async function getSession(req, env) {
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
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, username, username_lower, email, password_hash, password_salt, password_iter, avatar, elo, created_at, updated_at, data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, username, low, email, hash, salt, iter, 'knight:red', 1200, ts, ts, '{}'),
    env.DB.prepare('INSERT INTO user_stats (user_id, updated_at) VALUES (?, ?)').bind(id, ts),
  ]);
  const token = await createSession(env, id, req);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return json({ user: publicUser(user), stats: await getStats(env, id), badges: [] }, 201, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
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
  return json({ user: publicUser(row), stats: await getStats(env, row.id), badges: await getBadges(env, row.id) }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
}

async function logout(req, env) {
  const token = parseCookies(req)[COOKIE];
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` });
}

async function me(req, env) {
  const s = await getSession(req, env);
  if (!s) return json({ user: null });
  return json({ user: publicUser(s.user), stats: await getStats(env, s.user.id), badges: await getBadges(env, s.user.id) });
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
  if (typeof b.avatar === 'string' && /^[a-z]+:[a-z]+$/.test(b.avatar)) { fields.push('avatar = ?'); vals.push(b.avatar); }
  if (typeof b.country === 'string') { fields.push('country = ?'); vals.push(b.country.slice(0, 3).toUpperCase() || null); }
  if (!fields.length) return errRes('Nada que actualizar.');
  fields.push('updated_at = ?'); vals.push(nowISO());
  vals.push(s.user.id);
  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(s.user.id).first();
  return json({ user: publicUser(user) });
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
    if (path === '/api/profile/badges' && m === 'PUT') return await updateBadges(req, env);
    if (path === '/api/games' && m === 'GET') return await listGames(req, env);
    if (path === '/api/games' && m === 'POST') return await saveGame(req, env);
    if (path === '/api/games/import' && m === 'POST') return await importGames(req, env);
    const dg = path.match(/^\/api\/games\/([A-Za-z0-9-]+)$/);
    if (dg && m === 'DELETE') return await deleteGame(req, env, dg[1]);
    if (path === '/api/stats' && m === 'GET') { const s = await getSession(req, env); return s ? json({ stats: await getStats(env, s.user.id), elo: s.user.elo }) : errRes('No has iniciado sesión.', 401); }
    const pu = path.match(/^\/api\/u\/([A-Za-z0-9_]+)$/);
    if (pu && m === 'GET') return await publicProfile(req, env, pu[1]);
    return errRes('Ruta no encontrada.', 404);
  } catch (e) {
    return errRes('Error interno del servidor.', 500, { detail: String(e && e.message || e) });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env);
    // Resto: servir la web estática
    return env.ASSETS.fetch(req);
  },
};
