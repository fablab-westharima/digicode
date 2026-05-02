/**
 * コンパイル使用量管理API
 * コンパイル回数のカウントと取得
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { errorJson } from '../utils/errorJson';
import type { Bindings, Variables } from '../types/env';

const compileUsage = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 現在の月をYYYY-MM形式で取得
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * student の場合、コンパイル枠は管理者（enterprise class owner）から消費する。
 * student → class_members → classes.owner_id で管理者を特定。
 * 複数クラス所属の場合は最初に見つかったクラスの owner を使う。
 */
async function resolveCompileUserId(db: D1Database, userId: number): Promise<number> {
  const user = await db.prepare(
    'SELECT account_type FROM users WHERE id = ?'
  ).bind(userId).first<{ account_type: string | null }>();

  if (user?.account_type !== 'student') return userId;

  const owner = await db.prepare(
    `SELECT c.owner_id FROM class_members cm
     JOIN classes c ON cm.class_id = c.id
     WHERE cm.user_id = ? AND cm.role = 'student'
     LIMIT 1`
  ).bind(userId).first<{ owner_id: number }>();

  return owner?.owner_id ?? userId;
}

// コンパイル回数をインクリメント
compileUsage.post('/increment', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const currentMonth = getCurrentMonth();

    // student なら管理者の枠から消費
    const targetUserId = await resolveCompileUserId(c.env.DB, userId);

    // UPSERT: 存在すればインクリメント、なければ作成
    const result = await c.env.DB.prepare(`
      INSERT INTO compile_usage (user_id, month, count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, month) DO UPDATE SET
        count = count + 1,
        updated_at = datetime('now')
      RETURNING count
    `).bind(targetUserId, currentMonth).first<{ count: number }>();

    return c.json({
      success: true,
      month: currentMonth,
      count: result?.count || 1,
    });
  } catch (error) {
    console.error('Compile usage increment error:', error);
    return errorJson(c, 'compileUsage.recordFailed', 500);
  }
});

// 現在月のコンパイル使用量を取得
compileUsage.get('/', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const currentMonth = getCurrentMonth();

    // student なら管理者の枠を参照（管理者は enterprise → 無制限）
    const targetUserId = await resolveCompileUserId(c.env.DB, userId);

    // 使用量取得
    const usage = await c.env.DB.prepare(`
      SELECT count FROM compile_usage
      WHERE user_id = ? AND month = ?
    `).bind(targetUserId, currentMonth).first<{ count: number }>();

    // ユーザー情報とサブスクリプション情報を取得して制限を決定
    // 優先順: users.plan > subscriptions.plan_type > 'free'
    //
    // student の場合: targetUserId = 管理者 → enterprise → limit = -1（無制限）
    //
    // バグ修正記録: 2026-04-11
    // 詳細: prompt/maintenance/13_2026-04-11_プラン管理バグ修正と計画再編.md
    const user = await c.env.DB.prepare(`
      SELECT u.plan, s.plan_type
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = ?
    `).bind(targetUserId).first<{ plan: string | null; plan_type: string | null }>();

    // プランごとの制限
    const limits: Record<string, number> = {
      free: 50,         // 無料: 月50回
      lite: 250,        // Lite($5): 月250回
      pro: 500,         // Pro($10): 月500回 + ピンアサイン
      enterprise: -1,   // Enterprise($20): 無制限 + ピンアサイン + クラス機能
    };

    const planType = user?.plan || user?.plan_type || 'free';
    const limit = limits[planType] ?? limits.free;
    const count = usage?.count || 0;

    return c.json({
      month: currentMonth,
      count,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - count),
      planType,
      isOverLimit: limit !== -1 && count >= limit,
    });
  } catch (error) {
    console.error('Get compile usage error:', error);
    return errorJson(c, 'compileUsage.fetchFailed', 500);
  }
});

// 履歴取得（過去6ヶ月分）
compileUsage.get('/history', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    const history = await c.env.DB.prepare(`
      SELECT month, count, created_at, updated_at
      FROM compile_usage
      WHERE user_id = ?
      ORDER BY month DESC
      LIMIT 6
    `).bind(userId).all<{ month: string; count: number; created_at: string; updated_at: string }>();

    return c.json({
      history: history.results || [],
    });
  } catch (error) {
    console.error('Get compile usage history error:', error);
    return errorJson(c, 'submission.historyFailed', 500);
  }
});

export default compileUsage;
