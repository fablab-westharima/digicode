/**
 * Webhook処理API
 * Square決済からの通知を処理
 */
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  SQUARE_WEBHOOK_SIGNATURE_KEY?: string;
};

const webhooks = new Hono<{ Bindings: Bindings }>();

// Square Webhook署名検証
async function verifySquareSignature(
  body: string,
  signature: string | null,
  signatureKey: string | undefined
): Promise<boolean> {
  if (!signature || !signatureKey) {
    console.warn('Missing signature or signature key');
    return false;
  }

  try {
    // Square uses HMAC-SHA256 for webhook signatures
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signatureKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Square Webhook エンドポイント
webhooks.post('/square', async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('x-square-hmacsha256-signature');

    // 署名検証（本番環境では必須）
    if (c.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
      const isValid = await verifySquareSignature(
        body,
        signature,
        c.env.SQUARE_WEBHOOK_SIGNATURE_KEY
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        return c.json({ error: 'Invalid signature' }, 401);
      }
    }

    const event = JSON.parse(body);
    console.log('Received Square webhook:', event.type);

    // イベントタイプに応じた処理
    switch (event.type) {
      case 'subscription.created':
        await handleSubscriptionCreated(c.env.DB, event.data.object);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(c.env.DB, event.data.object);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(c.env.DB, event.data.object);
        break;

      case 'invoice.payment_made':
        await handlePaymentMade(c.env.DB, event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(c.env.DB, event.data.object);
        break;

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return c.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// サブスクリプション作成ハンドラ
async function handleSubscriptionCreated(db: D1Database, subscription: any) {
  console.log('Processing subscription.created:', subscription.id);

  const customerId = subscription.customer_id;
  const subscriptionId = subscription.id;
  const planVariationId = subscription.plan_variation_id;

  // プランIDをplan_typeにマッピング（Square Catalog IDに応じて調整）
  const planType = mapPlanVariationToPlanType(planVariationId);

  // 顧客IDでユーザーを検索
  const user = await db.prepare(`
    SELECT user_id FROM subscriptions WHERE square_customer_id = ?
  `).bind(customerId).first<{ user_id: number }>();

  if (user) {
    await db.prepare(`
      UPDATE subscriptions
      SET
        square_subscription_id = ?,
        plan_type = ?,
        status = 'active',
        current_period_start = datetime('now'),
        updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(subscriptionId, planType, user.user_id).run();

    console.log(`Updated subscription for user ${user.user_id} to ${planType}`);
  }
}

// サブスクリプション更新ハンドラ
async function handleSubscriptionUpdated(db: D1Database, subscription: any) {
  console.log('Processing subscription.updated:', subscription.id);

  const subscriptionId = subscription.id;
  const status = subscription.status?.toLowerCase();
  const planVariationId = subscription.plan_variation_id;
  const planType = mapPlanVariationToPlanType(planVariationId);

  await db.prepare(`
    UPDATE subscriptions
    SET
      plan_type = ?,
      status = ?,
      updated_at = datetime('now')
    WHERE square_subscription_id = ?
  `).bind(planType, status, subscriptionId).run();
}

// サブスクリプションキャンセルハンドラ
async function handleSubscriptionCanceled(db: D1Database, subscription: any) {
  console.log('Processing subscription.canceled:', subscription.id);

  const subscriptionId = subscription.id;

  await db.prepare(`
    UPDATE subscriptions
    SET
      plan_type = 'free',
      status = 'canceled',
      square_subscription_id = NULL,
      updated_at = datetime('now')
    WHERE square_subscription_id = ?
  `).bind(subscriptionId).run();
}

// 支払い完了ハンドラ
async function handlePaymentMade(db: D1Database, invoice: any) {
  console.log('Processing invoice.payment_made:', invoice.id);
  // 支払い成功のログを記録（必要に応じて）
}

// 支払い失敗ハンドラ
async function handlePaymentFailed(db: D1Database, invoice: any) {
  console.log('Processing invoice.payment_failed:', invoice.id);

  const subscriptionId = invoice.subscription_id;

  if (subscriptionId) {
    await db.prepare(`
      UPDATE subscriptions
      SET
        status = 'past_due',
        updated_at = datetime('now')
      WHERE square_subscription_id = ?
    `).bind(subscriptionId).run();
  }
}

// Square Plan Variation IDをplan_typeにマッピング
function mapPlanVariationToPlanType(planVariationId: string): string {
  // TODO: 実際のSquare Catalog IDに応じてマッピングを設定
  const mapping: Record<string, string> = {
    // 'SQUARE_PLAN_VARIATION_ID_LITE': 'lite',
    // 'SQUARE_PLAN_VARIATION_ID_PRO': 'pro',
    // 'SQUARE_PLAN_VARIATION_ID_ENTERPRISE': 'enterprise',
  };

  return mapping[planVariationId] || 'lite';
}

// ヘルスチェック（Webhook設定確認用）
webhooks.get('/square/health', (c) => {
  return c.json({
    status: 'ok',
    signatureKeyConfigured: !!c.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  });
});

export default webhooks;
