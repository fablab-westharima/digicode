import { Hono } from 'hono';
import { generateTokenPair, generateRefreshToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { authMiddleware } from '../middleware/auth';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendRecoveryEmail,
} from '../services/emailService';

// リフレッシュトークンのハッシュ化（SHA-256）
async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
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

// パスワード強度バリデーション
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上である必要があります' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'パスワードには小文字を含める必要があります' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'パスワードには大文字を含める必要があります' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'パスワードには数字を含める必要があります' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'パスワードには特殊文字（!@#$%^&*など）を含める必要があります' };
  }

  return { valid: true, message: '' };
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

    // パスワード強度チェック
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return c.json({ error: passwordValidation.message }, 400);
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

    // メール確認トークン生成
    const verificationToken = generateResetToken(); // 同じ関数を再利用
    const tokenHash = await hashResetToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24時間有効

    // トークンをDBに保存
    await c.env.DB.prepare(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(userResult.id, tokenHash, expiresAt).run();

    // 環境判定
    const isDev = c.req.header('host')?.includes('localhost') ||
                  c.req.header('host')?.includes('127.0.0.1');

    // メール送信
    if (c.env.RESEND_API_KEY) {
      const emailResult = await sendVerificationEmail(
        c.env.RESEND_API_KEY,
        userResult.email,
        verificationToken,
        isDev
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
      }
    } else {
      console.log(`[DEV] Verification token for ${email}: ${verificationToken}`);
    }

    // 開発モードかつAPIキーがない場合のみ、レスポンスにトークンを含める
    if (isDev && !c.env.RESEND_API_KEY) {
      return c.json({
        message: 'アカウントを作成しました。メールアドレスを確認してください。',
        verificationToken,
        verificationUrl: `http://localhost:5173/verify-email/${verificationToken}`,
        user: {
          id: userResult.id,
          email: userResult.email,
        },
      }, 201);
    }

    return c.json({
      message: 'アカウントを作成しました。確認メールを送信しましたので、メールアドレスを確認してください。',
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
      'SELECT id, email, password_hash, email_verified, passkey_only, account_type FROM users WHERE email = ?'
    ).bind(email).first<{
      id: number;
      email: string;
      password_hash: string;
      email_verified: number;
      passkey_only: number;
      account_type: string | null;
    }>();

    if (!user) {
      return c.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }

    // メール確認チェック（student は代理作成時に email_verified=1 済み）
    if (!user.email_verified) {
      return c.json({
        error: 'メールアドレスが確認されていません。確認メールをご確認ください。',
        needsVerification: true
      }, 403);
    }

    // パスキーのみモードチェック
    if (user.passkey_only) {
      return c.json({
        error: 'このアカウントはパスキーのみでログイン可能です。パスキーでログインしてください。',
        passkeyOnly: true
      }, 403);
    }

    // パスワード検証
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return c.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }

    // 生徒ログイン制限: student かつクラス未所属ならログイン不可
    if (user.account_type === 'student') {
      const membership = await c.env.DB.prepare(
        'SELECT COUNT(*) AS n FROM class_members WHERE user_id = ?'
      ).bind(user.id).first<{ n: number }>();

      if (!membership || membership.n === 0) {
        return c.json({
          error: 'クラスに所属していないため、ログインできません。管理者にお問い合わせください。',
        }, 403);
      }
    }

    // JWTトークンペア発行
    const tokens = await generateTokenPair(
      { userId: user.id, email: user.email },
      c.env.JWT_SECRET
    );

    // リフレッシュトークンをDBに保存（ハッシュ化）
    const tokenHash = await hashRefreshToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7日後

    await c.env.DB.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, tokenHash, expiresAt).run();

    // 最終ログイン日時を更新
    await c.env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
    ).bind(user.id).run();

    return c.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        passkeyOnly: user.passkey_only,
        accountType: user.account_type || 'regular',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'ログイン処理中にエラーが発生しました' }, 500);
  }
});

