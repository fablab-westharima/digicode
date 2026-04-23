-- Phase 1.5 (2026-04-23): Square 決済連携の完全排除。
-- 0001 で作成された subscriptions.square_customer_id / square_subscription_id カラムを drop する。
-- Square は一度も本番稼働しておらず、両カラムは全行 NULL（adoption 前に Stripe へ統一した経緯）。
--
-- SQLite の ALTER TABLE DROP COLUMN は UNIQUE 制約を持つカラムに対して失敗するため、
-- テーブル再生成パターンを採用する。subscriptions には外部からの FK 参照なし、
-- users への outgoing FK のみ（ON DELETE CASCADE は新テーブルで維持）。
--
-- 適用前の安全確認（手動）:
--   wrangler d1 execute DB --remote --command "SELECT COUNT(*) FROM subscriptions WHERE square_customer_id IS NOT NULL OR square_subscription_id IS NOT NULL"
--   → 0 であることを確認してから適用する。
--
-- 関連: prompt/maintenance/発見バグ/2026-04-23_034_*.md

-- 1. 新テーブル作成（square_* カラム除外、それ以外は現行と同一定義）
CREATE TABLE subscriptions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'free',
  plan_type TEXT NOT NULL DEFAULT 'free',
  started_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 既存データ移送（square_* 除く全カラム）
INSERT INTO subscriptions_new (
  id, user_id, status, plan_type, started_at, expires_at,
  created_at, updated_at,
  stripe_customer_id, stripe_subscription_id, stripe_price_id
)
SELECT
  id, user_id, status, plan_type, started_at, expires_at,
  created_at, updated_at,
  stripe_customer_id, stripe_subscription_id, stripe_price_id
FROM subscriptions;

-- 3. 旧テーブル削除（関連 auto-index + trigger も自動削除）
DROP TABLE subscriptions;

-- 4. 新テーブルをリネーム
ALTER TABLE subscriptions_new RENAME TO subscriptions;

-- 5. 0002 で追加された index を再作成
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 6. 0020 で追加された unique index を再作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- 7. 0003 で追加された timestamp trigger を再作成
CREATE TRIGGER IF NOT EXISTS update_subscriptions_timestamp
AFTER UPDATE ON subscriptions
BEGIN
  UPDATE subscriptions SET updated_at = datetime('now') WHERE id = NEW.id;
END;
