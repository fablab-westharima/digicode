import { Hono } from 'hono';
import { generateTokenPair, generateRefreshToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { authMiddleware } from '../middleware/auth';
import { errorJson, type ErrorKey } from '../utils/errorJson';
import { getMessage, resolveLocale } from '../i18n/messages';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendRecoveryEmail,
  sendAccountAlreadyExistsEmail,
} from '../services/emailService';
import { deleteClassCascade } from './classes';
import { deleteUserCascade } from '../utils/userCascade';

// リフレッシュトークンのハッシュ化（SHA-256）
async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

import type { Bindings, Variables } from '../types/env';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// メールアドレスバリデーション
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// パスワード強度バリデーション
// F-4 (Session 123): 旧コードは JA hardcoded message を return = 3 callsite
// (auth.ts:78 /register, :651 /reset-password, :1098 /change-password) で
// c.json({error: passwordValidation.message}, 400) を経由して client に
// pass-through、en/es/pt-PT/zh-TW user は JP error を見る (rule 09-backend-i18n
// 違反)。本 fix で errorKey: ErrorKey を return、callsite で errorJson 経由
// 5 lang i18n 化。
function validatePassword(password: string): { valid: boolean; errorKey?: ErrorKey } {
  if (password.length < 8) {
    return { valid: false, errorKey: 'auth.passwordRegularTooShort' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, errorKey: 'auth.passwordMissingLowercase' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, errorKey: 'auth.passwordMissingUppercase' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, errorKey: 'auth.passwordMissingDigit' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, errorKey: 'auth.passwordMissingSpecial' };
  }

  return { valid: true };
}

