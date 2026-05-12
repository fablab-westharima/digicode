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
  canUseServoPulse: (userPlan?: string) => boolean;
  canUseAiBlockGeneration: (userPlan?: string, accountType?: string) => boolean;
  canUseAiHelpBot: (userPlan?: string, accountType?: string) => boolean;
  canUseAiUiCustomize: (userPlan?: string, accountType?: string) => boolean;
  canSubmitFeedback: (userPlan?: string, accountType?: string) => boolean;
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

  // サーボパルス調整 (第107回 Task 1): 現状は全 user 開放 (default true)。
  // Task 2 でプラン差別化 = Pro/Enterprise 限定化の entry point として独立 gate を設置。
  // userPlan 引数は将来の gate 化に備えた signature placeholder。
  canUseServoPulse: (_userPlan?: string) => {
    return true;
  },

  canUseAiBlockGeneration: (userPlan?: string, accountType?: string) => {
    // 第103回 hotfix2: プレリリース期間中は全 user (student / guest 含む) に開放
    const flag = get().flags['pin_assign_pro'];
    if (flag && flag.isFreeNow) return true;
    if (accountType === 'student') return false;
    if (!userPlan) return false;
    return ['lite', 'pro', 'enterprise'].includes(userPlan);
  },

  // AI チャット: blockGen と同じく Lite+ 非 student 限定（判断 10 変更 2026-04-22）
  // BYOK + 有料プランの差別化機能として位置づけ
  canUseAiHelpBot: (userPlan?: string, accountType?: string) => {
    // 第103回 hotfix2: プレリリース期間中は全 user (student / guest 含む) に開放
    const flag = get().flags['pin_assign_pro'];
    if (flag && flag.isFreeNow) return true;
    if (accountType === 'student') return false;
    if (!userPlan) return false;
    return ['lite', 'pro', 'enterprise'].includes(userPlan);
  },

  // AI UI カスタマイズ (Phase 4、50.md §11 D2/D8 + §4.2 #6): Lite+ 非 student 限定。
  // 第 2 層 = AI チャットで Layer 1 ルールベース UI に customization fields populate、
  // BYOK + 課金差別化の柱 (47.md §7.1)。Free / student / ゲストは lock + Upgrade CTA。
  canUseAiUiCustomize: (userPlan?: string, accountType?: string) => {
    // 第103回 hotfix2: プレリリース期間中は全 user (student / guest 含む) に開放
    const flag = get().flags['pin_assign_pro'];
    if (flag && flag.isFreeNow) return true;
    if (accountType === 'student') return false;
    if (!userPlan) return false;
    return ['lite', 'pro', 'enterprise'].includes(userPlan);
  },

  // 要望フォーム: 課金ユーザー限定 (Lite / Pro / Enterprise admin)、Enterprise student / Free / ゲストは投稿不可
  // 41.md §2 認可マトリクス、backend `routes/feedback.ts` の二段階認可と同型 (defense in depth)
  canSubmitFeedback: (userPlan?: string, accountType?: string) => {
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
