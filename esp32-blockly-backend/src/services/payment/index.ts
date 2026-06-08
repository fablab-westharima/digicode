/**
 * Provider factory — resolves a user to the right PaymentProvider.
 *
 * Selection rules (plan 58 §3.3 + Phase 5 R-2 country_code override):
 *
 *   1. If the user already has an active/past_due/canceling subscription
 *      row, keep using that provider. Cross-provider migration is never
 *      automatic; it only happens after the user fully cancels and
 *      re-subscribes.
 *
 *   2. If `users.country_code` is set (non-NULL), prefer that over the
 *      CF-IPCountry header from this request. The column is populated
 *      by `countryMiddleware` on first authenticated visit and may also
 *      be manually overridden by an admin via D1 (used for the Polar
 *      overseas test account). The intentional side-effect is that the
 *      first country we observe for a user becomes sticky — a VPN /
 *      travel change in CF-IPCountry does not move a free-tier user
 *      between providers, mirroring how an active subscription's
 *      provider is locked in plan 58 §6a.1 #1.
 *
 *   3. Otherwise fall back to CF-IPCountry. `decideProviderByCountry`
 *      routes JP / null / 'XX' / 'T1' to Stripe (safer fallback;
 *      misrouting a JP customer to the overseas MoR provider would create
 *      inappropriate MoR VAT exposure that's harder to unwind than the reverse).
 *
 * The factory is async because steps 1 + 2 read from D1. Callers must
 * `await` it before invoking `createCheckout` / `createPortalSession`.
 *
 * `resolveEffectiveCountry` is exported so the /status route can return
 * the SAME country / expectedProvider the factory would choose — keeping
 * the frontend's state A/B/C decision in sync with what the backend will
 * actually do at checkout time.
 */

import type { PaymentProvider, ProviderId } from './types';
import { StripeProvider } from './stripeProvider';
import { PolarProvider } from './polarProvider';
import { LemonSqueezyProvider } from './lemonSqueezyProvider';
import { findBlockingActiveSubscription } from './activeSubscription';
import type { Bindings } from '../../types/env';

export async function getProviderForUser(
  env: Bindings,
  userId: number,
  countryFromHeader: string | null,
): Promise<PaymentProvider> {
  // Reuse the §6a.2 double-charge-guard helper so the "what counts as
  // an in-flight subscription that locks the provider" set is defined
  // in one place. An earlier inline copy here drifted to include
  // 'canceled' too, which violated the §6a.1 #5 contract ("cross-
  // provider switch only happens after the user fully cancels and
  // re-subscribes"): a fully-canceled row would have kept the user
  // pinned to their old provider on the next checkout. The helper's
  // status set is `('active', 'past_due', 'canceling')` only.
  const blocking = await findBlockingActiveSubscription(env.DB, userId);
  if (blocking) {
    return instantiate(env, blocking.provider);
  }

  const effective = await resolveEffectiveCountry(env, userId, countryFromHeader);
  return instantiate(env, decideProviderByCountry(effective));
}

/**
 * Effective country for a user: prefer the persisted users.country_code
 * over the CF-IPCountry header. Used by both the factory (step 2 above)
 * and the /status route response, so a frontend rendering state A/B/C
 * decides on the same value the backend would route a fresh checkout
 * against.
 */
export async function resolveEffectiveCountry(
  env: Bindings,
  userId: number,
  countryFromHeader: string | null,
): Promise<string | null> {
  const userRow = await env.DB
    .prepare('SELECT country_code FROM users WHERE id = ?')
    .bind(userId)
    .first<{ country_code: string | null }>();
  return userRow?.country_code ?? countryFromHeader;
}

/**
 * Pure-function variant of the country routing rule. Exported so the
 * factory test suite can exhaustively cover the country matrix without
 * a D1 mock.
 */
export function decideProviderByCountry(countryCode: string | null): ProviderId {
  if (!countryCode) return 'stripe';
  const normalized = countryCode.toUpperCase();
  if (normalized === 'JP') return 'stripe';
  if (normalized === 'XX' || normalized === 'T1') return 'stripe';
  // Phase ② (Session 163): overseas (non-JP) MoR = LemonSqueezy (replaces Polar).
  return 'lemonsqueezy';
}

/**
 * Phase ① (Session 163) overseas-checkout kill-switch.
 *
 * Returns true when new Polar (non-JP) checkouts are suspended via the
 * `POLAR_CHECKOUT_SUSPENDED='true'` env var. Single source of truth shared by
 * the /status `polarAvailable` flag (drives the frontend "準備中" UI) and the
 * /checkout guard (blocks new Polar checkout creation), so the two cannot
 * drift apart. Kept next to decideProviderByCountry because the suspend
 * decision and the routing decision belong together.
 *
 * Deliberately does NOT touch POLAR_ACCESS_TOKEN / POLAR_WEBHOOK_SECRET:
 * existing Polar portal + webhook lifecycle stay functional while new
 * checkouts are off.
 */
export function isPolarSuspended(env: Bindings): boolean {
  return env.POLAR_CHECKOUT_SUSPENDED === 'true';
}

/**
 * Phase ② (Session 163) LemonSqueezy go-live gate. Returns true when overseas
 * LS checkout is live (LEMONSQUEEZY_ENABLED='true'). Single source shared by
 * /status `lsAvailable` (準備中 UI) and the /checkout guard, so deploy and
 * activation stay decoupled (mirror of isPolarSuspended).
 */
export function isLemonSqueezyEnabled(env: Bindings): boolean {
  return env.LEMONSQUEEZY_ENABLED === 'true';
}

/**
 * Instantiate a provider by id. Exported so the admin payment-test route
 * shares this one switch instead of keeping its own stripe/polar branch
 * (Session 163: removes the binary-else trap at the admin route).
 */
export function instantiate(env: Bindings, id: ProviderId): PaymentProvider {
  switch (id) {
    case 'stripe':
      return new StripeProvider(env);
    case 'polar':
      return new PolarProvider(env);
    case 'lemonsqueezy':
      return new LemonSqueezyProvider(env);
  }
}