// ユーザー登録
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return errorJson(c, 'auth.emailAndPasswordRequired', 400);
    }

    if (!isValidEmail(email)) {
      return errorJson(c, 'validation.invalidEmail', 400);
    }

    // パスワード強度チェック
    // F-4 (Session 123): JA hardcoded message を errorJson + 5 lang i18n key 化
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid && passwordValidation.errorKey) {
      return errorJson(c, passwordValidation.errorKey, 400);
    }

    // RB-5 (Session 117 anti-enum cluster):
    // 既存 email の存在を 409 で明示すると enum 経路になるため、
    // 新規 / 既存 unverified / 既存 verified の 3 path 全てで 201 + 同形 response を返却。
    // mail content のみ分岐 (HIBP / Slack signup pattern):
    //   - 新規: verification mail (現状維持)
    //   - 既存 unverified: verification mail を新 token で再送 (UX 救済)
    //   - 既存 verified: 「アカウント登録試行のお知らせ」mail を送信 (login 誘導)
    const existingUser = await c.env.DB.prepare(
      'SELECT id, email_verified FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email_verified: number }>();

    // 環境判定
    const isDev = c.req.header('host')?.includes('localhost') ||
                  c.req.header('host')?.includes('127.0.0.1');

    let devVerificationToken: string | null = null;

    if (existingUser) {
      if (existingUser.email_verified) {
        // 既に verified user — login 誘導 mail を送信、token 発行なし
        if (c.env.RESEND_API_KEY) {
          const emailResult = await sendAccountAlreadyExistsEmail(
            c.env.RESEND_API_KEY,
            email,
            isDev
          );
          if (!emailResult.success) {
            console.error('Failed to send account-exists email:', emailResult.error);
          }
        }
      } else {
        // 既に unverified user — verification mail を新 token で再送 (UX 救済)
        const verificationToken = generateResetToken();
        const tokenHash = await hashResetToken(verificationToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await c.env.DB.prepare(
          'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
        ).bind(existingUser.id, tokenHash, expiresAt).run();

        if (c.env.RESEND_API_KEY) {
          const emailResult = await sendVerificationEmail(
            c.env.RESEND_API_KEY,
            email,
            verificationToken,
            isDev
          );
          if (!emailResult.success) {
            console.error('Failed to resend verification email:', emailResult.error);
          }
        } else {
          // F-1 (Session 123): 旧コードは [DEV] verification token を email + 値 含めて
          // console.log = RESEND_API_KEY rotation 間隙時に Workers Logs に token leak。
          // Session 120 D-2/D-3 完全削除 pattern 踏襲、token 値 log 全廃。
          // Dev developer は D1 email_verification_tokens から直接 query 可能。
          console.warn('[DEV] verification email skipped (no RESEND_API_KEY)');
        }
        devVerificationToken = verificationToken;
      }
    } else {
      // 新規 user 作成
      const passwordHash = await hashPassword(password);

      const userResult = await c.env.DB.prepare(
        'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at'
      ).bind(email, passwordHash).first<{ id: number; email: string; created_at: string }>();

      if (!userResult) {
        return errorJson(c, 'admin.userCreateFailed', 500);
      }

      // サブスクリプション作成（無料プラン）
      await c.env.DB.prepare(
        'INSERT INTO subscriptions (user_id, status, plan_type) VALUES (?, ?, ?)'
      ).bind(userResult.id, 'free', 'free').run();

      // メール確認トークン生成
      const verificationToken = generateResetToken();
      const tokenHash = await hashResetToken(verificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await c.env.DB.prepare(
        'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
      ).bind(userResult.id, tokenHash, expiresAt).run();

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
        // F-1 (Session 123): 同上、token log 全廃
        console.warn('[DEV] verification email skipped (no RESEND_API_KEY)');
      }
      devVerificationToken = verificationToken;
    }

    // R1 (Session 119 anti-enum cluster scope-rectification):
    // 旧コードは response.user.id に respondUserId を含めていたが、新規 user は
    // INSERT で auto-increment 最新 id を取得 (大きい)、既存 user は過去 id (小さい)
    // のため数値分布で識別可能 = N-1 enumeration oracle。f04b5d3 commit message の
    // "id is real for existing paths, fabricated by INSERT for new path" claim は
    // 実コード上「fabricated」ではない (RETURNING で実 auto-increment id 返却) と
    // 第119回 Task 1 audit で判明。response から user.id field 自体を削除し、
    // 全 path で identical shape { message, user: { email } } を返却。
    // F-2 (Session 123): 旧コードは isDev && !RESEND_API_KEY 時に verification
    // token を response body に含めて返却 = production で RESEND_API_KEY 不在 +
    // attacker が `Host: localhost.evil.com` (substring match で isDev=true)
    // 送信時に token を直接取得可能な double-fault scenario。本 fix で
    // dev-mode response body 経由 token 返却 path を完全削除、全 path で
    // identical silent-success shape を返却 (anti-enum 整合)。
    // Dev developer は D1 email_verification_tokens から直接 query 可能。
    //
    // 通常 response: 新規 / 既存 unverified / 既存 verified / dev-mode 全てで
    // identical shape
    return c.json({
      message: 'アカウントを作成しました。確認メールを送信しましたので、メールアドレスを確認してください。',
      user: { email },
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return errorJson(c, 'auth.signupFailed', 500);
  }
});

// ログイン
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return errorJson(c, 'auth.emailAndPasswordRequired', 400);
    }

    // ユーザー検索
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, email_verified, passkey_only, account_type, preferred_lang FROM users WHERE email = ?'
    ).bind(email).first<{
      id: number;
      email: string;
      password_hash: string;
      email_verified: number;
      passkey_only: number;
      account_type: string | null;
      preferred_lang: string | null;
    }>();

    if (!user) {
      return errorJson(c, 'auth.emailOrPasswordIncorrect', 401);
    }

    // パスワード検証を先行 (RB-4 / Session 117 anti-enum cluster):
    // email_verified / passkey_only の状態 leak を防ぐため password verify を最前段に移動。
    // BUG-083 で導入された needsVerification UX 救済 path はパスワード正解時のみ返却する形で維持。
    const { valid, needsRehash } = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return errorJson(c, 'auth.emailOrPasswordIncorrect', 401);
    }

    // Lazy upgrade: iterations 不足なら新形式で再 hash して DB 更新
    if (needsRehash) {
      const newHash = await hashPassword(password);
      await c.env.DB.prepare(
        "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(newHash, user.id).run();
    }

    // パスキーのみモードチェック (パスワード正解後のみ判定 = passkey_only 状態 leak 防止)
    //
    // RB-1 (Session 120 zero-base re-audit):
    // 旧コードは 403 + { error, passkeyOnly: true } を返却していたが、2fa.ts:111-113
    // の /send-otp は 401 errorJson('auth.passkeyOnly') を返却していたため、attacker が
    // 同 email + password を 2 endpoint に投げると status code 差 (403 vs 401) + extra
    // passkeyOnly:true field の有無 で passkey_only=1 user を識別可能 = cross-endpoint
    // anti-enum shape divergence。本 fix で 2fa.ts と同形 401 'auth.passkeyOnly' に統一。
    // frontend の passkeyOnly hint は response の errorCode で判定する形に変更。
    if (user.passkey_only) {
      return errorJson(c, 'auth.passkeyOnly', 401);
    }

    // メール未確認チェック (パスワード正解後のみ判定 = UX 救済 path 維持 + email_verified 状態 leak 防止)
    //
    // NEW-1 (Session 121 zero-base re-audit):
    // 旧コードは inline `c.json({error: <JP>, needsVerification: true}, 403)` で
    // errorCode field を含まない 2-key shape を返却していた。同 user state を
    // 2fa.ts /send-otp:132 / recovery-codes.ts /verify:151 / passkey.ts /login/verify:392
    // で受けると `errorJson(c, 'auth.emailNotVerified', 403, {needsVerification: true})` =
    // {error, errorCode, needsVerification} の 3-key shape が返るため、attacker が
    // 同 email + 正しい password を 2 endpoint に投げると response の `errorCode` field
    // 有無で email_verified=0 を確定可能 = RB-1 (passkey_only) と同 class の cross-endpoint
    // anti-enum shape divergence。本 fix で 4 endpoint 全件 同形 errorJson に統一。
    // needsVerification:true は UX 救済 (EmailVerificationWaiting へ frontend が誘導) で維持。
    if (!user.email_verified) {
      return errorJson(c, 'auth.emailNotVerified', 403, { needsVerification: true });
    }

    // 生徒ログイン制限: student かつクラス未所属ならログイン不可
    // F-3 (Session 123): 旧コードは inline c.json with JA hardcoded (`{error: 'クラスに...'}`)
    // で 5 endpoint (auth.ts /login + 2fa.ts /send-otp + /verify-otp + recovery-codes.ts
    // /verify + passkey.ts /login/verify) shape divergence + 5 lang i18n 違反。
    // Session 121 NEW-1 (email_verified=0) と同 cluster の sweep 漏れ、本 fix で
    // errorJson + auth.studentNotInClass 5 lang 統一。anti-enum cross-endpoint shape
    // uniformity を student-not-in-class state 軸でも達成。
    if (user.account_type === 'student') {
      const membership = await c.env.DB.prepare(
        'SELECT COUNT(*) AS n FROM class_members WHERE user_id = ?'
      ).bind(user.id).first<{ n: number }>();

      if (!membership || membership.n === 0) {
        return errorJson(c, 'auth.studentNotInClass', 403);
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
        preferredLang: user.preferred_lang || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorJson(c, 'auth.loginFailed', 500);
  }
});

