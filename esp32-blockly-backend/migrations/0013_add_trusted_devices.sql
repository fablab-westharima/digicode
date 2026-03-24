-- Phase 2: 信頼済みデバイステーブル
-- 2FAスキップ用のデバイストークン管理

CREATE TABLE IF NOT EXISTS trusted_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,             -- SHA-256ハッシュ
  device_name TEXT,                     -- ブラウザ/OS情報（任意）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,         -- 有効期限（30日）
  last_used_at DATETIME,                -- 最終使用日時
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token_hash ON trusted_devices(token_hash);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires ON trusted_devices(expires_at);