// パスキーのみモード確認（ログイン前にチェック）
auth.get('/check-passkey-mode', async (c) => {
  try {
    const email = c.req.query('email');

    if (!email) {
      return c.json({ error: 'メールアドレスが必要です' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT passkey_only FROM users WHERE email = ?'
    ).bind(email).first<{ passkey_only: number }>();

    if (!user) {
      // セキュリティ: ユーザー存在有無を隠す
      return c.json({ passkeyOnly: false });
    }

    return c.json({ passkeyOnly: user.passkey_only === 1 });
  } catch (error) {
    console.error('Check passkey mode error:', error);
    return c.json({ error: 'パスキーのみモードの確認中にエラーが発生しました' }, 500);
  }
});

// 認証ユーザー情報取得
auth.get('/me', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // ユーザー情報とサブスクリプション情報を取得
    const user = await c.env.DB.prepare(`
      SELECT
        u.id, u.email, u.created_at, u.passkey_only,
        u.is_admin, u.plan, u.plan_source, u.account_type,
        s.status as subscription_status, s.plan_type
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = ?
    `).bind(userId).first<{
      id: number;
      email: string;
      created_at: string;
      passkey_only: number;
      is_admin: number;
      plan: string;
      plan_source: string | null;
      account_type: string | null;
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
        passkeyOnly: user.passkey_only,
        isAdmin: user.is_admin === 1,
        plan: user.plan || user.plan_type || 'free',
        accountType: user.account_type || 'regular',
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

// リフレッシュトークンで新しいアクセストークンを取得
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return c.json({ error: 'リフレッシュトークンが必要です' }, 400);
    }

    // リフレッシュトークンのハッシュを計算
    const tokenHash = await hashRefreshToken(refreshToken);

    // DBからトークンを検索
    const storedToken = await c.env.DB.prepare(`
      SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.email
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ?
    `).bind(tokenHash).first<{
      id: number;
      user_id: number;
      expires_at: string;
      revoked_at: string | null;
      email: string;
    }>();

    if (!storedToken) {
      return c.json({ error: '無効なリフレッシュトークンです' }, 401);
    }

    // 失効チェック
    if (storedToken.revoked_at) {
      return c.json({ error: 'リフレッシュトークンは失効しています' }, 401);
    }

    // 有効期限チェック
    if (new Date(storedToken.expires_at) < new Date()) {
      return c.json({ error: 'リフレッシュトークンの有効期限が切れています' }, 401);
    }

    // 古いリフレッシュトークンを失効させる（ローテーション）
    await c.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE id = ?'
    ).bind(storedToken.id).run();

    // 新しいトークンペアを発行
    const tokens = await generateTokenPair(
      { userId: storedToken.user_id, email: storedToken.email },
      c.env.JWT_SECRET
    );

    // 新しいリフレッシュトークンを保存
    const newTokenHash = await hashRefreshToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(storedToken.user_id, newTokenHash, expiresAt).run();

    return c.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json({ error: 'トークン更新に失敗しました' }, 500);
  }
});

// ログアウト（リフレッシュトークンを失効）
auth.post('/logout', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body;

    if (refreshToken) {
      const tokenHash = await hashRefreshToken(refreshToken);
      await c.env.DB.prepare(
        'UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE token_hash = ?'
      ).bind(tokenHash).run();
    }

    return c.json({ message: 'ログアウトしました' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'ログアウト処理に失敗しました' }, 500);
  }
});

// 全デバイスからログアウト（ユーザーの全リフレッシュトークンを失効）
auth.post('/logout-all', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    await c.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE user_id = ? AND revoked_at IS NULL'
    ).bind(userId).run();

    return c.json({ message: '全デバイスからログアウトしました' });
  } catch (error) {
    console.error('Logout all error:', error);
    return c.json({ error: 'ログアウト処理に失敗しました' }, 500);
  }
});

// セキュアなランダムトークン生成（パスワードリセット用）
function generateResetToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// パスワードリセットトークンのハッシュ化
async function hashResetToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// パスワードリセット申請
auth.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'メールアドレスは必須です' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ error: '有効なメールアドレスを入力してください' }, 400);
    }

    // ユーザー検索
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string }>();

    // セキュリティ: ユーザーが存在しなくても同じレスポンスを返す
    if (!user) {
      return c.json({
        message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました'
      });
    }

    // 既存の未使用トークンを無効化
    await c.env.DB.prepare(
      'UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE user_id = ? AND used_at IS NULL'
    ).bind(user.id).run();

    // 新しいリセットトークン生成
    const resetToken = generateResetToken();
    const tokenHash = await hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1時間有効

    // トークンをDBに保存
    await c.env.DB.prepare(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, tokenHash, expiresAt).run();

    // 環境判定
    const isDev = c.req.header('host')?.includes('localhost') ||
                  c.req.header('host')?.includes('127.0.0.1');

    // メール送信（Resend APIキーが設定されている場合）
    if (c.env.RESEND_API_KEY) {
      const emailResult = await sendPasswordResetEmail(
        c.env.RESEND_API_KEY,
        user.email,
        resetToken,
        isDev
      );

      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error);
        // メール送信失敗でもエラーを返さない（セキュリティのため）
      }
    } else {
      // APIキーがない場合は開発モードとしてログ出力
      console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
    }

    // 開発モードかつAPIキーがない場合のみ、レスポンスにトークンを含める
    if (isDev && !c.env.RESEND_API_KEY) {
      return c.json({
        message: 'パスワードリセットトークンを生成しました（開発モード）',
        resetToken,
        resetUrl: `http://localhost:5173/reset-password?token=${resetToken}`
      });
    }

    return c.json({
      message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'パスワードリセット処理に失敗しました' }, 500);
  }
});