// パスキーのみモード確認（ログイン前にチェック）
//
// RB-2 (Session 120 zero-base re-audit):
// 旧コードは email を引いて user 存在時のみ実 `passkey_only` 値を返却、不在 user は
// `{ passkeyOnly: false }` を返却していた。これは attacker が email 列挙時に
// `passkeyOnly: true` を観測することで「email exists AND passkey_only=1」の 1-bit
// oracle を得られる anti-enum leak。本 fix で **常に `{ passkeyOnly: false }` を返却**
// (DB lookup も削除) して oracle を完全閉鎖。
//
// UX trade-off: LoginForm.tsx の email 入力後 debounce polling で「パスキー専用 user
// 用 password field 非表示」UI を出していたが、これは失われる。代替として
// 2fa.ts /send-otp が passkey_only user に 401 'auth.passkeyOnly' を返却するため、
// frontend は handleSubmit の catch で error message を表示してパスキー誘導する形に
// degrade。anti-enum 優先で受容 (Session 120 案 A user 確定)。
auth.get('/check-passkey-mode', async (c) => {
  const email = c.req.query('email');
  if (!email) {
    return errorJson(c, 'auth.emailRequired', 400);
  }
  return c.json({ passkeyOnly: false });
});

// 認証ユーザー情報取得
auth.get('/me', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // ユーザー情報とサブスクリプション情報を取得
    const user = await c.env.DB.prepare(`
      SELECT
        u.id, u.email, u.created_at, u.passkey_only,
        u.is_admin, u.plan, u.plan_source, u.account_type, u.preferred_lang,
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
      preferred_lang: string | null;
      subscription_status: string;
      plan_type: string;
    }>();

    if (!user) {
      return errorJson(c, 'auth.userNotFound', 404);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        passkeyOnly: user.passkey_only,
        isAdmin: user.is_admin === 1,
        plan: user.plan || user.plan_type || 'free',
        planSource: user.plan_source || null,
        accountType: user.account_type || 'regular',
        preferredLang: user.preferred_lang || null,
        createdAt: user.created_at,
        subscription: {
          status: user.subscription_status || 'free',
          planType: user.plan_type || 'free',
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return errorJson(c, 'auth.userInfoFailed', 500);
  }
});

// ユーザー設定更新（優先言語など）
auth.patch('/me', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const body = await c.req.json();
    const { preferredLang } = body;

    const supportedLangs = ['ja', 'en', 'es', 'pt-PT', 'zh-TW'];
    if (preferredLang !== undefined && preferredLang !== null && !supportedLangs.includes(preferredLang)) {
      return errorJson(c, 'auth.invalidLangCode', 400);
    }

    await c.env.DB.prepare(
      'UPDATE users SET preferred_lang = ? WHERE id = ?'
    ).bind(preferredLang ?? null, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Update me error:', error);
    return errorJson(c, 'auth.settingsUpdateFailed', 500);
  }
});

// リフレッシュトークンで新しいアクセストークンを取得
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return errorJson(c, 'auth.refreshTokenRequired', 400);
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
      return errorJson(c, 'auth.invalidRefreshToken', 401);
    }

    // F-29 (Session 123): 失効済 refresh token の再利用検知時、当該 user の
    // 全 refresh token を即時 revoke (RFC 6749 § 10.4 + OAuth 2.0 Security BCP
    // § 4.13、industry standard refresh-token rotation の breach detection)。
    // 旧コードは「該当 token 1 件を 401 で reject」のみ = session theft signal
    // を defense として活用できていなかった。
    //
    // Attack scenario:
    //   1. Attacker が legit user の refresh token を steal
    //   2. Legit user が refresh 完了 → 旧 token は revoked_at 設定
    //   3. Attacker が steal した token で /refresh → revoked_at で reject
    //   4. 旧コードは reject のみで legit user の新 token (parallel chain) を
    //      存続させる = attack 続行可能
    //   5. 本 fix で revoked-reuse 検知時に全 user token revoke、attacker +
    //      legit user 両方の session を全 terminate (compromise 確定対応)
    //
    // 機械検証: 全 user の active token を一括 revoke、idempotent (`revoked_at
    // IS NULL` filter) で competing race 安全。
    if (storedToken.revoked_at) {
      await c.env.DB.prepare(
        'UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE user_id = ? AND revoked_at IS NULL'
      ).bind(storedToken.user_id).run();
      console.warn(`[auth] refresh-token reuse detected: user_id=${storedToken.user_id}, all tokens revoked`);
      return errorJson(c, 'auth.refreshTokenRevoked', 401);
    }

    // 有効期限チェック
    if (new Date(storedToken.expires_at) < new Date()) {
      return errorJson(c, 'auth.refreshTokenExpired', 401);
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
    return errorJson(c, 'auth.tokenRefreshFailed', 500);
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

    const locale = resolveLocale(c.req.header('Accept-Language'));
    return c.json({ message: getMessage(locale, 'auth.loggedOut') });
  } catch (error) {
    console.error('Logout error:', error);
    return errorJson(c, 'auth.logoutFailed', 500);
  }
});

