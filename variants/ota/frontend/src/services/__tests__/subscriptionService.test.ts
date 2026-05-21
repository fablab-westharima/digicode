/**
 * Plan 58 §6a tests for the small pure-function surface of
 * `subscriptionService.ts`. The network-facing functions
 * (`createCheckoutByPlan`, `getSubscriptionStatusFull`, etc.) are
 * covered by the backend integration tests + Phase 5 UAT; here we
 * only exercise the state-machine derivation and the AlreadyActive
 * error class so the matrix is locked down before refactors.
 */
import { describe, it, expect } from 'vitest';
import {
  derivePlanState,
  AlreadyActiveError,
  type ProviderId,
} from '../subscriptionService';

describe('derivePlanState', () => {
  it('returns A when there is no active subscription', () => {
    expect(derivePlanState(false, null, 'stripe')).toBe('A');
    expect(derivePlanState(false, 'stripe', 'stripe')).toBe('A');
    expect(derivePlanState(false, 'polar', 'polar')).toBe('A');
  });

  it('returns B when active and providers match', () => {
    expect(derivePlanState(true, 'stripe', 'stripe')).toBe('B');
    expect(derivePlanState(true, 'polar', 'polar')).toBe('B');
  });

  it('returns C when active and providers disagree', () => {
    expect(derivePlanState(true, 'stripe', 'polar')).toBe('C');
    expect(derivePlanState(true, 'polar', 'stripe')).toBe('C');
  });

  it('treats a null currentProvider with active=true as a mismatch (C)', () => {
    // hasActiveSubscription should not be true when provider is null in
    // practice (the backend writes provider on every active row), but
    // documenting the safe fallback here keeps the state machine
    // monotonic if data drift ever occurs.
    expect(derivePlanState(true, null, 'stripe')).toBe('C');
    expect(derivePlanState(true, null, 'polar')).toBe('C');
  });
});

describe('AlreadyActiveError', () => {
  it('preserves provider + plan as instance fields', () => {
    const err = new AlreadyActiveError('Already active', 'stripe', 'pro');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AlreadyActiveError);
    expect(err.message).toBe('Already active');
    expect(err.currentProvider).toBe('stripe');
    expect(err.currentPlan).toBe('pro');
    expect(err.name).toBe('AlreadyActiveError');
  });

  it('is distinguishable from a plain Error via instanceof', () => {
    const err: unknown = new AlreadyActiveError('msg', 'polar', 'lite');
    if (err instanceof AlreadyActiveError) {
      const provider: ProviderId = err.currentProvider; // type-narrow check
      expect(provider).toBe('polar');
    } else {
      throw new Error('AlreadyActiveError instanceof guard failed');
    }
  });
});
