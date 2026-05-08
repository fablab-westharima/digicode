/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import passkey from './routes/passkey';
import recoveryCodes from './routes/recovery-codes';
import twoFactor from './routes/2fa';
import projects from './routes/projects';
import compileUsage from './routes/compile-usage';
import subscriptions from './routes/subscriptions';
import webhooks from './routes/webhooks';
import admin from './routes/admin';
import adminFeedback from './routes/admin-feedback';
import feedback from './routes/feedback';
import classes, { deleteClassCascade } from './routes/classes';
import submissionsRoute from './routes/submissions';
import { rateLimitPresets } from './middleware/rateLimit';
import { localeMiddleware } from './middleware/locale';
import type { Bindings } from './types/env';

// Re-exported for backwards-compatibility with any pre-consolidation
// import sites; new code should import from './types/env' directly.
export type { Bindings } from './types/env';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
// Default allowed origins (development + production)
const defaultOrigins = [
  // Development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  // Production (Cloudflare Pages)
  'https://esp32-blockly-frontend.pages.dev',
  'https://digicode.pages.dev',
  // Custom domain (if configured)
  'https://digicode.app',
  'https://www.digicode.app',
  'https://code.fablab-westharima.jp',
];

app.use('*', cors({
  origin: (origin, c) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return '*';

    // Check default origins
    if (defaultOrigins.includes(origin)) return origin;

    // Check additional origins from environment variable
    const additionalOrigins = c.env.CORS_ORIGINS?.split(',').map((o: string) => o.trim()) || [];
    if (additionalOrigins.includes(origin)) return origin;

    // Allow Cloudflare Pages preview deployments
    if (origin.endsWith('.pages.dev')) return origin;

    // Reject unknown origins
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-App-Version'],
  credentials: true,
}));

// i18n locale middleware: Accept-Language → c.set('locale', ...) — 全ルート前に適用
app.use('*', localeMiddleware);

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ルート
app.get('/', (c) => {
  return c.json({ message: 'DigiCode API' });
});

// レート制限を適用
// 認証エンドポイント（厳しめ: 10リクエスト/分）
app.use('/api/auth/*', rateLimitPresets.auth);

// コンパイル使用量（中程度: 30リクエスト/分）
app.use('/api/compile-usage/*', rateLimitPresets.compile);

// その他のAPIエンドポイント（標準: 100リクエスト/分）
app.use('/api/projects/*', rateLimitPresets.standard);
app.use('/api/subscriptions/*', rateLimitPresets.standard);
app.use('/api/classes/*', rateLimitPresets.standard);
app.use('/api/submissions/*', rateLimitPresets.standard);
app.use('/api/feedback/*', rateLimitPresets.standard);

// Webhook（制限緩め: 1000リクエスト/分）
app.use('/api/webhooks/*', rateLimitPresets.webhook);

// 認証ルート
app.route('/api/auth', auth);

// パスキールート
app.route('/api/auth/passkey', passkey);

// リカバリーコードルート
app.route('/api/auth/recovery-codes', recoveryCodes);

// 2段階認証ルート
app.route('/api/auth/2fa', twoFactor);

// プロジェクトルート
app.route('/api/projects', projects);

// コンパイル使用量ルート
app.route('/api/compile-usage', compileUsage);

// サブスクリプションルート
app.route('/api/subscriptions', subscriptions);

// Webhookルート（Stripe決済連携）
app.route('/api/webhooks', webhooks);

// 41.md Phase 1: 要望フォームルート (POST /api/feedback)
app.route('/api/feedback', feedback);

// 41.md Phase 1: 管理者向け要望ルート — `/api/admin` より前に登録 (Hono 登録順マッチ)
app.route('/api/admin/feedback', adminFeedback);

// 管理者APIルート（Admin + Feature Flags公開API）
app.route('/api/admin', admin);
app.route('/api', admin); // GET /api/feature-flags（認証不要）

// Phase C: クラス機能ルート（enterprise プラン専用、ML30 へプロキシ）
app.route('/api/classes', classes);

// Phase C: 生徒用 submissions ルート（authMiddleware のみ、requirePlan なし）
app.route('/api/submissions', submissionsRoute);

