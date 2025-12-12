const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

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
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'アカウント登録に失敗しました');
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
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ログインに失敗しました');
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
    throw new Error('ログインが必要です');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/logout-all`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '全デバイスからのログアウトに失敗しました');
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
    throw new Error('ログインが必要です');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ユーザー情報の取得に失敗しました');
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
    throw new Error('リフレッシュトークンがありません');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    // リフレッシュトークンが無効な場合はログアウト
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw new Error(error.error || 'トークンのリフレッシュに失敗しました');
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
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'パスワードリセット申請に失敗しました');
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
    },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'パスワードリセットに失敗しました');
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
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '確認メール送信に失敗しました');
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
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'メール確認に失敗しました');
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
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'リカバリー申請に失敗しました');
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
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'リカバリーに失敗しました');
  }

  const result = await response.json();

  // トークンをlocalStorageに保存
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);

  return result;
}
