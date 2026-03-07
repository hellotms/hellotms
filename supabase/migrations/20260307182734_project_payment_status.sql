-- Add payment_status and paid_at to projects
ALTER TABLE projects ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid'));
ALTER TABLE projects ADD COLUMN paid_at TIMESTAMPTZ;

-- Sync existing projects: if unpaid invoices exist, mark as unpaid (default), 
-- if all invoices are paid or total_received >= invoice_amount, mark as paid.
UPDATE projects 
SET payment_status = 'paid', 
    paid_at = created_at
WHERE invoice_amount > 0 AND (
    SELECT COALESCE(SUM(amount), 0) FROM collections WHERE project_id = projects.id AND deleted_at IS NULL
) >= invoice_amount;