// KVテストエンドポイント（Phase 1.6.2検証用、本番前に削除）
app.get('/api/test/kv', async (c) => {
  try {
    const testKey = 'test-key';
    const testValue = 'test-value-' + Date.now();

    // KVに書き込み
    await c.env.WEBAUTHN_CHALLENGES.put(testKey, testValue, { expirationTtl: 60 });

    // KVから読み込み
    const retrievedValue = await c.env.WEBAUTHN_CHALLENGES.get(testKey);

    // KVから削除
    await c.env.WEBAUTHN_CHALLENGES.delete(testKey);

    return c.json({
      success: true,
      message: 'KV access test successful',
      written: testValue,
      retrieved: retrievedValue,
      match: testValue === retrievedValue
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================
// Step 8: Cloudflare Workers Cron Trigger
// ============================================================
// wrangler.jsonc の triggers.crons で設定されたスケジュールに従って呼ばれる。
// 期限切れクラスを検出して、ML30 → D1 の順でカスケード削除する。
//
// 安全装置:
// - LIMIT 100 で大量誤削除を防止
// - SCHEDULED_DRY_RUN='true' で実削除せずログのみ（初回本番検証用）
// - 1 件の失敗で全体を止めず、エラーログのみ出して続行

async function handleScheduled(
  _controller: ScheduledController,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  const runId = crypto.randomUUID();
  console.log(`[scheduled ${runId}] triggered at ${new Date().toISOString()}`);

  const dryRun = env.SCHEDULED_DRY_RUN === 'true';
  if (dryRun) {
    console.log(`[scheduled ${runId}] DRY RUN mode (SCHEDULED_DRY_RUN=true)`);
  }

  try {
    // 期限切れクラスを列挙（LIMIT 100 で大量誤削除防止）
    const expired = await env.DB.prepare(
      `SELECT id, name, owner_id, expires_at
       FROM classes
       WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
       LIMIT 100`
    ).all<{ id: number; name: string; owner_id: number; expires_at: string }>();

    const count = expired.results?.length ?? 0;
    console.log(`[scheduled ${runId}] found ${count} expired classes`);

    if (count === 0) {
      console.log(`[scheduled ${runId}] nothing to do, exiting`);
      return;
    }

    if (dryRun) {
      for (const cls of expired.results ?? []) {
        console.log(
          `[scheduled ${runId}] [DRY RUN] would delete: class#${cls.id} "${cls.name}" (owner ${cls.owner_id}, expired ${cls.expires_at})`
        );
      }
      console.log(`[scheduled ${runId}] DRY RUN completed, no actual deletion`);
      return;
    }

    // 本番モード: 実際に削除
    let successCount = 0;
    let failCount = 0;
    for (const cls of expired.results ?? []) {
      try {
        const result = await deleteClassCascade(env, cls.id);
        if (result.ok) {
          successCount++;
          console.log(
            `[scheduled ${runId}] deleted class#${cls.id} "${cls.name}"`
          );
        } else {
          failCount++;
          console.error(
            `[scheduled ${runId}] failed to delete class#${cls.id}: ${result.error}`
          );
        }
      } catch (err) {
        failCount++;
        console.error(
          `[scheduled ${runId}] exception deleting class#${cls.id}:`,
          err
        );
        // 続行（一件の失敗で全体を止めない）
      }
    }

    console.log(
      `[scheduled ${runId}] expired classes: ${successCount} succeeded, ${failCount} failed of ${count} total`
    );

    // ---- C-2: enterprise 解約猶予の期限切れ処理 ----
    // Webhook で status='canceling', expires_at=1ヶ月後 に設定されたレコードを処理
    const cancelingUsers = await env.DB.prepare(
      `SELECT s.user_id, u.plan
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'canceling'
         AND s.expires_at IS NOT NULL
         AND s.expires_at < datetime('now')
       LIMIT 50`
    ).all<{ user_id: number; plan: string }>();

    const cancelCount = cancelingUsers.results?.length ?? 0;
    if (cancelCount > 0) {
      console.log(`[scheduled ${runId}] found ${cancelCount} canceling subscriptions past grace period`);

      for (const row of cancelingUsers.results ?? []) {
        try {
          // 該当ユーザーの全クラスを削除
          const userClasses = await env.DB.prepare(
            `SELECT id FROM classes WHERE owner_id = ?`
          ).bind(row.user_id).all<{ id: number }>();

          for (const cls of userClasses.results ?? []) {
            const delResult = await deleteClassCascade(env, cls.id);
            if (!delResult.ok) {
              console.error(`[scheduled ${runId}] C-2: failed to delete class#${cls.id} for user#${row.user_id}: ${delResult.error}`);
            }
          }

          // subscriptions を free に戻す
          await env.DB.prepare(`
            UPDATE subscriptions
            SET plan_type = 'free', status = 'canceled',
                stripe_subscription_id = NULL, stripe_price_id = NULL,
                expires_at = NULL, updated_at = datetime('now')
            WHERE user_id = ?
          `).bind(row.user_id).run();

          // users.plan も free に戻す
          await env.DB.prepare(`
            UPDATE users SET plan = 'free', plan_source = 'grace_expired', updated_at = datetime('now')
            WHERE id = ?
          `).bind(row.user_id).run();

          console.log(`[scheduled ${runId}] C-2: user#${row.user_id} grace expired → free, ${userClasses.results?.length ?? 0} classes deleted`);
        } catch (err) {
          console.error(`[scheduled ${runId}] C-2: exception for user#${row.user_id}:`, err);
        }
      }
    }

  } catch (err) {
    console.error(`[scheduled ${runId}] fatal error:`, err);
    // fatal error でも throw しない（次回実行は独立して継続）
  }
}

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<Bindings>;
