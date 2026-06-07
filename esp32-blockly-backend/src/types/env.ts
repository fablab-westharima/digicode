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
  /**
   * Optional: DockerHub Personal Access Token (`dckr_pat_…` form). Paired
   * with `DOCKERHUB_USERNAME` for authenticated Hub API calls via 2-step
   * JWT exchange (POST `/v2/users/login` with {username, password: PAT}
   * → returns JWT → `Authorization: Bearer ${JWT}` for subsequent calls).
   *
   * Session 154 hotfix (commit 230579b) initially used `Bearer ${PAT}`
   * directly but Hub API rejects PAT in Bearer (401) — Session 155 (commit
   * 26fc881 follow-up) corrected to 2-step JWT flow. Anonymous per-IP rate
   * limit (~180/6h) is hit on shared CF Worker egress IP; authenticated
   * session uses per-account quota (much higher).
   *
   * If either secret is absent, falls back to anonymous Hub API access
   * (fail-soft per Session 129 design).
   */
  DOCKERHUB_PAT?: string;
  /**
   * Optional: DockerHub username paired with `DOCKERHUB_PAT` for the
   * 2-step JWT exchange auth flow. Set via `wrangler secret put
   * DOCKERHUB_USERNAME`. See `DOCKERHUB_PAT` doc above for rationale.
   */
  DOCKERHUB_USERNAME?: string;

  // ── MoR payment integration (plan 58) ───────────────────────────
  // Provider-side IDs of the Lite/Pro/Enterprise plans. Stored as env
  // vars rather than D1 rows so a stripe-dashboard typo can be reverted
  // by a wrangler secret update without writing a migration.
  /** Stripe price IDs per plan, set via `wrangler secret put`. */
  STRIPE_PRICE_LITE?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_ENTERPRISE?: string;
  /** Polar Organization Access Token (Bearer `polar_oat_…`). */
  POLAR_ACCESS_TOKEN?: string;
  /** Polar webhook signing secret (base64-encoded, Standard Webhooks spec). */
  POLAR_WEBHOOK_SECRET?: string;
  /** Polar product UUIDs per plan, set via `wrangler secret put`. */
  POLAR_PRODUCT_LITE?: string;
  POLAR_PRODUCT_PRO?: string;
  POLAR_PRODUCT_ENTERPRISE?: string;

  // ── vars (wrangler.jsonc) ───────────────────────────────────────
  /** Optional: comma-separated list of additional CORS origins. */
  CORS_ORIGINS?: string;
  /** Phase C class API base URL, e.g. "https://class.digital-fab.jp". */
  CLASS_API_URL: string;
  /** Step 8: Scheduled handler dry-run flag — 'true' で実削除せずログのみ. */
  SCHEDULED_DRY_RUN?: string;
  /** Polar API server — 'sandbox' (default) or 'production'. */
  POLAR_SERVER_MODE?: 'sandbox' | 'production';
  /**
   * Phase ① (Session 163) overseas-checkout kill-switch. Set to the string
   * 'true' (in wrangler.jsonc vars) to suspend NEW Polar (non-JP) checkouts
   * while keeping POLAR_ACCESS_TOKEN / POLAR_WEBHOOK_SECRET live, so existing
   * portal + webhook lifecycle stay functional. Any other value / unset =
   * overseas checkout enabled. Read via `isPolarSuspended()`. Workers env
   * values are strings, so this is a string compared to 'true' (same
   * convention as SCHEDULED_DRY_RUN), not a real boolean.
   */
  POLAR_CHECKOUT_SUSPENDED?: string;
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
  /**
   * ISO 3166-1 alpha-2 set by `countryMiddleware` from CF-IPCountry.
   * `null` when the header is missing, or `'XX'`/`'T1'` (unknown/Tor) —
   * factory treats either as "route to Stripe (safer fallback)".
   */
  country: string | null;
};

/** Convenience composite for `Hono<Env>`. */
export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
