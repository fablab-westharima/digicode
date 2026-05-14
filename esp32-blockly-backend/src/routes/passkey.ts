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
import type { Bindings, Variables } from '../types/env';

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

// リフレッシュトークンのハッシュ化（SHA-256、auth.ts / 2fa.ts と同実装）
// F-4 fix: 旧コードは refreshToken を平文で DB 保存していたため修正
async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    // D-2 (Session 120): Workers Logs PII redaction.
    // 旧コードは userId + email + origin + RP_ID を unconditional log していたため
    // CF アカウントアクセス権を持つ全員に email + userId pair が露出していた。
    // 登録成功は metric (count) で十分、debug が必要な場合は req correlation id で
    // server-side のみで join する。

    // ユーザーの既存パスキーを取得
    const existingAuthenticators = await c.env.DB.prepare(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
    )
      .bind(user.userId)
      .all();

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

    // ChallengeをKVに5分間保存 (D-2: challenge prefix log 削除、KV save 通知も除去)
    await c.env.WEBAUTHN_CHALLENGES.put(
      `${user.userId}:register`,
      options.challenge,
      { expirationTtl: 300 }
    );

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
      // finding-3 (Session 122): inline c.json + 英語直書きを errorJson + 5 lang i18n
      // 化。/login/options 側 (L344-346) は anti-enum silent reject で
      // auth.authenticationFailed 統一だが、/register/verify は authMiddleware
      // 通過後 (登録中 user) に KV 5min TTL 切れで起きる UX エラーなので、
      // 明示的 i18n message で「もう一度お試しください」と提示する。
      return errorJson(c, 'passkey.challengeExpired', 400);
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
    // D-2 (Session 120): registeredCredential struct dump 削除。
    // 旧コードは public key + counter 等を log していたが、Workers Logs に
    // 認証器の素材が残るのは defense-in-depth 違反。debug が必要な場合は
    // local dev のみで log を一時復活させる。

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
// RB-3 (Session 117 anti-enum cluster):
// /check-passkey-mode (auth.ts:283) と同 silent success pattern。
// user 不在 / passkey 不在の case でも 200 + 空 allowCredentials で options を返却し、
// challenge を KV に保存 (anonymous key)。攻撃者は 200 のみ観測でき、user 存在 / passkey
// 登録状態を区別不能。後段の /login/verify で認証失敗として silent reject される。
app.post('/login/options', async (c) => {
  try {
    const origin = c.req.header('origin');
    const rpId = getRpId(origin);
    const { email } = await c.req.json();

    if (!email) {
      return errorJson(c, 'auth.emailRequired', 400);
    }

    // ユーザーを取得 (不在でも options 生成は続行)
    const userResult = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allowCredentials: any[] = [];
    let kvKey: string;

    if (userResult) {
      const userId = userResult.id as number;
      const authenticators = await c.env.DB.prepare(
        'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
      )
        .bind(userId)
        .all();

      allowCredentials = authenticators.results.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key' as const,
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      }));
      kvKey = `${userId}:login`;
    } else {
      // 不在 user 用 dummy KV key (email を SHA-256 で hash して衝突回避、後段 verify で
      // user 検索失敗時に silent reject される)
      const encoder = new TextEncoder();
      const data = encoder.encode(email);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const emailHash = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16);
      kvKey = `anonymous:${emailHash}:login`;
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000,
    });

    // ChallengeをKVに5分間保存
    await c.env.WEBAUTHN_CHALLENGES.put(kvKey, options.challenge, {
      expirationTtl: 300,
    });

    return c.json(options);
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return errorJson(c, 'passkey.optionsGenFailed', 500);
  }
});

// パスキー認証検証
// RB-3 (Session 117 anti-enum cluster):
// credential 検証成功までの失敗 path 全件で uniform 401 'auth.authenticationFailed' を返却。
// email_verified / student gate は credential 検証成功後にのみ判定 (UX 救済 path 維持)。
// /login/options が anonymous KV key で silent success 化されたため、verify 段階で
// 全ての invalid request を一様な response で reject する。
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

    // ユーザーを取得 (不在は silent reject)
    const userResult = await c.env.DB.prepare(
      'SELECT id, email, email_verified, passkey_only, account_type FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    if (!userResult) {
      return errorJson(c, 'auth.authenticationFailed', 401);
    }

    const userId = userResult.id as number;
    const emailVerified = userResult.email_verified as number;
    const accountType = userResult.account_type as string | null;

    // KVからChallengeを取得 (不在は silent reject = anonymous flow / TTL 切れ含む)
    const expectedChallenge = await c.env.WEBAUTHN_CHALLENGES.get(
      `${userId}:login`
    );

    if (!expectedChallenge) {
      return errorJson(c, 'auth.authenticationFailed', 401);
    }

    // Challengeを削除（使い捨て）
    await c.env.WEBAUTHN_CHALLENGES.delete(`${userId}:login`);

    // credentialIDをBase64URLエンコード
    const credentialIDBase64 = credential.id;

    // DBから認証器を取得 (不在は silent reject)
    const authenticator = await c.env.DB.prepare(
      'SELECT id, public_key, counter FROM authenticators WHERE user_id = ? AND credential_id = ?'
    )
      .bind(userId, credentialIDBase64)
      .first();

    if (!authenticator) {
      return errorJson(c, 'auth.authenticationFailed', 401);
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
      return errorJson(c, 'auth.authenticationFailed', 401);
    }

    // credential 検証成功 — ここから user 状態を返却 (anti-enum 通過済)

    // メール未確認チェック (検証成功後のみ判定 = UX 救済 path 維持、auth.ts / 2fa.ts と同 pattern)
    if (!emailVerified) {
      return errorJson(c, 'auth.emailNotVerified', 403, { needsVerification: true });
    }

    // 生徒ログイン制限: student かつクラス未所属ならログイン不可 (検証成功後)
    // F-5 fix: auth.ts:220-230 pattern を passkey login にも適用
    // F-3 (Session 123): inline c.json + JA hardcoded を errorJson + 5 lang i18n 化、
    // cross-endpoint shape uniformity 達成 (auth.studentNotInClass)
    if (accountType === 'student') {
      const membership = await c.env.DB.prepare(
        'SELECT COUNT(*) AS n FROM class_members WHERE user_id = ?'
      ).bind(userId).first<{ n: number }>();

      if (!membership || membership.n === 0) {
        return errorJson(c, 'auth.studentNotInClass', 403);
      }
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

    // リフレッシュトークンをDBに保存（SHA-256 ハッシュ化、auth.ts / 2fa.ts と同 pattern）
    // F-4 fix: 旧コードは refreshToken 平文で保存していた = DB compromise 時に sessions hijack 可能
    const tokenHash = await hashRefreshToken(refreshToken);
    await c.env.DB.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    )
      .bind(
        userId,
        tokenHash,
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
