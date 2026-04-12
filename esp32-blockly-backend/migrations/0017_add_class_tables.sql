-- Migration: 0017_add_class_tables
-- Created: 2026-04-12
-- Purpose: Add classes and class_members tables to D1 for Phase C Step 2.
--
-- Design decision (2026-04-12):
--   classes and class_members are placed in D1 (not ML30) because they are
--   lightweight metadata that does not risk hitting the 10GB D1 limit.
--   Only assignments and assignment_submissions (which contain large Blockly
--   XML and generated code) remain on ML30.
--
--   This ensures:
--     - Student creation + class membership is a single-DB operation (no cross-DB writes)
--     - Authorization checks (owner_id) are fast D1-local queries
--     - ML30 downtime does not affect class listing or member management
--     - Only assignment/submission operations depend on ML30
--
-- See: prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md
--      section "DB 配置原則"
--
-- FK notes:
--   D1's foreign_keys pragma may not be enabled by default. FK constraints
--   below serve as documentation of intended relationships. CASCADE deletion
--   is enforced in application code (Workers routes) to be safe regardless
--   of D1's FK enforcement setting.

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  compile_server_target TEXT NOT NULL DEFAULT 'cloud',
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_classes_owner_id ON classes(owner_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

CREATE TABLE IF NOT EXISTS class_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (class_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON class_members(user_id);
