-- Phase D-1: Stripe 決済連携用カラム追加
-- 既存の square_* カラムは残置（Phase D-3 で削除予定）
-- SQLite の ALTER TABLE ADD COLUMN は UNIQUE 制約を直接付けられないため、
-- カラム追加後にインデックスで UNIQUE を担保する。

ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN stripe_price_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
