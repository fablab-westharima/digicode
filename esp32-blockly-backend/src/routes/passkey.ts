import { Hono } from 'hono';
import { errorJson } from '../utils/errorJson';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  WEBAUTHN_CHALLENGES: KVNamespace;
  JWT_SECRET: string;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// WebAuthn設定
const RP_NAME = 'DigiCode';

// RP_IDを動的に取得する関数
function getRpId(origin: string | undefined): string {
  if (!origin) return 'code.fablab-westharima.jp';

  const url = new URL(origin);
  const hostname = url.hostname;

  // localhost判定
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }

  // originからホスト名を返す（動的対応）
  return hostname;
}

// Uint8ArrayをBase64URL文字列に変換（Cloudflare Workers用）
function uint8ArrayToBase64url(uint8Array: Uint8Array): string {
  // バイナリ文字列に変換
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }

  // Base64エンコード
  const base64 = btoa(binaryString);

  // Base64URLに変換（+を-に、/を_に、=を削除）
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Base64URL文字列をUint8Arrayに変換（Cloudflare Workers用）
function base64urlToUint8Array(base64url: string): Uint8Array {
  // Base64URLをBase64に変換（-を+に、_を/に）
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

  // パディング追加
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  // Base64デコード
  const binaryString = atob(base64);

  // Uint8Arrayに変換
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  return uint8Array;
}

