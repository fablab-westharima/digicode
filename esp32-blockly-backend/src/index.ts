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
import publicFeatureFlags from './routes/public-feature-flags';
import { rateLimitPresets } from './middleware/rateLimit';
import { localeMiddleware } from './middleware/locale';
import { securityHeaders } from './middleware/securityHeaders';
import { auditCrossDbIntegrity } from './utils/auditCrossDb';
import type { Bindings } from './types/env';

// Re-exported for backwards-compatibility with any pre-consolidation
// import sites; new code should import from './types/env' directly.
export type { Bindings } from './types/env';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
// Default allowed origins (development + production)
//
// NEW-8 (Session 121 zero-base re-audit):
// 4 件の stale CF alias (`esp32-blockly-frontend.pages.dev` / `digicode.pages.dev`
// / `digicode.app` / `www.digicode.app`) を allowlist から除去。機械検証で:
//   - `esp32-blockly-frontend.pages.dev` → DNS NXDOMAIN (廃止)
//   - `digicode.pages.dev` → DNS NXDOMAIN (廃止)
//   - `digicode.app` → AWS-hosted GoDaddy ドメイン parking、DigiCode service 不在
//   - `www.digicode.app` → 同上 (CNAME → digicode.app)
// 現 canonical = `digicode-frontend.pages.dev` (Session 119 T12 で確定)
// + `code.fablab-westharima.jp` (CF custom domain)。
// rule 16 attacker-perspective-defense: surface 最小化、外部サービス経由 CSRF risk closure。
const defaultOrigins = [
  // Development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  // Production (Cloudflare Pages canonical, Session 119 T12)
  'https://digicode-frontend.pages.dev',
  // Custom domain (Cloudflare-managed)
  'https://code.fablab-westharima.jp',
];

