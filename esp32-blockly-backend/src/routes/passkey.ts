import { Hono } from 'hono';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server/script/deps';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  PASSKEY_CHALLENGES: KVNamespace;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
};

const passkey = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// RP (Relying Party) 設定
const RP_NAME = 'DigiCode';
const RP_ID = process.env.NODE_ENV === 'production'
  ? 'digicode-frontend.pages.dev'
  : 'localhost';
const ORIGIN = process.env.NODE_ENV === 'production'
  ? 'https://digicode-frontend.pages.dev'
  : 'http://localhost:5173';

// チャレンジのTTL（5分）
const CHALLENGE_TTL = 300;

// Cloudflare Workers用のBase64エンコード/デコードヘルパー
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// 標準base64をUint8Arrayに変換（public_key用）
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// base64urlをUint8Arrayに変換（credential_id用）
function base64urlToUint8Array(base64url: string): Uint8Array {
  // base64url を標準 base64 に変換
  let base64Standard = base64url.replace(/-/g, '+').replace(/_/g, '/');

  // パディングを追加
  const padding = base64Standard.length % 4;
  if (padding > 0) {
    base64Standard += '='.repeat(4 - padding);
  }

  const binary = atob(base64Standard);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * POST /api/auth/passkey/register/options
 * パスキー登録のオプション生成
 * 認証済みユーザーのみアクセス可能
 */
passkey.post('/register/options', authMiddleware, async (c) => {
  try {
    const { userId, email } = c.get('user');

    // ユーザー情報を取得
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    // 既存の認証器を取得
    const existingAuthenticators = await c.env.DB.prepare(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
    ).bind(userId).all();

    // 除外する認証器のリスト
    const excludeCredentials = existingAuthenticators.results.map((auth: any) => ({
      id: auth.credential_id,
      type: 'public-key' as const,
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    }));

    // 登録オプションを生成
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(userId.toString()),
      userName: email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // チャレンジをKVに保存（5分間有効）
    const challengeKey = `register:${userId}`;
    await c.env.PASSKEY_CHALLENGES.put(
      challengeKey,
      options.challenge,
      { expirationTtl: CHALLENGE_TTL }
    );

    return c.json(options);
  } catch (error) {
    console.error('Error generating registration options:', error);
    return c.json({ error: '登録オプションの生成に失敗しました' }, 500);
  }
});

/**
 * POST /api/auth/passkey/register/verify
 * パスキー登録の検証
 * 認証済みユーザーのみアクセス可能
 */
passkey.post('/register/verify', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const body = await c.req.json<RegistrationResponseJSON>();

    // KVから保存されたチャレンジを取得
    const challengeKey = `register:${userId}`;
    const expectedChallenge = await c.env.PASSKEY_CHALLENGES.get(challengeKey);

    if (!expectedChallenge) {
      return c.json({ error: 'チャレンジが見つかりません。再度お試しください。' }, 400);
    }

    // チャレンジを削除（1回のみ使用可能）
    await c.env.PASSKEY_CHALLENGES.delete(challengeKey);

    // 登録レスポンスを検証
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ error: '検証に失敗しました' }, 400);
    }

    // v13: credential オブジェクトから取得
    const { credential } = verification.registrationInfo;
    const { id: credentialIdBase64, publicKey, counter } = credential;

    // 認証器情報をデータベースに保存
    // id は既にbase64文字列なのでそのまま使用
    const publicKeyBase64 = uint8ArrayToBase64(publicKey);
    const transports = body.response.transports
      ? JSON.stringify(body.response.transports)
      : null;

    await c.env.DB.prepare(`
      INSERT INTO authenticators (
        user_id, credential_id, public_key, counter, transports, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      userId,
      credentialIdBase64,
      publicKeyBase64,
      counter,
      transports
    ).run();

    return c.json({
      verified: true,
      message: 'パスキーが正常に登録されました'
    });
  } catch (error) {
    console.error('Error verifying registration:', error);
    return c.json({ error: '登録の検証に失敗しました' }, 500);
  }
});

/**
 * POST /api/auth/passkey/login/options
 * パスキーログインのオプション生成
 * 認証不要（ログイン前）
 */
passkey.post('/login/options', async (c) => {
  try {
    const { email } = await c.req.json<{ email: string }>();

    if (!email) {
      return c.json({ error: 'メールアドレスが必要です' }, 400);
    }

    // ユーザー情報を取得
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合も同じレスポンスを返す
      return c.json({ error: 'メールアドレスまたはパスキーが正しくありません' }, 401);
    }

    const userId = user.id as number;

    // ユーザーの認証器を取得
    const authenticators = await c.env.DB.prepare(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
    ).bind(userId).all();

    if (authenticators.results.length === 0) {
      return c.json({ error: 'パスキーが登録されていません' }, 400);
    }

    // 許可する認証器のリスト
    const allowCredentials = authenticators.results.map((auth: any) => ({
      id: auth.credential_id,
      type: 'public-key' as const,
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    }));

    // 認証オプションを生成
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // チャレンジをKVに保存（5分間有効）
    const challengeKey = `login:${userId}`;
    await c.env.PASSKEY_CHALLENGES.put(
      challengeKey,
      options.challenge,
      { expirationTtl: CHALLENGE_TTL }
    );

    // ユーザーIDも一緒に返す（verify時に必要）
    return c.json({ ...options, userId });
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return c.json({ error: 'ログインオプションの生成に失敗しました' }, 500);
  }
});

/**
 * POST /api/auth/passkey/login/verify
 * パスキーログインの検証
 * 認証不要（ログイン前）
 */
passkey.post('/login/verify', async (c) => {
  try {
    const body = await c.req.json<AuthenticationResponseJSON & { userId: number }>();
    const { userId, ...authResponse } = body;

    if (!userId) {
      return c.json({ error: 'ユーザーIDが必要です' }, 400);
    }

    // KVから保存されたチャレンジを取得
    const challengeKey = `login:${userId}`;
    const expectedChallenge = await c.env.PASSKEY_CHALLENGES.get(challengeKey);

    if (!expectedChallenge) {
      return c.json({ error: 'チャレンジが見つかりません。再度お試しください。' }, 400);
    }

    // チャレンジを削除（1回のみ使用可能）
    await c.env.PASSKEY_CHALLENGES.delete(challengeKey);

    // 認証器情報を取得
    const credentialIdBase64 = authResponse.id;
    console.log('Login: Looking for credential_id:', credentialIdBase64, 'userId:', userId);

    const authenticator = await c.env.DB.prepare(
      'SELECT id, credential_id, public_key, counter FROM authenticators WHERE credential_id = ? AND user_id = ?'
    ).bind(credentialIdBase64, userId).first();

    console.log('Login: Found authenticator:', authenticator);

    if (!authenticator) {
      return c.json({ error: '認証器が見つかりません' }, 404);
    }

    // Base64デコード（デバッグログ追加）
    console.log('Decoding public_key:', authenticator.public_key);
    console.log('Decoding credential_id:', credentialIdBase64);
    console.log('Counter value:', authenticator.counter);

    let credentialPublicKey: Uint8Array;
    let credentialID: Uint8Array;

    try {
      credentialPublicKey = base64ToUint8Array(authenticator.public_key as string);
      console.log('Public key decoded successfully, length:', credentialPublicKey.length);
    } catch (error) {
      console.error('Failed to decode public_key:', error);
      return c.json({ error: '公開鍵のデコードに失敗しました' }, 500);
    }

    try {
      credentialID = base64urlToUint8Array(credentialIdBase64);
      console.log('Credential ID decoded successfully, length:', credentialID.length);
    } catch (error) {
      console.error('Failed to decode credential_id:', error);
      return c.json({ error: '認証情報IDのデコードに失敗しました' }, 500);
    }

    // 認証レスポンスを検証
    console.log('Calling verifyAuthenticationResponse with:', {
      credentialIDLength: credentialID.length,
      credentialPublicKeyLength: credentialPublicKey.length,
      counter: authenticator.counter as number,
    });

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credentialID,
        publicKey: credentialPublicKey,
        counter: authenticator.counter as number,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return c.json({ error: '検証に失敗しました' }, 400);
    }

    // カウンターを更新
    const newCounter = verification.authenticationInfo.newCounter;
    await c.env.DB.prepare(
      'UPDATE authenticators SET counter = ?, last_used_at = datetime(\'now\') WHERE id = ?'
    ).bind(newCounter, authenticator.id).run();

    // ユーザー情報を取得してJWTトークンを生成
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    // JWT トークンを生成（既存のauth.tsと同じロジック）
    // TODO: JWT生成ロジックを共通化
    const { generateTokenPair } = await import('../utils/jwt');
    const { accessToken, refreshToken } = await generateTokenPair(
      { userId: user.id as number, email: user.email as string },
      c.env.JWT_SECRET
    );

    return c.json({
      verified: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return c.json({ error: 'ログインの検証に失敗しました' }, 500);
  }
});

// パスキー一覧取得 (認証済みユーザーのみ)
passkey.get('/list', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // ユーザーの全パスキーを取得
    const passkeys = await c.env.DB.prepare(
      'SELECT id, device_name AS deviceName, created_at AS createdAt, last_used_at AS lastUsedAt FROM authenticators WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

    return c.json({ passkeys: passkeys.results || [] });
  } catch (error) {
    console.error('Error fetching passkeys:', error);
    return c.json({ error: 'パスキーの取得に失敗しました' }, 500);
  }
});

// パスキー削除 (認証済みユーザーのみ)
passkey.delete('/:id', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const passkeyId = c.req.param('id');

    // パスキーがユーザーに属していることを確認
    const passkey = await c.env.DB.prepare(
      'SELECT id FROM authenticators WHERE id = ? AND user_id = ?'
    )
      .bind(passkeyId, userId)
      .first();

    if (!passkey) {
      return c.json({ error: 'パスキーが見つかりません' }, 404);
    }

    // パスキーを削除
    await c.env.DB.prepare('DELETE FROM authenticators WHERE id = ? AND user_id = ?')
      .bind(passkeyId, userId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting passkey:', error);
    return c.json({ error: 'パスキーの削除に失敗しました' }, 500);
  }
});

export default passkey;
