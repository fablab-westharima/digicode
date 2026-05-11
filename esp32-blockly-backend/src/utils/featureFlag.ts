/**
 * Feature flag runtime evaluation helpers.
 *
 * Mirror of `routes/admin.ts` GET /api/feature-flags `isFreeNow` formula:
 *   isFreeNow := enabled !== 1 || (free_until !== null && free_until > now)
 *
 * Used by:
 *   - routes/admin.ts (public flag list, computeIsFreeNow per row)
 *   - routes/feedback.ts (anonymous-submission gate during prerelease)
 *
 * 第103回 (2026-05-12) 新設: admin.ts inline → helper 抽出。計算式の single
 * source of truth 化、admin / feedback 二箇所重複を解消。
 */

export interface FeatureFlagRow {
  enabled: number;
  free_until: string | null;
}

/**
 * Compute `isFreeNow` for a single flag row at a given timestamp.
 * Pure function — preferred when caller already holds the row (e.g. admin list).
 */
export function computeIsFreeNow(row: FeatureFlagRow, nowIso: string): boolean {
  return row.enabled !== 1 || (row.free_until !== null && row.free_until > nowIso);
}

/**
 * Look up a single flag by key and return whether it is currently in its
 * "free open" window. Returns false if the flag does not exist.
 */
export async function isFlagFreeNow(db: D1Database, key: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT enabled, free_until FROM feature_flags WHERE key = ?')
    .bind(key)
    .first<FeatureFlagRow>();
  if (!row) return false;
  return computeIsFreeNow(row, new Date().toISOString());
}
