/**
 * Provider factory — resolves a user to the right PaymentProvider.
 *
 * Selection rules (plan 58 §3.3):
 *
 *   1. If the user already has an active/past_due/canceled subscription
 *      row, keep using that provider. Cross-provider migration is never
 *      automatic; it only happens after the user fully cancels and
 *      re-subscribes.
 *
 *   2. Otherwise, route by CF-IPCountry:
 *        - 'JP'           → Stripe
 *        - any other ISO  → Polar
 *        - null / 'XX' / 'T1' (unknown / Tor) → Stripe as a safer fallback
 *          (Stripe handles JP B2B invoicing well; misrouting an
 *           international customer to Stripe is a recoverable nuisance,
 *           misrouting a Japanese customer to Polar would create
 *           inappropriate MoR VAT exposure that is harder to unwind.)
 *
 * The factory is async because step 1 reads from D1. Callers must
 * `await` it before invoking `createCheckout` / `createPortalSession`.
 */

import type { PaymentProvider, ProviderId } from './types';
import { StripeProvider } from './stripeProvider';
import { PolarProvider } from './polarProvider';
import type { Bindings } from '../../types/env';

export async function getProviderForUser(
  env: Bindings,
  userId: number,
  countryCode: string | null,
): Promise<PaymentProvider> {
  const existing = await env.DB
    .prepare(
      `SELECT provider FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'past_due', 'canceled', 'canceling')`,
    )
    .bind(userId)
    .first<{ provider: ProviderId | null }>();

  if (existing?.provider === 'stripe' || existing?.provider === 'polar') {
    return instantiate(env, existing.provider);
  }

  return instantiate(env, decideProviderByCountry(countryCode));
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
  return 'polar';
}

function instantiate(env: Bindings, id: ProviderId): PaymentProvider {
  switch (id) {
    case 'stripe':
      return new StripeProvider(env);
    case 'polar':
      return new PolarProvider(env);
  }
}
