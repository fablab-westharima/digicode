/**
 * applyPolarEvent — write a NormalizedPolarEvent into D1.
 *
 * This is the single place the Polar webhook path mutates `subscriptions`
 * and `users.plan`. Keeping the writes here (instead of branching at the
 * webhook handler) means the four state-transition rules are visible
 * side-by-side and the unit test can sweep all four with an in-memory
 * D1 mock.
 *
 * Behavior is intentionally close to the existing Stripe handler in
 * `routes/webhooks.ts` so per-row outcomes for the same business event
 * match between providers. Key parallels:
 *
 *   - On `active`: INSERT or UPDATE the subscriptions row to status
 *     'active', set plan_type, set users.plan. Same as Stripe's
 *     `checkout.session.completed` handler.
 *
 *   - On `past_due`: UPDATE status='past_due'. plan_type and users.plan
 *     are NOT changed — user retains access during dunning. Same as
 *     Stripe's `invoice.payment_failed`.
 *
 *   - On `canceled`: Polar's "user requested cancel, period continues".
 *     UPDATE status='canceling' + expires_at=<period_end>. No change
 *     to plan_type or users.plan. The natural-period-end runway is
 *     longer than Stripe's enterprise 1-month grace, so we don't add
 *     extra grace here.
 *
 *   - On `expired`:
 *       enterprise via subscription.revoked → 1-month grace, mirroring
 *         the Stripe enterprise handler (admin needs time to export
 *         class data)
 *       any plan via order.refunded → immediate free downgrade (a
 *         refund unambiguously withdraws consent)
 *       lite/pro via subscription.revoked → immediate free
 *
 * Idempotency is handled by the webhook handler (via processed_webhooks
 * table + webhook-id header). This function does NOT need to be
 * idempotent on its own, but in practice the UPDATEs are.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { NormalizedPolarEvent } from './types';
import type { PlanId } from './types';
import { resolvePlanFromPolarProductId } from './polarProvider';
import type { Bindings } from '../../types/env';

interface ApplyEventResult {
  outcome: 'applied' | 'skipped';
  reason?: string;
}

export async function applyPolarEvent(
  env: Bindings,
  ev: NormalizedPolarEvent,
): Promise<ApplyEventResult> {
  if (ev.digicodeUserId == null) {
    return {
      outcome: 'skipped',
      reason: `missing digicode_user_id (event=${ev.rawType}, customer=${ev.externalCustomerId ?? '?'})`,
    };
  }

  const planFromProduct = resolvePlanFromPolarProductId(env, ev.productId);

  switch (ev.state) {
    case 'active':
      await applyActive(env.DB, ev, planFromProduct ?? 'lite');
      return { outcome: 'applied' };

    case 'past_due':
      await applyPastDue(env.DB, ev);
      return { outcome: 'applied' };

    case 'canceled':
      await applyCanceledPeriodEnd(env.DB, ev);
      return { outcome: 'applied' };

    case 'expired':
      await applyExpired(env.DB, ev);
      return { outcome: 'applied' };
  }
}

/**
 * `active` — first payment succeeded or recovery after past_due.
 *
 * Upsert by user_id so the same row is reused if a free-tier
 * placeholder existed (created lazily by the checkout flow). The
 * INSERT path sets provider='polar'; the UPDATE path forces it to
 * 'polar' too because crossing from stripe→polar mid-sub is not
 * allowed by the factory and shouldn't reach here, but if it does we
 * want the D1 row to reflect reality.
 */
