-- 054_document_history.sql
-- Multi-version PDF history for invoices and estimates

CREATE TABLE IF NOT EXISTS public.document_history (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id    uuid NOT NULL,
  parent_type  text NOT NULL CHECK (parent_type IN ('invoice', 'estimate')),
  file_name    text NOT NULL,
  pdf_url      text NOT NULL,
  is_sent      boolean NOT NULL DEFAULT false,
  sent_at      timestamptz,
  sent_to      jsonb,
  deleted_at   timestamptz,
  created_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_document_history_parent ON public.document_history(parent_id, parent_type);
CREATE INDEX IF NOT EXISTS idx_document_history_deleted_at ON public.document_history(deleted_at);

-- RLS
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_history_select_authenticated"
  ON public.document_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "document_history_insert_authenticated"
  ON public.document_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "document_history_update_authenticated"
  ON public.document_history FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "document_history_delete_authenticated"
  ON public.document_history FOR DELETE
  TO authenticated
  USING (true);

-- ─── MIGRATION DATA ───
-- Move existing invoice PDF URLs
INSERT INTO public.document_history (parent_id, parent_type, file_name, pdf_url, is_sent, sent_at, created_at)
SELECT 
  id as parent_id, 
  type as parent_type,
  'Initial Version' as file_name,
  pdf_url,
  (status = 'sent' OR status = 'paid' OR status = 'overdue') as is_sent,
  sent_at,
  created_at
FROM public.invoices
WHERE pdf_url IS NOT NULL;
