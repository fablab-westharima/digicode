import { defineConfig } from 'vitest/config';

/**
 * Backend vitest config — plan 58 P3-9.
 *
 * Pure-function tests only at this stage (normalizer, factory, country
 * middleware mock, applyEvent with in-memory D1 mock). Workers-runtime
 * integration tests (real D1, real fetch interception) would need
 * @cloudflare/vitest-pool-workers; deferred to Phase 5 (UAT).
 *
 * `node` environment because none of the units under test touch any
 * Web API beyond `fetch` (which is provided by Node 20+ globally).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    globals: false,
  },
});
