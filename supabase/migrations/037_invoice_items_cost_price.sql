-- Migration 037: Add missing columns to invoice_items
-- This ensures that invoice items can be linked back to ledger entries and store cost prices for profit analysis.

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS ledger_id uuid REFERENCES public.ledger_entries(id) ON DELETE SET NULL;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS cost_price numeric(14,2) NOT NULL DEFAULT 0;

-- Optional: Create index for performance
CREATE INDEX IF NOT EXISTS invoice_items_ledger_id_idx ON public.invoice_items(ledger_id);
