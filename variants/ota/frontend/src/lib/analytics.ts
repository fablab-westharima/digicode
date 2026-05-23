/**
 * Google Analytics 4 thin wrapper + loader.
 *
 * Loading model (post Session-136 Path B): `initGA()` is invoked from
 * `main.tsx` before React mounts. It reads `import.meta.env.VITE_GA_-
 * MEASUREMENT_ID` (Vite substitutes that with a JSON.stringify-safe
 * literal at build time — so any whitespace or special chars in the
 * env value are properly escaped, unlike the raw `%VITE_VAR%` HTML
 * substitution we previously used), trims it, and only proceeds when
 * the result matches `^G-[A-Z0-9]+$`. Anything else (unset, empty,
 * whitespace-only, paste-mangled) is a silent no-op.
 *
 * Application code never calls gtag directly — it calls `track()`
 * here, which itself no-ops whenever `window.gtag` is missing (env
 * unset, gtag.js blocked by an ad-blocker, load failed, SSR/test env
 * without a browser).
 *
 * Privacy contract (plan 58 stage-2 instrumentation brief):
 *   - No PII in event params (no user_id, no email, no auth token).
 *   - IP anonymisation is set on the `gtag('config', ...)` call below
 *     (`anonymize_ip: true`); we do NOT pass it again from track().
 *   - The boot-time page_view is suppressed (`send_page_view: false`)
 *     so the SPA route listener in App.tsx is the single source of
 *     page_view events.
 *   - We pass through whatever params the caller hands to track(), so
 *     the review surface for "did we leak PII?" is the call sites, not
 *     this module.
 *
 * Why this lives in TS rather than index.html: Session 136 surfaced
 * that the Vite HTML `%VITE_VAR%` substitution is raw text replacement
 * with no JS-context awareness. A CF Pages env var pasted with trailing
 * whitespace produced a `<script>` block with an unescaped newline
 * inside a string literal — JS SyntaxError, the whole boot script
 * aborted, gtag.js never loaded, GA4 data stream silent for 48 hours.
 * Reading the env var from TS instead lets Vite escape the value via
 * JSON.stringify, which is whitespace-safe by construction. The
 * runtime trim + regex validation is defense-in-depth on top of that.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __GA_ID__?: string;
  }
}

const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

/**
 * Boot-time GA4 loader. Idempotent isn't a guarantee — call from
 * `main.tsx` once, before `createRoot().render()`. The early call
 * ensures `window.gtag` is defined by the time React's first
 * `useEffect` fires the initial SPA page_view.
 *
 * Returns `true` if the loader actually installed gtag (env valid,
 * script tag appended). Returns `false` for the silent no-op paths.
 * The boolean isn't used by `main.tsx` but is convenient for tests.
 */
export function initGA(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (!GA_ID_PATTERN.test(id)) {
    return false;
  }

  window.__GA_ID__ = id;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);

  window.gtag('js', new Date());
  window.gtag('config', id, {
    anonymize_ip: true,
    // SPA route listener in src/App.tsx fires page_view on every
    // location change, so we suppress the implicit boot-time one to
    // avoid double-counting the landing route.
    send_page_view: false,
  });

  return true;
}

export function track(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}

export {};
