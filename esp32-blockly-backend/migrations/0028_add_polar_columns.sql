-- migrations/0028_add_polar_columns.sql
--
-- Phase 3 of MoR Payment Integration (plan: 58_MoR-payment-integration).
--
-- Adds Polar.sh identification columns to subscriptions. Mirrors the
-- stripe_* columns added by 0020 so a single subscription row can be
-- identified on either provider without joining a side table.
--
-- polar_customer_id     — Polar customer UUID returned by /v1/checkouts/
-- polar_subscription_id — Polar subscription UUID delivered by
--                         subscription.* webhook events
-- polar_product_id      — Polar product UUID the customer subscribed to
--                         (Polar's data model attaches price to product)
-- polar_checkout_id     — Polar checkout session UUID (for reconciling
--                         abandoned checkouts via checkout.expired events)
--
-- All columns are nullable: rows for stripe customers stay polar_*=NULL.

ALTER TABLE subscriptions ADD COLUMN polar_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN polar_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN polar_product_id TEXT;
ALTER TABLE subscriptions ADD COLUMN polar_checkout_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_customer_id
  ON subscriptions(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_subscription_id
  ON subscriptions(polar_subscription_id);
