-- VEXCHESS · Esquema D1 (referencia). Ya está aplicado en la base "vexchess-db".
-- Para recrearlo:  npx wrangler d1 execute vexchess-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iter INTEGER NOT NULL DEFAULT 100000,
  avatar TEXT DEFAULT 'knight:red',
  country TEXT,
  elo INTEGER NOT NULL DEFAULT 1200,
  is_admin INTEGER NOT NULL DEFAULT 0,     -- 1 = acceso al panel (derivado de role >= moderator)
  role TEXT NOT NULL DEFAULT 'member',     -- owner | admin | moderator | member
  member_no INTEGER,                       -- número VEX correlativo (VEX-0001, cosmético)
  connect_code TEXT,                       -- código permanente para añadir (QR / en persona)
  online_elo INTEGER NOT NULL DEFAULT 1200, -- Elo del multijugador online (separado del de la IA)
  last_seen TEXT,                          -- última actividad (presencia online/ausente/desconectado)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}'          -- JSON extensible para datos futuros
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_connect ON users(connect_code);

-- Amistades. Par canónico a_id < b_id para evitar duplicados. status: 'pending' | 'accepted'.
CREATE TABLE IF NOT EXISTS friendships (
  a_id TEXT NOT NULL,
  b_id TEXT NOT NULL,
  status TEXT NOT NULL,                     -- 'pending' | 'accepted'
  requested_by TEXT NOT NULL,              -- id de quien envió la solicitud
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (a_id, b_id),
  FOREIGN KEY (a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (b_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_friend_a ON friendships(a_id);
CREATE INDEX IF NOT EXISTS idx_friend_b ON friendships(b_id);

-- ===== Multijugador online =====
-- Elo online separado del Elo contra la IA (columna users.online_elo).

-- Retos entre amigos.
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  time_control TEXT NOT NULL,               -- '3+2' | '5+0' | '10+0' | ...
  status TEXT NOT NULL,                     -- pending | accepted | declined | cancelled | expired
  game_id TEXT,                             -- id de la partida cuando se acepta
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ch_to ON challenges(to_id, status);
CREATE INDEX IF NOT EXISTS idx_ch_from ON challenges(from_id, status);

-- Partidas online terminadas.
CREATE TABLE IF NOT EXISTS pvp_games (
  id TEXT PRIMARY KEY,
  white_id TEXT NOT NULL,
  black_id TEXT NOT NULL,
  result TEXT,                              -- '1-0' | '0-1' | '1/2-1/2'
  reason TEXT,                              -- checkmate | resign | timeout | stalemate | draw | abandon
  pgn TEXT,
  moves INTEGER,
  time_control TEXT,
  white_elo_before INTEGER, black_elo_before INTEGER,
  white_elo_after INTEGER, black_elo_after INTEGER,
  played_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pvp_white ON pvp_games(white_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_black ON pvp_games(black_id, played_at DESC);

-- Rivalidades (cara a cara agregado). Par canónico a_id < b_id.
CREATE TABLE IF NOT EXISTS rivalries (
  a_id TEXT NOT NULL,
  b_id TEXT NOT NULL,
  a_wins INTEGER NOT NULL DEFAULT 0,
  b_wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  last_played TEXT,
  PRIMARY KEY (a_id, b_id),
  FOREIGN KEY (a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (b_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Migración para bases ya existentes (no hace falta si se crea de cero):
--   ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
--   ALTER TABLE users ADD COLUMN member_no INTEGER;
--   ALTER TABLE users ADD COLUMN connect_code TEXT;
--   UPDATE users SET role = 'owner', is_admin = 1 WHERE username_lower = 'jorge';
--   (member_no y connect_code se rellenan por script; ver migración en el worker/README)

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pgn TEXT NOT NULL,
  result TEXT NOT NULL,                    -- '1-0' | '0-1' | '1/2-1/2'
  human_color TEXT NOT NULL,               -- 'w' | 'b'
  level TEXT,
  plies INTEGER,
  outcome TEXT,                            -- 'win' | 'loss' | 'draw' (punto de vista humano)
  elo_delta INTEGER DEFAULT 0,
  played_at TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}',         -- JSON extensible
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id, played_at DESC);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  by_level TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL,
  badge TEXT NOT NULL,                     -- id de la insignia (creator, staff, first-move, ...)
  granted_at TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}',       -- JSON extensible (p.ej. campeón: títulos/temporadas)
  pinned INTEGER NOT NULL DEFAULT 0,       -- fijada en el perfil (máx. 3)
  featured INTEGER NOT NULL DEFAULT 0,     -- destacada junto al nombre (1)
  PRIMARY KEY (user_id, badge),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_badges_user ON user_badges(user_id);