// 全デバイスからログアウト（ユーザーの全リフレッシュトークンを失効）
auth.post('/logout-all', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    await c.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE user_id = ? AND revoked_at IS NULL'
    ).bind(userId).run();

    const locale = resolveLocale(c.req.header('Accept-Language'));
    return c.json({ message: getMessage(locale, 'auth.loggedOutAllDevices') });
  } catch (error) {
    console.error('Logout all error:', error);
    return errorJson(c, 'auth.logoutFailed', 500);
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
      return errorJson(c, 'auth.emailRequired', 400);
    }

    if (!isValidEmail(email)) {
      return errorJson(c, 'validation.invalidEmail', 400);
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
      // F-1 (Session 123): reset token log 全廃 (PII redact、RESEND_API_KEY
      // rotation 間隙時の Workers Logs leak 防止)
      console.warn('[DEV] password reset email skipped (no RESEND_API_KEY)');
    }

    // F-2 (Session 123): reset token を response body に含む path を完全削除、
    // 全 path で identical silent-success shape を返却 (anti-enum 整合)
    return c.json({
      message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorJson(c, 'auth.passwordResetProcessFailed', 500);
  }
});

// パスワードリセット実行
auth.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { token, password } = body;

    if (!token || !password) {
      return errorJson(c, 'auth.tokenAndPasswordRequired', 400);
    }

    // パスワード強度チェック
    // F-4 (Session 123): JA hardcoded message を errorJson + 5 lang i18n key 化
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid && passwordValidation.errorKey) {
      return errorJson(c, passwordValidation.errorKey, 400);
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
      return errorJson(c, 'auth.invalidResetToken', 400);
    }

    // 使用済みチェック
    if (resetToken.used_at) {
      return errorJson(c, 'auth.resetTokenAlreadyUsed', 400);
    }

    // 有効期限チェック
    if (new Date(resetToken.expires_at) < new Date()) {
      return errorJson(c, 'auth.resetTokenExpired', 400);
    }

    // F-33 (Session 123): atomic CAS で TOCTOU race を closure。
    // 旧コードは password UPDATE + used_at UPDATE の 2 statement 非 atomic。
    // 2 並列同 token request: 両方 SELECT (used_at IS NULL) → 両方 password
    // UPDATE (異なる password) → 第二 request の password が prevail = data
    // corruption。token は theft 前提 share (phished URL) で 2 path 同時発火
    // 可能。本 fix で used_at UPDATE を password UPDATE の前に atomic CAS、
    // changes === 1 確認後のみ downstream 進行。
    const useResult = await c.env.DB.prepare(
      'UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE id = ? AND used_at IS NULL'
    ).bind(resetToken.id).run();
    if (useResult.meta.changes === 0) {
      return errorJson(c, 'auth.resetTokenAlreadyUsed', 400);
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);

    // パスワードを更新
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(passwordHash, resetToken.user_id).run();

    // 全リフレッシュトークンを無効化（セキュリティのため）
    await c.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE user_id = ? AND revoked_at IS NULL'
    ).bind(resetToken.user_id).run();

    return c.json({
      message: 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return errorJson(c, 'auth.passwordResetFailed', 500);
  }
});

