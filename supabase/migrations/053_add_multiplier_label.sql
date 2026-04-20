-- Migration 053: Add multiplier_label to invoices and ledger_entries
-- This allows customizing the label (Day/Month/etc) in headers and PDFs

-- 1. Add to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS multiplier_label text NOT NULL DEFAULT 'Days';

-- 2. Add to ledger_entries
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS multiplier_label text NOT NULL DEFAULT 'Days';

-- 3. Comment for documentation
COMMENT ON COLUMN public.invoices.multiplier_label IS 'Label for the multiplier column (e.g. Day, Month, Day/Month)';
COMMENT ON COLUMN public.ledger_entries.multiplier_label IS 'Label for the multiplier column (e.g. Day, Month, Day/Month)';
