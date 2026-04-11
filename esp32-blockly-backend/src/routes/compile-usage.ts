/**
 * コンパイル使用量管理API
 * コンパイル回数のカウントと取得
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
};

const compileUsage = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 現在の月をYYYY-MM形式で取得
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// コンパイル回数をインクリメント
compileUsage.post('/increment', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const currentMonth = getCurrentMonth();

    // UPSERT: 存在すればインクリメント、なければ作成
    const result = await c.env.DB.prepare(`
      INSERT INTO compile_usage (user_id, month, count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, month) DO UPDATE SET
        count = count + 1,
        updated_at = datetime('now')
      RETURNING count
    `).bind(userId, currentMonth).first<{ count: number }>();

    return c.json({
      success: true,
      month: currentMonth,
      count: result?.count || 1,
    });
  } catch (error) {
    console.error('Compile usage increment error:', error);
    return c.json({ error: 'コンパイル回数の記録に失敗しました' }, 500);
  }
});

// 現在月のコンパイル使用量を取得
compileUsage.get('/', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const currentMonth = getCurrentMonth();

    // 使用量取得
    const usage = await c.env.DB.prepare(`
      SELECT count FROM compile_usage
      WHERE user_id = ? AND month = ?
    `).bind(userId, currentMonth).first<{ count: number }>();

    // ユーザー情報とサブスクリプション情報を取得して制限を決定
    // 優先順: users.plan > subscriptions.plan_type > 'free'
    // （auth.ts L284-314 と同じロジック）
    //
    // 背景:
    // - users.plan: Admin画面で手動付与されたプラン (migration 0014)
    // - subscriptions.plan_type: Square/Stripe決済連携用 (migration 0001)
    // - 2つのテーブルに分かれているが、users.plan を優先する
    //   （現状、決済連携は未実装で admin 付与が主なため）
    //
    // バグ修正記録: 2026-04-11
    // 修正前は subscriptions.plan_type のみを見ていたため、
    // Admin画面で付与された lite/enterprise プランが反映されず、
    // 全てのユーザーが free 扱いされていた。
    // 詳細: prompt/maintenance/13_2026-04-11_プラン管理バグ修正と計画再編.md
    const user = await c.env.DB.prepare(`
      SELECT u.plan, s.plan_type
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = ?
    `).bind(userId).first<{ plan: string | null; plan_type: string | null }>();

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
    return c.json({ error: 'コンパイル使用量の取得に失敗しました' }, 500);
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
    return c.json({ error: '履歴の取得に失敗しました' }, 500);
  }
});

export default compileUsage;
