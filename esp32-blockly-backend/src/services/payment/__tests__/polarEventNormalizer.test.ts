import { describe, it, expect } from 'vitest';
import { normalizePolarEvent } from '../polarEventNormalizer';

const SUB_BASE = {
  id: 'sub_uuid_123',
  customer_id: 'cust_uuid_456',
  product_id: 'prod_uuid_lite',
  current_period_end: '2027-01-01T00:00:00Z',
  metadata: { digicode_user_id: '42', plan_id: 'lite' },
  customer: { external_id: '42' },
};

describe('normalizePolarEvent — state mapping', () => {
  it('subscription.created → active', () => {
    const ev = normalizePolarEvent('subscription.created', SUB_BASE);
    expect(ev?.state).toBe('active');
    expect(ev?.externalSubscriptionId).toBe('sub_uuid_123');
    expect(ev?.externalCustomerId).toBe('cust_uuid_456');
    expect(ev?.productId).toBe('prod_uuid_lite');
    expect(ev?.digicodeUserId).toBe(42);
  });

  it('subscription.active → active', () => {
    const ev = normalizePolarEvent('subscription.active', SUB_BASE);
    expect(ev?.state).toBe('active');
  });

  it('subscription.uncanceled → active (cancel rescinded)', () => {
    const ev = normalizePolarEvent('subscription.uncanceled', SUB_BASE);
    expect(ev?.state).toBe('active');
  });

  it('subscription.past_due → past_due', () => {
    const ev = normalizePolarEvent('subscription.past_due', SUB_BASE);
    expect(ev?.state).toBe('past_due');
  });

  it('subscription.canceled → canceled (period continues)', () => {
    const ev = normalizePolarEvent('subscription.canceled', SUB_BASE);
    expect(ev?.state).toBe('canceled');
    expect(ev?.periodEndAt).toBe('2027-01-01T00:00:00Z');
  });

  it('subscription.revoked → expired', () => {
    const ev = normalizePolarEvent('subscription.revoked', SUB_BASE);
    expect(ev?.state).toBe('expired');
  });

  it('order.refunded → expired (uses order subscription_id)', () => {
    const order = {
      id: 'ord_uuid_999',
      customer_id: 'cust_uuid_456',
      product_id: 'prod_uuid_lite',
      subscription_id: 'sub_uuid_777',
      metadata: { digicode_user_id: '99' },
    };
    const ev = normalizePolarEvent('order.refunded', order);
    expect(ev?.state).toBe('expired');
    expect(ev?.externalSubscriptionId).toBe('sub_uuid_777');
    expect(ev?.digicodeUserId).toBe(99);
  });

  it('subscription.updated → null (intentionally not handled)', () => {
    // subscription.updated is too broad; we wait for the specific
    // .active/.past_due/.canceled/.revoked replacement event.
    expect(normalizePolarEvent('subscription.updated', SUB_BASE)).toBeNull();
  });

  it('unrelated events → null', () => {
    for (const t of [
      'checkout.created',
      'checkout.updated',
      'checkout.expired',
      'customer.created',
      'customer.updated',
      'customer.deleted',
      'customer.state_changed',
      'order.created',
      'order.updated',
      'order.paid',
      'refund.created',
      'refund.updated',
      'benefit_grant.created',
      'benefit_grant.updated',
      'benefit_grant.revoked',
      'benefit.created',
      'benefit.updated',
      'product.created',
      'product.updated',
      'organization.updated',
      'made.up.event',
    ]) {
      expect(normalizePolarEvent(t, SUB_BASE)).toBeNull();
    }
  });
});

describe('normalizePolarEvent — digicode_user_id recovery', () => {
  it('falls back to customer.external_id when metadata missing', () => {
    const data = {
      ...SUB_BASE,
      metadata: null,
      customer: { external_id: '17' },
    };
    const ev = normalizePolarEvent('subscription.active', data);
    expect(ev?.digicodeUserId).toBe(17);
  });

  it('prefers metadata.digicode_user_id over customer.external_id', () => {
    const data = {
      ...SUB_BASE,
      metadata: { digicode_user_id: '111' },
      customer: { external_id: '222' },
    };
    const ev = normalizePolarEvent('subscription.active', data);
    expect(ev?.digicodeUserId).toBe(111);
  });

  it('returns null user_id when both missing', () => {
    const data = {
      id: 'sub_x',
      customer_id: 'cust_x',
      product_id: 'prod_x',
      metadata: null,
      customer: null,
    };
    const ev = normalizePolarEvent('subscription.active', data);
    expect(ev?.digicodeUserId).toBeNull();
  });

  it('rejects non-positive / non-numeric user ids', () => {
    for (const bad of ['0', '-3', 'abc', '', null]) {
      const data = {
        ...SUB_BASE,
        metadata: { digicode_user_id: bad as string | null },
        customer: null,
      };
      const ev = normalizePolarEvent('subscription.active', data);
      expect(ev?.digicodeUserId).toBeNull();
    }
  });
});

describe('normalizePolarEvent — payload shape resilience', () => {
  it('handles missing optional fields', () => {
    const sparse = { id: 'sub_x' };
    const ev = normalizePolarEvent('subscription.active', sparse);
    expect(ev?.state).toBe('active');
    expect(ev?.externalSubscriptionId).toBe('sub_x');
    expect(ev?.externalCustomerId).toBeNull();
    expect(ev?.productId).toBeNull();
    expect(ev?.periodEndAt).toBeNull();
    expect(ev?.digicodeUserId).toBeNull();
  });
});
