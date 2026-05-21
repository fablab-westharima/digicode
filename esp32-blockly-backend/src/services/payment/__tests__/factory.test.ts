import { describe, it, expect } from 'vitest';
import { decideProviderByCountry, resolveEffectiveCountry } from '../index';
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
