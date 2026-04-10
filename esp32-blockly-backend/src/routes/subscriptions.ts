/**
 * サブスクリプション管理API
 * プランの確認、変更、決済連携
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  SQUARE_ACCESS_TOKEN?: string;
  SQUARE_LOCATION_ID?: string;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
};

const subscriptions = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// プラン定義
const PLANS = {
  free: {
    id: 'free',
    name: '無料プラン',
    price: 0,
    compileLimit: 50,
    features: ['月50回コンパイル', '基本ブロック'],
  },
  lite: {
    id: 'lite',
    name: 'Liteプラン',
    price: 500, // 円
    compileLimit: 250,
    features: ['月250回コンパイル', '基本ブロック', 'プロジェクト保存無制限'],
  },
  pro: {
    id: 'pro',
    name: 'Proプラン',
    price: 1000,
    compileLimit: 500,
    features: ['月500回コンパイル', '全ブロック', 'ピンアサイン機能', '優先サポート'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterpriseプラン',
    price: 2000,
    compileLimit: -1, // 無制限
    features: ['無制限コンパイル', '全機能', 'ピンアサイン機能', '専用サポート'],
  },
};

// 利用可能なプラン一覧
subscriptions.get('/plans', (c) => {
  return c.json({ plans: Object.values(PLANS) });
});

// 現在のサブスクリプション状態を取得
subscriptions.get('/status', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    const subscription = await c.env.DB.prepare(`
      SELECT
        id, user_id, status, plan_type,
        square_subscription_id, square_customer_id,
        current_period_start, current_period_end,
        created_at, updated_at
      FROM subscriptions
      WHERE user_id = ?
    `).bind(userId).first<{
      id: number;
      user_id: number;
      status: string;
      plan_type: string;
      square_subscription_id: string | null;
      square_customer_id: string | null;
      current_period_start: string | null;
      current_period_end: string | null;
      created_at: string;
      updated_at: string;
    }>();

    if (!subscription) {
      // サブスクリプションがない場合は無料プランとして作成
      await c.env.DB.prepare(`
        INSERT INTO subscriptions (user_id, status, plan_type)
        VALUES (?, 'active', 'free')
      `).bind(userId).run();

      return c.json({
        subscription: {
          status: 'active',
          planType: 'free',
          plan: PLANS.free,
          currentPeriodStart: null,
          currentPeriodEnd: null,
        },
      });
    }

    const plan = PLANS[subscription.plan_type as keyof typeof PLANS] || PLANS.free;

    return c.json({
      subscription: {
        status: subscription.status,
        planType: subscription.plan_type,
        plan,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        squareSubscriptionId: subscription.square_subscription_id,
      },
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return c.json({ error: 'サブスクリプション情報の取得に失敗しました' }, 500);
  }
});

// プランアップグレードリクエスト（Square Checkout URLを生成）
subscriptions.post('/upgrade', authMiddleware, async (c) => {
  try {
    const { userId, email } = c.get('user');
    const { planId } = await c.req.json<{ planId: string }>();

    // プラン検証
    if (!planId || !(planId in PLANS) || planId === 'free') {
      return c.json({ error: '無効なプランが指定されました' }, 400);
    }

    const plan = PLANS[planId as keyof typeof PLANS];

    // Square Access Tokenがない場合はエラー
    if (!c.env.SQUARE_ACCESS_TOKEN) {
      return c.json({
        error: '決済システムが設定されていません',
        message: 'Square Access Tokenを設定してください',
      }, 503);
    }

    // 現在のサブスクリプション確認
    const currentSub = await c.env.DB.prepare(`
      SELECT plan_type FROM subscriptions WHERE user_id = ?
    `).bind(userId).first<{ plan_type: string }>();

    if (currentSub?.plan_type === planId) {
      return c.json({ error: '既に同じプランに加入しています' }, 400);
    }

    // TODO: Square Checkout API呼び出し
    // 現在はプレースホルダー応答
    return c.json({
      message: 'Square決済連携は準備中です',
      requestedPlan: plan,
      // checkoutUrl: 'https://square.link/...',
    });

  } catch (error) {
    console.error('Upgrade subscription error:', error);
    return c.json({ error: 'プランアップグレードの処理に失敗しました' }, 500);
  }
});

// プランダウングレード/キャンセル
subscriptions.post('/cancel', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // 現在のサブスクリプション確認
    const subscription = await c.env.DB.prepare(`
      SELECT id, plan_type, square_subscription_id
      FROM subscriptions WHERE user_id = ?
    `).bind(userId).first<{
      id: number;
      plan_type: string;
      square_subscription_id: string | null;
    }>();

    if (!subscription || subscription.plan_type === 'free') {
      return c.json({ error: '無料プランはキャンセルできません' }, 400);
    }

    // TODO: Square Subscription キャンセル API呼び出し

    // データベース更新（次回更新時に無料プランに戻る）
    await c.env.DB.prepare(`
      UPDATE subscriptions
      SET status = 'canceling', updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(userId).run();

    return c.json({
      message: 'サブスクリプションのキャンセルを受け付けました',
      note: '現在の請求期間終了後に無料プランに移行します',
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return c.json({ error: 'キャンセル処理に失敗しました' }, 500);
  }
});

// 管理者用：プランを直接変更（テスト用）
subscriptions.post('/admin/set-plan', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const { planId } = await c.req.json<{ planId: string }>();

    // TODO: 管理者権限チェックを追加

    if (!planId || !(planId in PLANS)) {
      return c.json({ error: '無効なプランが指定されました' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE subscriptions
      SET plan_type = ?, status = 'active', updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(planId, userId).run();

    return c.json({
      success: true,
      message: `プランを${PLANS[planId as keyof typeof PLANS].name}に変更しました`,
    });

  } catch (error) {
    console.error('Admin set plan error:', error);
    return c.json({ error: 'プラン変更に失敗しました' }, 500);
  }
});

export default subscriptions;
