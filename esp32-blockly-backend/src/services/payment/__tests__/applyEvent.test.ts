import { describe, it, expect, beforeEach } from 'vitest';
import { applyPolarEvent } from '../applyEvent';
import type { NormalizedPolarEvent } from '../types';
import type { Bindings } from '../../../types/env';

/**
 * Lightweight in-memory D1 mock that captures the prepared statements
 * and binding tuples our code under test issues. Subset of the D1
 * surface — only `prepare`, `bind`, `run`, `first` — and zero schema
 * intelligence: rows are stored as `{key: value}` per table, addressed
 * by the column the test sets.
 *
 * We rely on the SQL strings being deterministic (no whitespace
 * normalization) and the call shape being the one applyEvent.ts emits.
 * If applyEvent.ts reshapes its queries the matcher in `whenSql` must
 * be updated. That coupling is intentional — it keeps the assertions
 * tight enough that a subtle query change cannot silently regress
 * behavior without breaking a test.
 */

interface MockRows {
  // user_id -> arbitrary state
  subscriptions: Map<number, Record<string, unknown>>;
  users: Map<number, Record<string, unknown>>;
}

interface CallLog {
  sql: string;
  bindings: unknown[];
}

function createMockDb(initial?: Partial<MockRows>) {
  const state: MockRows = {
    subscriptions: new Map(initial?.subscriptions ?? []),
    users: new Map(initial?.users ?? []),
  };
  const calls: CallLog[] = [];

  function prepare(sql: string) {
    const trimmed = sql.replace(/\s+/g, ' ').trim();
    return {
      bind: (...bindings: unknown[]) => ({
        run: async () => {
          calls.push({ sql: trimmed, bindings });
          applyMutation(state, trimmed, bindings);
          return { meta: { changes: 1 } };
        },
        first: async <T>(): Promise<T | null> => {
          calls.push({ sql: trimmed, bindings });
          return readFirst(state, trimmed, bindings) as T | null;
        },
        all: async <T>(): Promise<{ results: T[] }> => {
          calls.push({ sql: trimmed, bindings });
          return { results: [] };
        },
      }),
    };
  }

  return {
    db: { prepare } as unknown as Bindings['DB'],
    calls,
    state,
  };
}

/**
 * Tiny "SQL interpreter" that recognizes the specific statements
 * applyEvent.ts emits. We pattern-match on substrings, not parse SQL
 * — that's fine for a unit test boundary.
 */
function applyMutation(state: MockRows, sql: string, bindings: unknown[]): void {
  if (sql.startsWith('INSERT INTO subscriptions')) {
    // INSERT ... VALUES (user_id, 'active', plan, 'polar', customerId, subId, productId, datetime('now'))
    // ON CONFLICT(user_id) DO UPDATE ...
    const [userId, planId, customerId, subId, productId] = bindings as [
      number,
      string,
      string,
      string,
      string,
    ];
    state.subscriptions.set(userId, {
      user_id: userId,
      status: 'active',
      plan_type: planId,
      provider: 'polar',
      polar_customer_id: customerId,
      polar_subscription_id: subId,
      polar_product_id: productId,
      expires_at: null,
    });
    return;
  }

  if (sql.startsWith('UPDATE users SET plan = ?')) {
    // applyActive path: bindings = [planId, userId]
    const [plan, userId] = bindings as [string, number];
    const current = state.users.get(userId) ?? { id: userId };
    state.users.set(userId, { ...current, plan });
    return;
  }

  if (sql.startsWith("UPDATE users SET plan = 'free'")) {
    // applyExpired path: bindings = [userId]
    const [userId] = bindings as [number];
    const current = state.users.get(userId) ?? { id: userId };
    state.users.set(userId, { ...current, plan: 'free' });
    return;
  }

  if (sql.startsWith('UPDATE subscriptions') && sql.includes("status = 'past_due'")) {
    const subId = bindings[0] as string | number;
    // can be polar_subscription_id or user_id depending on the path
    if (typeof subId === 'string') {
      for (const [k, v] of state.subscriptions) {
        if (v.polar_subscription_id === subId) {
          state.subscriptions.set(k, { ...v, status: 'past_due' });
        }
      }
    } else {
      const existing = state.subscriptions.get(subId);
      if (existing && existing.provider === 'polar') {
        state.subscriptions.set(subId, { ...existing, status: 'past_due' });
      }
    }
    return;
  }

  if (sql.startsWith('UPDATE subscriptions') && sql.includes("status = 'canceling'")) {
    // canceledPeriodEnd OR enterpriseGrace
    const expiresAt = bindings[0] as string;
    const subOrUser = bindings[1] as string | number;
    if (typeof subOrUser === 'string') {
      for (const [k, v] of state.subscriptions) {
        if (v.polar_subscription_id === subOrUser) {
          state.subscriptions.set(k, { ...v, status: 'canceling', expires_at: expiresAt });
        }
      }
    } else {
      const existing = state.subscriptions.get(subOrUser);
      if (existing && existing.provider === 'polar' && !existing.expires_at) {
        state.subscriptions.set(subOrUser, {
          ...existing,
          status: 'canceling',
          expires_at: expiresAt,
        });
      }
    }
    return;
  }

  if (sql.startsWith('UPDATE subscriptions') && sql.includes("plan_type = 'free'")) {
    const userId = bindings[0] as number;
    const existing = state.subscriptions.get(userId);
    if (existing) {
      state.subscriptions.set(userId, {
        ...existing,
        plan_type: 'free',
        status: 'canceled',
        polar_subscription_id: null,
      });
    }
    return;
  }
}

