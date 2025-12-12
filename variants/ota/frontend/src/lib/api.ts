// API client for DigiCode
// Cloudflare Pagesでは環境変数が使えないため、hostnameで判定
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

// トークン取得
function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

// トークン保存
export function setTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  if (expiresIn) {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem('tokenExpiresAt', expiresAt.toString());
  }
}

// 後方互換性のため（authStoreから呼ばれる）
export function setToken(token: string): void {
  localStorage.setItem('accessToken', token);
}

// トークン削除
export function removeToken(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiresAt');
  // 旧形式のトークンも削除
  localStorage.removeItem('auth_token');
}

// リフレッシュトークンでアクセストークンを更新
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      removeToken();
      return false;
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken, data.expiresIn);
    return true;
  } catch {
    removeToken();
    return false;
  }
}

// 認証付きfetch
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 401エラー時はトークンリフレッシュを試行
  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // リフレッシュ成功、リトライ
      return fetchWithAuth(endpoint, options, true);
    }
    // リフレッシュ失敗、ログアウト
    removeToken();
    window.location.href = '/auth';
  }

  return response;
}

// API endpoints
export const api = {
  baseUrl: API_URL,

  // 認証
  auth: {
    register: async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return response;
    },

    login: async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return response;
    },

    me: async () => {
      return fetchWithAuth('/api/auth/me');
    },

    logout: async (refreshToken: string | null) => {
      if (!refreshToken) return;
      return fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    },

    forgotPassword: async (email: string) => {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return response;
    },

    resetPassword: async (token: string, password: string) => {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      return response;
    },
  },

  // プロジェクト
  projects: {
    list: async () => {
      return fetchWithAuth('/api/projects');
    },

    get: async (id: number) => {
      return fetchWithAuth(`/api/projects/${id}`);
    },

    create: async (data: { title: string; description?: string; blocklyXml: string; language?: string }) => {
      return fetchWithAuth('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: { title?: string; description?: string; blocklyXml?: string; generatedCode?: string; language?: string }) => {
      return fetchWithAuth(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return fetchWithAuth(`/api/projects/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // コンパイル使用量
  compileUsage: {
    // コンパイル回数をインクリメント
    increment: async () => {
      return fetchWithAuth('/api/compile-usage/increment', {
        method: 'POST',
      });
    },

    // 現在月の使用量を取得
    get: async () => {
      return fetchWithAuth('/api/compile-usage');
    },

    // 履歴取得
    getHistory: async () => {
      return fetchWithAuth('/api/compile-usage/history');
    },
  },
};