// パスワードリセット実行
auth.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { token, password } = body;

    if (!token || !password) {
      return c.json({ error: 'トークンと新しいパスワードは必須です' }, 400);
    }

    // パスワード強度チェック
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return c.json({ error: passwordValidation.message }, 400);
    }

    // トークンのハッシュを計算
    const tokenHash = await hashResetToken(token);

    // DBからトークンを検索
    const resetToken = await c.env.DB.prepare(`
      SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token_hash = ?
    `).bind(tokenHash).first<{
      id: number;
      user_id: number;
      expires_at: string;
      used_at: string | null;
      email: string;
    }>();

    if (!resetToken) {
      return c.json({ error: '無効なリセットトークンです' }, 400);
    }

    // 使用済みチェック
    if (resetToken.used_at) {
      return c.json({ error: 'このリセットトークンは既に使用されています' }, 400);
    }

    // 有効期限チェック
    if (new Date(resetToken.expires_at) < new Date()) {
      return c.json({ error: 'リセットトークンの有効期限が切れています' }, 400);
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);

    // パスワードを更新
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(passwordHash, resetToken.user_id).run();

    // トークンを使用済みにする
    await c.env.DB.prepare(
      'UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE id = ?'
    ).bind(resetToken.id).run();

    // 全リフレッシュトークンを無効化（セキュリティのため）
    await c.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE user_id = ? AND revoked_at IS NULL'
    ).bind(resetToken.user_id).run();

    return c.json({
      message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'パスワードリセットに失敗しました' }, 500);
  }
});

// メール確認メール再送
auth.post('/verify-email/send', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'メールアドレスは必須です' }, 400);
    }

    // ユーザー検索
    const user = await c.env.DB.prepare(
      'SELECT id, email, email_verified FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string; email_verified: number }>();

    // セキュリティ: ユーザーが存在しなくても同じレスポンスを返す
    if (!user) {
      return c.json({
        message: 'メールアドレスが登録されている場合、確認メールを送信しました'
      });
    }

    // 既に確認済みの場合
    if (user.email_verified) {
      return c.json({
        message: 'このメールアドレスは既に確認済みです'
      });
    }

    // 既存の未使用トークンを無効化
    await c.env.DB.prepare(
      'UPDATE email_verification_tokens SET used_at = datetime(\'now\') WHERE user_id = ? AND used_at IS NULL'
    ).bind(user.id).run();

    // 新しい確認トークン生成
    const verificationToken = generateResetToken();
    const tokenHash = await hashResetToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24時間有効

    // トークンをDBに保存
    await c.env.DB.prepare(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, tokenHash, expiresAt).run();

    // 環境判定
    const isDev = c.req.header('host')?.includes('localhost') ||
                  c.req.header('host')?.includes('127.0.0.1');

    // メール送信
    if (c.env.RESEND_API_KEY) {
      const emailResult = await sendVerificationEmail(
        c.env.RESEND_API_KEY,
        user.email,
        verificationToken,
        isDev
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
      }
    } else {
      console.log(`[DEV] Verification token for ${email}: ${verificationToken}`);
    }

    // 開発モードかつAPIキーがない場合のみ、レスポンスにトークンを含める
    if (isDev && !c.env.RESEND_API_KEY) {
      return c.json({
        message: '確認メールを送信しました（開発モード）',
        verificationToken,
        verificationUrl: `http://localhost:5173/verify-email/${verificationToken}`
      });
    }

    return c.json({
      message: 'メールアドレスが登録されている場合、確認メールを送信しました'
    });
  } catch (error) {
    console.error('Verification email send error:', error);
    return c.json({ error: '確認メール送信に失敗しました' }, 500);
  }
});

