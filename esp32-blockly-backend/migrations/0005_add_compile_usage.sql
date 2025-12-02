-- コンパイル回数カウント用テーブル
-- 月ごとのコンパイル回数を記録し、課金計算に使用

CREATE TABLE IF NOT EXISTS compile_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL,           -- YYYY-MM形式 (例: '2025-12')
  count INTEGER DEFAULT 0,       -- その月のコンパイル回数
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, month)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_compile_usage_user_month ON compile_usage(user_id, month);

-- 更新時にupdated_atを自動更新するトリガー
CREATE TRIGGER IF NOT EXISTS update_compile_usage_timestamp
AFTER UPDATE ON compile_usage
BEGIN
  UPDATE compile_usage SET updated_at = datetime('now') WHERE id = NEW.id;
END;
