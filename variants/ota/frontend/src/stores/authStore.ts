import { create } from 'zustand';
import { api, setTokens, removeToken, getRefreshToken } from '@/lib/api';

interface User {
  id: number;
  email: string;
  passkeyOnly?: number;
  plan?: string;
  isAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.login(email, password);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ログインに失敗しました');
      }

      setTokens(data.accessToken, data.refreshToken, data.expiresIn);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'ログインに失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.register(email, password);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました');
      }

      // Phase 1.6.5: 登録後は即座にログインせず、メール確認を待つ
      // トークンは保存しない
      set({
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '登録に失敗しました',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    // サーバー側でリフレッシュトークンを失効させる（エラーは無視）
    const refreshToken = getRefreshToken();
    api.auth.logout(refreshToken).catch(() => {});

    removeToken();
    localStorage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await api.auth.me();
      const data = await response.json();

      if (!response.ok) {
        throw new Error('認証に失敗しました');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      set({
        user: data.user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      removeToken();
      localStorage.removeItem('user');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
