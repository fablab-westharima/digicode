/**
 * 2段階認証（Email OTP）ルート
 *
 * パスワードログイン専用の2FA機能
 * ※ パスキー認証・リカバリーコード認証には適用しない
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { verifyPassword } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';
import { sendLoginOtpEmail } from '../services/emailService';

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

const twoFactor = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// OTPコード生成（6桁数字）
function generateOtpCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 1000000).toString().padStart(6, '0');
}

// OTPコードのハッシュ化（SHA-256）
async function hashOtpCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// リフレッシュトークンのハッシュ化（auth.tsと同じ）
async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// デバイストークン生成（Phase 2: 信頼済みデバイス）
function generateDeviceToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// デバイストークンのハッシュ化
async function hashDeviceToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 信頼済みデバイスCookie設定
const DEVICE_TOKEN_COOKIE_NAME = 'digicode_device_token';
const DEVICE_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30日（秒）

/**
 * POST /api/auth/2fa/send-otp
 * パスワード検証後、OTPコードを生成してメール送信
 *
 * 2FAが無効なユーザーは通常のJWT発行を行う
 * 信頼済みデバイスからのリクエストは2FAをスキップ
 */
twoFactor.post('/send-otp', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: 'メールアドレスとパスワードが必要です' }, 400);
  }

  try {
    // ユーザー取得
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

    // パスキー専用モードのチェック
    if (user.passkey_only) {
      return c.json({ error: 'このアカウントはパスキー専用です' }, 401);
    }

    // メール未確認チェック
    if (!user.email_verified) {
      return c.json({ error: 'メールアドレスが確認されていません' }, 401);
    }

    // パスワード検証
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }

    // 2FA設定確認
    const twoFaSetting = await c.env.DB.prepare(
      'SELECT enabled FROM user_2fa_settings WHERE user_id = ?'
    ).bind(user.id).first<{ enabled: number }>();

    // 2FAが無効の場合は通常のJWT発行
    if (!twoFaSetting || !twoFaSetting.enabled) {
      const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
        { userId: user.id, email: user.email },
        c.env.JWT_SECRET
      );

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const tokenHash = await hashRefreshToken(refreshToken);

      await c.env.DB.prepare(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
      ).bind(user.id, tokenHash, expiresAt).run();

      return c.json({
        success: true,
        twoFactorRequired: false,
        accessToken,
        refreshToken,
        expiresIn,
        user: { id: user.id, email: user.email, accountType: user.account_type || 'regular' },
      });
    }

    // Phase 2: 信頼済みデバイスチェック
    const deviceTokenCookie = c.req.raw.headers.get('cookie')
      ?.split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(`${DEVICE_TOKEN_COOKIE_NAME}=`))
      ?.split('=')[1];

    if (deviceTokenCookie) {
      const tokenHash = await hashDeviceToken(deviceTokenCookie);
      const trustedDevice = await c.env.DB.prepare(
        `SELECT id FROM trusted_devices
         WHERE user_id = ? AND token_hash = ? AND expires_at > datetime('now')`
      ).bind(user.id, tokenHash).first<{ id: number }>();

      if (trustedDevice) {
        // 信頼済みデバイス: last_used_atを更新して2FAスキップ
        await c.env.DB.prepare(
          'UPDATE trusted_devices SET last_used_at = datetime(\'now\') WHERE id = ?'
        ).bind(trustedDevice.id).run();

        console.log(`[2FA] Trusted device login for ${user.email}`);

        // JWT発行（2FAスキップ）
        const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
          { userId: user.id, email: user.email },
          c.env.JWT_SECRET
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const rtHash = await hashRefreshToken(refreshToken);

        await c.env.DB.prepare(
          'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
        ).bind(user.id, rtHash, expiresAt).run();

        return c.json({
          success: true,
          twoFactorRequired: false,
          trustedDevice: true,
          accessToken,
          refreshToken,
          expiresIn,
          user: { id: user.id, email: user.email },
        });
      }
    }

    // 2FA有効の場合、OTPコード生成
    const otpCode = generateOtpCode();
    const otpHash = await hashOtpCode(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分

    // 既存の未使用OTPを無効化
    await c.env.DB.prepare(
      'UPDATE login_otp_codes SET used = 1, used_at = datetime(\'now\') WHERE user_id = ? AND used = 0'
    ).bind(user.id).run();

    // 新しいOTPを保存
    await c.env.DB.prepare(
      'INSERT INTO login_otp_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, otpHash, expiresAt).run();

    // メール送信
    const isDev = !c.env.RESEND_API_KEY;
    const emailResult = await sendLoginOtpEmail(
      c.env.RESEND_API_KEY || '',
      user.email,
      otpCode,
      isDev
    );

    // 開発環境ではコンソールにOTPを出力
    if (isDev) {
      console.log(`[2FA] OTP for ${user.email}: ${otpCode}`);
    }

    if (!emailResult.success && !isDev) {
      console.error('Failed to send OTP email:', emailResult.error);
      // メール送信失敗でもOTPは保存されているので、続行
    }

    return c.json({
      success: true,
      twoFactorRequired: true,
      message: '認証コードをメールで送信しました',
      expiresIn: 600, // 10分（秒）
    });
  } catch (error) {
    console.error('2FA send-otp error:', error);
    return c.json({ error: '認証処理に失敗しました' }, 500);
  }
});

