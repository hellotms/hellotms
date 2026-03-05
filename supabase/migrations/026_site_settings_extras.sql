-- 026_site_settings_extras.sql
-- Add company_logo_url and public_site_url to site_settings

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS company_logo_url text;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS public_site_url text;

-- Set a sensible default for public_site_url on existing row
UPDATE site_settings SET public_site_url = 'https://hellotms.com.bd' WHERE id = 1 AND public_site_url IS NULL;
