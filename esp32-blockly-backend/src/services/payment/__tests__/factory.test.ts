import { describe, it, expect } from 'vitest';
import { decideProviderByCountry, getProviderForUser, isPolarSuspended, isLemonSqueezyEnabled, resolveEffectiveCountry } from '../index';
import type { Bindings } from '../../../types/env';

describe('decideProviderByCountry — pure routing rule', () => {
  it('JP → stripe (domestic invoicing path)', () => {
    expect(decideProviderByCountry('JP')).toBe('stripe');
    expect(decideProviderByCountry('jp')).toBe('stripe');
  });

  it('any non-JP ISO → lemonsqueezy (Phase ②: replaced Polar)', () => {
    for (const c of ['US', 'DE', 'GB', 'FR', 'AU', 'BR', 'TW', 'CA', 'KR']) {
      expect(decideProviderByCountry(c)).toBe('lemonsqueezy');
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
    expect(decideProviderByCountry(country)).toBe('lemonsqueezy');
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
  suspended?: boolean;
  enabled?: boolean;
}): Bindings {
  return {
    POLAR_ACCESS_TOKEN: opts.polarAvailable === false ? undefined : 'polar_oat_test',
    POLAR_CHECKOUT_SUSPENDED: opts.suspended ? 'true' : undefined,
    POLAR_SERVER_MODE: 'sandbox',
    // Phase ②: non-JP now routes to LemonSqueezy, so the factory instantiates
    // LemonSqueezyProvider (ctor requires an API key + store + variants).
    LEMONSQUEEZY_API_KEY: 'ls_test_key',
    LEMONSQUEEZY_STORE_ID: 'store_1',
    LEMONSQUEEZY_VARIANT_LITE: 'var_lite',
    LEMONSQUEEZY_VARIANT_PRO: 'var_pro',
    LEMONSQUEEZY_VARIANT_ENTERPRISE: 'var_ent',
    LEMONSQUEEZY_ENABLED: opts.enabled ? 'true' : undefined,
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
  it('canceled existing subscription does NOT lock provider — country drives (US → lemonsqueezy)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: { status: 'canceled', provider: 'stripe', plan_type: 'lite' },
      userCountryCode: 'US',
    });
    const provider = await getProviderForUser(env, 20, 'JP');
    expect(provider.id).toBe('lemonsqueezy');
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

  it('no existing subscription + persisted US country_code → lemonsqueezy (header JP ignored)', async () => {
    // This is the exact forza_vissel_kobe scenario: the manual override
    // 'US' in users.country_code must outrank the CF-IPCountry='JP' from
    // a JP-resident's request.
    const env = envWithFactoryFixtures({
      subscriptionRow: null,
      userCountryCode: 'US',
    });
    const provider = await getProviderForUser(env, 20, 'JP');
    expect(provider.id).toBe('lemonsqueezy');
  });
});

/**
 * Phase ① (Session 163) — overseas (Polar) checkout kill-switch.
 *
 * Convention note: like polarWebhookSecret.test.ts (which tests the
 * `btoa()` primitive the route wraps the secret with, and leaves the HTTP
 * path to the deploy-time curl), these tests assert the decision primitives
 * the route branches on — `isPolarSuspended`, the real `getProviderForUser`
 * resolution, and the `polarAvailable` expression mirrored from
 * subscriptions.ts:192. The literal HTTP 503 / 200 wiring is exercised by
 * the deploy-time integration curl.
 */
describe('isPolarSuspended — POLAR_CHECKOUT_SUSPENDED kill-switch', () => {
  const env = (v: string | undefined) =>
    ({ POLAR_CHECKOUT_SUSPENDED: v }) as unknown as Bindings;

  it("is true only for the exact string 'true'", () => {
    expect(isPolarSuspended(env('true'))).toBe(true);
  });

  it('is false when unset', () => {
    expect(isPolarSuspended(env(undefined))).toBe(false);
  });

  it("is false for any non-'true' value (no truthy coercion)", () => {
    for (const v of ['false', '1', 'TRUE', 'yes', '']) {
      expect(isPolarSuspended(env(v))).toBe(false);
    }
  });
});

describe('Phase ② /checkout guard decision — provider.id === "lemonsqueezy" && !isLemonSqueezyEnabled', () => {
  // Until LEMONSQUEEZY_ENABLED='true', a non-JP user resolves to lemonsqueezy
  // but the route returns errorJson('subscription.overseasSuspended', 503).
  // Asserted via the REAL getProviderForUser resolution + REAL
  // isLemonSqueezyEnabled. The HTTP 503/200 wiring is exercised by deploy-time
  // curl (convention: polarWebhookSecret.test.ts). The dormant Polar guard
  // (provider.id==='polar') is unreachable via country routing now, so the
  // live overseas guard is the LemonSqueezy one.
  const guardBlocks = (provider: { id: string }, env: Bindings) =>
    provider.id === 'lemonsqueezy' && !isLemonSqueezyEnabled(env);

  it('non-JP (US) + not enabled → blocked (→ 503, 準備中)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: null,
      userCountryCode: 'US',
      enabled: false,
    });
    const provider = await getProviderForUser(env, 1, 'US');
    expect(provider.id).toBe('lemonsqueezy');
    expect(guardBlocks(provider, env)).toBe(true);
  });

  it('JP + not enabled → NOT blocked (Stripe path unaffected)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: null,
      userCountryCode: 'JP',
      enabled: false,
    });
    const provider = await getProviderForUser(env, 1, 'JP');
    expect(provider.id).toBe('stripe');
    expect(guardBlocks(provider, env)).toBe(false);
  });

  it('non-JP (US) + enabled → NOT blocked (overseas LS checkout proceeds)', async () => {
    const env = envWithFactoryFixtures({
      subscriptionRow: null,
      userCountryCode: 'US',
      enabled: true,
    });
    const provider = await getProviderForUser(env, 1, 'US');
    expect(provider.id).toBe('lemonsqueezy');
    expect(guardBlocks(provider, env)).toBe(false);
  });
});

