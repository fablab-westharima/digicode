/**
 * Stripe Webhook 処理 API
 *
 * Phase D-1: Stripe の署名検証 + イベント処理。
 * checkout.session.completed でプラン反映、
 * customer.subscription.updated / deleted でプラン変更・解約を処理。
 *
 * C-2: enterprise 解約時は即 free に戻さず、1 ヶ月猶予
 *      （subscriptions.status='canceling', expires_at=1ヶ月後）。
 *      scheduled handler が expires_at 経過後にクラス削除 + plan 戻しを実行。
 */
import { Hono } from 'hono';
import Stripe from 'stripe';
import type { Bindings } from '../types/env';
import { errorJson } from '../utils/errorJson';

// Stripe API version を明示固定する。SDK v22 のデフォルトと一致。
// 2026-04-23 に Stripe アカウント + webhook endpoint を 2018-02-28 → dahlia へ migration。
// SDK 更新時に default API version が勝手に動くのを防ぐため明示する。
const STRIPE_API_VERSION = '2026-03-25.dahlia';

const webhooks = new Hono<{ Bindings: Bindings }>();

// ---------- Payload 互換 helper ----------
// 2026-04-23 migration 後、endpoint API version は dahlia に揃えたが、
// Stripe 側で endpoint を旧版に戻した場合や古い未配信 event の retry に備え、
// 2018-02-28 payload 形式への fallback を永続維持する。
// 参考: prompt/maintenance/発見バグ/2026-04-23_034_*.md

function extractInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  // dahlia: invoice.parent.subscription_details.subscription
  const modern = invoice.parent?.subscription_details?.subscription;
  if (modern) {
    return typeof modern === 'string' ? modern : modern.id;
  }
  // 2018-02-28: invoice.subscription（現行 SDK 型には存在しないため cast）
  const legacy = (invoice as unknown as {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;
  if (legacy) {
    return typeof legacy === 'string' ? legacy : legacy.id;
  }
  return undefined;
}

function extractSubscriptionItemPriceId(
  subscription: Stripe.Subscription,
): string | null {
  const item = subscription.items.data[0];
  if (!item) return null;
  // dahlia は price、2018-02-28 は plan。SDK 型は両方保持しているため cast 不要。
  return item.price?.id ?? item.plan?.id ?? null;
}

// ---------- Stripe price_id → plan_type マッピング ----------
// Price ID は Stripe Dashboard で作成後に環境変数で管理するのが理想だが、
// Phase D-1 では D1 に price_id を保存して逆引きする方式を採用。
// Webhook イベントには price_id が含まれるので、それを元にプランを判定する。

async function resolvePlanFromSubscription(
  stripe: Stripe,
  subscriptionId: string,
): Promise<string> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = extractSubscriptionItemPriceId(sub);
    if (!priceId) return 'free';

    // price の metadata に plan_type を設定しておく（Dashboard で設定）
    const price = await stripe.prices.retrieve(priceId);
    const planType = price.metadata?.plan_type;
    if (planType && ['lite', 'pro', 'enterprise'].includes(planType)) {
      return planType;
    }

    // metadata がなければ product の metadata をフォールバック
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (productId) {
      const product = await stripe.products.retrieve(productId);
      const productPlan = product.metadata?.plan_type;
      if (productPlan && ['lite', 'pro', 'enterprise'].includes(productPlan)) {
        return productPlan;
      }
    }

    return 'free';
  } catch (error) {
    console.error('resolvePlanFromSubscription error:', error);
    return 'free';
  }
}

