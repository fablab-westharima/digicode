-- Migration: 0018_add_student_name_and_password
-- Created: 2026-04-12
-- Purpose: Add display_name and plain_password columns to users table
--          for admin-managed student accounts.
--
-- display_name: Student's real name (e.g., "田中太郎"). Only populated
--   for account_type='student'. Regular users do not use this field.
--
-- plain_password: Plaintext password stored for student accounts so that
--   the class owner (enterprise admin) can always view and distribute
--   credentials. This is acceptable because:
--   - Student accounts are admin-created, disposable accounts
--   - The admin already sees the password at creation time
--   - Educational platforms (TinkerCAD etc.) use the same pattern
--   - Regular user accounts never have this field populated
--
-- See: prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md

ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN plain_password TEXT DEFAULT NULL;
