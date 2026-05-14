import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Bindings } from '../types/env';
import { hashPassword, verifyPassword, RECOVERY_CODE_ITERATIONS } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';
import { errorJson } from '../utils/errorJson';

const recoveryCodes = new Hono<{ Bindings: Bindings }>();

// ランダムなリカバリーコード生成（XXXX-XXXX-XXXX形式）
// 紛らわしい文字を除外: 0(ゼロ), O(オー), I(アイ), 1(イチ), L(エル)
//
// R4 (Session 119 zero-base re-audit): MFA bypass last-resort credential のため
// crypto.getRandomValues 必須。旧コードの Math.random() は V8 PRNG (cryptographically
// not secure) で recovery code 推測 = 完全 MFA bypass risk。reference pattern =
// 2fa.ts:19 generateOtpCode。modulo bias (256 % 31 = 8) は誤差 4% level で実用受容。
function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const segments = 3;
  const segmentLength = 4;
  const totalChars = segments * segmentLength;

  const randomBytes = crypto.getRandomValues(new Uint8Array(totalChars));
  const code: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[randomBytes[i * segmentLength + j] % chars.length];
    }
    code.push(segment);
  }

  return code.join('-');
}

// POST /api/auth/recovery-codes/generate
// 10個のリカバリーコードを生成
recoveryCodes.post('/generate', authMiddleware, async (c) => {
  const user = c.get('user');
  const userId = user.userId;

  try {
    // 既存のリカバリーコードを全て無効化
    await c.env.DB.prepare(
      'DELETE FROM recovery_codes WHERE user_id = ?'
    ).bind(userId).run();

    // 10個の新しいリカバリーコードを生成
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = generateRecoveryCode();
      const codeHash = await hashPassword(code, RECOVERY_CODE_ITERATIONS);

      await c.env.DB.prepare(
        'INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)'
      ).bind(userId, codeHash).run();

      codes.push(code);
    }

    return c.json({
      codes,
      message: 'リカバリーコードを生成しました。安全な場所に保管してください。',
    });
  } catch (error) {
    console.error('Recovery code generation error:', error);
    return errorJson(c, 'recovery.genFailed', 500);
  }
});

// GET /api/auth/recovery-codes/count
// 残りの有効なリカバリーコード数を取得
recoveryCodes.get('/count', authMiddleware, async (c) => {
  const user = c.get('user');
  const userId = user.userId;

  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM recovery_codes WHERE user_id = ? AND used = 0'
    ).bind(userId).first<{ count: number }>();

    return c.json({
      count: result?.count || 0,
    });
  } catch (error) {
    console.error('Recovery code count error:', error);
    return errorJson(c, 'recovery.countFailed', 500);
  }
});

