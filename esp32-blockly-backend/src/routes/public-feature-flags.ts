/**
 * Public feature-flags endpoint — no auth required.
 *
 * Extracted from admin.ts in Session 119 R3 fix: previously mounted via
 * `app.route('/api', admin)` which side-effected the entire admin router
 * (`/users`, `/flags`, `/audit-cross-db`) into `/api/*`. Those endpoints
 * are authz-gated by middleware but were not covered by the `/api/admin/*`
 * rate-limit prefix, opening a brute-force / DoS surface.
 *
 * Mount: `app.route('/api/feature-flags', publicFeatureFlags)` in index.ts.
 */
import { Hono } from 'hono';
import { computeIsFreeNow } from '../utils/featureFlag';
import type { Bindings, Variables } from '../types/env';

const publicFeatureFlags = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/feature-flags
// Frontend public read of feature flag state (used by featureFlagStore).
publicFeatureFlags.get('/', async (c) => {
  try {
    const flags = await c.env.DB.prepare(
      'SELECT key, enabled, free_until, free_reason FROM feature_flags'
    ).all<{
      key: string;
      enabled: number;
      free_until: string | null;
      free_reason: string | null;
    }>();

    const now = new Date().toISOString();
    const result: Record<string, {
      enabled: boolean;
      freeUntil: string | null;
      freeReason: string | null;
      isFreeNow: boolean;
    }> = {};

    for (const f of flags.results) {
      // enabled=false → 全員に開放、enabled=true+期間内 → 無料開放中
      // (computeIsFreeNow と feedback.ts の isFlagFreeNow が同 formula、helper で single source 化)
      result[f.key] = {
        enabled: f.enabled === 1,
        freeUntil: f.free_until,
        freeReason: f.free_reason,
        isFreeNow: computeIsFreeNow({ enabled: f.enabled, free_until: f.free_until }, now),
      };
    }

    return c.json({ flags: result });
  } catch (error) {
    console.error('Get feature flags error:', error);
    return c.json({ flags: {} });
  }
});

export default publicFeatureFlags;
