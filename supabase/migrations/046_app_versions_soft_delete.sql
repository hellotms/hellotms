-- Add deleted_at column for soft deletes
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update the list index to exclude deleted versions
DROP INDEX IF EXISTS idx_app_versions_platform_latest;
CREATE INDEX IF NOT EXISTS idx_app_versions_platform_latest 
ON public.app_versions(platform, is_latest) 
WHERE is_latest = true AND deleted_at IS NULL;