// POST /api/auth/recovery-codes/verify
// リカバリーコードを検証してログイン
recoveryCodes.post('/verify', async (c) => {
  const { email, code } = await c.req.json<{ email: string; code: string }>();

  if (!email || !code) {
    return errorJson(c, 'auth.emailAndRecoveryCodeRequired', 400);
  }

  try {
    // ユーザー取得
    // case 19 cluster (BE-1) 第112回: account_type を SELECT に追加して student gate に供給
    const user = await c.env.DB.prepare(
      'SELECT id, email, email_verified, account_type FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string; email_verified: number; account_type: string | null }>();

    // D-3 (Session 120): debug console.log 6 行を削除。
    // 旧コードは user_id, recovery_codes count, valid code id 等を log していたが、
    // Workers Logs に attempt sequence + 数値が残るのは credential-replay attack
    // planning の補助材料。本 fix で全削除、error path は console.error のみ保持。

    if (!user) {
      return errorJson(c, 'auth.emailOrRecoveryCodeInvalid', 401);
    }

    // 未使用のリカバリーコードを全て取得
    const recoveryCodes = await c.env.DB.prepare(
      'SELECT id, code_hash FROM recovery_codes WHERE user_id = ? AND used = 0'
    ).bind(user.id).all<{ id: number; code_hash: string }>();

    // F-A1 (Session 118 anti-enum cluster scope-rectification):
    // 旧コードは「該当 user が recovery_codes 未設定」case を 401 recovery.noCodes で
    // 返却していたが、未登録 user (401 auth.emailOrRecoveryCodeInvalid) と error key が
    // 異なるため state leak。401 auth.emailOrRecoveryCodeInvalid に統一して
    // 「user 存在 AND recovery code 未設定」path を識別不能化。
    if (!recoveryCodes.results || recoveryCodes.results.length === 0) {
      return errorJson(c, 'auth.emailOrRecoveryCodeInvalid', 401);
    }

    // コードを検証
    let validCodeId: number | null = null;
    for (const recoveryCode of recoveryCodes.results) {
      const { valid } = await verifyPassword(code, recoveryCode.code_hash);
      if (valid) {
        validCodeId = recoveryCode.id;
        break;
      }
    }

    if (!validCodeId) {
      return errorJson(c, 'auth.emailOrRecoveryCodeInvalid', 401);
    }

    // F-A1 (Session 118 anti-enum cluster scope-rectification):
    // F-9 gate (旧 line 108-110) は code verification 前にあり、未登録 user (401) vs
    // 既存 unverified user + bad code (403 auth.emailNotVerified) で state leak していた。
    // 本 fix で code verification 成功後に defer (auth.ts:230-238 / 2fa.ts:101 RB-4 pattern)、
    // 失敗 path は uniform 401 auth.emailOrRecoveryCodeInvalid、成功時のみ unverified
    // user の UX 救済 (403 + needsVerification) を trigger。
    if (!user.email_verified) {
      return errorJson(c, 'auth.emailNotVerified', 403, { needsVerification: true });
    }

    // 生徒ログイン制限: student かつクラス未所属ならログイン不可
    // case 19 cluster (BE-1) 第112回: auth.ts:221 / passkey.ts:337 / 2fa.ts (本 commit) と同 pattern。
    // recovery code 消費前 (使用済みマークしない) で reject、student が gate に引っかかった場合
    // recovery code は次回も使用可能。
    // F-3 (Session 123): inline c.json + JA hardcoded を errorJson + 5 lang i18n 化、
    // cross-endpoint shape uniformity 達成 (auth.studentNotInClass)
    if (user.account_type === 'student') {
      const membership = await c.env.DB.prepare(
        'SELECT COUNT(*) AS n FROM class_members WHERE user_id = ?'
      ).bind(user.id).first<{ n: number }>();

      if (!membership || membership.n === 0) {
        return errorJson(c, 'auth.studentNotInClass', 403);
      }
    }

    // リカバリーコードを使用済みにマーク
    await c.env.DB.prepare(
      'UPDATE recovery_codes SET used = 1, used_at = datetime(\'now\') WHERE id = ?'
    ).bind(validCodeId).run();

    // JWTトークンペア生成（auth.tsと同じ方式）
    const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
      { userId: user.id, email: user.email },
      c.env.JWT_SECRET
    );

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30日

    // Refresh token保存
    const encoder = new TextEncoder();
    const data = encoder.encode(refreshToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await c.env.DB.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, tokenHash, expiresAt).run();

    // 最終ログイン日時を更新
    await c.env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
    ).bind(user.id).run();

    return c.json({
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
      },
      message: 'リカバリーコードでログインしました。新しいパスキーを登録してください。',
    });
  } catch (error) {
    console.error('Recovery code verification error:', error);
    return errorJson(c, 'recovery.verifyFailed', 500);
  }
});

// POST /api/auth/recovery-codes/regenerate
// 全てのリカバリーコードを再生成
recoveryCodes.post('/regenerate', authMiddleware, async (c) => {
  const user = c.get('user');
  const userId = user.userId;

  try {
    // 既存のリカバリーコードを全て削除
    await c.env.DB.prepare(
      'DELETE FROM recovery_codes WHERE user_id = ?'
    ).bind(userId).run();

    // 10個の新しいリカバリーコードを生成
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = generateRecoveryCode();
      const codeHash = await hashPassword(code, RECOVERY_CODE_ITERATIONS);

      await c.env.DB.prepare(
        'INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)'
      ).bind(userId, codeHash).run();

      codes.push(code);
    }

    return c.json({
      codes,
      message: '新しいリカバリーコードを生成しました。古いコードは無効になりました。',
    });
  } catch (error) {
    console.error('Recovery code regeneration error:', error);
    return errorJson(c, 'recovery.regenFailed', 500);
  }
});

export default recoveryCodes;
