import { create } from 'zustand';

const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

interface FeatureFlag {
  enabled: boolean;
  freeUntil: string | null;
  freeReason: string | null;
  isFreeNow: boolean;
}

interface FeatureFlagState {
  flags: Record<string, FeatureFlag>;
  isLoaded: boolean;
  lastFetchedAt: number | null;

  fetchFlags: () => Promise<void>;
  canUsePinAssign: (userPlan?: string) => boolean;
  canUseAiBlockGeneration: (userPlan?: string, accountType?: string) => boolean;
  isFreeOpenNow: (key: string) => boolean;
  getFreeReason: (key: string) => string | null;
  getFreeUntil: (key: string) => string | null;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5分キャッシュ

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  flags: {},
  isLoaded: false,
  lastFetchedAt: null,

  fetchFlags: async () => {
    const { lastFetchedAt } = get();
    const now = Date.now();

    // キャッシュが有効ならスキップ
    if (lastFetchedAt && now - lastFetchedAt < CACHE_DURATION_MS) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/feature-flags`);
      if (!response.ok) throw new Error('Failed to fetch feature flags');

      const data = await response.json() as { flags: Record<string, FeatureFlag> };
      set({
        flags: data.flags,
        isLoaded: true,
        lastFetchedAt: now,
      });
    } catch (error) {
      console.warn('[FeatureFlags] フラグ取得失敗、デフォルト値を使用:', error);
      // 取得失敗時はデフォルト（有料制限あり）
      set({
        flags: {},
        isLoaded: true,
        lastFetchedAt: now,
      });
    }
  },

  canUsePinAssign: (userPlan?: string) => {
    // Pro/Enterprise → 常に使える
    if (userPlan === 'pro' || userPlan === 'enterprise') return true;

    // Free/Basic → 無料開放期間中なら使える
    const flag = get().flags['pin_assign_pro'];
    if (flag && flag.isFreeNow) return true;

    return false;
  },

  canUseAiBlockGeneration: (userPlan?: string, accountType?: string) => {
    if (accountType === 'student') return false;
    if (!userPlan) return false;
    return ['lite', 'pro', 'enterprise'].includes(userPlan);
  },

  isFreeOpenNow: (key: string) => {
    const flag = get().flags[key];
    return flag?.isFreeNow || false;
  },

  getFreeReason: (key: string) => {
    const flag = get().flags[key];
    return flag?.freeReason || null;
  },

  getFreeUntil: (key: string) => {
    const flag = get().flags[key];
    return flag?.freeUntil || null;
  },
}));