function readFirst(state: MockRows, sql: string, bindings: unknown[]): Record<string, unknown> | null {
  if (sql.startsWith('SELECT user_id, plan_type FROM subscriptions')) {
    if (sql.includes('polar_subscription_id = ?')) {
      const subId = bindings[0] as string;
      for (const v of state.subscriptions.values()) {
        if (v.polar_subscription_id === subId) return v;
      }
      return null;
    }
    if (sql.includes('user_id = ?')) {
      const userId = bindings[0] as number;
      return state.subscriptions.get(userId) ?? null;
    }
  }
  return null;
}

function envWith(db: Bindings['DB']): Bindings {
  return {
    DB: db,
    R2: {} as unknown as Bindings['R2'],
    WEBAUTHN_CHALLENGES: {} as unknown as Bindings['WEBAUTHN_CHALLENGES'],
    RATE_LIMIT_KV: {} as unknown as Bindings['RATE_LIMIT_KV'],
    JWT_SECRET: 'test',
    STRIPE_SECRET_KEY: 'test',
    STRIPE_WEBHOOK_SECRET: 'test',
    CLASS_API_SECRET: 'test',
    CLASS_API_URL: 'https://example.test',
    POLAR_PRODUCT_LITE: 'prod_uuid_lite',
    POLAR_PRODUCT_PRO: 'prod_uuid_pro',
    POLAR_PRODUCT_ENTERPRISE: 'prod_uuid_enterprise',
  } as Bindings;
}

function activeEvent(planProductId: string, userId = 42): NormalizedPolarEvent {
  return {
    rawType: 'subscription.active',
    externalSubscriptionId: 'sub_uuid_1',
    externalCustomerId: 'cust_uuid_1',
    digicodeUserId: userId,
    productId: planProductId,
    state: 'active',
    periodEndAt: null,
  };
}

describe('applyPolarEvent — active', () => {
  it('writes subscriptions row and users.plan for lite product', async () => {
    const { db, state } = createMockDb();
    const result = await applyPolarEvent(envWith(db), activeEvent('prod_uuid_lite'));
    expect(result.outcome).toBe('applied');
    expect(state.subscriptions.get(42)?.plan_type).toBe('lite');
    expect(state.subscriptions.get(42)?.status).toBe('active');
    expect(state.subscriptions.get(42)?.provider).toBe('polar');
    expect(state.users.get(42)?.plan).toBe('lite');
  });

  it('writes pro for pro product UUID', async () => {
    const { db, state } = createMockDb();
    await applyPolarEvent(envWith(db), activeEvent('prod_uuid_pro'));
    expect(state.subscriptions.get(42)?.plan_type).toBe('pro');
    expect(state.users.get(42)?.plan).toBe('pro');
  });

  it('falls back to lite when product UUID does not match any env', async () => {
    const { db, state } = createMockDb();
    await applyPolarEvent(envWith(db), activeEvent('prod_unknown_uuid'));
    // The current behavior: applyActive uses `planFromProduct ?? 'lite'`.
    // This documents the fallback so a future change to a stricter
    // reject-with-skip is intentional.
    expect(state.subscriptions.get(42)?.plan_type).toBe('lite');
  });
});

describe('applyPolarEvent — skip path', () => {
  it('returns skipped when digicodeUserId is null', async () => {
    const { db } = createMockDb();
    const result = await applyPolarEvent(envWith(db), {
      ...activeEvent('prod_uuid_lite'),
      digicodeUserId: null,
    });
    expect(result.outcome).toBe('skipped');
    expect(result.reason).toMatch(/missing digicode_user_id/);
  });
});

