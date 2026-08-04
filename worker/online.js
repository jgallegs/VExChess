// ============================================================
//  VEXCHESS · Multijugador online (Durable Objects)
//  - GameRoom: una partida en vivo (WebSocket + relojes + fin)
//  - Matchmaker: cola de emparejamiento abierto
//  - Handlers HTTP: retos, cola, rivales
//  Validación de jugadas con chess.js en el servidor (autoritativo).
// ============================================================
import { Chess } from '../chess.js';
import { getSession, json, errRes, nowISO, getFriendship } from './index.js';

// ---------- controles de tiempo permitidos ----------
export const TIME_CONTROLS = {
  '1+0': { base: 60, inc: 0, label: 'Bullet 1+0' },
  '3+0': { base: 180, inc: 0, label: 'Blitz 3+0' },
  '3+2': { base: 180, inc: 2, label: 'Blitz 3+2' },
  '5+0': { base: 300, inc: 0, label: 'Blitz 5+0' },
  '10+0': { base: 600, inc: 0, label: 'Rápida 10+0' },
  '15+10': { base: 900, inc: 10, label: 'Rápida 15+10' },
};
export function parseTC(tc) { return TIME_CONTROLS[tc] || null; }

// ---------- Elo online ----------
export function onlineEloAfter(a, b, scoreA, K = 32) {
  const ea = 1 / (1 + Math.pow(10, (b - a) / 400));
  const na = Math.round(a + K * (scoreA - ea));
  const nb = Math.round(b + K * ((1 - scoreA) - (1 - ea)));
  return [Math.max(100, na), Math.max(100, nb)];
}

// ---------- emparejamiento (pura) ----------
// Busca en la cola el mejor rival para `p`: mismo control de tiempo y Elo
// dentro de una ventana que se ensancha con la espera. Devuelve el índice o -1.
export function findMatchIndex(queue, p, now) {
  let best = -1, bestDiff = Infinity;
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    if (q.userId === p.userId || q.tc !== p.tc) continue;
    const waited = (now - q.joinedAt) / 1000;
    const window = 150 + Math.floor(waited / 10) * 100;
    const diff = Math.abs(q.elo - p.elo);
    if (diff <= window && diff < bestDiff) { best = i; bestDiff = diff; }
  }
  return best;
}

// ---------- crear una GameRoom ----------
async function createGameRoom(env, gameId, white, black, tc) {
  const stub = env.GAME.get(env.GAME.idFromName(gameId));
  await stub.fetch('https://do/init', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, white, black, tc }),
  });
}

