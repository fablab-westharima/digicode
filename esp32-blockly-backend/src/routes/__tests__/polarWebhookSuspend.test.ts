/**
 * Polar webhook suspend guard (Session 165 T2).
 *
 * POST /polar must short-circuit with HTTP 503 when POLAR_CHECKOUT_SUSPENDED
 * is 'true' — BEFORE reading the body or verifying the signature. This is the
 * structural closure of the dormant-Polar webhook path: POLAR_WEBHOOK_SECRET
 * cannot be rotated (Polar dashboard login lost, S164 R3), so the route is
 * gated by the same flag as checkout instead of relying on the un-rotatable
 * secret. When the flag is unset the guard is bypassed and the normal path
 * runs (missing Standard-Webhooks headers → 400), proving the guard only
 * affects the suspended state.
 */
import { describe, it, expect } from 'vitest';
import webhooks from '../webhooks';
import type { Bindings } from '../../types/env';

function env(overrides: Partial<Bindings> = {}): Bindings {
  return { ...overrides } as unknown as Bindings;
}

describe('POST /polar — suspend guard (Session 165 T2)', () => {
  it('returns 503 when POLAR_CHECKOUT_SUSPENDED=true (before signature verify)', async () => {
    const res = await webhooks.request(
      '/polar',
      { method: 'POST', body: '{}' },
      env({ POLAR_CHECKOUT_SUSPENDED: 'true' }),
    );
    expect(res.status).toBe(503);
  });

  it('bypasses the guard when not suspended (missing headers → 400, not 503)', async () => {
    const res = await webhooks.request(
      '/polar',
      { method: 'POST', body: '{}' },
      env({ POLAR_CHECKOUT_SUSPENDED: undefined }),
    );
    // Guard not fired: normal handler reached, rejects missing standard-webhooks
    // headers with 400 (NOT 503).
    expect(res.status).toBe(400);
  });
});

describe('GET /polar/health — suspended field (Session 165 T2)', () => {
  it('reports suspended:true when flag set', async () => {
    const res = await webhooks.request('/polar/health', {}, env({ POLAR_CHECKOUT_SUSPENDED: 'true' }));
    const body = (await res.json()) as { suspended: boolean };
    expect(body.suspended).toBe(true);
  });

  it('reports suspended:false when flag unset', async () => {
    const res = await webhooks.request('/polar/health', {}, env());
    const body = (await res.json()) as { suspended: boolean };
    expect(body.suspended).toBe(false);
  });
});
