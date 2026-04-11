-- Migration: 0016_add_account_type
-- Created: 2026-04-11
-- Purpose: Add account_type column to users for Phase C class feature.
--
-- Values:
--   'regular'  - Normal user (default, existing users). Can self-register,
--                log in on any device, create/edit personal projects.
--   'student'  - Proxied account created by an enterprise class owner.
--                Cannot log in unless they belong to an active class.
--                Cannot create new projects or import files (anti-cheat).
--                Automatically deleted when removed from all classes or
--                when their class is deleted by the owner.
--
-- This column is orthogonal to `plan` (free/lite/pro/enterprise). A student
-- account has no plan of its own; compile usage is counted against the
-- enterprise class owner's quota (enforced in application logic).
--
-- See: prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md (section: 前提となる既存実装の現状 / プレ調査A)
-- See: prompt/logs/2026-04-10_PhaseC_クラス機能実装.md

ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'regular';

-- Backfill: all existing rows get 'regular'. The DEFAULT clause above only
-- affects new INSERTs on SQLite, so we explicitly update existing rows to
-- avoid NULL values for any driver that reads the column as strict.
UPDATE users SET account_type = 'regular' WHERE account_type IS NULL;

-- Index for filtering student accounts (e.g., admin UI, cleanup jobs).
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
