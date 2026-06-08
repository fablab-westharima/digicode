/**
 * applyLemonSqueezyEvent — write a NormalizedLemonSqueezyEvent into D1.
 *
 * The LemonSqueezy mirror of applyEvent.ts (applyPolarEvent). Same four
 * state-transition rules, writing the lemonsqueezy_* columns (migration 0029)
 * and provider='lemonsqueezy'. Per-row outcomes match the Polar/Stripe paths
 * so the same business event lands identically across providers.
 *
 *   active     — INSERT/UPDATE status='active', set plan_type + users.plan.
 *   past_due   — UPDATE status='past_due'; plan retained during dunning.
 *   canceled   — UPDATE status='canceling' + expires_at=<period end>; access
 *                continues until the period ends.
 *   expired    — enterprise via expiry → 1-month grace (admin export window);
 *                any plan via order_refunded OR lite/pro expiry → immediate free.
 *
 * Idempotency is handled by the webhook handler (processed_webhooks); this
 * function does not need to be idempotent on its own (the UPDATEs are).
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { NormalizedLemonSqueezyEvent, PlanId } from './types';
import { resolvePlanFromLsVariantId } from './lemonSqueezyProvider';
import type { Bindings } from '../../types/env';

interface ApplyEventResult {
  outcome: 'applied' | 'skipped';
  reason?: string;
}

export async function applyLemonSqueezyEvent(
  env: Bindings,
  ev: NormalizedLemonSqueezyEvent,
): Promise<ApplyEventResult> {
  if (ev.digicodeUserId == null) {
    return {
      outcome: 'skipped',
      reason: `missing custom_data.user_id (event=${ev.rawType}, customer=${ev.externalCustomerId ?? '?'})`,
    };
  }

  const planFromVariant = resolvePlanFromLsVariantId(env, ev.variantId);

  switch (ev.state) {
    case 'active':
      await applyActive(env.DB, ev, planFromVariant ?? 'lite');
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

async function applyActive(
  db: D1Database,
  ev: NormalizedLemonSqueezyEvent,
  planId: PlanId,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO subscriptions
         (user_id, status, plan_type, provider,
          lemonsqueezy_customer_id, lemonsqueezy_subscription_id, lemonsqueezy_variant_id,
          started_at)
       VALUES (?, 'active', ?, 'lemonsqueezy', ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         status = 'active',
         plan_type = excluded.plan_type,
         provider = 'lemonsqueezy',
         lemonsqueezy_customer_id = excluded.lemonsqueezy_customer_id,
         lemonsqueezy_subscription_id = excluded.lemonsqueezy_subscription_id,
         lemonsqueezy_variant_id = excluded.lemonsqueezy_variant_id,
         expires_at = NULL,
         updated_at = datetime('now')`,
    )
    .bind(
      ev.digicodeUserId,
      planId,
      ev.externalCustomerId,
      ev.externalSubscriptionId,
      ev.variantId,
    )
    .run();

  await db
    .prepare(
      `UPDATE users SET plan = ?, plan_source = 'lemonsqueezy', updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(planId, ev.digicodeUserId)
    .run();
}

async function applyPastDue(
  db: D1Database,
  ev: NormalizedLemonSqueezyEvent,
): Promise<void> {
  if (ev.externalSubscriptionId) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET status = 'past_due', updated_at = datetime('now')
         WHERE lemonsqueezy_subscription_id = ?`,
      )
      .bind(ev.externalSubscriptionId)
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE subscriptions
       SET status = 'past_due', updated_at = datetime('now')
       WHERE user_id = ? AND provider = 'lemonsqueezy'`,
    )
    .bind(ev.digicodeUserId)
    .run();
}

async function applyCanceledPeriodEnd(
  db: D1Database,
  ev: NormalizedLemonSqueezyEvent,
): Promise<void> {
  // User cancelled; period continues until periodEndAt. status='canceling'
  // (matches Stripe/Polar label) + explicit expires_at for scheduled cleanup.
  // plan + users.plan unchanged (user still has access).
  if (ev.externalSubscriptionId) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
         WHERE lemonsqueezy_subscription_id = ? AND (expires_at IS NULL OR expires_at <> ?)`,
      )
      .bind(ev.periodEndAt, ev.externalSubscriptionId, ev.periodEndAt)
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE subscriptions
       SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
       WHERE user_id = ? AND provider = 'lemonsqueezy'`,
    )
    .bind(ev.periodEndAt, ev.digicodeUserId)
    .run();
}

async function applyExpired(
  db: D1Database,
  ev: NormalizedLemonSqueezyEvent,
): Promise<void> {
  const current = ev.externalSubscriptionId
    ? await db
        .prepare(
          `SELECT user_id, plan_type FROM subscriptions
           WHERE lemonsqueezy_subscription_id = ?`,
        )
        .bind(ev.externalSubscriptionId)
        .first<{ user_id: number; plan_type: string }>()
    : await db
        .prepare(
          `SELECT user_id, plan_type FROM subscriptions
           WHERE user_id = ? AND provider = 'lemonsqueezy'`,
        )
        .bind(ev.digicodeUserId)
        .first<{ user_id: number; plan_type: string }>();

  if (!current) {
    // No matching row — log only, don't write.
    return;
  }

  const isRefund = ev.rawType === 'order_refunded';
  const isEnterpriseWithGrace = current.plan_type === 'enterprise' && !isRefund;

  if (isEnterpriseWithGrace) {
    const grace = new Date();
    grace.setMonth(grace.getMonth() + 1);
    await db
      .prepare(
        `UPDATE subscriptions
         SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
         WHERE user_id = ? AND provider = 'lemonsqueezy' AND expires_at IS NULL`,
      )
      .bind(grace.toISOString(), current.user_id)
      .run();
    return;
  }

  // lite/pro expired OR any refund: immediate free.
  await db
    .prepare(
      `UPDATE subscriptions
       SET plan_type = 'free', status = 'canceled',
           lemonsqueezy_subscription_id = NULL,
           updated_at = datetime('now')
       WHERE user_id = ? AND provider = 'lemonsqueezy'`,
    )
    .bind(current.user_id)
    .run();

  await db
    .prepare(
      `UPDATE users SET plan = 'free', plan_source = 'lemonsqueezy_canceled',
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(current.user_id)
    .run();
}
