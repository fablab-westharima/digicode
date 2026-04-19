import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import i18n from '@/i18n';

// Cloudflare Pagesでは環境変数が使えないため、hostnameで判定
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

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
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
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
    throw new Error(error.error || i18n.t('errors.passkey.registerOptionsFailed', { defaultValue: 'パスキー登録オプションの取得に失敗しました' }));
  }

  const options: PublicKeyCredentialCreationOptionsJSON = await optionsResponse.json();

  // Step 2: ブラウザのWebAuthn APIで認証器を登録
  let credential: RegistrationResponseJSON;
  try {
    credential = await startRegistration({ optionsJSON: options });
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error(i18n.t('errors.passkey.registerCanceled', { defaultValue: 'パスキー登録がキャンセルされました' }));
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
    throw new Error(error.error || i18n.t('errors.passkey.verifyFailed', { defaultValue: 'パスキーの検証に失敗しました' }));
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
    throw new Error(error.error || i18n.t('errors.passkey.authOptionsFailed', { defaultValue: 'パスキー認証オプションの取得に失敗しました' }));
  }

  const options: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();

  // Step 2: ブラウザのWebAuthn APIで認証
  let credential: AuthenticationResponseJSON;
  try {
    credential = await startAuthentication({ optionsJSON: options });
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error(i18n.t('errors.passkey.authCanceled', { defaultValue: 'パスキー認証がキャンセルされました' }));
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
    throw new Error(error.error || i18n.t('errors.passkey.authFailed', { defaultValue: 'パスキー認証に失敗しました' }));
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
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/passkey/list`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.passkey.listFailed', { defaultValue: 'パスキー一覧の取得に失敗しました' }));
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
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/passkey/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.passkey.deleteFailed', { defaultValue: 'パスキーの削除に失敗しました' }));
  }
}

/**
 * パスキーのみモードを設定
 * @param enabled 有効/無効
 */
export async function setPasskeyOnlyMode(enabled: boolean): Promise<void> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
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
    throw new Error(error.error || i18n.t('errors.passkey.onlyModeFailed', { defaultValue: 'パスキーのみモードの設定に失敗しました' }));
  }
}

/**
 * リカバリーコードを生成
 * @returns 生成されたリカバリーコード（10個）
 */
export async function generateRecoveryCodes(): Promise<string[]> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/recovery-codes/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.passkey.recoveryCodeGenerateFailed', { defaultValue: 'リカバリーコードの生成に失敗しました' }));
  }

  const result = await response.json();
  return result.codes;
}

/**
 * 残りの有効なリカバリーコード数を取得
 * @returns 有効なリカバリーコード数
 */
export async function getRecoveryCodesCount(): Promise<number> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/recovery-codes/count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.passkey.recoveryCodeCountFailed', { defaultValue: 'リカバリーコード数の取得に失敗しました' }));
  }

  const result = await response.json();
  return result.count;
}

/**
 * リカバリーコードで認証
 * @param email メールアドレス
 * @param code リカバリーコード
 * @returns 認証結果（トークン含む）
 */
export async function verifyRecoveryCode(email: string, code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: number; email: string };
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/recovery-codes/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.passkey.recoveryCodeVerifyFailed', { defaultValue: 'リカバリーコードの検証に失敗しました' }));
  }

  return response.json();
}

/**
 * リカバリーコードを再生成
 * @returns 新しく生成されたリカバリーコード（10個）
 */
export async function regenerateRecoveryCodes(): Promise<string[]> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/recovery-codes/regenerate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.passkey.recoveryCodeRegenerateFailed', { defaultValue: 'リカバリーコードの再生成に失敗しました' }));
  }

  const result = await response.json();
  return result.codes;
}
