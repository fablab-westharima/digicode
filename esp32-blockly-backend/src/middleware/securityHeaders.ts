/**
 * Security-headers middleware — applied to all Workers responses.
 *
 * Session 119 T13: previously no defense headers were emitted on
 * API responses. While CSP isn't needed (this Worker only serves
 * JSON and never HTML), nosniff / clickjack-deny / HSTS still
 * meaningfully reduce drive-by exposure when responses are
 * inspected in a browser or proxied through one.
 *
 * Headers added:
 *   - X-Content-Type-Options: nosniff
 *       Stops browsers from inferring a non-declared Content-Type
 *       (defense against MIME-confusion attacks).
 *   - X-Frame-Options: DENY
 *       Prevents the API from being framed (defense-in-depth for
 *       browsers that don't yet honor frame-ancestors CSP).
 *   - Strict-Transport-Security: max-age=31536000; includeSubDomains
 *       1-year HSTS. The Worker is only ever reached over HTTPS
 *       (Cloudflare-managed cert at code.fablab-westharima.jp;
 *       workers.dev is HTTPS-only by default), so committing the
 *       1-year max-age is safe.
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *       Trim cross-origin Referer leakage of full URL paths.
 *
 * Notes:
 *   - Not added: Content-Security-Policy (no HTML rendered),
 *     Permissions-Policy (no browser feature use),
 *     X-XSS-Protection (legacy, disabled by modern browsers).
 *   - HSTS is per Session 119 G6 decision — `code.fablab-westharima
 *     .jp` is HTTPS-only via Cloudflare custom domain.
 */
import type { MiddlewareHandler } from 'hono';

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
};
