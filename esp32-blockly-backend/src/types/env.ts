/**
 * Shared Hono Bindings + Variables for the entire Workers app.
 *
 * Prior to consolidation (P4 nice-to-have, 2026-05-02), every middleware /
 * route file defined its own `type Bindings` listing only the env vars it
 * touched. The wide intent (narrow types document what each module needs)
 * cost ~13 files of duplicated definitions and forced a same-file edit on
 * every new Worker secret / KV namespace / D1 binding.
 *
 * This module is the single source of truth. New env vars go here; routes
 * import the shared `Bindings` type unchanged.
 *
 * Variables follow Hono's `c.set` / `c.get` convention. `user` is set by
 * `authMiddleware`, `userPlan` by `requirePlan`, `locale` by
 * `localeMiddleware`. Files that don't run those middlewares (e.g.
 * `routes/webhooks.ts` — no auth, raw Stripe payload) declare their
 * `Hono<{ Bindings: Bindings }>` without Variables and never call `c.get`.
 *
 * Trade-off: a unified `Variables` widens the type at routes that don't
 * actually pass through every middleware. Acceptable because every
 * `c.get('user')` site is already gated by `authMiddleware` at runtime,
 * and the alternative (composable `BaseVariables` / `AuthVariables` /
 * `PlanVariables` chain) was rejected as more complex than the failure mode
 * it would prevent (a runtime "user is undefined" that never occurs given
 * the route registration order in `src/index.ts`).
 */

import type { PlanType } from '../utils/plan';
import type { Locale } from '../i18n/messages';

/** All Cloudflare bindings + secrets exposed to the Worker. */
export type Bindings = {
  // ── D1 + R2 + KV ────────────────────────────────────────────────
  DB: D1Database;
  R2: R2Bucket;
  WEBAUTHN_CHALLENGES: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;

  // ── Workers Secrets (`wrangler secret put`) ─────────────────────
  JWT_SECRET: string;
  /** Phase D-1: Stripe 決済連携 */
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** Phase C: class feature proxy (digicode-class-server on ML30) */
  CLASS_API_SECRET: string;
  /** Optional: 2FA / OTP email transport. */
  RESEND_API_KEY?: string;

  // ── vars (wrangler.jsonc) ───────────────────────────────────────
  /** Optional: comma-separated list of additional CORS origins. */
  CORS_ORIGINS?: string;
  /** Phase C class API base URL, e.g. "https://class.digital-fab.jp". */
  CLASS_API_URL: string;
  /** Step 8: Scheduled handler dry-run flag — 'true' で実削除せずログのみ. */
  SCHEDULED_DRY_RUN?: string;
};

/**
 * All values set on the Hono Context across the request lifecycle.
 *
 * - `user` — set by `authMiddleware` (src/middleware/auth.ts)
 * - `userPlan` — set by `requirePlan` (src/middleware/plan.ts)
 * - `locale` — set by `localeMiddleware` (src/middleware/locale.ts)
 *
 * Non-auth routes (webhooks.ts) declare their Hono generic without
 * Variables and never call `c.get` — see module-level comment above.
 */
export type Variables = {
  user: {
    userId: number;
    email: string;
  };
  userPlan: PlanType;
  locale: Locale;
};

/** Convenience composite for `Hono<Env>`. */
export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
