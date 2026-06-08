/**
 * Payment provider abstraction layer — shared types.
 *
 * Plan 58 (MoR Payment Integration) introduces multiple payment providers
 * (Stripe for Japan, Polar.sh for the rest). The route + middleware layer
 * stays provider-agnostic; this file is the contract everyone else honors.
 *
 * Design notes that are easy to forget six months from now:
 *
 *   - `createCheckout` and `createPortalSession` are the ONLY operations
 *     on the interface. Cancel / upgrade / refund are handled by each
 *     provider's hosted customer portal, so DigiCode never invokes them
 *     directly. If admin force-cancel becomes a feature, add the method
 *     here, do not bypass.
 *
 *   - Webhook handling is OUT of this interface. Each provider's webhook
 *     payload + signature scheme is too different to homogenize cheaply.
 *     Webhooks live in `routes/webhooks.ts` and write subscription state
 *     directly (Stripe) or via `applyEvent.ts` (Polar).
 *
 *   - `SubscriptionStateInternal` is the four-value normalized state used
 *     by the Polar code path. Stripe's existing webhook handlers continue
 *     to write the raw Stripe status strings unchanged (the `subscriptions`
 *     table has no CHECK constraint on status in SQLite, see migration
 *     0027 module comment for the reasoning). When the Stripe webhook is
 *     refactored to use the same normalizer (Phase 6 polish), the in-DB
 *     values converge to this enum.
 */

export type ProviderId = 'stripe' | 'polar' | 'lemonsqueezy';

export type PlanId = 'free' | 'lite' | 'pro' | 'enterprise';

/**
 * The four states the Polar normalizer collapses every provider event to.
 *
 *   active     — paid, current period, full access
 *   past_due   — most recent payment failed; provider is retrying; access
 *                continues during the dunning window
 *   canceled   — user/admin requested cancellation; access continues
 *                until the current period ends. NOTE: this matches
 *                Polar's `subscription.canceled` semantics. Stripe uses
 *                `canceled` for "fully terminated" — see normalizer §5.3
 *   expired    — period ended OR refunded; user is back on free
 */
export type SubscriptionStateInternal = 'active' | 'past_due' | 'canceled' | 'expired';

export interface CheckoutOptions {
  userId: number;
  email: string;
  planId: PlanId;
  /** Origin of the request — used to build `success_url` / `cancel_url`. */
  origin: string;
}

export interface CheckoutResult {
  /** Where the frontend should redirect the user. */
  url: string;
  /** Provider-side session ID, for observability + debugging. */
  sessionId: string;
  provider: ProviderId;
}

export interface PortalOptions {
  /** Provider-side customer ID (stripe_customer_id or polar_customer_id). */
  customerId: string;
  returnUrl: string;
}

export interface PortalResult {
  url: string;
}

export interface PaymentProvider {
  readonly id: ProviderId;
  createCheckout(opts: CheckoutOptions): Promise<CheckoutResult>;
  createPortalSession(opts: PortalOptions): Promise<PortalResult>;
}

/**
 * Errors thrown by provider implementations.
 *
 * `code` is an i18n key suffix (e.g. `'polar.checkoutFailed'`) the route
 * layer can pass to `errorJson(c, code, status)`. `cause` carries the
 * upstream error (Stripe SDK throw, Polar response body) for `console.error`
 * — never serialized back to the client (rule 09-runtime-research +
 * F-5 leakage lesson).
 */
export class PaymentProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

/**
 * Normalized event for the Polar webhook path. Stripe events have their
 * own field-rich Stripe.Event type and stay on the existing handler in
 * `routes/webhooks.ts`; this shape is the Polar side only.
 */
export interface NormalizedPolarEvent {
  /** Polar event type, e.g. `'subscription.created'`. Kept for logging. */
  rawType: string;
  externalSubscriptionId: string | null;
  externalCustomerId: string | null;
  /** DigiCode user_id recovered from Polar customer.external_id or metadata. */
  digicodeUserId: number | null;
  /** Polar product UUID — used to derive planId via env lookup. */
  productId: string | null;
  state: SubscriptionStateInternal;
  /** Cancellation period end (when state === 'canceled'). ISO 8601 string. */
  periodEndAt: string | null;
}

/**
 * Normalized event for the LemonSqueezy webhook path. Mirrors
 * NormalizedPolarEvent but carries `variantId` (LemonSqueezy attaches price
 * to a variant, not a product). LemonSqueezy events have no Standard-Webhooks
 * envelope; the handler dedupes via SHA-256(rawBody) instead.
 */
export interface NormalizedLemonSqueezyEvent {
  /** LemonSqueezy event name, e.g. `'subscription_created'`. Kept for logging. */
  rawType: string;
  externalSubscriptionId: string | null;
  externalCustomerId: string | null;
  /** DigiCode user_id recovered from meta.custom_data.user_id (LS returns it as a string). */
  digicodeUserId: number | null;
  /** LemonSqueezy variant id — used to derive planId via env lookup. */
  variantId: string | null;
  state: SubscriptionStateInternal;
  /** Cancellation / period end (when state === 'canceled'). ISO 8601 string. */
  periodEndAt: string | null;
}
