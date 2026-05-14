-- Session 123 F-8 (Stripe webhook idempotency)
-- Stripe webhook event の replay 防止用 idempotency table。
-- Stripe は failed delivery を 3 日間 retry し、同じ event.id が複数回到着する。
-- 旧コード (webhooks.ts) は event.id 重複 check なしで全 handler を再実行 → 例えば
-- handleSubscriptionDeleted の enterprise grace path で gracePeriod = now+1month を
-- 各 retry ごとに UPDATE = cancellation deadline が無限延長される脆弱性 (F-10)。
--
-- 本 migration で event.id PRIMARY KEY の小規模 table を作成、webhook handler は
-- INSERT OR IGNORE event.id を行い、affected_rows=0 (重複) なら 200 早期 return。
-- 5 万 events/year × 32 byte/row ≈ 1.5 MB/year で D1 容量影響無視できる。

CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
  ON processed_webhooks (processed_at);
