/**
 * サブスクリプション管理 API — provider 抽象化レイヤー経由
 *
 * Phase 3 (plan 58 §3): checkout / portal は services/payment/ の
 * PaymentProvider 抽象を経由する。`POST /checkout` は新 `planId` 形式
 * を受けつつ、frontend が migration を完了するまで legacy `priceId`
 * 形式も backward-compat で残置 (legacy path は常に Stripe に流す)。
 *
 * Webhook 処理は `routes/webhooks.ts` 側に分離 (Stripe webhook は本
 * Phase で touch せず、Polar webhook handler を別途追加)。
 *
 * Response shape (SubscriptionStatus 等) は pre-refactor と同形で互換
 * 維持。新 field (provider / hasActiveSubscription / state /
 * periodEndAt 等) は Phase 4 で frontend と同 commit で追加する。
 */
import { Hono, type Context } from 'hono';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth';
import { countryMiddleware } from '../middleware/country';
import { getUserPlan } from '../utils/plan';
import { errorJson, type ErrorKey } from '../utils/errorJson';
import { getProviderForUser } from '../services/payment';
import { PaymentProviderError } from '../services/payment/types';
import type { Bindings, Variables } from '../types/env';

type RouteContext = Context<{ Bindings: Bindings; Variables: Variables }>;

/**
 * Map a PaymentProviderError.code (free-form string from the provider
 * layer) to an i18n ErrorKey. Provider code is decoupled from the i18n
 * resource map by intent — keep the mapping narrow and known here.
 * Unknown codes fall back to a generic provider error.
 */
function providerErrorKey(code: string): ErrorKey {
  switch (code) {
    case 'subscription.priceNotConfigured':
    case 'subscription.checkoutFailed':
    case 'subscription.portalSessionFailed':
    case 'subscription.providerError':
      return code;
    default:
      return 'subscription.providerError';
  }
}

const subscriptions = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// auth + country を /api/subscriptions/* の全 endpoint に適用。
// country は factory の振分けに使うため authMiddleware の後ろに mount し、
// user 取得後に CF-IPCountry を context へ載せる。
subscriptions.use('*', authMiddleware, countryMiddleware);

// Stripe API version — legacy /checkout path で priceId 直渡しした場合に
// この value で SDK を init する。webhooks.ts の値と同期。
const STRIPE_API_VERSION = '2026-03-25.dahlia';

// プラン定義（参考情報、実際の金額は Stripe Dashboard / Polar Dashboard で設定）
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

type PlanLiteral = keyof typeof PLANS;

function isPlanLiteral(value: unknown): value is Exclude<PlanLiteral, 'free'> {
  return value === 'lite' || value === 'pro' || value === 'enterprise';
}

// ---------- GET /plans ----------
subscriptions.get('/plans', (c) => {
  return c.json({ plans: Object.values(PLANS) });
});