// ---------- POST /stripe ----------
webhooks.post('/stripe', async (c) => {
  const body = await c.req.text();
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    // F-28 (Session 123 post-deploy smoke で発見、本 commit C4 sweep 漏れの即時 closure):
    // 旧 inline c.json + 英語直書きを errorJson + 5 lang i18n 統一。catch block (L110)
    // の Stripe library exception と同 webhook signature error cluster、本 fix で
    // 両 path uniform errorJson + webhook.signatureInvalid 5 lang。
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    // F-28 (Session 123): 旧コードは Stripe library exception message を client
    // (Stripe 自身) に返却 = malformed payload で Stripe 例外 string を leak、
    // attacker が library state を fingerprint 可能 (e.g. `No signatures found
    // matching the expected signature for payload`)。Stripe 側 retry logic は
    // status code のみ参照、response body は不要。本 fix で error string を
    // client に返さず、internal log のみで保持。
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', msg);
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  const db = c.env.DB;

  console.log(`[webhook] ${event.type} id=${event.id}`);

  // F-8 (Session 123): Stripe webhook idempotency check.
  // Stripe は failed delivery を 3 日間 retry し、同じ event.id が複数回到着する。
  // 旧コードは event.id 重複 check なしで全 handler を再実行 → 例えば
  // handleSubscriptionDeleted の enterprise grace path で gracePeriod = now+1month を
  // 各 retry ごとに UPDATE = cancellation deadline が無限延長される脆弱性 (F-10)。
  // 本 fix で processed_webhooks に INSERT OR IGNORE、重複なら 200 早期 return。
  // checkout.session.completed は ON CONFLICT DO UPDATE で idempotent だが、
  // handler 全体での重複処理 (stripe API 再 fetch / users.plan UPDATE 等) を防ぐ。
  const insertResult = await db.prepare(
    'INSERT OR IGNORE INTO processed_webhooks (event_id, event_type) VALUES (?, ?)'
  ).bind(event.id, event.type).run();

  if (insertResult.meta.changes === 0) {
    // 重複 event = Stripe の retry を ack して early return。
    // 200 を返すことで Stripe 側の retry 停止 (Stripe spec)。
    console.log(`[webhook] duplicate event ignored: ${event.type} id=${event.id}`);
    return c.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(db, stripe, event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(db, stripe, event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(db, event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(db, event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`[webhook] unhandled event type: ${event.type}`);
  }

  return c.json({ received: true });
});

// ---------- checkout.session.completed ----------
async function handleCheckoutCompleted(
  db: D1Database,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.metadata?.digicode_user_id;

  if (!userId || !customerId || !subscriptionId) {
    console.error('[webhook] checkout.session.completed: missing metadata', {
      userId, customerId, subscriptionId,
    });
    return;
  }

  const planType = await resolvePlanFromSubscription(stripe, subscriptionId);
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = extractSubscriptionItemPriceId(sub);

  // subscriptions テーブル更新
  await db.prepare(`
    INSERT INTO subscriptions (user_id, status, plan_type, stripe_customer_id, stripe_subscription_id, stripe_price_id, started_at)
    VALUES (?, 'active', ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      status = 'active',
      plan_type = excluded.plan_type,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      started_at = excluded.started_at,
      expires_at = NULL,
      updated_at = datetime('now')
  `).bind(Number(userId), planType, customerId, subscriptionId, priceId).run();

  // users.plan も同時更新（二重管理の整合性維持）
  await db.prepare(`
    UPDATE users SET plan = ?, plan_source = 'stripe', updated_at = datetime('now')
    WHERE id = ?
  `).bind(planType, Number(userId)).run();

  console.log(`[webhook] checkout completed: user=${userId} plan=${planType}`);
}

// ---------- customer.subscription.updated ----------
async function handleSubscriptionUpdated(
  db: D1Database,
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const subscriptionId = subscription.id;
  const status = subscription.status; // active, past_due, canceled, etc.
  const planType = await resolvePlanFromSubscription(stripe, subscriptionId);
  const priceId = extractSubscriptionItemPriceId(subscription);

  await db.prepare(`
    UPDATE subscriptions
    SET plan_type = ?, status = ?, stripe_price_id = ?, updated_at = datetime('now')
    WHERE stripe_subscription_id = ?
  `).bind(planType, status, priceId, subscriptionId).run();

  // users.plan も同期（active の場合のみ。canceled 等は handleSubscriptionDeleted で処理）
  if (status === 'active') {
    const sub = await db.prepare(
      'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?'
    ).bind(subscriptionId).first<{ user_id: number }>();

    if (sub) {
      await db.prepare(`
        UPDATE users SET plan = ?, plan_source = 'stripe', updated_at = datetime('now')
        WHERE id = ?
      `).bind(planType, sub.user_id).run();
    }
  }

  console.log(`[webhook] subscription.updated: sub=${subscriptionId} plan=${planType} status=${status}`);
}

// ---------- customer.subscription.deleted ----------
// C-2: enterprise 解約時は 1 ヶ月猶予。それ以外は即 free。
async function handleSubscriptionDeleted(
  db: D1Database,
  subscription: Stripe.Subscription,
) {
  const subscriptionId = subscription.id;

  const sub = await db.prepare(
    'SELECT user_id, plan_type FROM subscriptions WHERE stripe_subscription_id = ?'
  ).bind(subscriptionId).first<{ user_id: number; plan_type: string }>();

  if (!sub) {
    console.warn(`[webhook] subscription.deleted: no matching record for ${subscriptionId}`);
    return;
  }

  if (sub.plan_type === 'enterprise') {
    // C-2: enterprise は 1 ヶ月猶予（scheduled handler でクラス削除 + plan 戻し）
    const gracePeriod = new Date();
    gracePeriod.setMonth(gracePeriod.getMonth() + 1);

    // F-10 (Session 123): defense-in-depth filter `expires_at IS NULL`。
    // 旧コードは event.id idempotency 不在 (F-8) + grace UPDATE unconditional =
    // Stripe retry storm で gracePeriod が無限延長される脆弱性。F-8 で event.id
    // 重複 check 実装済だが、本 filter で double-defense (status='canceling'
    // already-set rows への重複 grace 延長を block)。
    await db.prepare(`
      UPDATE subscriptions
      SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
      WHERE stripe_subscription_id = ? AND expires_at IS NULL
    `).bind(gracePeriod.toISOString(), subscriptionId).run();

    console.log(`[webhook] enterprise canceling: user=${sub.user_id} grace until ${gracePeriod.toISOString()}`);
  } else {
    // lite/pro は即座に free に戻す
    await db.prepare(`
      UPDATE subscriptions
      SET plan_type = 'free', status = 'canceled',
          stripe_subscription_id = NULL, stripe_price_id = NULL,
          updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
    `).bind(subscriptionId).run();

    await db.prepare(`
      UPDATE users SET plan = 'free', plan_source = 'stripe_canceled', updated_at = datetime('now')
      WHERE id = ?
    `).bind(sub.user_id).run();

    console.log(`[webhook] subscription deleted: user=${sub.user_id} → free`);
  }
}

// ---------- invoice.payment_failed ----------
async function handlePaymentFailed(
  db: D1Database,
  invoice: Stripe.Invoice,
) {
  const subscriptionId = extractInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    console.warn('[webhook] invoice.payment_failed: no subscription reference in payload');
    return;
  }

  await db.prepare(`
    UPDATE subscriptions
    SET status = 'past_due', updated_at = datetime('now')
    WHERE stripe_subscription_id = ?
  `).bind(subscriptionId).run();

  console.log(`[webhook] payment failed: sub=${subscriptionId} → past_due`);
}

// ---------- GET /stripe/health ----------
webhooks.get('/stripe/health', (c) => {
  return c.json({
    status: 'ok',
    webhookSecretConfigured: !!c.env.STRIPE_WEBHOOK_SECRET,
  });
});

export default webhooks;
