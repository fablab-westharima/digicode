-- migrations/0027_add_provider_and_country.sql
--
-- Phase 3 of MoR Payment Integration (plan: 58_MoR-payment-integration).
--
-- Adds:
--   subscriptions.provider — payment provider that owns this subscription row
--     ('stripe' for existing JP customers, 'polar' for new international ones).
--     DEFAULT 'stripe' so every existing row is backfilled to Stripe — that's
--     the truth before this migration: every active subscription is Stripe.
--   users.country_code — ISO 3166-1 alpha-2 captured from CF-IPCountry by
--     middleware/country.ts. Observability only; the factory reads the
--     request header at decision time, not this column.
--
-- The CHECK constraint on subscriptions.status is NOT modified here.
-- SQLite can't ALTER a CHECK constraint without recreating the table,
-- and the design (§5.4) accepts app-layer enforcement of the four-value
-- internal state (active/past_due/canceled/expired) plus the legacy 'free'.

ALTER TABLE subscriptions ADD COLUMN provider TEXT NOT NULL DEFAULT 'stripe';

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider);

ALTER TABLE users ADD COLUMN country_code TEXT;

CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);
