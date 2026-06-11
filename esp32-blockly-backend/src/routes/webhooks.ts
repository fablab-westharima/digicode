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
import { Webhook, WebhookVerificationError } from 'standardwebhooks';
import type { Bindings } from '../types/env';
import { errorJson } from '../utils/errorJson';
import { normalizePolarEvent } from '../services/payment/polarEventNormalizer';
import { applyPolarEvent } from '../services/payment/applyEvent';
import { isPolarSuspended } from '../services/payment/index';
import { normalizeLemonSqueezyEvent } from '../services/payment/lemonSqueezyEventNormalizer';
import { applyLemonSqueezyEvent } from '../services/payment/applyLsEvent';
import { constantTimeEqual } from '../utils/crypto';

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

// ============================================================
// Polar webhook handler (plan 58 §6)
// ============================================================
//
// Polar.sh follows the Standard Webhooks spec, delivered as POST with
// three signature headers: `webhook-id`, `webhook-timestamp`,
// `webhook-signature`. Signature verification is delegated to the
// `standardwebhooks` npm package (MIT, Workers-compatible — see
// lib-adoption-protocol audit P3-1).
//
// Event semantics + state mapping live in
// `services/payment/polarEventNormalizer.ts`; D1 writes live in
// `services/payment/applyEvent.ts`. This handler is the thin transport
// layer: verify → idempotency → normalize → apply.