// パスキー登録オプション生成
app.post('/register/options', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const origin = c.req.header('origin');
    const rpId = getRpId(origin);

    console.log('[Passkey Register] User:', user.userId, user.email);
    console.log('[Passkey Register] Origin:', origin);
    console.log('[Passkey Register] RP_ID:', rpId);

    // ユーザーの既存パスキーを取得
    const existingAuthenticators = await c.env.DB.prepare(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
    )
      .bind(user.userId)
      .all();

    console.log('[Passkey Register] Existing authenticators:', existingAuthenticators.results.length);

    // userIDをUint8Arrayに変換（Cloudflare WorkersではBufferが使えないのでTextEncoderを使用）
    // v13 API は Uint8Array<ArrayBuffer> を期待するため new Uint8Array() で明示再パック
    const userIdString = user.userId.toString();
    const userIdUint8Array = new Uint8Array(new TextEncoder().encode(userIdString));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userID: userIdUint8Array,
      userName: user.email,
      userDisplayName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: existingAuthenticators.results.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      timeout: 60000,
    });

    console.log('[Passkey Register] Generated options challenge:', options.challenge.substring(0, 20) + '...');

    // ChallengeをKVに5分間保存
    await c.env.WEBAUTHN_CHALLENGES.put(
      `${user.userId}:register`,
      options.challenge,
      { expirationTtl: 300 }
    );

    console.log('[Passkey Register] Challenge saved to KV');

    return c.json(options);
  } catch (error) {
    console.error('[Passkey Register] Error generating registration options:', error);
    console.error('[Passkey Register] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[Passkey Register] Error stack:', error instanceof Error ? error.stack : 'N/A');
    return c.json(
      { error: 'パスキー登録オプションの生成に失敗しました', details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
});

// パスキー登録検証
app.post('/register/verify', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const origin = c.req.header('origin');
    const rpId = getRpId(origin);
    const body = await c.req.json();
    const { credential, deviceName } = body as {
      credential: RegistrationResponseJSON;
      deviceName?: string;
    };

    // KVからChallengeを取得
    const expectedChallenge = await c.env.WEBAUTHN_CHALLENGES.get(
      `${user.userId}:register`
    );

    if (!expectedChallenge) {
      return c.json({ error: 'Challenge not found or expired' }, 400);
    }

    // Challengeを削除（使い捨て）
    await c.env.WEBAUTHN_CHALLENGES.delete(`${user.userId}:register`);

    // 検証
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin || `https://${rpId}`,
      expectedRPID: rpId,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return errorJson(c, 'passkey.verifyFailed', 400);
    }

    // v13では registrationInfo.credential の下にデータがある
    const { credential: registeredCredential } = verification.registrationInfo;
    console.log('[Passkey Register] registeredCredential:', registeredCredential);

    // v13では credential.id は既にBase64URL文字列
    // publicKey は Uint8Array なのでエンコードが必要
    const credentialIDBase64 = registeredCredential.id;
    const publicKeyBase64 = uint8ArrayToBase64url(registeredCredential.publicKey);

    // transportsからhybridを除外（QRコード表示を防ぐ）
    let transports = registeredCredential.transports;
    if (transports && Array.isArray(transports)) {
      transports = transports.filter((t: string) => t !== 'hybrid');
    }

    // DBに保存
    const result = await c.env.DB.prepare(
      `INSERT INTO authenticators (
        user_id, credential_id, public_key, counter, transports, device_name
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user.userId,
        credentialIDBase64,
        publicKeyBase64,
        registeredCredential.counter,
        transports && transports.length > 0
          ? JSON.stringify(transports)
          : null,
        deviceName || null
      )
      .run();

    return c.json({
      success: true,
      authenticatorId: result.meta.last_row_id,
    });
  } catch (error) {
    console.error('Error verifying registration:', error);
    return errorJson(c, 'passkey.registerFailed', 500);
  }
});

// パスキー認証オプション生成
app.post('/login/options', async (c) => {
  try {
    const origin = c.req.header('origin');
    const rpId = getRpId(origin);
    const { email } = await c.req.json();

    if (!email) {
      return errorJson(c, 'auth.emailRequired', 400);
    }

    // ユーザーを取得
    const userResult = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    if (!userResult) {
      return errorJson(c, 'auth.userNotFound', 404);
    }

    const userId = userResult.id as number;

    // ユーザーのパスキーを取得
    const authenticators = await c.env.DB.prepare(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
    )
      .bind(userId)
      .all();

    if (authenticators.results.length === 0) {
      return errorJson(c, 'passkey.notRegistered', 404);
    }

    console.log('[Passkey Login] User ID:', userId);
    console.log('[Passkey Login] RP_ID:', rpId);
    console.log('[Passkey Login] Origin:', origin);
    console.log('[Passkey Login] Authenticators:', JSON.stringify(authenticators.results));

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: authenticators.results.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      userVerification: 'preferred',
      timeout: 60000,
    });

    console.log('[Passkey Login] Generated options:', JSON.stringify(options));

    // ChallengeをKVに5分間保存
    await c.env.WEBAUTHN_CHALLENGES.put(
      `${userId}:login`,
      options.challenge,
      { expirationTtl: 300 }
    );

    return c.json(options);
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return errorJson(c, 'passkey.optionsGenFailed', 500);
  }
});

// パスキー認証検証
app.post('/login/verify', async (c) => {
  try {
    const origin = c.req.header('origin');
    const rpId = getRpId(origin);
    const body = await c.req.json();
    const { email, credential } = body as {
      email: string;
      credential: AuthenticationResponseJSON;
    };

    if (!email || !credential) {
      return errorJson(c, 'auth.emailAndCredentialRequired', 400);
    }

    // ユーザーを取得
    const userResult = await c.env.DB.prepare(
      'SELECT id, email, email_verified, passkey_only FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    if (!userResult) {
      return errorJson(c, 'auth.userNotFound', 404);
    }

    const userId = userResult.id as number;
    const emailVerified = userResult.email_verified as number;

    // メール確認チェック
    if (!emailVerified) {
      return errorJson(c, 'auth.emailNotVerified', 403);
    }

    // KVからChallengeを取得
    const expectedChallenge = await c.env.WEBAUTHN_CHALLENGES.get(
      `${userId}:login`
    );

    if (!expectedChallenge) {
      return c.json({ error: 'Challenge not found or expired' }, 400);
    }

    // Challengeを削除（使い捨て）
    await c.env.WEBAUTHN_CHALLENGES.delete(`${userId}:login`);

    // credentialIDをBase64URLエンコード
    const credentialIDBase64 = credential.id;

    console.log('[Passkey Login Verify] credential.id from browser:', credentialIDBase64);

    // DBから認証器を取得
    const authenticator = await c.env.DB.prepare(
      'SELECT id, public_key, counter FROM authenticators WHERE user_id = ? AND credential_id = ?'
    )
      .bind(userId, credentialIDBase64)
      .first();

    console.log('[Passkey Login Verify] authenticator from DB:', authenticator);

    if (!authenticator) {
      // デバッグ: ユーザーの全認証器を取得
      const allAuths = await c.env.DB.prepare(
        'SELECT credential_id FROM authenticators WHERE user_id = ?'
      ).bind(userId).all();
      console.log('[Passkey Login Verify] All authenticators for user:', JSON.stringify(allAuths.results));
      return errorJson(c, 'passkey.notFound', 404);
    }

    // Base64URLからUint8Arrayに変換（Cloudflare Workers対応）
    // v13: publicKey は Uint8Array<ArrayBuffer> 期待のため new Uint8Array() で明示再パック
    // v13: credential.id は Base64URLString (string) に変更されたため Uint8Array 変換不要
    const publicKeyBuffer = new Uint8Array(base64urlToUint8Array(authenticator.public_key as string));

    // 検証
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin || `https://${rpId}`,
      expectedRPID: rpId,
      credential: {
        id: credentialIDBase64,
        publicKey: publicKeyBuffer,
        counter: authenticator.counter as number,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return errorJson(c, 'passkey.verifyFailed', 400);
    }

    // カウンターを更新、last_used_atを更新
    await c.env.DB.prepare(
      'UPDATE authenticators SET counter = ?, last_used_at = datetime(\'now\') WHERE id = ?'
    )
      .bind(verification.authenticationInfo.newCounter, authenticator.id)
      .run();

    // JWTトークン生成
    const { generateToken, generateRefreshToken } = await import('../utils/jwt');
    const accessToken = await generateToken(
      { userId, email: userResult.email as string },
      c.env.JWT_SECRET
    );
    // generateRefreshToken は引数を取らない（opaque 32-byte hex）。
    // 旧コードは payload + secret を渡していたが JS が黙って drop しており runtime 動作は不変。
    // v13 API typecheck で表面化したため正しい signature に修正。
    const refreshToken = generateRefreshToken();

    // リフレッシュトークンをDBに保存
    await c.env.DB.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    )
      .bind(
        userId,
        refreshToken, // 本来はハッシュ化すべきだが、簡略化
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      )
      .run();

    // 最終ログイン日時を更新
    await c.env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
    ).bind(userId).run();

    return c.json({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: userId,
        email: userResult.email,
        passkeyOnly: userResult.passkey_only,
      },
    });
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return errorJson(c, 'passkey.authFailed', 500);
  }
});

