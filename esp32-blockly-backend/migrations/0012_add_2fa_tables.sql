-- Migration: Add 2FA (Two-Factor Authentication) tables
-- Date: 2025-12-17
-- Purpose: Email OTP based two-factor authentication for password login

-- 2FA設定テーブル
-- ユーザーごとの2FA有効/無効設定を管理
CREATE TABLE IF NOT EXISTS user_2fa_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  enabled INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ログインOTPコードテーブル
-- 一時的なOTPコード（ハッシュ化して保存）
CREATE TABLE IF NOT EXISTS login_otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  used_at DATETIME,
  attempts INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id ON user_2fa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_login_otp_codes_user_id ON login_otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_login_otp_codes_expires_at ON login_otp_codes(expires_at);
