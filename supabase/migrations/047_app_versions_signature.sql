-- 047_app_versions_signature.sql
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS signature text;
