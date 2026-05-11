/**
 * D1 / ML30 cross-DB integrity audit (BUG-051 案 A、第103回 新設).
 *
 * Detects orphan assignments — class_ids that exist in ML30
 * (digicode-class-server `assignments` table) but no longer exist in D1
 * (`classes` table). Orphans accumulate when ML30 DELETE fails after a
 * D1 class deletion (network blip etc.; classes.ts retry layer reduces
 * but does not eliminate the rate).
 *
 * Read-only — never writes. Recovery is a separate human/admin step
 * (issue DELETE /assignments/by-class/:id with the orphan class_id).
 *
 * Used by:
 *   - `handleScheduled` (daily cron, automatic detection + structured log)
 *   - `routes/admin.ts` GET /api/admin/audit-cross-db (manual admin trigger)
 *
 * Related: BUG-051 / `routes/classes.ts` DELETE retry / ML30
 *   `src/routes/admin.ts` GET /admin/assignment-class-ids
 */

import type { Bindings } from '../types/env';

export interface CrossDbAuditReport {
  healthy: boolean;
  orphans: number[]; // class_ids in ML30 but not in D1
  ml30Count: number;
  d1Count: number;
  ml30Available: boolean;
  error: string | null;
}

const ML30_TIMEOUT_MS = 10_000;

export async function auditCrossDbIntegrity(env: Bindings): Promise<CrossDbAuditReport> {
  // 1. Fetch ML30 class_ids (system-level, X-Internal-Secret only)
  const ml30Url = `${env.CLASS_API_URL}/admin/assignment-class-ids`;
  let ml30Ids: number[] = [];
  let ml30Available = true;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ML30_TIMEOUT_MS);
    try {
      const res = await fetch(ml30Url, {
        headers: { 'X-Internal-Secret': env.CLASS_API_SECRET },
        signal: controller.signal,
      });
      if (!res.ok) {
        ml30Available = false;
        error = `ML30 audit endpoint returned ${res.status}`;
      } else {
        const json = (await res.json()) as { classIds?: number[] };
        ml30Ids = json.classIds ?? [];
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    ml30Available = false;
    error = `ML30 audit endpoint unreachable: ${(err as Error).message}`;
  }

  // 2. Fetch D1 class_ids
  const d1Rows = await env.DB.prepare('SELECT id FROM classes').all<{ id: number }>();
  const d1Ids = new Set((d1Rows.results ?? []).map((r) => r.id));

  // 3. orphans = ML30 set − D1 set
  const orphans = ml30Ids.filter((id) => !d1Ids.has(id));

  return {
    healthy: ml30Available && orphans.length === 0,
    orphans,
    ml30Count: ml30Ids.length,
    d1Count: d1Ids.size,
    ml30Available,
    error,
  };
}
