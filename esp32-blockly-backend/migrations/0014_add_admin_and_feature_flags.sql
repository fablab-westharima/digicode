-- Phase 1-1: 管理機能・Feature Flags対応
-- usersテーブルにカラム追加 + feature_flagsテーブル作成

-- 管理者フラグ
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- プラン管理（Stripe連携前はadmin_grantedで手動付与）
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_source TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN plan_note TEXT DEFAULT NULL;

-- 最終ログイン日時（放置アカウント検出用）
ALTER TABLE users ADD COLUMN last_login_at TEXT DEFAULT NULL;

-- Feature Flagsテーブル
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT 1,
  free_until TEXT,
  free_reason TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 初期データ: ピンアサイン変更のフラグ（テスター期間中は全機能開放）
INSERT INTO feature_flags (key, enabled, free_until, free_reason)
VALUES ('pin_assign_pro', 1, '2026-12-31T23:59:59Z', 'テスター期間 - 全機能開放');
