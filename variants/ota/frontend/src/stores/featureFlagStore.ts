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
  canUseClasses: (userPlan?: string) => boolean;
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

  // 個別ピンアサイン (第107回 Task 2): Enterprise 限定。
  // プレリリース期間中 (pin_assign_pro.isFreeNow=true) は全 user 開放を維持
  // (`memory:prerelease_open_scope`)。flag 名は historical = 命名整理は post-release polish。
  canUsePinAssign: (userPlan?: string) => {
    // Enterprise → 常に使える
    if (userPlan === 'enterprise') return true;

    // 無料開放期間中なら全 user 開放
    const flag = get().flags['pin_assign_pro'];
    if (flag && flag.isFreeNow) return true;

    return false;
  },

  // サーボパルス調整 (第107回 Task 1 entry point + Task 2 narrow): Pro/Enterprise 限定。
  // プレリリース期間中は全 user 開放 (pin_assign_pro flag 共用、`memory:prerelease_open_scope`)。
  canUseServoPulse: (userPlan?: string) => {
    // Pro/Enterprise → 常に使える
    if (userPlan === 'pro' || userPlan === 'enterprise') return true;

    // 無料開放期間中なら全 user 開放
    const flag = get().flags['pin_assign_pro'];
    if (flag && flag.isFreeNow) return true;

    return false;
  },

  // クラス機能: Enterprise 限定 (第107回 Task 2 と同 spirit)。
  // プレリリース期間中 (pin_assign_pro.isFreeNow=true) は全 user 開放
  // (`memory:prerelease_open_scope`)。第112回 case 19 cluster (FE-1) で
  // inline `user.plan === 'enterprise' || isPinAssignFreeOpen` 3 callsite
  // (Sidebar / ClassesPage / ClassDetailPage) を本 helper に統合、prerelease
  // bypass 条件変更時の sync risk を構造的解消。callsite では `!!user &&`
  // で認証 user 状態を別途確認 (anonymous は class owner_id 不在のため対象外)。
  canUseClasses: (userPlan?: string) => {
    // Enterprise → 常に使える
    if (userPlan === 'enterprise') return true;

    // 無料開放期間中なら全 user 開放
    const flag = get().flags['pin_assign_pro'];
    if (flag && flag.isFreeNow) return true;

    return false;
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
