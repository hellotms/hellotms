-- Migration 052: Add day_month multiplier to ledger_entries and invoice_items
-- This column acts as a multiplier for calculations: Total = Qty * Day/Month * Rate

-- 1. Add to ledger_entries
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS day_month numeric(10,2) NOT NULL DEFAULT 1;

-- 2. Add to invoice_items
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS day_month numeric(10,2) NOT NULL DEFAULT 1;

-- 3. Comment for documentation
COMMENT ON COLUMN public.ledger_entries.day_month IS 'Multiplier for quantity (days/months/etc)';
COMMENT ON COLUMN public.invoice_items.day_month IS 'Multiplier for quantity (days/months/etc)';
