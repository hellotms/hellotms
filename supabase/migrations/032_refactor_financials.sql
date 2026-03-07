-- Migration 032: Refactor Project Financials
-- 1. Rename 'budget' to 'invoice_amount' in projects table
ALTER TABLE public.projects 
  RENAME COLUMN budget TO invoice_amount;

COMMENT ON COLUMN public.projects.invoice_amount IS 'Agreed total project contract value from client';

-- 2. Add 'is_external' flag to ledger_entries
-- false (default) = Standard project expense (invoiceable)
-- true = Internal/Other expense (not for client invoice)
ALTER TABLE public.ledger_entries
  ADD COLUMN is_external BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ledger_entries.is_external IS 'If true, this is an internal/other expense not meant for client invoicing';

-- 3. Optional: Add 'paid_date' to collections if not already trackable via created_at
-- (Actually payment_date already exists in collections)