async function applyActive(
  db: D1Database,
  ev: NormalizedPolarEvent,
  planId: PlanId,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO subscriptions
         (user_id, status, plan_type, provider,
          polar_customer_id, polar_subscription_id, polar_product_id,
          started_at)
       VALUES (?, 'active', ?, 'polar', ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         status = 'active',
         plan_type = excluded.plan_type,
         provider = 'polar',
         polar_customer_id = excluded.polar_customer_id,
         polar_subscription_id = excluded.polar_subscription_id,
         polar_product_id = excluded.polar_product_id,
         expires_at = NULL,
         updated_at = datetime('now')`,
    )
    .bind(
      ev.digicodeUserId,
      planId,
      ev.externalCustomerId,
      ev.externalSubscriptionId,
      ev.productId,
    )
    .run();

  await db
    .prepare(
      `UPDATE users SET plan = ?, plan_source = 'polar', updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(planId, ev.digicodeUserId)
    .run();
}

async function applyPastDue(db: D1Database, ev: NormalizedPolarEvent): Promise<void> {
  // Match by polar_subscription_id if we have it; fall back to user_id +
  // provider so a missing subscription_id (rare, but defensive) still updates
  // the right row.
  if (ev.externalSubscriptionId) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET status = 'past_due', updated_at = datetime('now')
         WHERE polar_subscription_id = ?`,
      )
      .bind(ev.externalSubscriptionId)
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE subscriptions
       SET status = 'past_due', updated_at = datetime('now')
       WHERE user_id = ? AND provider = 'polar'`,
    )
    .bind(ev.digicodeUserId)
    .run();
}

async function applyCanceledPeriodEnd(
  db: D1Database,
  ev: NormalizedPolarEvent,
): Promise<void> {
  // User clicked cancel; period continues until periodEndAt. Mark
  // status='canceling' (matches the existing Stripe enterprise label)
  // and write the explicit expires_at so scheduled cleanup can pick it
  // up at the right time. Plan + users.plan unchanged (user still has
  // access).
  if (ev.externalSubscriptionId) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
         WHERE polar_subscription_id = ? AND (expires_at IS NULL OR expires_at <> ?)`,
      )
      .bind(ev.periodEndAt, ev.externalSubscriptionId, ev.periodEndAt)
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE subscriptions
       SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
       WHERE user_id = ? AND provider = 'polar'`,
    )
    .bind(ev.periodEndAt, ev.digicodeUserId)
    .run();
}

async function applyExpired(db: D1Database, ev: NormalizedPolarEvent): Promise<void> {
  // Look up the current plan so we know whether to grace (enterprise via
  // subscription.revoked) or drop immediately (lite/pro or any
  // order.refunded). Refunds bypass grace regardless of plan.
  const current = ev.externalSubscriptionId
    ? await db
        .prepare(
          `SELECT user_id, plan_type FROM subscriptions
           WHERE polar_subscription_id = ?`,
        )
        .bind(ev.externalSubscriptionId)
        .first<{ user_id: number; plan_type: string }>()
    : await db
        .prepare(
          `SELECT user_id, plan_type FROM subscriptions
           WHERE user_id = ? AND provider = 'polar'`,
        )
        .bind(ev.digicodeUserId)
        .first<{ user_id: number; plan_type: string }>();

  if (!current) {
    // No matching row — log only, don't write
    return;
  }

  const isRefund = ev.rawType === 'order.refunded';
  const isEnterpriseWithGrace = current.plan_type === 'enterprise' && !isRefund;

  if (isEnterpriseWithGrace) {
    const grace = new Date();
    grace.setMonth(grace.getMonth() + 1);
    await db
      .prepare(
        `UPDATE subscriptions
         SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
         WHERE user_id = ? AND provider = 'polar' AND expires_at IS NULL`,
      )
      .bind(grace.toISOString(), current.user_id)
      .run();
    return;
  }

  // lite/pro revoked OR any refund: immediate free
  await db
    .prepare(
      `UPDATE subscriptions
       SET plan_type = 'free', status = 'canceled',
           polar_subscription_id = NULL,
           updated_at = datetime('now')
       WHERE user_id = ? AND provider = 'polar'`,
    )
    .bind(current.user_id)
    .run();

  await db
    .prepare(
      `UPDATE users SET plan = 'free', plan_source = 'polar_canceled',
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(current.user_id)
    .run();
}
