/**
 * Active-subscription lookup for the §6a.2 double-charge guard.
 *
 * "Active" here means any state that is still consuming the provider's
 * subscription slot — including `past_due` (dunning window) and
 * `canceling` (grace period until expires_at). A user with a row in
 * one of these states must NOT be allowed to start a new checkout on
 * EITHER provider (same-provider creates a parallel subscription;
 * different-provider creates the very double-charge we are guarding
 * against).
 *
 * The states that are NOT blocking:
 *   'free'     — customer record exists but no paid subscription
 *   'canceled' — subscription terminated, no remaining access
 *   'expired'  — period ended after cancel, downgraded to free
 *
 * Phase 4 lifts this into a separate helper (vs inlining the query in
 * the route) so the unit test can sweep the status matrix without
 * spinning up Hono.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { ProviderId } from './types';

export interface BlockingActiveSubscription {
  provider: ProviderId;
  plan_type: string;
}

/**
 * Returns the active subscription row that should block a new checkout
 * attempt, or null if the user is free to subscribe.
 */
export async function findBlockingActiveSubscription(
  db: D1Database,
  userId: number,
): Promise<BlockingActiveSubscription | null> {
  const row = await db
    .prepare(
      `SELECT provider, plan_type FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'past_due', 'canceling')`,
    )
    .bind(userId)
    .first<{ provider: string | null; plan_type: string | null }>();

  if (!row) return null;

  // Defensive: only return when provider has a value the type union
  // recognises. A NULL provider would be a 0027-pre row that never got
  // backfilled, but the migration set NOT NULL DEFAULT 'stripe', so
  // this branch is here for type-narrow safety, not real-world drift.
  if (row.provider !== 'stripe' && row.provider !== 'polar' && row.provider !== 'lemonsqueezy') return null;

  return {
    provider: row.provider,
    plan_type: row.plan_type ?? 'free',
  };
}