webhooks.post('/polar', async (c) => {
  // 0. Session 165 T2 — Polar dormant 化に伴う webhook 経路の構造遮断。
  //    背景: POLAR_WEBHOOK_SECRET は Polar dashboard ログイン不能 (S164 R3) のため
  //    自社側で rotate / 無効化できない = 漏洩時に署名検証ベースの防御が立て直せない。
  //    対策: checkout guard (subscriptions.ts の isPolarSuspended) と同型の flag 駆動で、
  //    署名検証より前に 503 で遮断。rotate 不能な secret に依存せず経路自体を塞ぐ。
  //    本番 Polar 契約者 0 ・新規 checkout も 503 ゆえ既存 lifecycle への実害なし。
  //    Polar 復権時は POLAR_CHECKOUT_SUSPENDED を外すだけで webhook も復帰。
  //    注: 連続非2xx で Polar が webhook endpoint を auto-disable する可能性は、本 file
  //    既存コメント (§4 idempotency) 由来の記述で、Polar 公式仕様としては本 session 未検証
  //    (推察)。仮に auto-disable されても「経路無効化」の望ましい方向ゆえ guard 設計は不変。
  if (isPolarSuspended(c.env)) {
    return errorJson(c, 'subscription.overseasSuspended', 503);
  }

  // 1. Read the raw body BEFORE the JSON parse — Standard Webhooks
  //    signs the bytes Polar sent, not the post-JSON-roundtrip shape.
  const body = await c.req.text();

  // 2. Pull the three required headers. The standardwebhooks Webhook
  //    class will reject on missing values, but checking up front lets
  //    us short-circuit cleanly without instantiating the verifier.
  const webhookId = c.req.header('webhook-id');
  const webhookTimestamp = c.req.header('webhook-timestamp');
  const webhookSignature = c.req.header('webhook-signature');
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.error('[webhook polar] missing standard-webhooks headers');
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  if (!c.env.POLAR_WEBHOOK_SECRET) {
    // Configuration error — surface clearly in logs but reject with
    // the same opaque code so a misconfigured environment is not
    // distinguishable to an attacker from a forged signature.
    console.error('[webhook polar] POLAR_WEBHOOK_SECRET is not set');
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  // 3. Verify the signature.
  //
  // Polar follows the Standard Webhooks spec's "secret must be base64-
  // encoded before passing to the verifier" gotcha (see Polar docs
  // §integrate/webhooks/delivery and `@polar-sh/sdk` validateEvent,
  // which does `Buffer.from(secret, 'utf-8').toString('base64')` before
  // instantiating standardwebhooks.Webhook). The value Polar puts on
  // the dashboard — and therefore the value we store in
  // POLAR_WEBHOOK_SECRET — is a raw ASCII string (typically
  // `whsec_<random>`), NOT a base64 payload. Passing it directly to
  // `new Webhook(secret)` makes standardwebhooks strip the `whsec_`
  // prefix and base64-decode the random tail, which:
  //   (a) usually fails outright because the tail contains chars
  //       outside the standard base64 alphabet (`A-Z a-z 0-9 + / =`),
  //   (b) and even when it happens to decode, yields different HMAC
  //       key bytes than Polar's SDK uses, so every signature fails.
  // Encoding the entire raw string with `btoa()` mirrors Polar's SDK
  // exactly: standardwebhooks sees no `whsec_` prefix, decodes the
  // base64 back to the original UTF-8 bytes of the raw secret, and
  // uses those bytes as the HMAC key — the same bytes Polar signs with.
  //
  // Two failure modes from `standardwebhooks` arrive as separate
  // exception types and we collapse both to HTTP 400 with the same
  // opaque error code:
  //
  //   - `new Webhook(secret)` ctor may throw a plain `Error` when the
  //     configured POLAR_WEBHOOK_SECRET cannot be base64-decoded (e.g.
  //     during a brief window where a placeholder value is set before
  //     the real webhook signing secret is provisioned, or any future
  //     misconfiguration). `btoa()` itself throws `DOMException` if
  //     the raw secret contains non-Latin-1 chars; this catch absorbs
  //     that path too. Returning 500 here would (a) be a server-
  //     fingerprint leak per rule 16 §attacker-perspective, and
  //     (b) count toward Polar's "10 consecutive failed deliveries →
  //     auto-disable" counter, so we treat the misconfig as a client-
  //     visible signature-invalid response.
  //   - `verifier.verify(...)` throws `WebhookVerificationError` for
  //     missing headers, bad timestamps, and signature mismatches.
  //
  // Both are logged server-side via `console.error`; the response body
  // is identical so an attacker can't distinguish the two from outside.
  let verifier: Webhook;
  try {
    const encodedSecret = btoa(c.env.POLAR_WEBHOOK_SECRET);
    verifier = new Webhook(encodedSecret);
  } catch (err) {
    console.error(
      '[webhook polar] webhook secret could not be initialized:',
      err instanceof Error ? err.message : err,
    );
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  let event: { type?: string; data?: unknown };
  try {
    const parsed = verifier.verify(body, {
      'webhook-id': webhookId,
      'webhook-timestamp': webhookTimestamp,
      'webhook-signature': webhookSignature,
    });
    event = parsed as { type?: string; data?: unknown };
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error('[webhook polar] signature verification failed:', err.message);
      return errorJson(c, 'webhook.signatureInvalid', 400);
    }
    // Anything else here would be an unexpected SDK regression (e.g.
    // verify() throwing a non-WebhookVerificationError). Bubble so the
    // test suite catches it; production rate-limits + the outer Hono
    // error boundary keep this from spinning into an endpoint disable.
    throw err;
  }

  const eventType = typeof event.type === 'string' ? event.type : '<unknown>';
  console.log(`[webhook polar] ${eventType} id=${webhookId}`);

  // 4. Idempotency — Polar retries up to 10× with exponential backoff
  //    and disables the endpoint after 10 consecutive failures, so a
  //    duplicate event id during retry is realistic. We reuse the
  //    existing processed_webhooks table (added in migration 0026 for
  //    Stripe); a globally unique webhook-id from Standard Webhooks +
  //    Stripe's evt_ id share the same column without collision.
  const insertResult = await c.env.DB
    .prepare('INSERT OR IGNORE INTO processed_webhooks (event_id, event_type) VALUES (?, ?)')
    .bind(webhookId, eventType)
    .run();

  if (insertResult.meta.changes === 0) {
    console.log(`[webhook polar] duplicate event ignored: ${eventType} id=${webhookId}`);
    return c.json({ received: true, duplicate: true });
  }

  // 5. Normalize + apply. Unhandled event types (most of Polar's 26)
  //    fall to `null` and we return 200 without writing — Polar must
  //    not retry on a handled-but-unmapped event.
  const normalized = normalizePolarEvent(eventType, event.data);
  if (!normalized) {
    console.log(`[webhook polar] unhandled event type: ${eventType}`);
    return c.json({ received: true });
  }

  const result = await applyPolarEvent(c.env, normalized);
  if (result.outcome === 'skipped') {
    console.warn(`[webhook polar] skipped: ${result.reason}`);
  }

  return c.json({ received: true });
});

// ---------- GET /polar/health ----------
webhooks.get('/polar/health', (c) => {
  return c.json({
    status: 'ok',
    webhookSecretConfigured: !!c.env.POLAR_WEBHOOK_SECRET,
    serverMode: c.env.POLAR_SERVER_MODE ?? 'sandbox',
    // Session 165 T2: webhook 経路が suspend guard で遮断されているか (POST /polar が 503)。
    // 監視が dormant 実態を反映できるよう health に明示。
    suspended: isPolarSuspended(c.env),
  });
});

// ============================================================
// LemonSqueezy webhook handler (plan 58 Phase ②)
// ============================================================
//
// LemonSqueezy signs the raw request body with HMAC-SHA256 (hex digest)
// keyed by the webhook secret, delivered in the `X-Signature` header. There
// is NO Standard-Webhooks envelope and NO unique delivery id header, so the
// standardwebhooks library used for Polar does not apply: verification uses
// Web Crypto (crypto.subtle HMAC) + the shared constant-time compare, and
// idempotency keys off SHA-256(rawBody) (LS resends the identical payload on
// retry).
//
// Event semantics + state mapping live in
// `services/payment/lemonSqueezyEventNormalizer.ts`; D1 writes live in
// `services/payment/applyLsEvent.ts`. This handler is the thin transport:
// verify → idempotency → normalize → apply.

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

webhooks.post('/lemonsqueezy', async (c) => {
  // 1. Raw body BEFORE JSON parse — LS signs the bytes it sent.
  const body = await c.req.text();
  const signature = c.req.header('X-Signature');

  if (!signature) {
    console.error('[webhook ls] missing X-Signature header');
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }
  if (!c.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    // Misconfig surfaced in logs, returned with the same opaque code so an
    // attacker cannot distinguish it from a forged signature (rule 16).
    console.error('[webhook ls] LEMONSQUEEZY_WEBHOOK_SECRET is not set');
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  // 2. Verify HMAC-SHA256(rawBody, secret) hex == X-Signature (constant-time).
  const enc = new TextEncoder();
  let valid = false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(c.env.LEMONSQUEEZY_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    valid = constantTimeEqual(bytesToHex(mac), signature.trim().toLowerCase());
  } catch (err) {
    console.error('[webhook ls] signature computation failed:', err instanceof Error ? err.message : err);
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }
  if (!valid) {
    console.error('[webhook ls] signature verification failed');
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  // 3. Parse only after the signature is verified.
  let payload: { meta?: unknown; data?: unknown };
  try {
    payload = JSON.parse(body) as { meta?: unknown; data?: unknown };
  } catch {
    console.error('[webhook ls] body is not valid JSON');
    return errorJson(c, 'webhook.signatureInvalid', 400);
  }

  const meta = payload.meta as { event_name?: string } | undefined;
  const eventName = typeof meta?.event_name === 'string' ? meta.event_name : '<unknown>';
  console.log(`[webhook ls] ${eventName}`);

  // 4. Idempotency — no native delivery id, so dedupe on SHA-256(rawBody).
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(body));
  const eventId = `ls_${bytesToHex(digest)}`;
  const insertResult = await c.env.DB
    .prepare('INSERT OR IGNORE INTO processed_webhooks (event_id, event_type) VALUES (?, ?)')
    .bind(eventId, eventName)
    .run();
  if (insertResult.meta.changes === 0) {
    console.log(`[webhook ls] duplicate event ignored: ${eventName}`);
    return c.json({ received: true, duplicate: true });
  }

  // 5. Normalize + apply. Unmapped events fall to null → 200 without writing.
  const normalized = normalizeLemonSqueezyEvent(payload.meta, payload.data);
  if (!normalized) {
    console.log(`[webhook ls] unhandled event type: ${eventName}`);
    return c.json({ received: true });
  }

  const result = await applyLemonSqueezyEvent(c.env, normalized);
  if (result.outcome === 'skipped') {
    console.warn(`[webhook ls] skipped: ${result.reason}`);
  }
  return c.json({ received: true });
});

// ---------- GET /lemonsqueezy/health ----------
webhooks.get('/lemonsqueezy/health', (c) => {
  return c.json({
    status: 'ok',
    webhookSecretConfigured: !!c.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    enabled: c.env.LEMONSQUEEZY_ENABLED === 'true',
    testMode: c.env.LEMONSQUEEZY_TEST_MODE === 'true',
  });
});

export default webhooks;