// ---------- registrar resultado en D1 (Elo + rivalidad + histórico) ----------
export async function recordPvpResult(env, g, result, reason) {
  const wId = g.white.userId, bId = g.black.userId;
  const wu = await env.DB.prepare('SELECT online_elo FROM users WHERE id = ?').bind(wId).first();
  const bu = await env.DB.prepare('SELECT online_elo FROM users WHERE id = ?').bind(bId).first();
  const wBefore = wu ? wu.online_elo : 1200;
  const bBefore = bu ? bu.online_elo : 1200;
  const scoreW = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
  const [wAfter, bAfter] = onlineEloAfter(wBefore, bBefore, scoreW);
  const ts = nowISO();
  const pgn = buildPgn(g);
  const ops = [
    env.DB.prepare('UPDATE users SET online_elo = ?, updated_at = ? WHERE id = ?').bind(wAfter, ts, wId),
    env.DB.prepare('UPDATE users SET online_elo = ?, updated_at = ? WHERE id = ?').bind(bAfter, ts, bId),
    env.DB.prepare('INSERT OR REPLACE INTO pvp_games (id, white_id, black_id, result, reason, pgn, moves, time_control, white_elo_before, black_elo_before, white_elo_after, black_elo_after, played_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(g.gameId, wId, bId, result, reason, pgn, g.moves.length, g.tc, wBefore, bBefore, wAfter, bAfter, ts),
  ];
  // rivalidad canónica
  const [a, b] = wId < bId ? [wId, bId] : [bId, wId];
  const aIsWhite = a === wId;
  let aW = 0, bW = 0, dr = 0;
  if (result === '1/2-1/2') dr = 1;
  else if ((result === '1-0') === aIsWhite) aW = 1; else bW = 1;
  ops.push(env.DB.prepare(
    `INSERT INTO rivalries (a_id, b_id, a_wins, b_wins, draws, games, last_played) VALUES (?,?,?,?,?,1,?)
     ON CONFLICT(a_id, b_id) DO UPDATE SET a_wins = a_wins + ?, b_wins = b_wins + ?, draws = draws + ?, games = games + 1, last_played = ?`
  ).bind(a, b, aW, bW, dr, ts, aW, bW, dr, ts));
  await env.DB.batch(ops);
  return { wBefore, bBefore, wAfter, bAfter };
}
function buildPgn(g) {
  let out = ''; for (let i = 0; i < g.moves.length; i++) { if (i % 2 === 0) out += (i / 2 + 1) + '. '; out += g.moves[i].san + ' '; }
  return out.trim();
}

// ============================================================
//  Durable Object: Matchmaker (cola global)
// ============================================================
export class Matchmaker {
  constructor(state, env) { this.state = state; this.env = env; this.queue = []; this.matches = {}; }
  async fetch(req) {
    const url = new URL(req.url);
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};
    if (url.pathname.endsWith('/join')) return this.join(body);
    if (url.pathname.endsWith('/leave')) return this.leave(body.userId);
    if (url.pathname.endsWith('/status')) return json({ size: this.queue.length });
    return new Response('nf', { status: 404 });
  }
  async join(p) {
    if (this.matches[p.userId]) { const g = this.matches[p.userId]; delete this.matches[p.userId]; return json({ status: 'matched', game_id: g }); }
    this.queue = this.queue.filter(x => x.userId !== p.userId);
    const now = Date.now();
    const idx = findMatchIndex(this.queue, p, now);
    if (idx >= 0) {
      const opp = this.queue[idx];
      this.queue.splice(idx, 1);
      const gameId = crypto.randomUUID();
      const whiteFirst = Math.random() < 0.5;
      const white = whiteFirst ? opp : p, black = whiteFirst ? p : opp;
      await createGameRoom(this.env, gameId,
        { userId: white.userId, name: white.name, avatar: white.avatar, elo: white.elo },
        { userId: black.userId, name: black.name, avatar: black.avatar, elo: black.elo }, p.tc);
      this.matches[opp.userId] = gameId;   // el rival lo recogerá en su siguiente join/poll
      return json({ status: 'matched', game_id: gameId });
    }
    this.queue.push({ ...p, joinedAt: now });
    return json({ status: 'queued' });
  }
  leave(userId) { this.queue = this.queue.filter(x => x.userId !== userId); delete this.matches[userId]; return json({ status: 'left' }); }
}

