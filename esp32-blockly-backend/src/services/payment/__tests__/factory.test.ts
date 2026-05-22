import { describe, it, expect } from 'vitest';
import { decideProviderByCountry, getProviderForUser, resolveEffectiveCountry } from '../index';
import type { Bindings } from '../../../types/env';

describe('decideProviderByCountry — pure routing rule', () => {
  it('JP → stripe (domestic invoicing path)', () => {
    expect(decideProviderByCountry('JP')).toBe('stripe');
    expect(decideProviderByCountry('jp')).toBe('stripe');
  });

  it('any non-JP ISO → polar', () => {
    for (const c of ['US', 'DE', 'GB', 'FR', 'AU', 'BR', 'TW', 'CA', 'KR']) {
      expect(decideProviderByCountry(c)).toBe('polar');
    }
  });

  it('XX (unknown) → stripe (safer fallback)', () => {
    expect(decideProviderByCountry('XX')).toBe('stripe');
    expect(decideProviderByCountry('xx')).toBe('stripe');
  });

  it('T1 (Tor exit) → stripe (safer fallback)', () => {
    expect(decideProviderByCountry('T1')).toBe('stripe');
    expect(decideProviderByCountry('t1')).toBe('stripe');
  });

  it('null / empty → stripe (safer fallback)', () => {
    expect(decideProviderByCountry(null)).toBe('stripe');
    expect(decideProviderByCountry('')).toBe('stripe');
  });
});

/**
 * Minimal env builder that only models the SELECT this code path runs.
 * Mirrors the same pattern used in activeSubscription.test.ts.
 */
function envWithUserCountry(country_code: string | null | undefined): Bindings {
  return {
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => (country_code === undefined ? null : { country_code }),
        }),
      }),
    },
  } as unknown as Bindings;
}

describe('resolveEffectiveCountry — users.country_code overrides header', () => {
  it('returns persisted country_code when non-NULL (header value ignored)', async () => {
    const env = envWithUserCountry('US');
    expect(await resolveEffectiveCountry(env, 42, 'JP')).toBe('US');
  });

  it('falls back to the header when country_code is NULL', async () => {
    const env = envWithUserCountry(null);
    expect(await resolveEffectiveCountry(env, 42, 'JP')).toBe('JP');
  });

  it('falls back to the header when the user row does not exist', async () => {
    const env = envWithUserCountry(undefined); // first() → null
    expect(await resolveEffectiveCountry(env, 42, 'DE')).toBe('DE');
  });

  it('returns null when both sources are absent', async () => {
    const env = envWithUserCountry(null);
    expect(await resolveEffectiveCountry(env, 42, null)).toBeNull();
  });

  it('does NOT lowercase / normalize — caller handles that via decideProviderByCountry', async () => {
    // Documents that override → routing happens in two pure steps:
    // resolveEffectiveCountry produces the raw country, then
    // decideProviderByCountry applies the JP/XX/T1 collapse.
    const env = envWithUserCountry('us');
    const country = await resolveEffectiveCountry(env, 42, 'JP');
    expect(country).toBe('us');
    expect(decideProviderByCountry(country)).toBe('polar');
  });
});

/**
 * D1 stub that returns different rows based on which SQL is prepared.
 * The factory issues two SELECTs in sequence:
 *   1. FROM subscriptions  (existing-sub lock check via findBlockingActiveSubscription)
 *   2. FROM users          (country override via resolveEffectiveCountry)
 * Each call inspects the SQL string to route to the right canned row.
 */
function envWithFactoryFixtures(opts: {
  subscriptionRow: { status: string; provider: string | null; plan_type: string | null } | null;
  userCountryCode: string | null;
  polarAvailable?: boolean;
}): Bindings {
  return {
    POLAR_ACCESS_TOKEN: opts.polarAvailable === false ? undefined : 'polar_oat_test',
    POLAR_SERVER_MODE: 'sandbox',
    DB: {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('FROM subscriptions')) {
              if (!opts.subscriptionRow) return null;
              // Mirror findBlockingActiveSubscription's filter so the
              // helper only "finds" rows whose status the SQL would
              // actually return.
              if (
                !['active', 'past_due', 'canceling'].includes(opts.subscriptionRow.status)
              ) {
                return null;
              }
              return {
                provider: opts.subscriptionRow.provider,
                plan_type: opts.subscriptionRow.plan_type,
              };
            }
            if (sql.includes('FROM users')) {
              return { country_code: opts.userCountryCode };
            }
            return null;
          },
        }),
      }),
    },
    STRIPE_SECRET_KEY: 'sk_test_dummy',
    STRIPE_PRICE_LITE: 'price_lite',
    STRIPE_PRICE_PRO: 'price_pro',
    STRIPE_PRICE_ENTERPRISE: 'price_ent',
  } as unknown as Bindings;
}

describe('getProviderForUser — composition of lock + country override', () => {
  // Regression cluster (Session 136 forza_vissel_kobe@icloud.com case):
  // an inline SQL copy in the factory included 'canceled' alongside
  // ('active','past_due','canceling'), which contradicted both the
  // findBlockingActiveSubscription canonical set AND §6a.1 #5
  // ("cross-provider switch only via cancel → re-subscribe"). The
  // refactor delegated to the canonical helper so both call sites
  // share one filter.
  //
  // Below tests target the integration: an existing-but-fully-canceled
  // subscription must NOT pin the user to the old provider; country
  // resolution drives routing for the next checkout.
  it('canceled existing subscription does NOT lock provider — country drives (US → polar)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: { status: 'canceled', provider: 'stripe', plan_type: 'lite' },
      userCountryCode: 'US',
    });
    const provider = await getProviderForUser(env, 20, 'JP');
    expect(provider.id).toBe('polar');
  });

  it('canceled existing subscription does NOT lock — country drives (JP → stripe)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: { status: 'canceled', provider: 'polar', plan_type: 'pro' },
      userCountryCode: 'JP',
    });
    const provider = await getProviderForUser(env, 20, 'US');
    expect(provider.id).toBe('stripe');
  });

  it('active existing subscription DOES lock provider (no country override)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: { status: 'active', provider: 'stripe', plan_type: 'lite' },
      userCountryCode: 'US',
    });
    const provider = await getProviderForUser(env, 20, 'US');
    // Even with country=US (Polar territory), the active Stripe sub locks us in.
    expect(provider.id).toBe('stripe');
  });

  it('canceling existing subscription DOES lock provider (grace period)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: { status: 'canceling', provider: 'polar', plan_type: 'enterprise' },
      userCountryCode: 'JP',
    });
    const provider = await getProviderForUser(env, 20, 'JP');
    expect(provider.id).toBe('polar');
  });

  it('past_due existing subscription DOES lock provider (dunning)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: { status: 'past_due', provider: 'stripe', plan_type: 'pro' },
      userCountryCode: 'US',
    });
    const provider = await getProviderForUser(env, 20, 'US');
    expect(provider.id).toBe('stripe');
  });

  it('no existing subscription + persisted US country_code → polar (header JP ignored)', async () => {
    // This is the exact forza_vissel_kobe scenario: the manual override
    // 'US' in users.country_code must outrank the CF-IPCountry='JP' from
    // a JP-resident's request.
    const env = envWithFactoryFixtures({
      subscriptionRow: null,
      userCountryCode: 'US',
    });
    const provider = await getProviderForUser(env, 20, 'JP');
    expect(provider.id).toBe('polar');
  });
});
