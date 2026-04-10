-- Migration: プラン名 basic → lite に変更
-- 作成日: 2026-04-11
-- 関連: prompt/maintenance/11_未実装・未完了機能一覧.md セクション4
--      Phase B Part 3: プラン名統一（free / lite / pro / enterprise）

-- usersテーブルのplanカラム
-- migration 0014 で追加された plan カラムの 'basic' を 'lite' に変更
UPDATE users
SET plan = 'lite', updated_at = datetime('now')
WHERE plan = 'basic';

-- subscriptionsテーブルのplan_typeカラム
-- 0001_initial_schema.sql で定義された plan_type の 'basic' を 'lite' に変更
UPDATE subscriptions
SET plan_type = 'lite', updated_at = datetime('now')
WHERE plan_type = 'basic';
