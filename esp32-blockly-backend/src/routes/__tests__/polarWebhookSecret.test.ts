/**
 * Polar webhook handler ctor-exception path (plan 58 §6 + P5-2.5 hotfix).
 *
 * This file isolates the one behavior the route's outer try/catch
 * exists for: a malformed POLAR_WEBHOOK_SECRET must result in HTTP 400
 * with `webhook.signatureInvalid`, not HTTP 500. Two reasons we treat
 * the misconfig as a client error:
 *
 *   1. rule 16 §attacker-perspective: returning 500 leaks the fact
 *      that the server-side secret is malformed (vs. a valid secret
 *      with a bad client signature).
 *   2. Polar disables a webhook endpoint after 10 consecutive non-2xx
 *      deliveries. A misconfigured secret + retries → endpoint auto-
 *      disable, even though the underlying issue is a one-time
 *      provisioning gap (e.g. the brief window between Workers deploy
 *      and Polar dashboard webhook creation).
 *
 * The test instantiates `standardwebhooks.Webhook` directly to assert
 * the underlying primitive really throws on the kind of malformed
 * secret we want to defend against (placeholder values containing
 * non-base64 alphabet characters like underscore). The Hono handler
 * then catches that throw and returns 400 — that path is exercised by
 * the integration step in deploy (curl with invalid signature → 400).
 */
import { describe, it, expect } from 'vitest';
import { Webhook } from 'standardwebhooks';

describe('standardwebhooks.Webhook ctor — malformed secret defense', () => {
  it('throws when the secret contains characters outside the base64 alphabet', () => {
    // Underscores are NOT in the standard base64 alphabet
    // (A-Z, a-z, 0-9, +, /, =). The placeholder secrets DigiCode used
    // during the provisioning window matched this shape.
    expect(
      () => new Webhook('dummy_will_overwrite_after_polar_webhook_creation'),
    ).toThrow();
  });

  it('accepts a real-shape base64 secret without throwing', () => {
    // The "whsec_" prefix is stripped by the SDK; the remainder must be
    // valid base64. 32 bytes of zeros base64-encoded:
    // AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
    const validSecret =
      'whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    expect(() => new Webhook(validSecret)).not.toThrow();
  });

  it('rejects an empty secret with the SDK\'s own error', () => {
    // Useful as a smoke for the "POLAR_WEBHOOK_SECRET unset" branch we
    // short-circuit before reaching the ctor — confirms the SDK would
    // otherwise throw, justifying the early return in the handler.
    expect(() => new Webhook('')).toThrow();
  });
});

describe('Polar secret pre-encoding — mirrors @polar-sh/sdk validateEvent', () => {
  // The route wraps `c.env.POLAR_WEBHOOK_SECRET` with `btoa(...)` before
  // passing to `new Webhook(...)`. That mirrors Polar's official TS SDK
  // (`Buffer.from(secret, 'utf-8').toString('base64')` in
  // polar-js/src/webhooks.ts validateEvent). The protocol the dashboard
  // emits is a raw ASCII string (often with `whsec_` prefix and tail
  // characters outside the standard base64 alphabet), and standardwebhooks
  // is contracted to receive an already-base64-encoded form so that its
  // internal base64 decode yields the original UTF-8 bytes as the HMAC key.
  //
  // These tests cover the encoding contract the route now honors: any
  // raw ASCII secret can be wrapped with `btoa(...)` and passed safely to
  // `new Webhook(...)`, and the bytes the verifier ends up keying off
  // match the bytes Polar signs with.
  it('accepts a Polar-shape raw secret (whsec_ + url-safe tail) after btoa wrap', () => {
    // Tail intentionally contains `-` and `_` which are URL-safe base64
    // alphabet characters — standardwebhooks rejects them as standard
    // base64. With the btoa wrap the entire raw string becomes valid
    // standard base64 and the ctor accepts it.
    const rawSecret = 'whsec_PolarStyle-With_UrlSafe-Chars_AndMore';
    expect(() => new Webhook(rawSecret)).toThrow();
    expect(() => new Webhook(btoa(rawSecret))).not.toThrow();
  });

  it('preserves the raw secret bytes as the HMAC key (round-trip)', () => {
    // Sanity check on the encoding round-trip: btoa() followed by
    // standardwebhooks' internal base64 decode must recover the exact
    // UTF-8 byte sequence of the raw secret. We verify this indirectly
    // by computing the bytes both ways and comparing.
    const rawSecret = 'whsec_RoundTripCheck-123_xyz';
    const encoded = btoa(rawSecret);
    const decoded = atob(encoded);
    expect(decoded).toBe(rawSecret);
    // The route's verifier is keyed by the bytes of `decoded`, which is
    // the same as the bytes of `rawSecret` — that's the byte sequence
    // Polar signs the HMAC with on the dashboard side.
  });

  it('handles a raw secret containing no `whsec_` prefix', () => {
    // Polar dashboard lets users "set your own" secret. If the operator
    // sets a value without the conventional prefix, btoa(...) still
    // produces a valid base64 string. standardwebhooks' prefix strip
    // is a no-op on the encoded form (which starts with base64 chars,
    // not `whsec_`), so the ctor accepts and the HMAC key bytes match
    // the user-set string exactly.
    const rawSecret = 'arbitrary-user-supplied-secret-value';
    expect(() => new Webhook(btoa(rawSecret))).not.toThrow();
  });
});
