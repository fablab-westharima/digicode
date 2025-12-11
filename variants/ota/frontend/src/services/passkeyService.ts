// Passkey (WebAuthn) authentication service for DigiCode
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import { setTokens } from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

/**
 * パスキー情報の型定義
 */
export interface PasskeyInfo {
  id: number;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * パスキー登録の結果
 */
export interface RegisterPasskeyResult {
  success: boolean;
  error?: string;
}

/**
 * パスキーログインの結果
 */
export interface LoginWithPasskeyResult {
  success: boolean;
  user?: {
    id: number;
    email: string;
  };
  error?: string;
}

/**
 * パスキーを登録する
 *
 * 前提条件:
 * - ユーザーは既にログイン済み（JWT accessTokenが必要）
 * - localStorageにaccessTokenが保存されている
 *
 * フロー:
 * 1. バックエンドから登録オプションを取得
 * 2. ブラウザのWebAuthn APIで認証器を登録
 * 3. バックエンドで検証
 *
 * @returns {Promise<RegisterPasskeyResult>} 登録結果
 */
export async function registerPasskey(): Promise<RegisterPasskeyResult> {
  try {
    // Step 1: 登録オプションを取得
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      return {
        success: false,
        error: 'ログインが必要です',
      };
    }

    const optionsResponse = await fetch(
      `${API_URL}/api/auth/passkey/register/options`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return {
        success: false,
        error: error.error || '登録オプションの取得に失敗しました',
      };
    }

    const options: PublicKeyCredentialCreationOptionsJSON =
      await optionsResponse.json();

    // Step 2: ブラウザのWebAuthn APIで認証器を登録
    let registrationResponse: RegistrationResponseJSON;
    try {
      registrationResponse = await startRegistration(options);
    } catch (error) {
      console.error('Passkey registration error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'パスキーの登録をキャンセルしました',
      };
    }

    // Step 3: バックエンドで検証
    const verificationResponse = await fetch(
      `${API_URL}/api/auth/passkey/register/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(registrationResponse),
      }
    );

    if (!verificationResponse.ok) {
      const error = await verificationResponse.json();
      return {
        success: false,
        error: error.error || '登録の検証に失敗しました',
      };
    }

    const result = await verificationResponse.json();
    return {
      success: result.verified,
      error: result.verified ? undefined : '登録に失敗しました',
    };
  } catch (error) {
    console.error('registerPasskey error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'パスキーの登録中にエラーが発生しました',
    };
  }
}

/**
 * パスキーでログインする
 *
 * フロー:
 * 1. メールアドレスを元にログインオプションを取得
 * 2. ブラウザのWebAuthn APIで認証
 * 3. バックエンドで検証し、JWTトークンを取得
 * 4. トークンをlocalStorageに保存
 *
 * @param {string} email - ユーザーのメールアドレス
 * @returns {Promise<LoginWithPasskeyResult>} ログイン結果
 */
export async function loginWithPasskey(
  email: string
): Promise<LoginWithPasskeyResult> {
  try {
    // Step 1: ログインオプションを取得
    const optionsResponse = await fetch(
      `${API_URL}/api/auth/passkey/login/options`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      }
    );

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return {
        success: false,
        error: error.error || 'ログインオプションの取得に失敗しました',
      };
    }

    const optionsData = await optionsResponse.json();
    const { userId, ...options } = optionsData;
    const authOptions: PublicKeyCredentialRequestOptionsJSON = options;

    // Step 2: ブラウザのWebAuthn APIで認証
    let authenticationResponse: AuthenticationResponseJSON;
    try {
      authenticationResponse = await startAuthentication(authOptions);
    } catch (error) {
      console.error('Passkey authentication error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'パスキーでの認証をキャンセルしました',
      };
    }

    // Step 3: バックエンドで検証
    const verificationResponse = await fetch(
      `${API_URL}/api/auth/passkey/login/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...authenticationResponse,
          userId,
        }),
      }
    );

    if (!verificationResponse.ok) {
      const error = await verificationResponse.json();
      return {
        success: false,
        error: error.error || 'ログインの検証に失敗しました',
      };
    }

    const result = await verificationResponse.json();

    if (!result.verified || !result.accessToken) {
      return {
        success: false,
        error: 'ログインに失敗しました',
      };
    }

    // Step 4: トークンを保存
    setTokens(result.accessToken, result.refreshToken);

    return {
      success: true,
      user: result.user,
    };
  } catch (error) {
    console.error('loginWithPasskey error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'ログイン中にエラーが発生しました',
    };
  }
}

/**
 * 登録済みパスキーの一覧を取得する
 *
 * 前提条件:
 * - ユーザーはログイン済み（JWT accessTokenが必要）
 *
 * @returns {Promise<PasskeyInfo[]>} 登録済みパスキーの一覧
 */
export async function listPasskeys(): Promise<PasskeyInfo[]> {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('ログインが必要です');
    }

    const response = await fetch(`${API_URL}/api/auth/passkey/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'パスキー一覧の取得に失敗しました');
    }

    const data = await response.json();
    return data.passkeys || [];
  } catch (error) {
    console.error('listPasskeys error:', error);
    throw error;
  }
}

/**
 * パスキーを削除する
 *
 * 前提条件:
 * - ユーザーはログイン済み（JWT accessTokenが必要）
 *
 * @param {number} passkeyId - 削除するパスキーのID
 * @returns {Promise<void>}
 */
export async function deletePasskey(passkeyId: number): Promise<void> {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('ログインが必要です');
    }

    const response = await fetch(
      `${API_URL}/api/auth/passkey/${passkeyId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'パスキーの削除に失敗しました');
    }
  } catch (error) {
    console.error('deletePasskey error:', error);
    throw error;
  }
}
