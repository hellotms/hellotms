-- Add login_bg_url to site_settings table
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS login_bg_url TEXT;
