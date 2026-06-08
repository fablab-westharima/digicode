-- migrations/0029_add_lemonsqueezy_columns.sql
--
-- Phase ② of MoR Payment Integration (plan 58 / Session 163): LemonSqueezy
-- becomes the overseas (non-JP) Merchant-of-Record provider. Polar is kept
-- dormant as a backup (its columns from 0028 are untouched).
--
-- Mirrors the polar_* columns (0028) so a single subscription row can be
-- identified on LemonSqueezy without joining a side table.
--
-- lemonsqueezy_customer_id     — LS customer id (numeric string) from the
--                                webhook payload / Customer object. Used by
--                                createPortalSession (GET /v1/customers/{id}
--                                → attributes.urls.customer_portal).
-- lemonsqueezy_subscription_id — LS subscription id delivered by
--                                subscription_* webhook events.
-- lemonsqueezy_variant_id      — LS variant id the customer subscribed to
--                                (LS attaches price to a variant, not a product).
-- lemonsqueezy_order_id        — LS order id (for reconciling order_refunded).
--
-- All columns are nullable: rows for stripe/polar customers stay
-- lemonsqueezy_*=NULL. The `provider` column (0027) has no CHECK constraint,
-- so the value 'lemonsqueezy' is accepted without a schema change.

ALTER TABLE subscriptions ADD COLUMN lemonsqueezy_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN lemonsqueezy_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN lemonsqueezy_variant_id TEXT;
ALTER TABLE subscriptions ADD COLUMN lemonsqueezy_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_customer_id
  ON subscriptions(lemonsqueezy_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_subscription_id
  ON subscriptions(lemonsqueezy_subscription_id);
