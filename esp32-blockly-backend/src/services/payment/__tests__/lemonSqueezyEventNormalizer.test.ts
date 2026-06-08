import { describe, it, expect } from 'vitest';
import { normalizeLemonSqueezyEvent } from '../lemonSqueezyEventNormalizer';

/** Build a LemonSqueezy webhook envelope (meta + data). */
function ev(
  eventName: string,
  attributes: Record<string, unknown>,
  custom: Record<string, unknown> | undefined = { user_id: '42' },
) {
  return {
    meta: { event_name: eventName, custom_data: custom },
    data: { id: 'sub_1', attributes },
  };
}

describe('normalizeLemonSqueezyEvent — status → internal state (Session 163 confirmed mapping)', () => {
  const cases: Array<[string, string, 'active' | 'past_due' | 'canceled' | 'expired']> = [
    ['subscription_created', 'on_trial', 'active'],
    ['subscription_created', 'active', 'active'],
    ['subscription_updated', 'paused', 'active'], // paused retains access
    ['subscription_payment_failed', 'past_due', 'past_due'],
    ['subscription_updated', 'unpaid', 'past_due'],
    ['subscription_cancelled', 'cancelled', 'canceled'],
    ['subscription_expired', 'expired', 'expired'],
  ];

  for (const [eventName, status, expected] of cases) {
    it(`${eventName} / status=${status} → ${expected}`, () => {
      const p = ev(eventName, { status, variant_id: 9, customer_id: 7 });
      const n = normalizeLemonSqueezyEvent(p.meta, p.data);
      expect(n?.state).toBe(expected);
    });
  }

  it('order_refunded → expired (refund withdraws consent), subscription id from order', () => {
    const p = ev('order_refunded', { subscription_id: 'sub_9', variant_id: 9, customer_id: 7 });
    const n = normalizeLemonSqueezyEvent(p.meta, p.data);
    expect(n?.state).toBe('expired');
    expect(n?.externalSubscriptionId).toBe('sub_9');
  });

  it('falls back to event name when status absent (payment_success → active)', () => {
    const p = ev('subscription_payment_success', { variant_id: 9, customer_id: 7 });
    const n = normalizeLemonSqueezyEvent(p.meta, p.data);
    expect(n?.state).toBe('active');
  });

  it('unmapped event → null (handler logs + 200, no D1 write)', () => {
    const p = ev('subscription_plan_changed', { status: 'whatever' });
    expect(normalizeLemonSqueezyEvent(p.meta, p.data)).toBeNull();
  });

  it('user_id round-trips from custom_data string → number (LS returns it as string)', () => {
    const p = ev('subscription_created', { status: 'active' }, { user_id: '123' });
    expect(normalizeLemonSqueezyEvent(p.meta, p.data)?.digicodeUserId).toBe(123);
  });

  it('numeric variant/customer ids are coerced to strings', () => {
    const p = ev('subscription_created', { status: 'active', variant_id: 555, customer_id: 777 });
    const n = normalizeLemonSqueezyEvent(p.meta, p.data);
    expect(n?.variantId).toBe('555');
    expect(n?.externalCustomerId).toBe('777');
  });

  it('missing user_id → digicodeUserId null (applyEvent then skips the write)', () => {
    const p = ev('subscription_created', { status: 'active' }, {});
    expect(normalizeLemonSqueezyEvent(p.meta, p.data)?.digicodeUserId).toBeNull();
  });
});
