-- usersテーブルにメール確認フラグ追加
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verified_at TEXT;

-- パスキーのみモードフラグ
ALTER TABLE users ADD COLUMN passkey_only INTEGER NOT NULL DEFAULT 0;

-- メール確認トークンテーブル
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_token ON email_verification_tokens(token_hash);
