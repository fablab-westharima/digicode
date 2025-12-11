-- 0008_add_authenticators.sql
-- パスキー（WebAuthn）認証のためのテーブル追加

-- authenticatorsテーブル作成
CREATE TABLE IF NOT EXISTS authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  device_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_authenticators_user_id ON authenticators(user_id);
CREATE INDEX idx_authenticators_credential_id ON authenticators(credential_id);
