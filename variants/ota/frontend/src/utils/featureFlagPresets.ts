/**
 * Feature Flag `free_reason` プリセット定義
 *
 * 第102回 Task 1-A: AdminPage で admin が選択する 3 種のテンプレート enum key。
 * DB `feature_flags.free_reason` 列には enum key (e.g. 'prerelease') が格納される。
 * 表示は i18n key `featureFlag.presets.<key>` で 5 lang 翻訳。
 *
 * 関連 migration: 0024_backfill_feature_flag_presets.sql
 * 関連 i18n key:  featureFlag.presets.{prerelease,newFeatureTest,campaign}
 */

export const FREE_REASON_PRESETS = ['prerelease', 'newFeatureTest', 'campaign'] as const;

export type FreeReasonPreset = (typeof FREE_REASON_PRESETS)[number];

export function isKnownPreset(value: string | null | undefined): value is FreeReasonPreset {
  if (value == null) return false;
  return (FREE_REASON_PRESETS as readonly string[]).includes(value);
}

export function presetTranslationKey(preset: FreeReasonPreset): string {
  return `featureFlag.presets.${preset}`;
}