// ---------- GET /status ----------
subscriptions.get('/status', async (c) => {
  try {
    const { userId } = c.get('user');
    const plan = await getUserPlan(c.env.DB, userId);

    const subscription = await c.env.DB.prepare(`
      SELECT status, plan_type, provider,
             stripe_customer_id, stripe_subscription_id, stripe_price_id,
             polar_customer_id, polar_subscription_id, polar_product_id,
             started_at, expires_at
      FROM subscriptions WHERE user_id = ?
    `).bind(userId).first<{
      status: string;
      plan_type: string;
      provider: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      stripe_price_id: string | null;
      polar_customer_id: string | null;
      polar_subscription_id: string | null;
      polar_product_id: string | null;
      started_at: string | null;
      expires_at: string | null;
    }>();

    const planDef = PLANS[plan as keyof typeof PLANS] || PLANS.free;

    return c.json({
      subscription: {
        status: subscription?.status || 'free',
        planType: plan,
        plan: planDef,
        // ---- existing fields (backward-compat) ----
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
//
// 受け付ける body は 2 種類:
//   { planId: 'lite' | 'pro' | 'enterprise' }
//     → 新 path。country で provider を判定、provider.createCheckout() を呼ぶ。
//   { priceId: string }
//     → legacy path。frontend (PlanPage.tsx) が PRICE_IDS hard-coded を撤去
//        するまでの backward-compat。常に Stripe に流す。
//
// 両方 set されている場合は新 path (planId) を優先。
subscriptions.post('/checkout', async (c) => {
  try {
    const { userId, email } = c.get('user');
    const body = await c.req.json<{ planId?: string; priceId?: string }>();

    // ---- New path: planId → provider factory ----
    if (body.planId) {
      if (!isPlanLiteral(body.planId)) {
        return errorJson(c, 'validation.invalidPlan', 400);
      }
      const country = c.get('country');
      const provider = await getProviderForUser(c.env, userId, country);
      const origin = c.req.header('Origin') || 'https://code.fablab-westharima.jp';

      const result = await provider.createCheckout({
        userId,
        email,
        planId: body.planId,
        origin,
      });
      return c.json({ url: result.url });
    }

    // ---- Legacy path: priceId → direct Stripe call (unchanged) ----
    if (body.priceId) {
      return await legacyStripeCheckout(c, userId, email, body.priceId);
    }

    return errorJson(c, 'validation.priceIdRequired', 400);
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      console.error('Checkout provider error:', error.code, error.message, error.cause);
      return errorJson(c, providerErrorKey(error.code), 500);
    }
    console.error('Checkout session error:', error);
    return errorJson(c, 'subscription.checkoutFailed', 500);
  }
});

// ---------- POST /portal ----------
//
// 現 user の provider に応じた Customer Portal URL を返す。Provider 判定は
// factory に委譲、factory は active sub の provider 列を優先するので、
// stripe customer が portal を要求すれば stripe portal、polar なら polar
// portal がそれぞれ返る。
subscriptions.post('/portal', async (c) => {
  try {
    const { userId } = c.get('user');

    const sub = await c.env.DB.prepare(
      `SELECT provider, stripe_customer_id, polar_customer_id
       FROM subscriptions WHERE user_id = ?`,
    ).bind(userId).first<{
      provider: string | null;
      stripe_customer_id: string | null;
      polar_customer_id: string | null;
    }>();

    if (!sub) {
      return errorJson(c, 'subscription.noStripeCustomer', 400);
    }

    const country = c.get('country');
    const provider = await getProviderForUser(c.env, userId, country);

    const customerId =
      provider.id === 'stripe' ? sub.stripe_customer_id : sub.polar_customer_id;

    if (!customerId) {
      // Provider does not have a customer record yet — likely the user
      // hit /portal before completing any checkout. Surface the same
      // stable code clients used pre-refactor.
      return errorJson(c, 'subscription.noStripeCustomer', 400);
    }

    const origin = c.req.header('Origin') || 'https://code.fablab-westharima.jp';
    const result = await provider.createPortalSession({
      customerId,
      returnUrl: `${origin}/plan`,
    });
    return c.json({ url: result.url });
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      console.error('Portal provider error:', error.code, error.message, error.cause);
      return errorJson(c, providerErrorKey(error.code), 500);
    }
    console.error('Portal session error:', error);
    return errorJson(c, 'subscription.portalSessionFailed', 500);
  }
});

/**
 * Legacy `priceId` checkout — kept verbatim from the pre-Phase-3 inline
 * implementation. Calls Stripe SDK directly without going through the
 * Provider abstraction, because passing a Stripe `priceId` to Polar
 * makes no sense and the new `planId` path is the migration target.
 *
 * This block is dead-code-able once the frontend stops sending priceId
 * (planned for Phase 4 PlanPage.tsx refactor). Until then, deleting it
 * would break any cached frontend bundle.
 */
async function legacyStripeCheckout(
  c: RouteContext,
  userId: number,
  email: string,
  priceId: string,
): Promise<Response> {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });

  let customerId: string;
  const sub = await c.env.DB.prepare(
    'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?',
  ).bind(userId).first<{ stripe_customer_id: string | null }>();

  if (sub?.stripe_customer_id) {
    customerId = sub.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email,
      metadata: { digicode_user_id: String(userId) },
    });
    customerId = customer.id;

    await c.env.DB.prepare(`
      INSERT INTO subscriptions (user_id, status, plan_type, stripe_customer_id, provider)
      VALUES (?, 'free', 'free', ?, 'stripe')
      ON CONFLICT(user_id) DO UPDATE SET
        stripe_customer_id = excluded.stripe_customer_id,
        provider = COALESCE(subscriptions.provider, 'stripe'),
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
}

export default subscriptions;
