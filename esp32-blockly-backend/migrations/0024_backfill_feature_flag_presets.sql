-- 0024: Feature Flag free_reason をテンプレート enum key に backfill
-- 第102回 Task 1-A: AdminPage 自由入力 → Select 化、5 lang 翻訳のため enum key 格納方式に移行
-- 既存 seed 'テスター期間 - 全機能開放' を 'prerelease' enum key にのみ更新
-- WHERE 句で対象を狭く絞り、他の手動入力値があれば不変

UPDATE feature_flags
SET free_reason = 'prerelease', updated_at = datetime('now')
WHERE key = 'pin_assign_pro'
  AND free_reason = 'テスター期間 - 全機能開放';
