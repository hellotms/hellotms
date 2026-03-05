-- 024_notices.sql
-- Notice board: staff can create notices, all authenticated users can view

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  cover_url text,
  attachments jsonb DEFAULT '[]'::jsonb, -- [{type: 'image'|'pdf', url: text, name: text}]
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_notices_created_at ON notices(created_at DESC);
CREATE INDEX idx_notices_expires_at ON notices(expires_at);

-- RLS
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "notices_select_authenticated"
  ON notices FOR SELECT
  TO authenticated
  USING (true);

-- Only users with manage_notices permission (enforced at app level via worker)
-- The following policies allow all authenticated to insert/update/delete 
-- (backend worker enforces permission check before calling Supabase)
CREATE POLICY "notices_insert_authenticated"
  ON notices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "notices_update_authenticated"
  ON notices FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "notices_delete_authenticated"
  ON notices FOR DELETE
  TO authenticated
  USING (true);
