-- 第103回 Task 1: feedback.user_id を NULL 許可に緩和
-- プレリリース期間中 (pin_assign_pro.isFreeNow=true) は未ログインユーザーからの
-- 要望投稿を受け付ける (routes/feedback.ts の 2 段認可)。anonymous row は
-- user_id=NULL で記録、admin-feedback の LEFT JOIN users で email/plan は NULL fallback。
-- D1 (SQLite) は ALTER TABLE ... ALTER COLUMN 不可のため標準 4-step rebuild pattern。

CREATE TABLE IF NOT EXISTS feedback_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
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

INSERT INTO feedback_new
  (id, user_id, category, title, body, status, admin_note, locale, app_version, user_agent, created_at, updated_at)
  SELECT id, user_id, category, title, body, status, admin_note, locale, app_version, user_agent, created_at, updated_at
  FROM feedback;

DROP TABLE feedback;
ALTER TABLE feedback_new RENAME TO feedback;

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

CREATE TRIGGER IF NOT EXISTS update_feedback_timestamp
AFTER UPDATE ON feedback
BEGIN
  UPDATE feedback SET updated_at = datetime('now') WHERE id = NEW.id;
END;
