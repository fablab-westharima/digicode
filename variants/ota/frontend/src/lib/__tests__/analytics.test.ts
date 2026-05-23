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
    // dataLayer should have 2 entries: ['js', Date] and
    // ['config', id, opts]. Each entry is an IArguments-shaped value
    // (see the dedicated push-shape test below), but indexed access
    // works the same way Google's gtag.js iterator expects.
    expect(window.dataLayer?.length).toBe(2);
    const second = window.dataLayer![1] as IArguments;
    expect(second[0]).toBe('config');
    expect(second[1]).toBe('G-TESTID00');
    // Fix A (Session 136): config call must include page_location +
    // page_title so the GA4 data stream "no data collected" warning
    // clears even with send_page_view:false. anonymize_ip:true is
    // unchanged. The SPA listener in App.tsx re-supplies page_location
    // + page_title on every route transition.
    expect(second[2]).toMatchObject({
      anonymize_ip: true,
      send_page_view: false,
    });
    const opts = second[2] as Record<string, unknown>;
    expect(typeof opts.page_location).toBe('string');
    expect(typeof opts.page_title).toBe('string');
  });

  it('pushes IArguments-shaped entries to dataLayer (Fix C — Google boilerplate parity)', () => {
    // Fix C (Session 136): the earlier rest-spread shim pushed real
    // Array objects to dataLayer; matching Google's official boiler-
    // plate (`function gtag(){dataLayer.push(arguments);}`) eliminates
    // a silent-incompatibility surface where gtag.js's internal
    // iterator might distinguish Array from IArguments. The runtime
    // check below is the explicit shape contract: NOT Array, but has
    // `length` + numeric indices.
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TESTID00');
    initGA();
    const initialLength = window.dataLayer!.length;
    window.gtag!('event', 'test_event', { foo: 'bar' });

    const pushed = window.dataLayer![initialLength];
    expect(Array.isArray(pushed)).toBe(false);
    const args = pushed as IArguments;
    expect(args.length).toBe(3);
    expect(args[0]).toBe('event');
    expect(args[1]).toBe('test_event');
    expect(args[2]).toMatchObject({ foo: 'bar' });
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