// パスキー一覧取得
app.get('/list', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const authenticators = await c.env.DB.prepare(
      'SELECT id, device_name, created_at, last_used_at FROM authenticators WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(user.userId)
      .all();

    return c.json({
      authenticators: authenticators.results.map((auth: any) => ({
        id: auth.id,
        deviceName: auth.device_name || 'Unknown Device',
        createdAt: auth.created_at,
        lastUsedAt: auth.last_used_at,
      })),
    });
  } catch (error) {
    console.error('Error listing authenticators:', error);
    return errorJson(c, 'passkey.listFailed', 500);
  }
});

// パスキー削除
app.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const authenticatorId = parseInt(c.req.param('id'));

    if (isNaN(authenticatorId)) {
      return errorJson(c, 'validation.invalidId', 400);
    }

    // 認証器がユーザーのものか確認
    const authenticator = await c.env.DB.prepare(
      'SELECT id FROM authenticators WHERE id = ? AND user_id = ?'
    )
      .bind(authenticatorId, user.userId)
      .first();

    if (!authenticator) {
      return errorJson(c, 'passkey.notFound', 404);
    }

    // 削除
    await c.env.DB.prepare('DELETE FROM authenticators WHERE id = ?')
      .bind(authenticatorId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting authenticator:', error);
    return errorJson(c, 'passkey.deleteFailed', 500);
  }
});

// パスキーのみモード設定
app.post('/set-only-mode', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { enabled } = await c.req.json();

    if (typeof enabled !== 'boolean') {
      return errorJson(c, 'validation.enabledMustBeBoolean', 400);
    }

    // 有効化する場合、少なくとも1つのパスキーが登録されているか確認
    if (enabled) {
      const authenticatorCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM authenticators WHERE user_id = ?'
      )
        .bind(user.userId)
        .first();

      if (!authenticatorCount || (authenticatorCount.count as number) === 0) {
        return errorJson(c, 'passkey.onlyModeRequiresOne', 400);
      }
    }

    // 更新
    await c.env.DB.prepare('UPDATE users SET passkey_only = ? WHERE id = ?')
      .bind(enabled ? 1 : 0, user.userId)
      .run();

    return c.json({ success: true, passkeyOnly: enabled });
  } catch (error) {
    console.error('Error setting passkey-only mode:', error);
    return errorJson(c, 'passkey.onlyModeSetFailed', 500);
  }
});

export default app;
