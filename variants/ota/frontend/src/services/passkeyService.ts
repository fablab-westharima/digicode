import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

/**
 * ブラウザがパスキーをサポートしているかチェック
 */
export function isPasskeySupported(): boolean {
  return browserSupportsWebAuthn();
}

/**
 * パスキーを登録
 * @param deviceName デバイス名（省略可）
 * @returns 登録されたパスキーのID
 */
export async function registerPasskey(deviceName?: string): Promise<number> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('ログインが必要です');
  }

  // Step 1: 登録オプションを取得
  const optionsResponse = await fetch(`${API_BASE_URL}/api/auth/passkey/register/options`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!optionsResponse.ok) {
    const error = await optionsResponse.json();
    throw new Error(error.error || 'パスキー登録オプションの取得に失敗しました');
  }

  const options: PublicKeyCredentialCreationOptionsJSON = await optionsResponse.json();

  // Step 2: ブラウザのWebAuthn APIで認証器を登録
  let credential: RegistrationResponseJSON;
  try {
    credential = await startRegistration(options);
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error('パスキー登録がキャンセルされました');
    }
    throw error;
  }

  // Step 3: サーバーで検証
  const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/passkey/register/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credential,
      deviceName,
    }),
  });

  if (!verifyResponse.ok) {
    const error = await verifyResponse.json();
    throw new Error(error.error || 'パスキーの検証に失敗しました');
  }

  const result = await verifyResponse.json();
  return result.authenticatorId;
}

/**
 * パスキーで認証
 * @param email メールアドレス
 * @returns アクセストークン等
 */
export async function authenticateWithPasskey(email: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: number; email: string };
}> {
  // Step 1: 認証オプションを取得
  const optionsResponse = await fetch(`${API_BASE_URL}/api/auth/passkey/login/options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!optionsResponse.ok) {
    const error = await optionsResponse.json();
    throw new Error(error.error || 'パスキー認証オプションの取得に失敗しました');
  }

  const options: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();

  // Step 2: ブラウザのWebAuthn APIで認証
  let credential: AuthenticationResponseJSON;
  try {
    credential = await startAuthentication(options);
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error('パスキー認証がキャンセルされました');
    }
    throw error;
  }

  // Step 3: サーバーで検証
  const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/passkey/login/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      credential,
    }),
  });

  if (!verifyResponse.ok) {
    const error = await verifyResponse.json();
    throw new Error(error.error || 'パスキー認証に失敗しました');
  }

  const result = await verifyResponse.json();

  // トークンをlocalStorageに保存
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);

  return result;
}

/**
 * パスキー一覧を取得
 */
export async function listPasskeys(): Promise<Array<{
  id: number;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}>> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('ログインが必要です');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/passkey/list`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'パスキー一覧の取得に失敗しました');
  }

  const result = await response.json();
  return result.authenticators;
}

/**
 * パスキーを削除
 * @param id パスキーID
 */
export async function deletePasskey(id: number): Promise<void> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('ログインが必要です');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/passkey/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'パスキーの削除に失敗しました');
  }
}

/**
 * パスキーのみモードを設定
 * @param enabled 有効/無効
 */
export async function setPasskeyOnlyMode(enabled: boolean): Promise<void> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('ログインが必要です');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/passkey/set-only-mode`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'パスキーのみモードの設定に失敗しました');
  }
}