// メール確認実行
auth.post('/verify-email/:token', async (c) => {
  try {
    const token = c.req.param('token');

    if (!token) {
      return c.json({ error: 'トークンは必須です' }, 400);
    }

    // トークンのハッシュを計算
    const tokenHash = await hashResetToken(token);

    // DBからトークンを検索
    const verificationToken = await c.env.DB.prepare(`
      SELECT evt.id, evt.user_id, evt.expires_at, evt.used_at, u.email, u.email_verified
      FROM email_verification_tokens evt
      JOIN users u ON evt.user_id = u.id
      WHERE evt.token_hash = ?
    `).bind(tokenHash).first<{
      id: number;
      user_id: number;
      expires_at: string;
      used_at: string | null;
      email: string;
      email_verified: number;
    }>();

    if (!verificationToken) {
      return c.json({ error: '無効な確認トークンです' }, 400);
    }

    // 使用済みチェック
    if (verificationToken.used_at) {
      return c.json({ error: 'この確認トークンは既に使用されています' }, 400);
    }

    // 有効期限チェック
    if (new Date(verificationToken.expires_at) < new Date()) {
      return c.json({ error: '確認トークンの有効期限が切れています' }, 400);
    }

    // 既に確認済みの場合
    if (verificationToken.email_verified) {
      return c.json({
        verified: true,
        message: 'このメールアドレスは既に確認済みです'
      });
    }

    // メールアドレスを確認済みにする
    await c.env.DB.prepare(
      'UPDATE users SET email_verified = 1, email_verified_at = datetime(\'now\') WHERE id = ?'
    ).bind(verificationToken.user_id).run();

    // トークンを使用済みにする
    await c.env.DB.prepare(
      'UPDATE email_verification_tokens SET used_at = datetime(\'now\') WHERE id = ?'
    ).bind(verificationToken.id).run();

    return c.json({
      verified: true,
      message: 'メールアドレスが確認されました。ログインできます。'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return c.json({ error: 'メール確認に失敗しました' }, 500);
  }
});

// リカバリー申請
auth.post('/recovery/request', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'メールアドレスは必須です' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ error: '有効なメールアドレスを入力してください' }, 400);
    }

    // ユーザー検索
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string }>();

    // セキュリティ: ユーザーが存在しなくても同じレスポンスを返す
    if (!user) {
      return c.json({
        message: 'メールアドレスが登録されている場合、リカバリーメールを送信しました'
      });
    }

    // 既存の未使用トークンを無効化
    await c.env.DB.prepare(
      'UPDATE recovery_tokens SET used_at = datetime(\'now\') WHERE user_id = ? AND used_at IS NULL'
    ).bind(user.id).run();

    // 新しいリカバリートークン生成
    const recoveryToken = generateResetToken();
    const tokenHash = await hashResetToken(recoveryToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1時間有効

    // トークンをDBに保存
    await c.env.DB.prepare(
      'INSERT INTO recovery_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, tokenHash, expiresAt).run();

    // 環境判定
    const isDev = c.req.header('host')?.includes('localhost') ||
                  c.req.header('host')?.includes('127.0.0.1');

    // メール送信
    if (c.env.RESEND_API_KEY) {
      const emailResult = await sendRecoveryEmail(
        c.env.RESEND_API_KEY,
        user.email,
        recoveryToken,
        isDev
      );

      if (!emailResult.success) {
        console.error('Failed to send recovery email:', emailResult.error);
      }
    } else {
      console.log(`[DEV] Recovery token for ${email}: ${recoveryToken}`);
    }

    // 開発モードかつAPIキーがない場合のみ、レスポンスにトークンを含める
    if (isDev && !c.env.RESEND_API_KEY) {
      return c.json({
        message: 'リカバリートークンを生成しました（開発モード）',
        recoveryToken,
        recoveryUrl: `http://localhost:5173/recovery/${recoveryToken}`
      });
    }

    return c.json({
      message: 'メールアドレスが登録されている場合、リカバリーメールを送信しました'
    });
  } catch (error) {
    console.error('Recovery request error:', error);
    return c.json({ error: 'リカバリー申請に失敗しました' }, 500);
  }
});