// メール確認メール再送
auth.post('/verify-email/send', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return errorJson(c, 'auth.emailRequired', 400);
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

    // 既に確認済みの場合: silent success (anti-enumeration)
    // 第112回 case 19 cluster (MW-1) 第112回: 旧コードは "このメールアドレスは既に
    // 確認済みです" を返却していたが、これは email 存在 AND verified 状態の info leak
    // (CWE-203 類)。!user path と同 message に統一し、verification email 送信処理を
    // skip して silent success 返却で anti-enumeration 設計を完成。
    if (user.email_verified) {
      return c.json({
        message: 'メールアドレスが登録されている場合、確認メールを送信しました'
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
      // F-1 (Session 123): verification token log 全廃
      console.warn('[DEV] verification email skipped (no RESEND_API_KEY)');
    }

    // F-2 (Session 123): verification token を response body に含む path を完全
    // 削除、全 path で identical silent-success shape (anti-enum 整合)
    return c.json({
      message: 'メールアドレスが登録されている場合、確認メールを送信しました'
    });
  } catch (error) {
    console.error('Verification email send error:', error);
    return errorJson(c, 'auth.verifyEmailSendFailed', 500);
  }
});

// メール確認実行
auth.post('/verify-email/:token', async (c) => {
  try {
    const token = c.req.param('token');

    if (!token) {
      return errorJson(c, 'auth.tokenRequired', 400);
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
      return errorJson(c, 'auth.invalidVerifyToken', 400);
    }

    // 使用済みチェック
    if (verificationToken.used_at) {
      return errorJson(c, 'auth.verifyTokenAlreadyUsed', 400);
    }

    // 有効期限チェック
    if (new Date(verificationToken.expires_at) < new Date()) {
      return errorJson(c, 'auth.verifyTokenExpired', 400);
    }

    // 既に確認済みの場合
    if (verificationToken.email_verified) {
      return c.json({
        verified: true,
        message: 'このメールアドレスは既に確認済みです'
      });
    }

    // F-33 (Session 123): atomic CAS で TOCTOU race を closure。
    // 旧コードは users.email_verified UPDATE + tokens.used_at UPDATE の 2
    // statement。idempotent UPDATE (email_verified=1) なので race impact は
    // /reset-password ほど致命ではないが、parallel structure として CAS 化、
    // post-fix re-run で 0 件残存達成。
    const useResult = await c.env.DB.prepare(
      'UPDATE email_verification_tokens SET used_at = datetime(\'now\') WHERE id = ? AND used_at IS NULL'
    ).bind(verificationToken.id).run();
    if (useResult.meta.changes === 0) {
      return errorJson(c, 'auth.verifyTokenAlreadyUsed', 400);
    }

    // メールアドレスを確認済みにする
    await c.env.DB.prepare(
      'UPDATE users SET email_verified = 1, email_verified_at = datetime(\'now\') WHERE id = ?'
    ).bind(verificationToken.user_id).run();

    return c.json({
      verified: true,
      message: 'メールアドレスが確認されました。ログインできます。'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return errorJson(c, 'auth.emailVerifyFailed', 500);
  }
});

// リカバリー申請
auth.post('/recovery/request', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return errorJson(c, 'auth.emailRequired', 400);
    }

    if (!isValidEmail(email)) {
      return errorJson(c, 'validation.invalidEmail', 400);
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
      // F-1 (Session 123): recovery token log 全廃
      console.warn('[DEV] recovery email skipped (no RESEND_API_KEY)');
    }

    // F-2 (Session 123): recovery token を response body に含む path を完全削除、
    // 全 path で identical silent-success shape (anti-enum 整合)
    return c.json({
      message: 'メールアドレスが登録されている場合、リカバリーメールを送信しました'
    });
  } catch (error) {
    console.error('Recovery request error:', error);
    return errorJson(c, 'recovery.requestFailed', 500);
  }
});

