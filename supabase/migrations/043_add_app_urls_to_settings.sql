-- Add windows_app_url and android_app_url to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS windows_app_url text,
ADD COLUMN IF NOT EXISTS android_app_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.site_settings.windows_app_url IS 'URL for the Windows desktop application installer (R2)';
COMMENT ON COLUMN public.site_settings.android_app_url IS 'URL for the Android mobile application APK (R2)';
