-- Unifying contact_submissions into leads table and adding project completion date logic

-- 1. Add missing columns to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- 2. Add project_completed_at to projects (if not already exists - checking shared types, it is there)
-- Actually, let's make sure it is in the DB
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_completed_at timestamptz;

-- 3. Cleanup Legacy entries (Previously contact_submissions was moved here)
-- No migration needed as table was manually deleted.