// リカバリー実行
auth.post('/recovery/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return errorJson(c, 'auth.tokenRequired', 400);
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
      return errorJson(c, 'recovery.invalidToken', 400);
    }

    // 使用済みチェック
    if (recoveryToken.used_at) {
      return errorJson(c, 'recovery.tokenAlreadyUsed', 400);
    }

    // 有効期限チェック
    if (new Date(recoveryToken.expires_at) < new Date()) {
      return errorJson(c, 'recovery.tokenExpired', 400);
    }

    // F-33 (Session 123): atomic CAS で TOCTOU race を closure。
    // 旧コードは used_at UPDATE + 後段 JWT 発行 で同 token 並列 verify が 2 JWT
    // 取得可能 (phished URL を attacker + legit user 同時実行)。本 fix で CAS
    // 化、changes === 1 確認後のみ JWT 発行。
    const useResult = await c.env.DB.prepare(
      'UPDATE recovery_tokens SET used_at = datetime(\'now\') WHERE id = ? AND used_at IS NULL'
    ).bind(recoveryToken.id).run();
    if (useResult.meta.changes === 0) {
      return errorJson(c, 'recovery.tokenAlreadyUsed', 400);
    }

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

    // F-1 fix: AdminPage inactive 判定のため recovery 経由 login でも last_login_at 更新
    // (auth.ts:248 / 2fa.ts BUG-084 fix pattern 踏襲)
    await c.env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
    ).bind(recoveryToken.user_id).run();

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
    return errorJson(c, 'recovery.failed', 500);
  }
});

