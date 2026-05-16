/**
 * 管理者API + Feature Flags公開API
 * ユーザー管理、プラン変更、Feature Flags制御
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { errorJson } from '../utils/errorJson';
import { auditCrossDbIntegrity } from '../utils/auditCrossDb';
import { deleteClassCascade } from './classes';
import { deleteUserCascade } from '../utils/userCascade';
import type { Bindings, Variables } from '../types/env';

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ========================================
// 管理者API（authMiddleware + adminMiddleware）
// ========================================

// ユーザー一覧
admin.get('/users', authMiddleware, adminMiddleware, async (c) => {
  try {
    const search = c.req.query('search') || '';
    const planFilter = c.req.query('plan') || '';
    const inactiveDays = parseInt(c.req.query('inactive_days') || '0', 10);
    const sort = c.req.query('sort') || 'created_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    // ソートカラムのホワイトリスト
    const allowedSorts = ['created_at', 'last_login_at', 'email', 'plan'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (search) {
      whereClause += ' AND email LIKE ?';
      params.push(`%${search}%`);
    }

    if (planFilter) {
      whereClause += ' AND plan = ?';
      params.push(planFilter);
    }

    if (inactiveDays > 0) {
      whereClause += ' AND (last_login_at IS NULL OR last_login_at < datetime(\'now\', ?))';
      params.push(`-${inactiveDays} days`);
    }

    // ユーザー一覧取得
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`
    ).bind(...params).first<{ total: number }>();

    const users = await c.env.DB.prepare(
      `SELECT id, email, is_admin, plan, plan_source, plan_note, last_login_at, created_at
       FROM users WHERE ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all<{
      id: number;
      email: string;
      is_admin: number;
      plan: string;
      plan_source: string | null;
      plan_note: string | null;
      last_login_at: string | null;
      created_at: string;
    }>();

    return c.json({
      users: users.results.map((u) => ({
        id: u.id,
        email: u.email,
        isAdmin: u.is_admin === 1,
        plan: u.plan || 'free',
        planSource: u.plan_source,
        planNote: u.plan_note,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
      total: countResult?.total || 0,
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    return errorJson(c, 'admin.userListFailed', 500);
  }
});

// ユーザーのプラン変更
admin.post('/users/:id/plan', authMiddleware, adminMiddleware, async (c) => {
  try {
    const targetUserId = parseInt(c.req.param('id'), 10);
    const { plan, source, note } = await c.req.json<{
      plan: string;
      source?: string;
      note?: string;
    }>();

    const validPlans = ['free', 'lite', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return errorJson(c, 'validation.invalidPlan', 400);
    }

    // 対象ユーザーの存在確認
    const targetUser = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(targetUserId).first<{ id: number; email: string }>();

    if (!targetUser) {
      return errorJson(c, 'auth.userNotFound', 404);
    }

    await c.env.DB.prepare(
      `UPDATE users SET plan = ?, plan_source = ?, plan_note = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(plan, source || 'admin_granted', note || null, targetUserId).run();

    return c.json({
      success: true,
      message: `${targetUser.email} のプランを ${plan} に変更しました`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        plan,
        planSource: source || 'admin_granted',
        planNote: note || null,
      },
    });
  } catch (error) {
    console.error('Admin set plan error:', error);
    return errorJson(c, 'admin.planChangeFailed', 500);
  }
});

// ユーザー削除
admin.delete('/users/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { userId: adminUserId } = c.get('user');
    const targetUserId = parseInt(c.req.param('id'), 10);

    // 管理者自身は削除不可
    if (adminUserId === targetUserId) {
      return errorJson(c, 'admin.cannotDeleteSelf', 400);
    }

    // 対象ユーザーの存在確認 + admin チェーン削除防止 (Session 131 A-2 hardening)。
    // 旧コードは self-delete のみ block していたが、他 admin の削除を許していた
    // = 1 admin account 乗っ取りで全 admin chain 削除可能だった。
    // is_admin = 1 の target を 403 reject で構造的閉鎖、緊急時は D1 直接操作で
    // 復旧 path 維持。詳細は plans/active/admin-security-audit-and-hardening.md
    // §6.1 R-1 + §9.1 A-2 参照。
    const targetUser = await c.env.DB.prepare(
      'SELECT id, email, is_admin FROM users WHERE id = ?'
    ).bind(targetUserId).first<{ id: number; email: string; is_admin: number }>();

    if (!targetUser) {
      return errorJson(c, 'auth.userNotFound', 404);
    }

    if (targetUser.is_admin === 1) {
      return errorJson(c, 'admin.cannotDeleteAdmin', 403);
    }

    // F-21 fix: owner クラスを deleteClassCascade で削除 (ML30 assignments/submissions + D1 classes + 孤児 student)
    // adminUserId を audit trail に伝播 = 誰が削除を実行したか ML30 ログで追跡可能
    const ownerClasses = await c.env.DB.prepare(
      'SELECT id FROM classes WHERE owner_id = ?'
    ).bind(targetUserId).all<{ id: number }>();
    for (const cls of ownerClasses.results ?? []) {
      const result = await deleteClassCascade(c.env, cls.id, adminUserId);
      if (!result.ok) {
        console.error(JSON.stringify({
          event: 'cross_db_orphan_on_admin_user_delete',
          admin_user_id: adminUserId,
          target_user_id: targetUserId,
          class_id: cls.id,
          error: result.error,
        }));
        // 削除続行: ML30 失敗で全 abort しない、orphan は cross-DB audit cron で回収
      }
    }

    // T7 (Session 119): 14 dependent tables + users 行を deleteUserCascade に委譲。
    // 旧コードは auth.ts / admin.ts / classes.ts 3 callsite で同じテーブルリストを
    // コピペしていたが、classes.ts の student-cleanup path だけ 14 tables 欠落 →
    // utils/userCascade.ts に集約して single source of truth 化。
    await deleteUserCascade(c.env, targetUserId);

    return c.json({
      success: true,
      message: `${targetUser.email} を削除しました`,
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return errorJson(c, 'admin.userDeleteFailed', 500);
  }
});

// Feature Flags一覧（管理者用 - 全情報）
admin.get('/flags', authMiddleware, adminMiddleware, async (c) => {
  try {
    const flags = await c.env.DB.prepare(
      'SELECT key, enabled, free_until, free_reason, updated_at FROM feature_flags'
    ).all<{
      key: string;
      enabled: number;
      free_until: string | null;
      free_reason: string | null;
      updated_at: string;
    }>();

    return c.json({
      flags: flags.results.map((f) => ({
        key: f.key,
        enabled: f.enabled === 1,
        freeUntil: f.free_until,
        freeReason: f.free_reason,
        updatedAt: f.updated_at,
      })),
    });
  } catch (error) {
    console.error('Admin get flags error:', error);
    return errorJson(c, 'feature.fetchFailed', 500);
  }
});

// Session 131 A-3 hardening: Feature Flag key whitelist。
// 旧コードは任意 key の UPSERT を許していた = admin 認証奪取後の post-exploit で
// arbitrary flag namespace pollution 可能だった。現状 featureFlagStore は
// `pin_assign_pro` 1 key のみ参照する設計のため、whitelist を導入して未知 key の
// 新規作成を構造的に閉鎖する。新 flag 追加時はここの配列に追記する認知運用。
// 詳細は plans/active/admin-security-audit-and-hardening.md §6.2 R-2 + §9.1 A-3 参照。
const ALLOWED_FLAG_KEYS = ['pin_assign_pro'] as const;
type AllowedFlagKey = (typeof ALLOWED_FLAG_KEYS)[number];

function isAllowedFlagKey(key: string): key is AllowedFlagKey {
  return (ALLOWED_FLAG_KEYS as readonly string[]).includes(key);
}

// Feature Flag更新
admin.post('/flags/:key', authMiddleware, adminMiddleware, async (c) => {
  try {
    const key = c.req.param('key');
    if (!isAllowedFlagKey(key)) {
      return errorJson(c, 'admin.unknownFlagKey', 400);
    }
    const { enabled, free_until, free_reason } = await c.req.json<{
      enabled?: boolean;
      free_until?: string | null;
      free_reason?: string | null;
    }>();

    // 既存フラグの確認
    const existing = await c.env.DB.prepare(
      'SELECT key FROM feature_flags WHERE key = ?'
    ).bind(key).first();

    if (existing) {
      // 更新
      await c.env.DB.prepare(
        `UPDATE feature_flags
         SET enabled = ?, free_until = ?, free_reason = ?, updated_at = datetime('now')
         WHERE key = ?`
      ).bind(
        enabled !== undefined ? (enabled ? 1 : 0) : 1,
        free_until !== undefined ? free_until : null,
        free_reason !== undefined ? free_reason : null,
        key
      ).run();
    } else {
      // 新規作成
      await c.env.DB.prepare(
        `INSERT INTO feature_flags (key, enabled, free_until, free_reason)
         VALUES (?, ?, ?, ?)`
      ).bind(
        key,
        enabled !== undefined ? (enabled ? 1 : 0) : 1,
        free_until || null,
        free_reason || null
      ).run();
    }

    return c.json({
      success: true,
      message: `Feature Flag "${key}" を更新しました`,
    });
  } catch (error) {
    console.error('Admin update flag error:', error);
    return errorJson(c, 'feature.updateFailed', 500);
  }
});

// R3 (Session 119 zero-base re-audit):
// 旧コードは admin.ts に /feature-flags handler を含み、index.ts で
// `app.route('/api', admin)` 経由で公開していた。これは admin の他 endpoint
// (/users, /flags, /audit-cross-db) を全て `/api/*` 配下にも mount する
// side effect があり、`/api/admin/*` rate-limit prefix から漏れる brute-force
// surface を作っていた。本 commit で feature-flags は routes/public-feature-flags.ts
// に分離、index.ts では `app.route('/api/feature-flags', publicFeatureFlags)`
// で独立 mount するため admin の二重 mount を撤廃。

// ========================================
// 第103回 BUG-051: cross-DB integrity audit (manual admin trigger)
// 日次 cron が `handleScheduled` で同 logic を自動実行、本 endpoint は admin 手動 verify 用
// ========================================
admin.get('/audit-cross-db', authMiddleware, adminMiddleware, async (c) => {
  try {
    const report = await auditCrossDbIntegrity(c.env);
    return c.json(report);
  } catch (error) {
    console.error('Cross-DB audit error:', error);
    return errorJson(c, 'common.serverConfigError', 500);
  }
});

export default admin;
