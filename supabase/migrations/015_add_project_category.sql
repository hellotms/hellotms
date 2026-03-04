-- Add category column to projects table
ALTER TABLE IF EXISTS public.projects 
ADD COLUMN IF NOT EXISTS category text;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS projects_category_idx ON public.projects(category);
