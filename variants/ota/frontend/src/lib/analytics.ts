/**
 * Google Analytics 4 thin wrapper.
 *
 * Loading model: `index.html` decides whether to inject the gtag.js
 * script + `window.gtag` shim at boot, conditional on the build-time
 * substituted `%VITE_GA_MEASUREMENT_ID%`. Application code never calls
 * gtag directly — it calls `track()` here, which no-ops whenever the
 * shim is missing (env var unset, gtag.js blocked by an ad-blocker,
 * load failed, SSR/test env without window).
 *
 * Privacy contract (matches plan 58 stage-2 instrumentation brief):
 *   - No PII in event params (no user_id, no email, no auth token).
 *   - IP anonymisation is set on the `gtag('config', ...)` call in
 *     index.html (`anonymize_ip: true`); we do NOT override it here.
 *   - We pass through whatever params the caller hands us, so the
 *     review surface for "did we leak PII?" is the call sites, not
 *     this module.
 */

declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
    __GA_ID__?: string;
  }
}

export function track(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}

export {};
