-- リカバリートークンテーブル（パスキー紛失時用）
CREATE TABLE IF NOT EXISTS recovery_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_recovery_user ON recovery_tokens(user_id);
CREATE INDEX idx_recovery_token ON recovery_tokens(token_hash);