describe('Phase ① /status polarAvailable = !!POLAR_ACCESS_TOKEN && !isPolarSuspended', () => {
  // Mirrors the expression at subscriptions.ts:192 (same convention as
  // polarWebhookSecret.test.ts mirroring the route's btoa() wrap).
  const polarAvailable = (env: Bindings) =>
    !!env.POLAR_ACCESS_TOKEN && !isPolarSuspended(env);
  const mk = (token: string | undefined, suspended: boolean) =>
    ({
      POLAR_ACCESS_TOKEN: token,
      POLAR_CHECKOUT_SUSPENDED: suspended ? 'true' : undefined,
    }) as unknown as Bindings;

  it('token set + not suspended → true (overseas live)', () => {
    expect(polarAvailable(mk('polar_oat_x', false))).toBe(true);
  });

  it('token set + suspended → false (drives the 準備中 UI)', () => {
    expect(polarAvailable(mk('polar_oat_x', true))).toBe(false);
  });

  it('token unset → false regardless of suspend flag', () => {
    expect(polarAvailable(mk(undefined, false))).toBe(false);
    expect(polarAvailable(mk(undefined, true))).toBe(false);
  });
});

describe('isLemonSqueezyEnabled — LEMONSQUEEZY_ENABLED go-live gate', () => {
  const env = (v: string | undefined) =>
    ({ LEMONSQUEEZY_ENABLED: v }) as unknown as Bindings;

  it("is true only for the exact string 'true'", () => {
    expect(isLemonSqueezyEnabled(env('true'))).toBe(true);
  });

  it('is false when unset / non-true (no truthy coercion)', () => {
    for (const v of [undefined, 'false', '1', 'TRUE', '']) {
      expect(isLemonSqueezyEnabled(env(v))).toBe(false);
    }
  });
});

describe('Phase ② /status lsAvailable = !!LEMONSQUEEZY_API_KEY && isLemonSqueezyEnabled', () => {
  // Mirrors subscriptions.ts (same convention as the polarAvailable mirror).
  const lsAvailable = (env: Bindings) =>
    !!env.LEMONSQUEEZY_API_KEY && isLemonSqueezyEnabled(env);
  const mk = (key: string | undefined, enabled: boolean) =>
    ({
      LEMONSQUEEZY_API_KEY: key,
      LEMONSQUEEZY_ENABLED: enabled ? 'true' : undefined,
    }) as unknown as Bindings;

  it('key set + enabled → true (overseas LS live)', () => {
    expect(lsAvailable(mk('ls_key', true))).toBe(true);
  });

  it('key set + not enabled → false (drives the 準備中 UI)', () => {
    expect(lsAvailable(mk('ls_key', false))).toBe(false);
  });

  it('key unset → false regardless of enabled', () => {
    expect(lsAvailable(mk(undefined, true))).toBe(false);
    expect(lsAvailable(mk(undefined, false))).toBe(false);
  });
});
