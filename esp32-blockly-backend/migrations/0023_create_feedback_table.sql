-- 41.md Wave 3 新規 2 機能 A: 要望フォーム機能 (2026-04-27)
-- 課金ユーザー (Lite / Pro / Enterprise admin) 限定の要望投稿用テーブル。
-- Admin 画面でリスト + ステータス管理 + CSV エクスポート、Claude Code が外部分析エンジンとして月次運用する想定。
--
-- 設計判断 (memory:feedback_form_design + 41.md §3 + §9):
--   - category enum 6 種、status enum 4 種 (admin only)
--   - title 80 chars / body 2000 chars (frontend + backend 二重 validation)
--   - locale / app_version / user_agent は debug 補助で frontend 自動付与
--   - user 自己編集削除なし、admin は status + admin_note のみ更新可
--   - ON DELETE CASCADE で user account 削除時に要望も自動削除 (GDPR 観点)
--
-- 関連: prompt/maintenance/41_2026-04-27_要望フォーム計画_Wave3-新規2機能A.md

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('bug', 'feature', 'ui', 'block', 'docs', 'other')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK(status IN ('new', 'triaged', 'planned', 'closed')),
  admin_note TEXT,
  locale TEXT,
  app_version TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- updated_at 自動更新 trigger (subscriptions / projects と同パターン、0003 由来)
CREATE TRIGGER IF NOT EXISTS update_feedback_timestamp
AFTER UPDATE ON feedback
BEGIN
  UPDATE feedback SET updated_at = datetime('now') WHERE id = NEW.id;
END;
