/**
 * countryMiddleware — pulls CF-IPCountry off the request and seeds the
 * Hono context for downstream provider routing.
 *
 * Plan 58 §4 chose CF-IPCountry as the authoritative country signal.
 * No self-declaration UI, no VPN-override accommodation. The middleware:
 *
 *   1. Reads `CF-IPCountry` from request headers
 *      (Cloudflare auto-injects on every request that hits a Worker)
 *   2. Normalizes to uppercase 2-letter or `null`
 *   3. `c.set('country', value)` for the factory to consume
 *   4. Fire-and-forget D1 write of `users.country_code` on FIRST
 *      observation only (Phase 5 R-2 sticky semantics — Plan 58 §6a +
 *      handover S13). The first country observed for a user becomes
 *      sticky: subsequent VPN/travel changes in CF-IPCountry leave the
 *      column alone, and the factory routes by the persisted column
 *      via `resolveEffectiveCountry` (services/payment/index.ts).
 *
 *      Sticky semantics matter because:
 *        - The factory now READS this column (Phase 5 R-2). If the
 *          middleware kept overwriting it from each request's header,
 *          a JP-resident clicking checkout while VPN-ing to US would
 *          flip to Polar, then back to Stripe the next request — a
 *          provider thrash that violates the §6a.1 #5 contract
 *          ("cross-provider switch only via cancel → re-subscribe").
 *        - Admin overrides (e.g. seeding a US value via D1 for the
 *          Polar overseas test account) must survive subsequent
 *          authenticated visits. Per S13, all writes are uniform
 *          (no separate `manually_set` flag) — the NULL-guard is the
 *          only mechanism distinguishing first-observed from override.
 *
 * The D1 write uses `c.executionCtx.waitUntil` so it runs to completion
 * after the response is sent without blocking the request.
 */

import type { MiddlewareHandler } from 'hono';
import type { Bindings, Variables } from '../types/env';

export const countryMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const raw = c.req.header('CF-IPCountry');
  const country = isValidCountryCode(raw) ? raw!.toUpperCase() : null;

  c.set('country', country);

  // Optional D1 sync. Only when:
  //   - we have an authenticated user (`authMiddleware` populated c.get('user'))
  //   - we have a real country code (skip 'XX' / 'T1' / null)
  if (country && country !== 'XX' && country !== 'T1') {
    const user = c.get('user');
    if (user?.userId) {
      c.executionCtx.waitUntil(
        c.env.DB
          .prepare(
            // NULL-only guard = first-observed sticky. Non-NULL values
            // (auto-written on a prior visit OR admin-seeded via D1)
            // are preserved so the factory's `resolveEffectiveCountry`
            // sees a stable signal.
            `UPDATE users SET country_code = ?
             WHERE id = ? AND country_code IS NULL`,
          )
          .bind(country, user.userId)
          .run()
          .catch((err) => {
            // Best-effort: log and continue; the country resolution path
            // does not depend on this row being current.
            console.warn('[country] D1 sync failed', err);
          }),
      );
    }
  }

  await next();
};

/**
 * CF-IPCountry sends ISO 3166-1 alpha-2 codes (`JP`, `US`, ...) or the
 * special placeholders `XX` (unknown) and `T1` (Tor exit). Length-2
 * is the only reliable shape check; we keep the special placeholders
 * because the factory treats them explicitly as fallback-to-Stripe.
 */
function isValidCountryCode(value: string | undefined): value is string {
  return !!value && /^[A-Za-z0-9]{2}$/.test(value);
}
