-- パスキー（認証器）テーブル
CREATE TABLE IF NOT EXISTS authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,  -- JSON配列として格納
  device_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_authenticators_user_id ON authenticators(user_id);
CREATE INDEX idx_authenticators_credential_id ON authenticators(credential_id);
