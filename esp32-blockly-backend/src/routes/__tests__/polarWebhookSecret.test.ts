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
