/**
 * LemonSqueezy webhook event → NormalizedLemonSqueezyEvent.
 *
 * LemonSqueezy webhook envelope:
 *
 *   {
 *     "meta": { "event_name": "subscription_created", "custom_data": { "user_id": "123" } },
 *     "data": { "id": "<subscription id>", "attributes": { "status": "active", ... } }
 *   }
 *
 * Internal state mapping (plan 58 / Session 163 Phase ②, confirmed mapping):
 *   on_trial / active / paused      → active    (LS: only `expired` loses access)
 *   past_due / unpaid               → past_due
 *   cancelled                       → canceled  (access until period end)
 *   expired                         → expired
 *   order_refunded (event)          → expired
 *
 * We prefer the explicit `data.attributes.status` (LS's source of truth) and
 * fall back to the event name when status is absent. Everything else → null
 * (handler logs + returns 200 so LS does not retry a handled-but-unmapped event).
 *
 * user_id round-trips via meta.custom_data and LemonSqueezy returns custom
 * values as STRINGS even when sent as a number — parsed back to int here.
 */

import type { NormalizedLemonSqueezyEvent, SubscriptionStateInternal } from './types';

interface LsWebhookMeta {
  event_name?: string;
  custom_data?: Record<string, string | number | boolean | null> | null;
}

interface LsWebhookData {
  id?: string;
  attributes?: {
    status?: string;
    customer_id?: number | string | null;
    variant_id?: number | string | null;
    order_id?: number | string | null;
    subscription_id?: number | string | null;
    renews_at?: string | null;
    ends_at?: string | null;
  };
}

/**
 * Map a LemonSqueezy webhook (meta + data) to the normalized internal shape.
 * Return `null` to mean "not a state-changing event we handle".
 */
export function normalizeLemonSqueezyEvent(
  meta: unknown,
  data: unknown,
): NormalizedLemonSqueezyEvent | null {
  const m = (meta ?? {}) as LsWebhookMeta;
  const d = (data ?? {}) as LsWebhookData;
  const eventName = typeof m.event_name === 'string' ? m.event_name : '';
  const attrs = d.attributes ?? {};

  const state = stateForLsEvent(
    eventName,
    typeof attrs.status === 'string' ? attrs.status : undefined,
  );
  if (!state) return null;

  // order_refunded carries an Order resource (the subscription id is in
  // attributes.subscription_id); subscription_* events carry the Subscription
  // resource (its id is data.id).
  const externalSubscriptionId =
    eventName === 'order_refunded'
      ? toStr(attrs.subscription_id)
      : d.id ?? null;

  return {
    rawType: eventName,
    externalSubscriptionId,
    externalCustomerId: toStr(attrs.customer_id),
    digicodeUserId: parseUserId(m.custom_data?.user_id),
    variantId: toStr(attrs.variant_id),
    state,
    periodEndAt:
      (typeof attrs.ends_at === 'string' ? attrs.ends_at : null) ??
      (typeof attrs.renews_at === 'string' ? attrs.renews_at : null),
  };
}

function stateForLsEvent(
  eventName: string,
  status: string | undefined,
): SubscriptionStateInternal | null {
  // A refund unambiguously withdraws consent regardless of subscription status.
  if (eventName === 'order_refunded') return 'expired';

  // Prefer LS's explicit subscription status (source of truth).
  switch (status) {
    case 'on_trial':
    case 'active':
    case 'paused': // LS keeps access while paused; only `expired` loses it.
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'cancelled':
      return 'canceled';
    case 'expired':
      return 'expired';
  }

  // status absent → map by event name.
  switch (eventName) {
    case 'subscription_created':
    case 'subscription_resumed':
    case 'subscription_payment_success':
      return 'active';
    case 'subscription_payment_failed':
      return 'past_due';
    case 'subscription_cancelled':
      return 'canceled';
    case 'subscription_expired':
      return 'expired';
    default:
      return null;
  }
}

function toStr(value: number | string | null | undefined): string | null {
  if (value == null) return null;
  return String(value);
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
