-- Migration 031: Add last_password_reset_at to profiles for cooldown logic
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_password_reset_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.last_password_reset_at IS
  'Timestamp of the last administrative password reset. Used for 30-minute cooldown.';
