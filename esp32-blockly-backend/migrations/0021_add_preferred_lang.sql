-- ユーザーの優先言語設定を保存するカラム追加 (SP3, 2026-04-20)
-- 対応言語: ja / en / es / pt-PT / zh-TW / NULL（未設定）
ALTER TABLE users ADD COLUMN preferred_lang TEXT DEFAULT NULL;
