/**
 * Polar webhook event → NormalizedPolarEvent.
 *
 * Polar follows the Standard Webhooks payload envelope:
 *
 *   {
 *     "type": "subscription.created",
 *     "data": { ...subscription resource... }
 *   }
 *
 * Out of Polar's 26 documented event types, only the lifecycle events
 * we care about for SaaS subscription billing produce a normalized
 * value. Everything else (benefit_grant.*, product.*, etc.) maps to
 * `null` and the webhook handler logs + ignores.
 *
 * Internal state mapping rationale (plan 58 §5.2-5.3):
 *
 *   subscription.created / .active / .uncanceled → active
 *     Polar emits .created at the moment of subscription, .active when
 *     the first payment succeeds. Both put the user into the paying
 *     state from our perspective.
 *
 *   subscription.past_due → past_due
 *     Payment failed, Polar is retrying. The customer keeps access
 *     during the dunning window per Polar's defaults.
 *
 *   subscription.canceled → canceled
 *     User clicked "cancel" in the portal. Access continues until the
 *     current period ends. NOTE: Polar uses `canceled` for this
 *     scheduled-cancel state; Stripe uses `canceled` for fully
 *     terminated. Our internal `canceled` matches Polar's meaning.
 *
 *   subscription.revoked → expired
 *     Period ended after a cancel, or admin force-cancel. Access lost.
 *
 *   order.refunded → expired
 *     One-time refund of the current order — treat as expired so
 *     users.plan drops to free immediately.
 *
 *   Everything else → null (handler logs and returns 200)
 */

import type { NormalizedPolarEvent, SubscriptionStateInternal } from './types';

/** Subset of the Polar `Subscription` resource we read from event data. */
interface PolarSubscriptionData {
  id?: string;
  customer_id?: string;
  product_id?: string;
  current_period_end?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  customer?: { external_id?: string | null } | null;
}

/** Subset of the Polar `Order` resource we read from event data. */
interface PolarOrderData {
  id?: string;
  customer_id?: string;
  product_id?: string;
  subscription_id?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  customer?: { external_id?: string | null } | null;
}

/**
 * Map a Polar event type + data payload to the normalized internal shape.
 * Return `null` to mean "not a state-changing event we handle".
 */
export function normalizePolarEvent(
  eventType: string,
  data: unknown,
): NormalizedPolarEvent | null {
  const state = stateForEventType(eventType);
  if (!state) return null;

  // Most lifecycle events carry a Subscription; `order.refunded` carries an Order.
  if (eventType === 'order.refunded') {
    const order = data as PolarOrderData;
    return {
      rawType: eventType,
      externalSubscriptionId: order.subscription_id ?? null,
      externalCustomerId: order.customer_id ?? null,
      digicodeUserId: extractDigicodeUserId(order),
      productId: order.product_id ?? null,
      state,
      periodEndAt: null,
    };
  }

  const sub = data as PolarSubscriptionData;
  return {
    rawType: eventType,
    externalSubscriptionId: sub.id ?? null,
    externalCustomerId: sub.customer_id ?? null,
    digicodeUserId: extractDigicodeUserId(sub),
    productId: sub.product_id ?? null,
    state,
    periodEndAt: sub.current_period_end ?? null,
  };
}

function stateForEventType(eventType: string): SubscriptionStateInternal | null {
  switch (eventType) {
    case 'subscription.created':
    case 'subscription.active':
    case 'subscription.uncanceled':
      return 'active';
    case 'subscription.past_due':
      return 'past_due';
    case 'subscription.canceled':
      return 'canceled';
    case 'subscription.revoked':
      return 'expired';
    case 'order.refunded':
      return 'expired';
    // subscription.updated is intentionally NOT normalized — it fires
    // for many low-impact changes (metadata, billing address, …) and
    // its replacement event (.active / .past_due / .canceled / .revoked)
    // already carries the state we care about.
    default:
      return null;
  }
}

/**
 * Recover DigiCode's internal user_id. Source priority:
 *   1. metadata.digicode_user_id  (we set this on every checkout)
 *   2. customer.external_id       (we set this via external_customer_id)
 *
 * Returns null when neither is parseable — applyEvent then refuses to
 * write D1 and the webhook handler logs the dropped event.
 */
function extractDigicodeUserId(
  payload: PolarSubscriptionData | PolarOrderData,
): number | null {
  const metaUserId = payload.metadata?.digicode_user_id;
  const parsedMeta = parseUserId(metaUserId);
  if (parsedMeta != null) return parsedMeta;

  const external = payload.customer?.external_id;
  const parsedExternal = parseUserId(external);
  return parsedExternal;
}

function parseUserId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
