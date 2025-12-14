-- Migration: Add recovery_codes table for passkey recovery
-- Date: 2025-12-13
-- Purpose: Store one-time-use recovery codes for passkey-only accounts

CREATE TABLE IF NOT EXISTS recovery_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT 0,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_code_hash ON recovery_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_used ON recovery_codes(used);
