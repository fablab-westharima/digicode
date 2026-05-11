/**
 * Feature Flag バナー (FeatureFlagBanner) 用 pure helpers
 *
 * 第102回 Task 1-B + 1-C: 残日数計算 + variant 判定 + dismiss 24h 管理
 * 関連 component: components/common/FeatureFlagBanner.tsx
 */

export type BannerVariant = 'normal' | 'warning' | 'critical' | 'expired';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * `free_until` (ISO 8601) と現在時刻から残日数を計算する。
 *
 * - 期限切れ (diff <= 0): -1 を返す (banner 非表示の signal)
 * - 期限未到来: 残りミリ秒を ceil で日数化 (1 秒残り → 1 日扱い、UI 表示の自然さ優先)
 */
export function getDaysRemaining(isoDate: string, now: number = Date.now()): number {
  const end = new Date(isoDate).getTime();
  if (!Number.isFinite(end)) return -1;
  const diff = end - now;
  if (diff <= 0) return -1;
  return Math.ceil(diff / MS_PER_DAY);
}

/**
 * 同じ UTC カレンダー日かを判定する (endsToday 表示判定用)
 */
export function isSameUtcDay(t1: number, t2: number): boolean {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * 残日数からバナー variant を決定する (D-3 確定 7 / 3 / 1 日 threshold)
 *
 * - days >= 7: normal (緑、🎁、untilDate 表示)
 * - 3 <= days < 7: warning (黄、⏰、endsInDays 表示)
 * - 1 <= days < 3: critical (橙、⚠️、endsInDays / endsTomorrow 表示)
 * - days <= 0: expired (banner 非表示)
 */
export function getBannerVariant(daysRemaining: number): BannerVariant {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining < 3) return 'critical';
  if (daysRemaining < 7) return 'warning';
  return 'normal';
}

/* --------------------------- dismiss 24h sessionStorage --------------------------- */

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

function getDismissKey(flagKey: string): string {
  return `featureFlag.banner.dismissed.${flagKey}`;
}

export function isDismissedRecently(flagKey: string, now: number = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(getDismissKey(flagKey));
    if (!raw) return false;
    const t = parseInt(raw, 10);
    return Number.isFinite(t) && now - t < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function markDismissed(flagKey: string, now: number = Date.now()): void {
  try {
    sessionStorage.setItem(getDismissKey(flagKey), String(now));
  } catch {
    /* sessionStorage unavailable (SSR / disabled), 静かに無視 */
  }
}

/* test-only 内部 access */
export const __testing__ = {
  DISMISS_TTL_MS,
  MS_PER_DAY,
  getDismissKey,
};