// ============================================================
//  Durable Object: GameRoom (una partida)
// ============================================================
export class GameRoom {
  constructor(state, env) {
    this.state = state; this.env = env; this.sessions = new Set(); this.g = null;
    state.blockConcurrencyWhile(async () => { this.g = (await state.storage.get('g')) || null; });
  }
  async save() { await this.state.storage.put('g', this.g); }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.endsWith('/init') && req.method === 'POST') return this.init(req);
    if (url.pathname.endsWith('/info')) return this.info();
    if (req.headers.get('Upgrade') === 'websocket') return this.acceptWs(req);
    return new Response('nf', { status: 404 });
  }

  async init(req) {
    const b = await req.json();
    if (this.g) return json({ ok: true, already: true });
    const tc = parseTC(b.tc) || { base: 300, inc: 0 };
    this.g = {
      gameId: b.gameId, white: b.white, black: b.black, tc: b.tc,
      inc: tc.inc * 1000, fen: new Chess().fen(), moves: [],
      wMs: tc.base * 1000, bMs: tc.base * 1000, turn: 'w', turnStart: null,
      status: 'waiting', result: null, reason: null, drawOffer: null, seen: {},
    };
    await this.save();
    return json({ ok: true });
  }

  info() {
    if (!this.g) return errRes('Partida no encontrada.', 404);
    return json({
      gameId: this.g.gameId, white: this.g.white, black: this.g.black, tc: this.g.tc,
      status: this.g.status, result: this.g.result, reason: this.g.reason,
      fen: this.g.fen, moves: this.g.moves.map(m => m.san),
    });
  }

  remaining(color) {
    if (!this.g) return 0;
    let ms = color === 'w' ? this.g.wMs : this.g.bMs;
    if (this.g.status === 'active' && this.g.turn === color && this.g.turnStart) ms -= (Date.now() - this.g.turnStart);
    return Math.max(0, ms);
  }
  stateMsg() {
    return {
      fen: this.g.fen, moves: this.g.moves.map(m => m.san), turn: this.g.turn, status: this.g.status,
      result: this.g.result, reason: this.g.reason, white: this.g.white, black: this.g.black, tc: this.g.tc,
      wMs: this.remaining('w'), bMs: this.remaining('b'), drawOffer: this.g.drawOffer, serverTime: Date.now(),
    };
  }
  broadcast(obj) { const s = JSON.stringify(obj); for (const ws of this.sessions) { try { ws.send(s); } catch (e) {} } }

  acceptWs(req) {
    if (!this.g) return new Response('no game', { status: 404 });
    const userId = req.headers.get('X-User-Id');
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    let color = null;
    if (userId === this.g.white.userId) color = 'w'; else if (userId === this.g.black.userId) color = 'b';
    const meta = { userId, color };
    server._meta = meta;
    this.sessions.add(server);
    if (color) this.g.seen[color] = true;
    // Arranca cuando ambos jugadores han aparecido.
    if (this.g.status === 'waiting' && this.g.seen.w && this.g.seen.b) {
      this.g.status = 'active'; this.g.turn = 'w'; this.g.turnStart = Date.now();
      this.save(); this.scheduleFlag();
    }
    server.send(JSON.stringify({ t: 'state', ...this.stateMsg(), you: color }));
    server.addEventListener('message', (e) => this.onMsg(server, e));
    server.addEventListener('close', () => this.sessions.delete(server));
    server.addEventListener('error', () => this.sessions.delete(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  async scheduleFlag() {
    if (!this.g || this.g.status !== 'active') return;
    await this.state.storage.setAlarm(Date.now() + this.remaining(this.g.turn) + 50);
  }
  async alarm() {
    if (!this.g || this.g.status !== 'active') return;
    if (this.remaining(this.g.turn) <= 0) {
      await this.endGame(this.g.turn === 'w' ? '0-1' : '1-0', 'timeout');
    } else { await this.scheduleFlag(); }
  }

  async onMsg(ws, e) {
    let msg; try { msg = JSON.parse(e.data); } catch (err) { return; }
    const meta = ws._meta || {};
    if (!this.g) return;
    if (msg.t === 'move') return this.onMove(meta, msg);
    if (msg.t === 'resign') { if (meta.color) return this.endGame(meta.color === 'w' ? '0-1' : '1-0', 'resign'); return; }
    if (msg.t === 'drawoffer') { if (meta.color && this.g.status === 'active') { this.g.drawOffer = meta.color; await this.save(); this.broadcast({ t: 'draw_offer', by: meta.color }); } return; }
    if (msg.t === 'drawrespond') {
      if (meta.color && this.g.drawOffer && this.g.drawOffer !== meta.color) {
        if (msg.accept) return this.endGame('1/2-1/2', 'draw');
        this.g.drawOffer = null; await this.save(); this.broadcast({ t: 'draw_declined' });
      }
      return;
    }
  }

  async onMove(meta, msg) {
    if (this.g.status !== 'active') return;
    if (meta.color !== this.g.turn) return;   // no es tu turno
    const chess = new Chess(this.g.fen);
    let mv;
    try { mv = chess.move({ from: msg.from, to: msg.to, promotion: msg.promotion || 'q' }); }
    catch (err) { mv = null; }
    if (!mv) { try { for (const c of this.sessions) if (c._meta === meta) c.send(JSON.stringify({ t: 'illegal' })); } catch (e) {} return; }
    // Descontar tiempo del que movió, sumar incremento.
    const now = Date.now();
    const elapsed = this.g.turnStart ? (now - this.g.turnStart) : 0;
    if (this.g.turn === 'w') this.g.wMs = Math.max(0, this.g.wMs - elapsed) + this.g.inc;
    else this.g.bMs = Math.max(0, this.g.bMs - elapsed) + this.g.inc;
    this.g.moves.push({ san: mv.san, from: mv.from, to: mv.to, promotion: mv.promotion || null });
    this.g.fen = chess.fen();
    this.g.turn = chess.turn();
    this.g.turnStart = now;
    this.g.drawOffer = null;
    await this.save();
    this.broadcast({ t: 'move', san: mv.san, from: mv.from, to: mv.to, promotion: mv.promotion || null, ...this.stateMsg() });
    // ¿fin por reglas?
    if (chess.isGameOver()) {
      let result = '1/2-1/2', reason = 'draw';
      if (chess.isCheckmate()) { result = this.g.turn === 'w' ? '0-1' : '1-0'; reason = 'checkmate'; }
      else if (chess.isStalemate()) reason = 'stalemate';
      else if (chess.isInsufficientMaterial()) reason = 'insufficient';
      else if (chess.isThreefoldRepetition()) reason = 'repetition';
      else reason = 'fifty';
      return this.endGame(result, reason);
    }
    await this.scheduleFlag();
  }

  async endGame(result, reason) {
    if (!this.g || this.g.status === 'over') return;
    this.g.status = 'over'; this.g.result = result; this.g.reason = reason; this.g.turnStart = null;
    await this.save();
    try { await recordPvpResult(this.env, this.g, result, reason); } catch (e) {}
    try { await this.state.storage.deleteAlarm(); } catch (e) {}
    this.broadcast({ t: 'end', result, reason, ...this.stateMsg() });
  }
}

// ============================================================
//  Handlers HTTP (retos, cola, rivales) — llamados por el router
// ============================================================
async function userMini(env, id) {
  const u = await env.DB.prepare('SELECT id, username, avatar, online_elo FROM users WHERE id = ?').bind(id).first();
  return u ? { userId: u.id, name: u.username, avatar: u.avatar, elo: u.online_elo } : null;
}

export async function challengeCreate(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  if (!parseTC(b.tc)) return errRes('Control de tiempo no válido.');
  const toId = b.to;
  if (toId === s.user.id) return errRes('No puedes retarte a ti mismo.');
  const fr = await getFriendship(env, s.user.id, toId);
  if (!fr || fr.status !== 'accepted') return errRes('Solo puedes retar a tus amigos.', 403);
  // Evita duplicados pendientes.
  const dup = await env.DB.prepare("SELECT id FROM challenges WHERE from_id = ? AND to_id = ? AND status = 'pending'").bind(s.user.id, toId).first();
  if (dup) return json({ id: dup.id, status: 'pending' });
  const id = crypto.randomUUID(); const ts = nowISO();
  await env.DB.prepare('INSERT INTO challenges (id, from_id, to_id, time_control, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, s.user.id, toId, b.tc, 'pending', ts, ts).run();
  return json({ id, status: 'pending' });
}

export async function challengeList(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const { results } = await env.DB.prepare(
    "SELECT * FROM challenges WHERE status = 'pending' AND (from_id = ? OR to_id = ?) ORDER BY created_at DESC"
  ).bind(s.user.id, s.user.id).all();
  const incoming = [], outgoing = [];
  for (const c of (results || [])) {
    const otherId = c.from_id === s.user.id ? c.to_id : c.from_id;
    const u = await userMini(env, otherId);
    if (!u) continue;
    const item = { id: c.id, tc: c.time_control, user: u, created_at: c.created_at, game_id: c.game_id };
    if (c.from_id === s.user.id) outgoing.push(item); else incoming.push(item);
  }
  return json({ incoming, outgoing });
}

export async function challengeRespond(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  const c = await env.DB.prepare('SELECT * FROM challenges WHERE id = ?').bind(b.id).first();
  if (!c || c.status !== 'pending') return errRes('Reto no disponible.', 404);
  if (c.to_id !== s.user.id) return errRes('Ese reto no es para ti.', 403);
  const ts = nowISO();
  if (b.action !== 'accept') {
    await env.DB.prepare("UPDATE challenges SET status = 'declined', updated_at = ? WHERE id = ?").bind(ts, c.id).run();
    return json({ status: 'declined' });
  }
  const white = await userMini(env, Math.random() < 0.5 ? c.from_id : c.to_id);
  const blackId = white.userId === c.from_id ? c.to_id : c.from_id;
  const black = await userMini(env, blackId);
  const gameId = crypto.randomUUID();
  await createGameRoom(env, gameId, white, black, c.time_control);
  await env.DB.prepare("UPDATE challenges SET status = 'accepted', game_id = ?, updated_at = ? WHERE id = ?").bind(gameId, ts, c.id).run();
  return json({ status: 'accepted', game_id: gameId });
}

export async function challengeCancel(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  await env.DB.prepare("UPDATE challenges SET status = 'cancelled', updated_at = ? WHERE id = ? AND from_id = ? AND status = 'pending'").bind(nowISO(), b.id, s.user.id).run();
  return json({ status: 'cancelled' });
}

// Consulta un reto propio (para que el retador sepa cuándo lo aceptan).
export async function challengePoll(req, env, id) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const c = await env.DB.prepare('SELECT * FROM challenges WHERE id = ?').bind(id).first();
  if (!c || (c.from_id !== s.user.id && c.to_id !== s.user.id)) return errRes('No encontrado.', 404);
  return json({ status: c.status, game_id: c.game_id });
}

export async function queueJoin(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  let b; try { b = await req.json(); } catch (e) { return errRes('JSON no válido.'); }
  if (!parseTC(b.tc)) return errRes('Control de tiempo no válido.');
  const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName('global'));
  const r = await stub.fetch('https://do/join', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: s.user.id, name: s.user.username, avatar: s.user.avatar, elo: s.user.online_elo || 1200, tc: b.tc }),
  });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
}
export async function queueLeave(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName('global'));
  const r = await stub.fetch('https://do/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: s.user.id }) });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
}