/**
 * POST /api/auth/2fa/verify-otp
 * OTPコードを検証してログイン完了
 * trustDevice=trueの場合、デバイストークンをCookieにセット
 */
twoFactor.post('/verify-otp', async (c) => {
  const { email, code, trustDevice } = await c.req.json<{
    email: string;
    code: string;
    trustDevice?: boolean;
  }>();

  if (!email || !code) {
    return c.json({ error: 'メールアドレスと認証コードが必要です' }, 400);
  }

  // 6桁数字の形式チェック
  if (!/^\d{6}$/.test(code)) {
    return c.json({ error: '認証コードは6桁の数字です' }, 400);
  }

  try {
    // ユーザー取得
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string }>();

    if (!user) {
      return c.json({ error: '認証に失敗しました' }, 401);
    }

    // 未使用で有効期限内のOTPを取得
    const otpRecord = await c.env.DB.prepare(
      `SELECT id, code_hash, attempts FROM login_otp_codes
       WHERE user_id = ? AND used = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first<{ id: number; code_hash: string; attempts: number }>();

    if (!otpRecord) {
      return c.json({ error: '認証コードが見つからないか期限切れです' }, 401);
    }

    // 試行回数チェック（5回まで）
    if (otpRecord.attempts >= 5) {
      return c.json({ error: '試行回数の上限に達しました。新しいコードを送信してください' }, 429);
    }

    // 試行回数をインクリメント
    await c.env.DB.prepare(
      'UPDATE login_otp_codes SET attempts = attempts + 1 WHERE id = ?'
    ).bind(otpRecord.id).run();

    // OTPコード検証
    const inputHash = await hashOtpCode(code);
    if (inputHash !== otpRecord.code_hash) {
      const remainingAttempts = 5 - otpRecord.attempts - 1;
      return c.json({
        error: `認証コードが正しくありません（残り${remainingAttempts}回）`
      }, 401);
    }

    // OTPを使用済みにマーク
    await c.env.DB.prepare(
      'UPDATE login_otp_codes SET used = 1, used_at = datetime(\'now\') WHERE id = ?'
    ).bind(otpRecord.id).run();

    // JWT発行
    const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
      { userId: user.id, email: user.email },
      c.env.JWT_SECRET
    );

    const rtExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const tokenHash = await hashRefreshToken(refreshToken);

    await c.env.DB.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, tokenHash, rtExpiresAt).run();

    // Phase 2: 信頼済みデバイスの登録
    if (trustDevice) {
      const deviceToken = generateDeviceToken();
      const deviceTokenHash = await hashDeviceToken(deviceToken);
      const deviceExpiresAt = new Date(Date.now() + DEVICE_TOKEN_MAX_AGE * 1000).toISOString();

      // 古いデバイストークンを削除（同一ユーザーにつき最大5デバイスまで）
      await c.env.DB.prepare(
        `DELETE FROM trusted_devices WHERE id IN (
          SELECT id FROM trusted_devices
          WHERE user_id = ?
          ORDER BY last_used_at DESC, created_at DESC
          LIMIT -1 OFFSET 4
        )`
      ).bind(user.id).run();

      // 新しいデバイストークンを登録
      await c.env.DB.prepare(
        'INSERT INTO trusted_devices (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
      ).bind(user.id, deviceTokenHash, deviceExpiresAt).run();

      console.log(`[2FA] Device trusted for ${user.email}`);

      // Cookie設定（httpOnly, secure, sameSite）
      // クロスドメインCookieにはSameSite=None + Secureが必須
      const isProduction = !!c.env.RESEND_API_KEY;
      const cookieOptions = [
        `${DEVICE_TOKEN_COOKIE_NAME}=${deviceToken}`,
        `Max-Age=${DEVICE_TOKEN_MAX_AGE}`,
        'Path=/',
        'HttpOnly',
        isProduction ? 'SameSite=None' : 'SameSite=Lax',
      ];
      if (isProduction) {
        cookieOptions.push('Secure');
      }

      c.header('Set-Cookie', cookieOptions.join('; '));
    }

    return c.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('2FA verify-otp error:', error);
    return c.json({ error: '認証処理に失敗しました' }, 500);
  }
});

/**
 * POST /api/auth/2fa/resend-otp
 * OTPコードを再送信
 */
twoFactor.post('/resend-otp', async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email) {
    return c.json({ error: 'メールアドレスが必要です' }, 400);
  }

  try {
    // ユーザー取得
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string }>();

    if (!user) {
      // セキュリティ上、ユーザーが存在しなくても同じレスポンス
      return c.json({
        success: true,
        message: '認証コードを再送信しました',
        expiresIn: 600,
      });
    }

    // 2FA設定確認
    const twoFaSetting = await c.env.DB.prepare(
      'SELECT enabled FROM user_2fa_settings WHERE user_id = ?'
    ).bind(user.id).first<{ enabled: number }>();

    if (!twoFaSetting || !twoFaSetting.enabled) {
      return c.json({ error: '2段階認証が有効ではありません' }, 400);
    }

    // レート制限チェック（直近10分で3回まで）
    const recentCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM login_otp_codes
       WHERE user_id = ? AND created_at > datetime('now', '-10 minutes')`
    ).bind(user.id).first<{ count: number }>();

    if (recentCount && recentCount.count >= 3) {
      return c.json({ error: 'しばらく待ってから再送信してください' }, 429);
    }

    // OTPコード生成
    const otpCode = generateOtpCode();
    const otpHash = await hashOtpCode(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 既存の未使用OTPを無効化
    await c.env.DB.prepare(
      'UPDATE login_otp_codes SET used = 1, used_at = datetime(\'now\') WHERE user_id = ? AND used = 0'
    ).bind(user.id).run();

    // 新しいOTPを保存
    await c.env.DB.prepare(
      'INSERT INTO login_otp_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, otpHash, expiresAt).run();

    // メール送信
    const isDev = !c.env.RESEND_API_KEY;
    await sendLoginOtpEmail(
      c.env.RESEND_API_KEY || '',
      user.email,
      otpCode,
      isDev
    );

    if (isDev) {
      console.log(`[2FA] Resend OTP for ${user.email}: ${otpCode}`);
    }

    return c.json({
      success: true,
      message: '認証コードを再送信しました',
      expiresIn: 600,
    });
  } catch (error) {
    console.error('2FA resend-otp error:', error);
    return c.json({ error: '再送信に失敗しました' }, 500);
  }
});

/**
 * GET /api/auth/2fa/status
 * 2FA設定状態を取得（要認証）
 */
twoFactor.get('/status', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const setting = await c.env.DB.prepare(
      'SELECT enabled, created_at, updated_at FROM user_2fa_settings WHERE user_id = ?'
    ).bind(user.userId).first<{ enabled: number; created_at: string; updated_at: string }>();

    return c.json({
      enabled: setting?.enabled === 1,
      enabledAt: setting?.enabled ? setting.updated_at : null,
    });
  } catch (error) {
    console.error('2FA status error:', error);
    return c.json({ error: '設定の取得に失敗しました' }, 500);
  }
});

