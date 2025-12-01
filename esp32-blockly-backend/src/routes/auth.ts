import { Hono } from 'hono';
import { generateToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
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

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// メールアドレスバリデーション
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ユーザー登録
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return c.json({ error: 'メールアドレスとパスワードは必須です' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ error: '有効なメールアドレスを入力してください' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'パスワードは8文字以上である必要があります' }, 400);
    }

    // メールアドレス重複チェック
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      return c.json({ error: 'このメールアドレスは既に登録されています' }, 409);
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザー作成
    const userResult = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at'
    ).bind(email, passwordHash).first<{ id: number; email: string; created_at: string }>();

    if (!userResult) {
      return c.json({ error: 'ユーザー作成に失敗しました' }, 500);
    }

    // サブスクリプション作成（無料プラン）
    await c.env.DB.prepare(
      'INSERT INTO subscriptions (user_id, status, plan_type) VALUES (?, ?, ?)'
    ).bind(userResult.id, 'free', 'free').run();

    // JWTトークン発行
    const token = await generateToken(
      { userId: userResult.id, email: userResult.email },
      c.env.JWT_SECRET
    );

    return c.json({
      token,
      user: {
        id: userResult.id,
        email: userResult.email,
      },
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: '登録処理中にエラーが発生しました' }, 500);
  }
});

// ログイン
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return c.json({ error: 'メールアドレスとパスワードは必須です' }, 400);
    }

    // ユーザー検索
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string; password_hash: string }>();

    if (!user) {
      return c.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }

    // パスワード検証
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return c.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }

    // JWTトークン発行
    const token = await generateToken(
      { userId: user.id, email: user.email },
      c.env.JWT_SECRET
    );

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'ログイン処理中にエラーが発生しました' }, 500);
  }
});

// 認証ユーザー情報取得
auth.get('/me', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // ユーザー情報とサブスクリプション情報を取得
    const user = await c.env.DB.prepare(`
      SELECT
        u.id, u.email, u.created_at,
        s.status as subscription_status, s.plan_type
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = ?
    `).bind(userId).first<{
      id: number;
      email: string;
      created_at: string;
      subscription_status: string;
      plan_type: string;
    }>();

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        subscription: {
          status: user.subscription_status || 'free',
          planType: user.plan_type || 'free',
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return c.json({ error: 'ユーザー情報の取得に失敗しました' }, 500);
  }
});

export default auth;
