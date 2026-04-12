-- Migration: 0019_add_class_type
-- Created: 2026-04-12
-- Purpose: Add class_type column to classes table for automatic expiry.
--
-- Values:
--   'workshop'  — WS/短期講座。有効期限 1ヶ月。課題PDF上限 5件。
--   'classroom' — 教室（1クール）。有効期限 4ヶ月。課題PDF上限 10件。
--
-- When a class is created, expires_at is auto-calculated based on class_type.
-- Expired classes are deleted automatically (Step 8 implementation).
--
-- See: prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md

ALTER TABLE classes ADD COLUMN class_type TEXT DEFAULT 'classroom';
