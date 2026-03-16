-- Add hero_slider to site_settings table
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_slider JSONB DEFAULT '[]'::jsonb;
