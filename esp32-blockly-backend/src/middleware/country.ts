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
 *   4. Fire-and-forget D1 update of `users.country_code` for
 *      observability (admin panels, log analysis). The update never
 *      influences the factory — the factory only reads the live header
 *      on each request, so VPN/travel naturally re-routes the user on
 *      next checkout.
 *
 * The D1 write uses `c.executionCtx.waitUntil` so it runs to completion
 * after the response is sent without blocking the request. It is
 * guarded by `IS NULL OR != ?` so we only write on first-seen or
 * changed values, sparing D1 quota.
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
            `UPDATE users SET country_code = ?
             WHERE id = ? AND (country_code IS NULL OR country_code != ?)`,
          )
          .bind(country, user.userId, country)
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
