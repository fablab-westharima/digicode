import { describe, it, expect } from 'vitest';
import { findBlockingActiveSubscription } from '../activeSubscription';
import type { D1Database } from '@cloudflare/workers-types';

/**
 * Build a minimal D1-shaped stub that returns a fixed row for the
 * single SELECT applyEvent.test.ts pattern would otherwise need.
 * The query the helper issues has a fixed shape, so we only need to
 * model "what row would the WHERE clause find?".
 */
function dbReturning(row: { status: string; provider: string | null; plan_type: string | null } | null) {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => {
          // The helper's SELECT filters by status IN ('active','past_due','canceling').
          // We replicate that filter here so the test rows can declare the
          // status they "have" and the helper sees the right thing.
          if (!row) return null;
          if (!['active', 'past_due', 'canceling'].includes(row.status)) return null;
          return { provider: row.provider, plan_type: row.plan_type };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe('findBlockingActiveSubscription — blocking statuses', () => {
  it.each(['active', 'past_due', 'canceling'])(
    'returns row when status is %s',
    async (status) => {
      const db = dbReturning({ status, provider: 'stripe', plan_type: 'pro' });
      const result = await findBlockingActiveSubscription(db, 42);
      expect(result).toEqual({ provider: 'stripe', plan_type: 'pro' });
    },
  );

  it('returns polar row when provider=polar', async () => {
    const db = dbReturning({ status: 'active', provider: 'polar', plan_type: 'lite' });
    const result = await findBlockingActiveSubscription(db, 42);
    expect(result).toEqual({ provider: 'polar', plan_type: 'lite' });
  });
});

describe('findBlockingActiveSubscription — non-blocking statuses', () => {
  it.each(['free', 'canceled', 'expired'])('returns null when status is %s', async (status) => {
    const db = dbReturning({ status, provider: 'stripe', plan_type: 'pro' });
    expect(await findBlockingActiveSubscription(db, 42)).toBeNull();
  });

  it('returns null when no subscription row exists', async () => {
    const db = dbReturning(null);
    expect(await findBlockingActiveSubscription(db, 42)).toBeNull();
  });
});

describe('findBlockingActiveSubscription — defensive narrowing', () => {
  it('returns null when provider is an unexpected value (NULL or garbage)', async () => {
    // migration 0027 made provider NOT NULL DEFAULT 'stripe', so this
    // should not occur in production data — but the helper must still
    // narrow safely to keep the route's TypeScript happy.
    const db = dbReturning({ status: 'active', provider: null, plan_type: 'pro' });
    expect(await findBlockingActiveSubscription(db, 42)).toBeNull();

    const dbWeird = dbReturning({ status: 'active', provider: 'mystery', plan_type: 'pro' });
    expect(await findBlockingActiveSubscription(dbWeird, 42)).toBeNull();
  });

  it('coerces null plan_type to "free" so downstream consumers do not crash', async () => {
    const db = dbReturning({ status: 'active', provider: 'stripe', plan_type: null });
    const result = await findBlockingActiveSubscription(db, 42);
    expect(result).toEqual({ provider: 'stripe', plan_type: 'free' });
  });
});
