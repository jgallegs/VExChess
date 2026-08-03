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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}'          -- JSON extensible para datos futuros
);

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
