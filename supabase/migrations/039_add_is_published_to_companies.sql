-- Add is_published to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Allow public access to published companies
CREATE POLICY "Allow public read-only access to published companies"
ON companies FOR SELECT
USING (is_published = true AND deleted_at IS NULL);
