import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Bindings } from '../index';
import { hashPassword, verifyPassword, RECOVERY_CODE_ITERATIONS } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';
import { errorJson } from '../utils/errorJson';

const recoveryCodes = new Hono<{ Bindings: Bindings }>();

// ランダムなリカバリーコード生成（XXXX-XXXX-XXXX形式）
// 紛らわしい文字を除外: 0(ゼロ), O(オー), I(アイ), 1(イチ), L(エル)
function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const segments = 3;
  const segmentLength = 4;

  const code = [];
  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      segment += chars[randomIndex];
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
      console.log('[Recovery Code Generate] Code:', code);
      const codeHash = await hashPassword(code, RECOVERY_CODE_ITERATIONS);
      console.log('[Recovery Code Generate] Hash:', codeHash);

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
    console.log('[Recovery Code Verify] Email:', email, 'Code:', code);

    // ユーザー取得
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first<{ id: number; email: string }>();

    if (!user) {
      console.log('[Recovery Code Verify] User not found');
      return errorJson(c, 'auth.emailOrRecoveryCodeInvalid', 401);
    }

    console.log('[Recovery Code Verify] User found:', user.id);

    // 未使用のリカバリーコードを全て取得
    const recoveryCodes = await c.env.DB.prepare(
      'SELECT id, code_hash FROM recovery_codes WHERE user_id = ? AND used = 0'
    ).bind(user.id).all<{ id: number; code_hash: string }>();

    console.log('[Recovery Code Verify] Recovery codes count:', recoveryCodes.results?.length || 0);

    if (!recoveryCodes.results || recoveryCodes.results.length === 0) {
      console.log('[Recovery Code Verify] No recovery codes found');
      return errorJson(c, 'recovery.noCodes', 401);
    }

    // コードを検証
    let validCodeId: number | null = null;
    for (const recoveryCode of recoveryCodes.results) {
      console.log('[Recovery Code Verify] Checking code ID:', recoveryCode.id);
      console.log('[Recovery Code Verify] Input code:', code);
      console.log('[Recovery Code Verify] Stored hash:', recoveryCode.code_hash);
      const { valid } = await verifyPassword(code, recoveryCode.code_hash);
      console.log('[Recovery Code Verify] Code valid:', valid);
      if (valid) {
        validCodeId = recoveryCode.id;
        break;
      }
    }

    if (!validCodeId) {
      console.log('[Recovery Code Verify] No valid code found');
      return errorJson(c, 'auth.emailOrRecoveryCodeInvalid', 401);
    }

    console.log('[Recovery Code Verify] Valid code ID:', validCodeId);

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
      console.log('[Recovery Code Generate] Code:', code);
      const codeHash = await hashPassword(code, RECOVERY_CODE_ITERATIONS);
      console.log('[Recovery Code Generate] Hash:', codeHash);

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
