import { describe, it, expect } from 'vitest';
import { decideProviderByCountry } from '../index';

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
