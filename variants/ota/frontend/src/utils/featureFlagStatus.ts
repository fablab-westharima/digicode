/**
 * StatusBar inline Feature Flag 表示用 pure helpers
 *
 * 第102回 C4: グローバル下部 banner を撤回、エディタ下部 StatusBar inline 表示に切替。
 * 関連 component: components/editor/StatusBar.tsx
 *
 * 第102回 C2 で導入された utils/featureFlagBanner.ts を rename + dismiss / isSameUtcDay
 * helpers を削除して本 file に集約。
 */

export type StatusVariant = 'normal' | 'warning' | 'critical' | 'expired';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * `free_until` (ISO 8601) と現在時刻から残日数を計算する。
 *
 * - 期限切れ (diff <= 0): -1 を返す (表示非表示の signal)
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
 * 残日数からインライン表示 variant を決定する (第102回 C4 user 仕様)
 *
 * - days <= 0: expired (表示非表示)
 * - 1 <= days <= 3: critical (橙)
 * - 4 <= days <= 7: warning (黄)
 * - days > 7: normal (通常色)
 */
export function getStatusVariant(daysRemaining: number): StatusVariant {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 3) return 'critical';
  if (daysRemaining <= 7) return 'warning';
  return 'normal';
}
