import i18n from '@/i18n';

// Cloudflare Pagesでは環境変数が使えないため、hostnameで判定
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

/**
 * ユーザー登録
 */
export async function register(email: string, password: string): Promise<{
  message: string;
  user: { id: number; email: string };
  verificationToken?: string;
  verificationUrl?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.registerFailed', { defaultValue: 'アカウント登録に失敗しました' }));
  }

  return await response.json();
}

/**
 * ログイン
 */
export async function login(email: string, password: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: number; email: string };
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.loginFailed', { defaultValue: 'ログインに失敗しました' }));
  }

  const result = await response.json();

  // トークンをlocalStorageに保存
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);

  return result;
}

/**
 * ログアウト
 */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
  }

  // ローカルのトークンを削除
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * 全デバイスからログアウト
 */
export async function logoutAll(): Promise<void> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/logout-all`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Language': i18n.language || 'ja',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.logoutAllFailed', { defaultValue: '全デバイスからのログアウトに失敗しました' }));
  }

  // ローカルのトークンを削除
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * ユーザー情報取得
 */
export async function getMe(): Promise<{
  user: {
    id: number;
    email: string;
    createdAt: string;
    subscription: {
      status: string;
      planType: string;
    };
  };
}> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Language': i18n.language || 'ja',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.userInfoFailed', { defaultValue: 'ユーザー情報の取得に失敗しました' }));
  }

  return await response.json();
}

/**
 * アクセストークンをリフレッシュ
 */
export async function refreshToken(): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    throw new Error(i18n.t('errors.auth.refreshTokenMissing', { defaultValue: 'リフレッシュトークンがありません' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    // リフレッシュトークンが無効な場合はログアウト
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw new Error(error.error || i18n.t('errors.auth.refreshFailed', { defaultValue: 'トークンのリフレッシュに失敗しました' }));
  }

  const result = await response.json();

  // 新しいトークンを保存
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);

  return result;
}

/**
 * パスワードリセット申請
 */
export async function forgotPassword(email: string): Promise<{
  message: string;
  resetToken?: string;
  resetUrl?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.forgotPasswordFailed', { defaultValue: 'パスワードリセット申請に失敗しました' }));
  }

  return await response.json();
}

/**
 * パスワードリセット実行
 */
export async function resetPassword(token: string, password: string): Promise<{
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.resetPasswordFailed', { defaultValue: 'パスワードリセットに失敗しました' }));
  }

  return await response.json();
}

/**
 * メール確認メール送信
 */
export async function sendVerificationEmail(email: string): Promise<{
  message: string;
  verificationToken?: string;
  verificationUrl?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.verifyEmailSendFailed', { defaultValue: '確認メール送信に失敗しました' }));
  }

  return await response.json();
}

/**
 * メール確認実行
 */
export async function verifyEmail(token: string): Promise<{
  verified: boolean;
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.verifyEmailFailed', { defaultValue: 'メール確認に失敗しました' }));
  }

  return await response.json();
}

/**
 * リカバリー申請
 */
export async function requestRecovery(email: string): Promise<{
  message: string;
  recoveryToken?: string;
  recoveryUrl?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/recovery/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.recoveryRequestFailed', { defaultValue: 'リカバリー申請に失敗しました' }));
  }

  return await response.json();
}

/**
 * リカバリー実行
 */
export async function verifyRecovery(token: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: number; email: string };
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/recovery/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.recoveryFailed', { defaultValue: 'リカバリーに失敗しました' }));
  }

  const result = await response.json();

  // トークンをlocalStorageに保存
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);

  return result;
}

// ======================
// 2段階認証（2FA）関連
// ======================

/**
 * 2FA OTP送信（パスワード検証 + OTP送信）
 * 2FAが無効なユーザーの場合はJWTを直接返す
 */
export async function sendOtp(email: string, password: string): Promise<{
  success: boolean;
  twoFactorRequired: boolean;
  trustedDevice?: boolean; // Phase 2: 信頼済みデバイスからのログイン
  message?: string;
  expiresIn?: number;
  // 2FA不要の場合はJWTが返る
  accessToken?: string;
  refreshToken?: string;
  user?: { id: number; email: string };
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/2fa/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    credentials: 'include', // Cookie送受信のために必要（信頼済みデバイス）
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.authFailed', { defaultValue: '認証に失敗しました' }));
  }

  const result = await response.json();

  // 2FAが不要の場合、トークンをlocalStorageに保存
  if (!result.twoFactorRequired && result.accessToken) {
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
  }

  return result;
}

/**
 * OTPコード検証
 */
export async function verifyOtp(email: string, code: string, trustDevice?: boolean): Promise<{
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: number; email: string };
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/2fa/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    credentials: 'include', // Cookie送受信のために必要
    body: JSON.stringify({ email, code, trustDevice }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.otpVerifyFailed', { defaultValue: 'OTP検証に失敗しました' }));
  }

  const result = await response.json();

  // トークンをlocalStorageに保存
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);

  return result;
}

/**
 * OTP再送信
 */
export async function resendOtp(email: string): Promise<{
  success: boolean;
  message: string;
  expiresIn: number;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/2fa/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ja',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.otpResendFailed', { defaultValue: 'OTP再送信に失敗しました' }));
  }

  return await response.json();
}

/**
 * 2FA設定状態取得
 */
export async function getTwoFactorStatus(): Promise<{
  enabled: boolean;
  enabledAt: string | null;
}> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/2fa/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Language': i18n.language || 'ja',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.twoFactorStatusFailed', { defaultValue: '2FA設定の取得に失敗しました' }));
  }

  return await response.json();
}

/**
 * 2FA有効化
 */
export async function enableTwoFactor(): Promise<{
  success: boolean;
  message: string;
}> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/2fa/enable`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Language': i18n.language || 'ja',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.twoFactorEnableFailed', { defaultValue: '2FA有効化に失敗しました' }));
  }

  return await response.json();
}

/**
 * 2FA無効化（パスワード確認必須）
 */
export async function disableTwoFactor(password: string): Promise<{
  success: boolean;
  message: string;
}> {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error(i18n.t('errors.auth.loginRequired', { defaultValue: 'ログインが必要です' }));
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || i18n.t('errors.auth.twoFactorDisableFailed', { defaultValue: '2FA無効化に失敗しました' }));
  }

  return await response.json();
}
