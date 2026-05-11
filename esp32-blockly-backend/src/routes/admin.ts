/**
 * 管理者API + Feature Flags公開API
 * ユーザー管理、プラン変更、Feature Flags制御
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { errorJson } from '../utils/errorJson';
import { computeIsFreeNow } from '../utils/featureFlag';
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

    // 対象ユーザーの存在確認
    const targetUser = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(targetUserId).first<{ id: number; email: string }>();

    if (!targetUser) {
      return errorJson(c, 'auth.userNotFound', 404);
    }

    // 関連データ削除（auth.tsのアカウント削除ロジックと同じ順序）
    const tables = [
      'authenticators',
      'refresh_tokens',
      'password_reset_tokens',
      'email_verification_tokens',
      'recovery_tokens',
      'projects',
      'compile_usage',
      'subscriptions',
    ];

    for (const table of tables) {
      await c.env.DB.prepare(
        `DELETE FROM ${table} WHERE user_id = ?`
      ).bind(targetUserId).run();
    }

    // ユーザー本体を削除
    await c.env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(targetUserId).run();

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

// Feature Flag更新
admin.post('/flags/:key', authMiddleware, adminMiddleware, async (c) => {
  try {
    const key = c.req.param('key');
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

// ========================================
// 公開API（認証不要）
// ========================================

// Feature Flags取得（フロントエンド用）
admin.get('/feature-flags', async (c) => {
  try {
    const flags = await c.env.DB.prepare(
      'SELECT key, enabled, free_until, free_reason FROM feature_flags'
    ).all<{
      key: string;
      enabled: number;
      free_until: string | null;
      free_reason: string | null;
    }>();

    const now = new Date().toISOString();
    const result: Record<string, {
      enabled: boolean;
      freeUntil: string | null;
      freeReason: string | null;
      isFreeNow: boolean;
    }> = {};

    for (const f of flags.results) {
      // enabled=false → 全員に開放、enabled=true+期間内 → 無料開放中
      // (computeIsFreeNow と feedback.ts の isFlagFreeNow が同 formula、helper で single source 化)
      result[f.key] = {
        enabled: f.enabled === 1,
        freeUntil: f.free_until,
        freeReason: f.free_reason,
        isFreeNow: computeIsFreeNow({ enabled: f.enabled, free_until: f.free_until }, now),
      };
    }

    return c.json({ flags: result });
  } catch (error) {
    console.error('Get feature flags error:', error);
    return c.json({ flags: {} });
  }
});

export default admin;
