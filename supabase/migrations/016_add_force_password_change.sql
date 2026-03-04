-- Migration 016: Add force_password_change flag to profiles
-- This flag is set to true when a new staff member is invited with a temp password.
-- On first login, the admin app redirects them to /setup to create a new password.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE;

-- Comment
COMMENT ON COLUMN profiles.force_password_change IS
  'When true, user must change their password (and optionally set profile details) on next login.';