// リカバリー実行
auth.post('/recovery/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return c.json({ error: 'トークンは必須です' }, 400);
    }

    // トークンのハッシュを計算
    const tokenHash = await hashResetToken(token);

    // DBからトークンを検索
    const recoveryToken = await c.env.DB.prepare(`
      SELECT rt.id, rt.user_id, rt.expires_at, rt.used_at, u.email
      FROM recovery_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ?
    `).bind(tokenHash).first<{
      id: number;
      user_id: number;
      expires_at: string;
      used_at: string | null;
      email: string;
    }>();

    if (!recoveryToken) {
      return c.json({ error: '無効なリカバリートークンです' }, 400);
    }

    // 使用済みチェック
    if (recoveryToken.used_at) {
      return c.json({ error: 'このリカバリートークンは既に使用されています' }, 400);
    }

    // 有効期限チェック
    if (new Date(recoveryToken.expires_at) < new Date()) {
      return c.json({ error: 'リカバリートークンの有効期限が切れています' }, 400);
    }

    // トークンを使用済みにする
    await c.env.DB.prepare(
      'UPDATE recovery_tokens SET used_at = datetime(\'now\') WHERE id = ?'
    ).bind(recoveryToken.id).run();

    // JWTトークンペア発行
    const tokens = await generateTokenPair(
      { userId: recoveryToken.user_id, email: recoveryToken.email },
      c.env.JWT_SECRET
    );

    // リフレッシュトークンをDBに保存（ハッシュ化）
    const newTokenHash = await hashRefreshToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7日後

    await c.env.DB.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(recoveryToken.user_id, newTokenHash, expiresAt).run();

    return c.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: recoveryToken.user_id,
        email: recoveryToken.email,
      },
      message: 'ログインしました。新しいパスキーを登録してください。'
    });
  } catch (error) {
    console.error('Recovery verify error:', error);
    return c.json({ error: 'リカバリーに失敗しました' }, 500);
  }
});

// アカウント削除
auth.delete('/account', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // トランザクション的に削除
    // 1. パスキーを全て削除
    await c.env.DB.prepare(
      'DELETE FROM authenticators WHERE user_id = ?'
    ).bind(userId).run();

    // 2. リフレッシュトークンを全て削除
    await c.env.DB.prepare(
      'DELETE FROM refresh_tokens WHERE user_id = ?'
    ).bind(userId).run();

    // 3. パスワードリセットトークンを削除
    await c.env.DB.prepare(
      'DELETE FROM password_reset_tokens WHERE user_id = ?'
    ).bind(userId).run();

    // 4. メール確認トークンを削除
    await c.env.DB.prepare(
      'DELETE FROM email_verification_tokens WHERE user_id = ?'
    ).bind(userId).run();

    // 5. リカバリートークンを削除
    await c.env.DB.prepare(
      'DELETE FROM recovery_tokens WHERE user_id = ?'
    ).bind(userId).run();

    // 6. プロジェクトを全て削除
    await c.env.DB.prepare(
      'DELETE FROM projects WHERE user_id = ?'
    ).bind(userId).run();

    // 7. コンパイル使用量履歴を削除
    await c.env.DB.prepare(
      'DELETE FROM compile_usage WHERE user_id = ?'
    ).bind(userId).run();

    // 8. サブスクリプションを削除
    await c.env.DB.prepare(
      'DELETE FROM subscriptions WHERE user_id = ?'
    ).bind(userId).run();

    // 9. 最後にユーザー自身を削除
    await c.env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(userId).run();

    return c.json({
      message: 'アカウントを削除しました。ご利用ありがとうございました。'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return c.json({ error: 'アカウント削除に失敗しました' }, 500);
  }
});

// パスワード変更（生徒向け: plain_password を NULL にする）
auth.post('/change-password', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();

    if (!body.currentPassword || !body.newPassword) {
      return c.json({ error: '現在のパスワードと新しいパスワードは必須です' }, 400);
    }

    if (body.newPassword.length < 4) {
      return c.json({ error: 'パスワードは4文字以上にしてください' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string }>();

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    const isValid = await verifyPassword(body.currentPassword, user.password_hash);
    if (!isValid) {
      return c.json({ error: '現在のパスワードが正しくありません' }, 401);
    }

    const newHash = await hashPassword(body.newPassword);

    // plain_password を NULL にする（管理者画面で「生徒変更済み」表示になる）
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, plain_password = NULL, updated_at = datetime('now') WHERE id = ?"
    ).bind(newHash, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'パスワード変更に失敗しました' }, 500);
  }
});

export default auth;
