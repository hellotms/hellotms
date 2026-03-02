-- Add proposal_date to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS proposal_date timestamptz;
