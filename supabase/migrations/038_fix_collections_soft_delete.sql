-- Add deleted_at to collections if missing
ALTER TABLE collections ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