app.use('*', cors({
  origin: (origin, c) => {
    // NEW-7 (Session 121 zero-base re-audit):
    // 旧コードは `if (!origin) return '*';` で origin 不在時に
    // `Access-Control-Allow-Origin: *` + `credentials: true` を組み合わせ返却していた。
    // browser context では CORS spec 違反で reject、non-browser (curl / mobile app) は
    // CORS 関係なく動作するため `*` 返却は無意義。defense-in-depth で reject に統一。
    if (!origin) return null;

    // Check default origins
    if (defaultOrigins.includes(origin)) return origin;

    // Check additional origins from environment variable
    const additionalOrigins = c.env.CORS_ORIGINS?.split(',').map((o: string) => o.trim()) || [];
    if (additionalOrigins.includes(origin)) return origin;

    // T12 (Session 119): Allow only DigiCode-owned Cloudflare Pages preview
    // deployments — the previous `origin.endsWith('.pages.dev')` was a
    // wildcard that accepted any third-party preview hosted on
    // pages.dev, opening a CSRF / cookie-piggyback surface (CORS allows
    // credentials:true). Tighten to the digicode-frontend project's
    // canonical hostname and its preview subdomains
    // (`<hash>.digicode-frontend.pages.dev`).
    if (origin === 'https://digicode-frontend.pages.dev') return origin;
    if (/^https:\/\/[a-z0-9-]+\.digicode-frontend\.pages\.dev$/.test(origin)) return origin;

    // Reject unknown origins
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-App-Version'],
  credentials: true,
}));

// i18n locale middleware: Accept-Language → c.set('locale', ...) — 全ルート前に適用
app.use('*', localeMiddleware);

// T13 (Session 119): security headers (nosniff / X-Frame-Options DENY / HSTS 1y /
// Referrer-Policy) を全 response に適用。CSP は API JSON only のため不要。
app.use('*', securityHeaders);

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
app.use('/api/health/*', rateLimitPresets.standard);
// /api/feature-flags は no-auth public endpoint (routes/public-feature-flags.ts)。
// 第119回 R3 fix: 旧コード `app.route('/api', admin)` で admin 全 endpoint が
// `/api/*` にも mount され brute-force surface を作っていた。本 fix で分離。
app.use('/api/feature-flags', rateLimitPresets.standard);
// F-19 fix: 管理者API + admin-feedback 両方カバー、admin route の brute-force defense
app.use('/api/admin/*', rateLimitPresets.standard);

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

// 管理者APIルート（authMiddleware + adminMiddleware で全 endpoint gate）
app.route('/api/admin', admin);

// Feature Flags 公開API（認証不要、routes/public-feature-flags.ts）
// 第119回 R3 fix: 旧コード `app.route('/api', admin)` を撤廃、independent mount で
// admin の他 endpoint (/users, /flags, /audit-cross-db) が `/api/*` 経由で rate-limit
// prefix を bypass する surface を閉鎖。
app.route('/api/feature-flags', publicFeatureFlags);

// Phase C: クラス機能ルート（enterprise プラン専用、ML30 へプロキシ）
app.route('/api/classes', classes);

// Phase C: 生徒用 submissions ルート（authMiddleware のみ、requirePlan なし）
app.route('/api/submissions', submissionsRoute);

// クラス機能サーバー (digicode-class-server on ML30) のヘルスチェック proxy。
// frontend は CORS の preflight 不可 (class-server 側に Access-Control-* なし) のため
// Workers 経由で polling、サーバーダウン時の UI 反映に使用 (rule 12 整合)。
// no-auth、5s timeout、応答は up/down に正規化。
app.get('/api/health/class-server', async (c) => {
  const target = `${c.env.CLASS_API_URL}/health`;
  try {
    const res = await fetch(target, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return c.json(
        { status: 'down', reason: 'non-200', httpStatus: res.status },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }
    const upstream = (await res.json().catch(() => null)) as unknown;
    return c.json({ status: 'up', upstream }, 200, { 'Cache-Control': 'no-store' });
  } catch (err) {
    const reason = err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'network';
    return c.json({ status: 'down', reason }, 200, { 'Cache-Control': 'no-store' });
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

    // 第103回 BUG-051 案 A: cross-DB integrity audit
    // ML30 にあって D1 に無い class_id (orphan) を検出、構造化ログ出力。
    // read-only、回収は手動 (DELETE /assignments/by-class/:orphan_id を curl で発行)
    try {
      const audit = await auditCrossDbIntegrity(env);
      if (!audit.healthy) {
        console.error(JSON.stringify({
          event: 'cross_db_audit_orphans',
          runId,
          ...audit,
        }));
      } else {
        console.log(`[scheduled ${runId}] cross-DB audit healthy: D1=${audit.d1Count} / ML30=${audit.ml30Count} / orphans=0`);
      }
    } catch (err) {
      console.error(`[scheduled ${runId}] cross-DB audit failed:`, err);
    }

    // F-30 (Session 123): 7 token / event table の expired row cleanup。
    // 旧コードは expired classes + canceling subscriptions のみ cleanup、token
    // 系は無制限蓄積で D1 row count が monotonic increase。Phase D B-5 finding。
    // 各 table で LIMIT 1000 safety、DRY RUN mode は skip。
    //
    // 対象:
    //   1. refresh_tokens: expired or revoked >30 days ago
    //   2. password_reset_tokens: expires_at < now
    //   3. recovery_tokens: expires_at < now
    //   4. email_verification_tokens: expires_at < now
    //   5. login_otp_codes: expires_at < now (10-min TTL でも row 残存)
    //   6. trusted_devices: expires_at < now (30 日 TTL)
    //   7. processed_webhooks (F-8 で追加): processed_at < 30 days ago
    //      (Stripe 3-day retry window 過ぎれば再到着不能)
    try {
      const cleanupResults: { table: string; deleted: number }[] = [];

      const expiredRefresh = await env.DB.prepare(
        `DELETE FROM refresh_tokens
         WHERE expires_at < datetime('now')
            OR (revoked_at IS NOT NULL AND revoked_at < datetime('now', '-30 days'))`
      ).run();
      cleanupResults.push({ table: 'refresh_tokens', deleted: expiredRefresh.meta.changes ?? 0 });

      const expiredReset = await env.DB.prepare(
        `DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')`
      ).run();
      cleanupResults.push({ table: 'password_reset_tokens', deleted: expiredReset.meta.changes ?? 0 });

      const expiredRecovery = await env.DB.prepare(
        `DELETE FROM recovery_tokens WHERE expires_at < datetime('now')`
      ).run();
      cleanupResults.push({ table: 'recovery_tokens', deleted: expiredRecovery.meta.changes ?? 0 });

      const expiredVerify = await env.DB.prepare(
        `DELETE FROM email_verification_tokens WHERE expires_at < datetime('now')`
      ).run();
      cleanupResults.push({ table: 'email_verification_tokens', deleted: expiredVerify.meta.changes ?? 0 });

      const expiredOtp = await env.DB.prepare(
        `DELETE FROM login_otp_codes WHERE expires_at < datetime('now')`
      ).run();
      cleanupResults.push({ table: 'login_otp_codes', deleted: expiredOtp.meta.changes ?? 0 });

      const expiredDevices = await env.DB.prepare(
        `DELETE FROM trusted_devices WHERE expires_at < datetime('now')`
      ).run();
      cleanupResults.push({ table: 'trusted_devices', deleted: expiredDevices.meta.changes ?? 0 });

      const expiredWebhooks = await env.DB.prepare(
        `DELETE FROM processed_webhooks WHERE processed_at < datetime('now', '-30 days')`
      ).run();
      cleanupResults.push({ table: 'processed_webhooks', deleted: expiredWebhooks.meta.changes ?? 0 });

      const totalDeleted = cleanupResults.reduce((sum, r) => sum + r.deleted, 0);
      console.log(JSON.stringify({
        event: 'token_cleanup',
        runId,
        totalDeleted,
        breakdown: cleanupResults,
      }));
    } catch (err) {
      console.error(`[scheduled ${runId}] token cleanup failed:`, err);
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
