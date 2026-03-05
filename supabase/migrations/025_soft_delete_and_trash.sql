-- 025_soft_delete_and_trash.sql
-- Add soft delete support + trash bin

-- Add deleted_at to main tables
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Trash bin table (stores snapshots for restore)
CREATE TABLE IF NOT EXISTS trash_bin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,   -- 'company', 'project', 'invoice', 'collection', 'ledger_entry', 'gallery_photo'
  entity_id text NOT NULL,
  entity_name text NOT NULL,
  entity_data jsonb NOT NULL,  -- full snapshot of the row for restoration
  deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX idx_trash_bin_entity_type ON trash_bin(entity_type);
CREATE INDEX idx_trash_bin_expires_at ON trash_bin(expires_at);

-- RLS
ALTER TABLE trash_bin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trash_bin_select_authenticated"
  ON trash_bin FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "trash_bin_insert_authenticated"
  ON trash_bin FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "trash_bin_delete_authenticated"
  ON trash_bin FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "trash_bin_update_authenticated"
  ON trash_bin FOR UPDATE
  TO authenticated
  USING (true);
