import { describe, it, expect } from 'vitest';
import { resolvePolarProductId, resolvePlanFromPolarProductId } from '../polarProvider';
import type { Bindings } from '../../../types/env';

const env = {
  POLAR_PRODUCT_LITE: 'prod_uuid_lite',
  POLAR_PRODUCT_PRO: 'prod_uuid_pro',
  POLAR_PRODUCT_ENTERPRISE: 'prod_uuid_enterprise',
} as unknown as Bindings;

describe('resolvePolarProductId — planId → UUID', () => {
  it('lite → POLAR_PRODUCT_LITE', () => {
    expect(resolvePolarProductId(env, 'lite')).toBe('prod_uuid_lite');
  });
  it('pro → POLAR_PRODUCT_PRO', () => {
    expect(resolvePolarProductId(env, 'pro')).toBe('prod_uuid_pro');
  });
  it('enterprise → POLAR_PRODUCT_ENTERPRISE', () => {
    expect(resolvePolarProductId(env, 'enterprise')).toBe('prod_uuid_enterprise');
  });
  it('free → undefined', () => {
    expect(resolvePolarProductId(env, 'free')).toBeUndefined();
  });
});

describe('resolvePlanFromPolarProductId — UUID → planId reverse', () => {
  it('matches each configured product', () => {
    expect(resolvePlanFromPolarProductId(env, 'prod_uuid_lite')).toBe('lite');
    expect(resolvePlanFromPolarProductId(env, 'prod_uuid_pro')).toBe('pro');
    expect(resolvePlanFromPolarProductId(env, 'prod_uuid_enterprise')).toBe('enterprise');
  });
  it('returns null for unconfigured UUIDs', () => {
    expect(resolvePlanFromPolarProductId(env, 'prod_uuid_unknown')).toBeNull();
  });
  it('returns null for null input', () => {
    expect(resolvePlanFromPolarProductId(env, null)).toBeNull();
  });
});
