-- Make slug columns nullable in projects and companies
ALTER TABLE public.projects ALTER COLUMN slug DROP NOT NULL;
ALTER TABLE public.companies ALTER COLUMN slug DROP NOT NULL;

-- Remove unique constraint if we want to allow nulls (which already allow multiple nulls in Postgres)
-- But we might want to keep it unique for non-null values.
-- Postgres unique constraints already handle multiple NULL values correctly (they are not considered equal).
