import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initGA, track } from '../analytics';

/**
 * Covers the two public surfaces of `src/lib/analytics.ts`:
 *
 *   - `initGA()` — the boot-time loader called from main.tsx, which
 *     reads VITE_GA_MEASUREMENT_ID, validates it, and (only on valid
 *     input) installs `window.gtag` + appends the gtag.js <script>.
 *     Session 136 (Path B) moved this from index.html to TS to avoid
 *     the Vite `%VITE_VAR%` raw substitution → JS SyntaxError class of
 *     bugs that surfaced when a CF Pages env var was pasted with
 *     trailing whitespace.
 *
 *   - `track()` — the thin event wrapper application code calls. Must
 *     remain a silent no-op whenever `window.gtag` is missing
 *     (env unset, gtag.js blocked by ad-blocker, load failed, SSR).
 */

function resetWindowGA() {
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { dataLayer?: unknown }).dataLayer;
  delete (window as { __GA_ID__?: unknown }).__GA_ID__;
  // Best-effort: remove any gtag.js script tags initGA() may have
  // appended on a prior test. We don't run the loaded script (it just
  // tries to fetch from googletagmanager.com, which jsdom blocks),
  // but pruning the tag keeps the head clean for the next assertion.
  document.querySelectorAll('script[src*="googletagmanager.com"]').forEach((el) => el.remove());
}

beforeEach(() => {
  resetWindowGA();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetWindowGA();
});

describe('initGA — VITE_GA_MEASUREMENT_ID loader', () => {
  it('returns false and installs nothing when the env var is unset', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
    expect(initGA()).toBe(false);
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
    expect(window.__GA_ID__).toBeUndefined();
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
  });

  it('rejects whitespace-only values', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '   \n\t  ');
    expect(initGA()).toBe(false);
    expect(window.gtag).toBeUndefined();
  });

  it('rejects malformed IDs (no G- prefix)', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'UA-12345-1');
    expect(initGA()).toBe(false);
    expect(window.gtag).toBeUndefined();
  });

  it('accepts a clean valid ID and installs the gtag shim', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TESTID00');
    expect(initGA()).toBe(true);
    expect(window.__GA_ID__).toBe('G-TESTID00');
    expect(typeof window.gtag).toBe('function');
    expect(window.dataLayer).toBeInstanceOf(Array);
    const tag = document.querySelector('script[src*="googletagmanager.com"]') as HTMLScriptElement | null;
    expect(tag).not.toBeNull();
    expect(tag?.src).toContain('id=G-TESTID00');
    expect(tag?.async).toBe(true);
  });

  it('trims trailing whitespace (the exact Session 136 root-cause case)', () => {
    // Reproduces the CF Pages paste-mangled value: trailing newlines
    // that broke the previous index.html-based loader. With initGA in
    // TS, Vite escapes the value as a JSON-safe string literal AND we
    // trim() it before validation, so this is now recoverable.
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TESTID00\n\n');
    expect(initGA()).toBe(true);
    expect(window.__GA_ID__).toBe('G-TESTID00');
    const tag = document.querySelector('script[src*="googletagmanager.com"]') as HTMLScriptElement | null;
    expect(tag?.src).toContain('id=G-TESTID00');
    // And critically, the src does NOT contain encoded newlines.
    expect(tag?.src).not.toMatch(/%0A/);
  });

  it('queues js + config calls into dataLayer (suppresses boot page_view)', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TESTID00');
    initGA();
    // dataLayer should have 2 entries: ['js', Date] and ['config', id, opts]
    expect(window.dataLayer?.length).toBe(2);
    const second = (window.dataLayer![1] as unknown[]);
    expect(second[0]).toBe('config');
    expect(second[1]).toBe('G-TESTID00');
    expect(second[2]).toMatchObject({
      anonymize_ip: true,
      send_page_view: false,
    });
  });
});

describe('track — GA4 thin wrapper', () => {
  it('no-ops when window.gtag is undefined (gtag.js never loaded)', () => {
    expect(window.gtag).toBeUndefined();
    expect(() => track('compile_execute', { mode: 'cloud' })).not.toThrow();
  });

  it('forwards event name + params to gtag when present', () => {
    const spy = vi.fn();
    window.gtag = spy;

    track('checkout_start', { planId: 'lite', provider: 'polar' });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith('event', 'checkout_start', {
      planId: 'lite',
      provider: 'polar',
    });
  });

  it('forwards undefined params when caller omits payload', () => {
    const spy = vi.fn();
    window.gtag = spy;

    track('plan_page_view');

    expect(spy).toHaveBeenCalledWith('event', 'plan_page_view', undefined);
  });
});
