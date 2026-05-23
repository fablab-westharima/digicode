import { describe, it, expect, vi, afterEach } from 'vitest';
import { track } from '../analytics';

/**
 * The track() helper is the only surface application code touches for
 * GA4. These tests cover the three invariants the call sites rely on:
 *
 *   1. Calling track() when gtag.js hasn't loaded (no `window.gtag`)
 *      must not throw. Production reaches this state whenever the
 *      VITE_GA_MEASUREMENT_ID env var is unset OR the gtag script
 *      failed to load (ad-blocker, network blip, content-security-
 *      policy). Application code must remain functional in all those
 *      cases.
 *
 *   2. When gtag is present, track() forwards the call as
 *      `gtag('event', name, params)` — matching GA4's documented
 *      custom-event signature. Any rewriting here would surprise the
 *      next contributor reading the call sites.
 *
 *   3. Omitting params must produce a `gtag('event', name, undefined)`
 *      call (not e.g. an empty-object substitution), so call sites
 *      that don't care about payload stay terse.
 */

afterEach(() => {
  delete (window as { gtag?: unknown }).gtag;
});

describe('track — GA4 thin wrapper', () => {
  it('no-ops when window.gtag is undefined (gtag.js never loaded)', () => {
    expect((window as { gtag?: unknown }).gtag).toBeUndefined();
    expect(() => track('compile_execute', { mode: 'cloud' })).not.toThrow();
  });

  it('forwards event name + params to gtag when present', () => {
    const spy = vi.fn();
    (window as { gtag?: unknown }).gtag = spy;

    track('checkout_start', { planId: 'lite', provider: 'polar' });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith('event', 'checkout_start', {
      planId: 'lite',
      provider: 'polar',
    });
  });

  it('forwards undefined params when caller omits payload', () => {
    const spy = vi.fn();
    (window as { gtag?: unknown }).gtag = spy;

    track('plan_page_view');

    expect(spy).toHaveBeenCalledWith('event', 'plan_page_view', undefined);
  });
});