// アカウント削除
auth.delete('/account', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // owner クラスを deleteClassCascade で先に削除
    // (ML30 assignments/submissions + D1 classes + 孤児 student のフル cascade)
    // ML30 通信失敗時は orphan 残置 → cross-DB audit cron で構造化ログに乗り、admin curl で回収。
    const ownerClasses = await c.env.DB.prepare(
      'SELECT id FROM classes WHERE owner_id = ?'
    ).bind(userId).all<{ id: number }>();
    for (const cls of ownerClasses.results ?? []) {
      const result = await deleteClassCascade(c.env, cls.id, userId);
      if (!result.ok) {
        console.error(JSON.stringify({
          event: 'cross_db_orphan_on_user_delete',
          user_id: userId,
          class_id: cls.id,
          error: result.error,
        }));
        // 削除続行: user delete は他テーブルも触る、ML30 失敗で全 abort しない
      }
    }

    // T7 (Session 119): 14 dependent tables + users 行を deleteUserCascade に委譲。
    // 旧コードは auth.ts / admin.ts / classes.ts 3 callsite で同じテーブルリストを
    // コピペしていたが、classes.ts の student-cleanup path だけ 14 tables 欠落 →
    // utils/userCascade.ts に集約して single source of truth 化。
    await deleteUserCascade(c.env, userId);

    return c.json({
      message: 'アカウントを削除しました。ご利用ありがとうございました。'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return errorJson(c, 'auth.accountDeleteFailed', 500);
  }
});

// パスワード変更（生徒向け: plain_password を NULL にする）
auth.post('/change-password', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();

    if (!body.currentPassword || !body.newPassword) {
      return errorJson(c, 'auth.currentAndNewPasswordRequired', 400);
    }

    // T1 (Session 119): account_type 別に password 強度要件を分岐。
    //   student → 4 文字以上 (現場で 4 桁 PIN-like 想定、強度は 2FA / passkey で補完)
    //   regular → register と同 validatePassword (8 文字 + 大小英数記号、target_users
    //             integrity 維持。change-password 経由で強度 bypass する path を封鎖)
    // 旧コードは全 user 4 文字許容で、Fab Academy / FS 受講者 / 大学生 等の
    // regular user が register 強度を回避できる loophole があった。
    const user = await c.env.DB.prepare(
      'SELECT password_hash, account_type FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string; account_type: string | null }>();

    if (!user) {
      return errorJson(c, 'auth.userNotFound', 404);
    }

    if (user.account_type === 'student') {
      if (body.newPassword.length < 4) {
        return errorJson(c, 'auth.passwordTooShort', 400);
      }
    } else {
      // F-4 (Session 123): JA hardcoded message を errorJson + 5 lang i18n key 化
      const passwordValidation = validatePassword(body.newPassword);
      if (!passwordValidation.valid && passwordValidation.errorKey) {
        return errorJson(c, passwordValidation.errorKey, 400);
      }
    }

    const { valid } = await verifyPassword(body.currentPassword, user.password_hash);
    if (!valid) {
      return errorJson(c, 'auth.currentPasswordIncorrect', 401);
    }

    const newHash = await hashPassword(body.newPassword);

    // plain_password を NULL にする（管理者画面で「生徒変更済み」表示になる）
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, plain_password = NULL, updated_at = datetime('now') WHERE id = ?"
    ).bind(newHash, userId).run();

    // F-9 (Session 123): 旧コードは password_hash UPDATE のみで refresh_tokens
    // revoke 不在 = session hijack persistence。/reset-password (L698-701) は
    // 全 token revoke 済だが /change-password は sweep 漏れ。User が compromise
    // 疑いで password 変更しても 旧 refresh token は 7 日間有効でいるため、
    // attacker が refresh token を steal していれば session 継続可能。
    // 本 fix で全 refresh_tokens を revoke、攻撃 session を全 terminate。
    await c.env.DB.prepare(
      "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL"
    ).bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return errorJson(c, 'auth.passwordChangeFailed', 500);
  }
});

export default auth;
