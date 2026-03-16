-- Migration 042: Add support for custom company and project names in invoices/estimates
-- This allows creating estimates for entities not yet in the database.

ALTER TABLE public.invoices 
  ADD COLUMN other_company_name text,
  ADD COLUMN other_project_name text;

-- Make foreign keys nullable to allow custom names
ALTER TABLE public.invoices 
  ALTER COLUMN company_id DROP NOT NULL,
  ALTER COLUMN project_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.invoices.other_company_name IS 'Custom company name if not selected from existing companies';
COMMENT ON COLUMN public.invoices.other_project_name IS 'Custom project name if not selected from existing projects';
