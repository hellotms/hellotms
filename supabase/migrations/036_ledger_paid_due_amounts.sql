-- Migration 036: Add paid_amount and due_amount to ledger_entries
-- This enables partial payment tracking for individual expenses.

ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS paid_amount  numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount   numeric(14,2) DEFAULT 0;

-- Update paid_status constraint to include 'partial'
ALTER TABLE public.ledger_entries
  DROP CONSTRAINT IF EXISTS ledger_entries_paid_status_check;

-- Note: In older migrations the check might be named differently or unnamed.
-- We re-apply it robustly.
ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_paid_status_check CHECK (paid_status IN ('paid', 'unpaid', 'partial'));

COMMENT ON COLUMN public.ledger_entries.paid_amount IS 'The amount actually paid for this expense (useful for partial payments)';
COMMENT ON COLUMN public.ledger_entries.due_amount IS 'The remaining amount due for this expense';
