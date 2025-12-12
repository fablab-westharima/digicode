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
} from '@simplewebauthn/types';
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
const RP_ID = 'digicode.pages.dev'; // 本番ドメイン
// 開発環境の場合はlocalhostも許可する必要があるが、ここでは本番を優先

// パスキー登録オプション生成
app.post('/register/options', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // ユーザーの既存パスキーを取得
    const existingAuthenticators = await c.env.DB.prepare(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
    )
      .bind(user.userId)
      .all();

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.userId.toString(),
      userName: user.email,
      userDisplayName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'preferred',
      },
      excludeCredentials: existingAuthenticators.results.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      timeout: 60000,
    });

    // ChallengeをKVに5分間保存
    await c.env.WEBAUTHN_CHALLENGES.put(
      `${user.userId}:register`,
      options.challenge,
      { expirationTtl: 300 }
    );

    return c.json(options);
  } catch (error) {
    console.error('Error generating registration options:', error);
    return c.json(
      { error: 'パスキー登録オプションの生成に失敗しました' },
      500
    );
  }
});

// パスキー登録検証
app.post('/register/verify', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
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
      expectedOrigin: `https://${RP_ID}`,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ error: 'パスキーの検証に失敗しました' }, 400);
    }

    const { credentialID, credentialPublicKey, counter } =
      verification.registrationInfo;

    // credentialIDをBase64URLエンコード
    const credentialIDBase64 = Buffer.from(credentialID).toString('base64url');
    const publicKeyBase64 = Buffer.from(credentialPublicKey).toString(
      'base64url'
    );

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
        counter,
        credential.response.transports
          ? JSON.stringify(credential.response.transports)
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
    return c.json({ error: 'パスキーの登録に失敗しました' }, 500);
  }
});

// パスキー認証オプション生成
app.post('/login/options', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'メールアドレスが必要です' }, 400);
    }

    // ユーザーを取得
    const userResult = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    if (!userResult) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    const userId = userResult.id as number;

    // ユーザーのパスキーを取得
    const authenticators = await c.env.DB.prepare(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = ?'
    )
      .bind(userId)
      .all();

    if (authenticators.results.length === 0) {
      return c.json({ error: 'パスキーが登録されていません' }, 404);
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: authenticators.results.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      userVerification: 'preferred',
      timeout: 60000,
    });

    // ChallengeをKVに5分間保存
    await c.env.WEBAUTHN_CHALLENGES.put(
      `${userId}:login`,
      options.challenge,
      { expirationTtl: 300 }
    );

    return c.json(options);
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return c.json(
      { error: 'パスキー認証オプションの生成に失敗しました' },
      500
    );
  }
});

// パスキー認証検証
app.post('/login/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { email, credential } = body as {
      email: string;
      credential: AuthenticationResponseJSON;
    };

    if (!email || !credential) {
      return c.json({ error: 'メールアドレスとクレデンシャルが必要です' }, 400);
    }

    // ユーザーを取得
    const userResult = await c.env.DB.prepare(
      'SELECT id, email, email_verified FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    if (!userResult) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    const userId = userResult.id as number;
    const emailVerified = userResult.email_verified as number;

    // メール確認チェック
    if (!emailVerified) {
      return c.json(
        { error: 'メールアドレスが確認されていません' },
        403
      );
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

    // DBから認証器を取得
    const authenticator = await c.env.DB.prepare(
      'SELECT id, public_key, counter FROM authenticators WHERE user_id = ? AND credential_id = ?'
    )
      .bind(userId, credentialIDBase64)
      .first();

    if (!authenticator) {
      return c.json({ error: 'パスキーが見つかりません' }, 404);
    }

    const publicKeyBuffer = Buffer.from(
      authenticator.public_key as string,
      'base64url'
    );

    // 検証
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: `https://${RP_ID}`,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(credentialIDBase64, 'base64url'),
        credentialPublicKey: publicKeyBuffer,
        counter: authenticator.counter as number,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return c.json({ error: 'パスキーの検証に失敗しました' }, 400);
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
    const refreshToken = await generateRefreshToken(
      { userId, email: userResult.email as string },
      c.env.JWT_SECRET
    );

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

    return c.json({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: userId,
        email: userResult.email,
      },
    });
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return c.json({ error: 'パスキー認証に失敗しました' }, 500);
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
    return c.json({ error: 'パスキー一覧の取得に失敗しました' }, 500);
  }
});

// パスキー削除
app.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const authenticatorId = parseInt(c.req.param('id'));

    if (isNaN(authenticatorId)) {
      return c.json({ error: '無効なIDです' }, 400);
    }

    // 認証器がユーザーのものか確認
    const authenticator = await c.env.DB.prepare(
      'SELECT id FROM authenticators WHERE id = ? AND user_id = ?'
    )
      .bind(authenticatorId, user.userId)
      .first();

    if (!authenticator) {
      return c.json({ error: 'パスキーが見つかりません' }, 404);
    }

    // 削除
    await c.env.DB.prepare('DELETE FROM authenticators WHERE id = ?')
      .bind(authenticatorId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting authenticator:', error);
    return c.json({ error: 'パスキーの削除に失敗しました' }, 500);
  }
});

// パスキーのみモード設定
app.post('/set-only-mode', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { enabled } = await c.req.json();

    if (typeof enabled !== 'boolean') {
      return c.json({ error: 'enabledはboolean型である必要があります' }, 400);
    }

    // 有効化する場合、少なくとも1つのパスキーが登録されているか確認
    if (enabled) {
      const authenticatorCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM authenticators WHERE user_id = ?'
      )
        .bind(user.userId)
        .first();

      if (!authenticatorCount || (authenticatorCount.count as number) === 0) {
        return c.json(
          { error: 'パスキーのみモードを有効にするには、少なくとも1つのパスキーを登録してください' },
          400
        );
      }
    }

    // 更新
    await c.env.DB.prepare('UPDATE users SET passkey_only = ? WHERE id = ?')
      .bind(enabled ? 1 : 0, user.userId)
      .run();

    return c.json({ success: true, passkeyOnly: enabled });
  } catch (error) {
    console.error('Error setting passkey-only mode:', error);
    return c.json({ error: 'パスキーのみモードの設定に失敗しました' }, 500);
  }
});

export default app;
