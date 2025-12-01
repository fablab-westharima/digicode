-- 0004_add_language_column.sql
-- プロジェクトテーブルに言語選択カラムを追加

ALTER TABLE projects ADD COLUMN language TEXT NOT NULL DEFAULT 'micropython';
