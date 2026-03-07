-- Add subject line and explicit invoice date to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Backfill invoice_date from created_at for existing invoices
UPDATE invoices SET invoice_date = created_at::date WHERE invoice_date IS NULL;
