/**
 * サブスクリプション管理 API — Stripe Checkout + Customer Portal
 *
 * Phase D-1: 国内 Stripe のみ。
 * コードは price_id を参照するだけで金額をハードコードしない。
 * 価格・税・返金ポリシーは Stripe Dashboard で設定する。
 */
import { Hono } from 'hono';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth';
import { getUserPlan } from '../utils/plan';
import { errorJson } from '../utils/errorJson';
import type { Bindings, Variables } from '../types/env';

const subscriptions = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Stripe API version を明示固定する。SDK v22 のデフォルトと一致、webhooks.ts と同値。
// 2026-04-23 に 2018-02-28 → dahlia へ migration。
const STRIPE_API_VERSION = '2026-03-25.dahlia';

// プラン定義（参考情報、実際の金額は Stripe Dashboard で設定）
const PLANS = {
  free: {
    id: 'free',
    name: '無料プラン',
    compileLimit: 50,
    features: ['月50回クラウドコンパイル', '基本ブロック'],
  },
  lite: {
    id: 'lite',
    name: 'Liteプラン',
    compileLimit: 250,
    features: ['月250回クラウドコンパイル', '基本ブロック'],
  },
  pro: {
    id: 'pro',
    name: 'Proプラン',
    compileLimit: 500,
    features: ['月500回クラウドコンパイル', '全ブロック', 'ピンアサイン機能'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterpriseプラン',
    compileLimit: -1,
    features: ['無制限クラウドコンパイル', '全機能', 'クラス機能'],
  },
};

function getStripe(env: Bindings): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
}

// ---------- GET /plans ----------
subscriptions.get('/plans', (c) => {
  return c.json({ plans: Object.values(PLANS) });
});

// ---------- GET /status ----------
subscriptions.get('/status', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const plan = await getUserPlan(c.env.DB, userId);

    const subscription = await c.env.DB.prepare(`
      SELECT status, plan_type, stripe_customer_id, stripe_subscription_id,
             stripe_price_id, started_at, expires_at
      FROM subscriptions WHERE user_id = ?
    `).bind(userId).first<{
      status: string;
      plan_type: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      stripe_price_id: string | null;
      started_at: string | null;
      expires_at: string | null;
    }>();

    const planDef = PLANS[plan as keyof typeof PLANS] || PLANS.free;

    return c.json({
      subscription: {
        status: subscription?.status || 'free',
        planType: plan,
        plan: planDef,
        stripeCustomerId: subscription?.stripe_customer_id || null,
        stripeSubscriptionId: subscription?.stripe_subscription_id || null,
        hasStripeSubscription: !!subscription?.stripe_subscription_id,
      },
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return errorJson(c, 'subscription.fetchFailed', 500);
  }
});

// ---------- POST /checkout ----------
// Stripe Checkout Session を作成し、URL を返す。
// フロントエンドはこの URL にリダイレクトする。
subscriptions.post('/checkout', authMiddleware, async (c) => {
  try {
    const { userId, email } = c.get('user');
    const { priceId } = await c.req.json<{ priceId: string }>();

    if (!priceId) {
      return errorJson(c, 'validation.priceIdRequired', 400);
    }

    const stripe = getStripe(c.env);

    // 既存の Stripe Customer を検索、なければ作成
    let customerId: string;
    const sub = await c.env.DB.prepare(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first<{ stripe_customer_id: string | null }>();

    if (sub?.stripe_customer_id) {
      customerId = sub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { digicode_user_id: String(userId) },
      });
      customerId = customer.id;

      // subscriptions 行がなければ作成、あれば更新
      await c.env.DB.prepare(`
        INSERT INTO subscriptions (user_id, status, plan_type, stripe_customer_id)
        VALUES (?, 'free', 'free', ?)
        ON CONFLICT(user_id) DO UPDATE SET
          stripe_customer_id = excluded.stripe_customer_id,
          updated_at = datetime('now')
      `).bind(userId, customerId).run();
    }

    const origin = c.req.header('Origin') || 'https://code.fablab-westharima.jp';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/plan?result=success`,
      cancel_url: `${origin}/plan?result=cancel`,
      metadata: { digicode_user_id: String(userId) },
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    const msg = error instanceof Error ? error.message : 'Checkout セッションの作成に失敗しました';
    return c.json({ error: msg }, 500);
  }
});

// ---------- POST /portal ----------
// Stripe Customer Portal セッションを作成し、URL を返す。
// ユーザーはここでプラン変更・解約・請求書確認ができる。
subscriptions.post('/portal', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    const sub = await c.env.DB.prepare(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first<{ stripe_customer_id: string | null }>();

    if (!sub?.stripe_customer_id) {
      return errorJson(c, 'subscription.noStripeCustomer', 400);
    }

    const stripe = getStripe(c.env);
    const origin = c.req.header('Origin') || 'https://code.fablab-westharima.jp';

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/plan`,
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return errorJson(c, 'subscription.portalSessionFailed', 500);
  }
});

export default subscriptions;
