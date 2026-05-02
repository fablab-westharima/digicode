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
    return c.json({ error: 'Missing stripe-signature header' }, 400);
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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', msg);
    return c.json({ error: `Webhook Error: ${msg}` }, 400);
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  const db = c.env.DB;

  console.log(`[webhook] ${event.type} id=${event.id}`);

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

    await db.prepare(`
      UPDATE subscriptions
      SET status = 'canceling', expires_at = ?, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
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