export async function rivalsList(req, env) {
  const s = await getSession(req, env);
  if (!s) return errRes('No has iniciado sesión.', 401);
  const me = s.user.id;
  const { results } = await env.DB.prepare(
    'SELECT * FROM rivalries WHERE a_id = ? OR b_id = ? ORDER BY games DESC, last_played DESC LIMIT 50'
  ).bind(me, me).all();
  const rivals = [];
  for (const r of (results || [])) {
    const otherId = r.a_id === me ? r.b_id : r.a_id;
    const u = await userMini(env, otherId);
    if (!u) continue;
    const myWins = r.a_id === me ? r.a_wins : r.b_wins;
    const theirWins = r.a_id === me ? r.b_wins : r.a_wins;
    rivals.push({ user: u, wins: myWins, losses: theirWins, draws: r.draws, games: r.games, last_played: r.last_played });
  }
  return json({ rivals });
}

// nº de retos recibidos pendientes (para el aviso del navbar)
export async function pendingChallengeCount(env, userId) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM challenges WHERE to_id = ? AND status = 'pending'").bind(userId).first();
  return r ? r.n : 0;
}

// Enruta el WebSocket / info de una partida a su GameRoom.
export async function gameInfo(env, gameId) {
  const stub = env.GAME.get(env.GAME.idFromName(gameId));
  return stub.fetch('https://do/info');
}
export async function gameWs(req, env, gameId, userId) {
  const stub = env.GAME.get(env.GAME.idFromName(gameId));
  const headers = new Headers(req.headers);
  headers.set('X-User-Id', userId);
  return stub.fetch(new Request('https://do/ws', { method: 'GET', headers }));
}