/**
 * POST /api/auth/2fa/enable
 * 2FAを有効化（要認証）
 */
twoFactor.post('/enable', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    // 既存の設定を確認
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_2fa_settings WHERE user_id = ?'
    ).bind(user.userId).first<{ id: number }>();

    if (existing) {
      // 既存レコードを更新
      await c.env.DB.prepare(
        'UPDATE user_2fa_settings SET enabled = 1, updated_at = datetime(\'now\') WHERE user_id = ?'
      ).bind(user.userId).run();
    } else {
      // 新規レコードを作成
      await c.env.DB.prepare(
        'INSERT INTO user_2fa_settings (user_id, enabled) VALUES (?, 1)'
      ).bind(user.userId).run();
    }

    return c.json({
      success: true,
      message: '2段階認証を有効にしました',
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return c.json({ error: '設定の更新に失敗しました' }, 500);
  }
});

/**
 * POST /api/auth/2fa/disable
 * 2FAを無効化（要認証、パスワード確認必須）
 */
twoFactor.post('/disable', authMiddleware, async (c) => {
  const user = c.get('user');
  const { password } = await c.req.json<{ password: string }>();

  if (!password) {
    return c.json({ error: 'パスワードが必要です' }, 400);
  }

  try {
    // ユーザーのパスワードハッシュを取得
    const userData = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(user.userId).first<{ password_hash: string }>();

    if (!userData) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    // パスワード検証
    const isValidPassword = await verifyPassword(password, userData.password_hash);
    if (!isValidPassword) {
      return c.json({ error: 'パスワードが正しくありません' }, 401);
    }

    // 2FA設定を無効化
    await c.env.DB.prepare(
      'UPDATE user_2fa_settings SET enabled = 0, updated_at = datetime(\'now\') WHERE user_id = ?'
    ).bind(user.userId).run();

    return c.json({
      success: true,
      message: '2段階認証を無効にしました',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return c.json({ error: '設定の更新に失敗しました' }, 500);
  }
});

export default twoFactor;