describe('applyPolarEvent — past_due', () => {
  beforeEach(() => {});

  it('updates status to past_due on matching polar_subscription_id', async () => {
    const { db, state } = createMockDb({
      subscriptions: new Map([
        [
          42,
          {
            user_id: 42,
            status: 'active',
            plan_type: 'pro',
            provider: 'polar',
            polar_subscription_id: 'sub_uuid_1',
          },
        ],
      ]),
    });
    await applyPolarEvent(envWith(db), {
      rawType: 'subscription.past_due',
      externalSubscriptionId: 'sub_uuid_1',
      externalCustomerId: 'cust_uuid_1',
      digicodeUserId: 42,
      productId: 'prod_uuid_pro',
      state: 'past_due',
      periodEndAt: null,
    });
    expect(state.subscriptions.get(42)?.status).toBe('past_due');
  });
});

describe('applyPolarEvent — canceled (period continues)', () => {
  it('sets status=canceling and expires_at to period end', async () => {
    const { db, state } = createMockDb({
      subscriptions: new Map([
        [
          42,
          {
            user_id: 42,
            status: 'active',
            plan_type: 'lite',
            provider: 'polar',
            polar_subscription_id: 'sub_uuid_1',
          },
        ],
      ]),
    });
    await applyPolarEvent(envWith(db), {
      rawType: 'subscription.canceled',
      externalSubscriptionId: 'sub_uuid_1',
      externalCustomerId: 'cust_uuid_1',
      digicodeUserId: 42,
      productId: 'prod_uuid_lite',
      state: 'canceled',
      periodEndAt: '2027-12-31T23:59:59Z',
    });
    expect(state.subscriptions.get(42)?.status).toBe('canceling');
    expect(state.subscriptions.get(42)?.expires_at).toBe('2027-12-31T23:59:59Z');
  });
});

describe('applyPolarEvent — expired', () => {
  it('lite plan + revoked → immediate free', async () => {
    const { db, state } = createMockDb({
      subscriptions: new Map([
        [
          42,
          {
            user_id: 42,
            status: 'active',
            plan_type: 'lite',
            provider: 'polar',
            polar_subscription_id: 'sub_uuid_1',
          },
        ],
      ]),
    });
    await applyPolarEvent(envWith(db), {
      rawType: 'subscription.revoked',
      externalSubscriptionId: 'sub_uuid_1',
      externalCustomerId: 'cust_uuid_1',
      digicodeUserId: 42,
      productId: 'prod_uuid_lite',
      state: 'expired',
      periodEndAt: null,
    });
    expect(state.subscriptions.get(42)?.plan_type).toBe('free');
    expect(state.subscriptions.get(42)?.status).toBe('canceled');
    expect(state.subscriptions.get(42)?.polar_subscription_id).toBeNull();
    expect(state.users.get(42)?.plan).toBe('free');
  });

  it('enterprise + revoked → 1-month grace (status=canceling + expires_at set)', async () => {
    const { db, state } = createMockDb({
      subscriptions: new Map([
        [
          42,
          {
            user_id: 42,
            status: 'active',
            plan_type: 'enterprise',
            provider: 'polar',
            polar_subscription_id: 'sub_uuid_1',
            expires_at: null,
          },
        ],
      ]),
    });
    await applyPolarEvent(envWith(db), {
      rawType: 'subscription.revoked',
      externalSubscriptionId: 'sub_uuid_1',
      externalCustomerId: 'cust_uuid_1',
      digicodeUserId: 42,
      productId: 'prod_uuid_enterprise',
      state: 'expired',
      periodEndAt: null,
    });
    expect(state.subscriptions.get(42)?.status).toBe('canceling');
    expect(state.subscriptions.get(42)?.expires_at).toBeDefined();
    // users.plan should NOT be free yet — grace period is in effect
    expect(state.users.get(42)?.plan).toBeUndefined();
  });

  it('enterprise + order.refunded → immediate free (refund bypasses grace)', async () => {
    const { db, state } = createMockDb({
      subscriptions: new Map([
        [
          42,
          {
            user_id: 42,
            status: 'active',
            plan_type: 'enterprise',
            provider: 'polar',
            polar_subscription_id: 'sub_uuid_1',
          },
        ],
      ]),
    });
    await applyPolarEvent(envWith(db), {
      rawType: 'order.refunded',
      externalSubscriptionId: 'sub_uuid_1',
      externalCustomerId: 'cust_uuid_1',
      digicodeUserId: 42,
      productId: 'prod_uuid_enterprise',
      state: 'expired',
      periodEndAt: null,
    });
    expect(state.subscriptions.get(42)?.plan_type).toBe('free');
    expect(state.users.get(42)?.plan).toBe('free');
  });
});
