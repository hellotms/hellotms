-- 1. Add ledger_id and cost_price to invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS ledger_id uuid REFERENCES ledger_entries(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cost_price numeric(14,2) NOT NULL DEFAULT 0;

-- 2. Backfill cost_price from ledger_entries if ledger_id exists
-- UPDATE invoice_items i SET cost_price = l.amount FROM ledger_entries l WHERE i.ledger_id = l.id AND i.cost_price = 0;

-- 3. Add Activity Logs Trigger for invoice_items
CREATE OR REPLACE FUNCTION public.log_invoice_items_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (action, entity_type, entity_id, after, user_id)
        VALUES ('create_invoice_item', 'invoice', NEW.invoice_id, row_to_json(NEW), current_user_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if actual values changed
        IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
            INSERT INTO public.audit_logs (action, entity_type, entity_id, before, after, user_id)
            VALUES ('update_invoice_item', 'invoice', NEW.invoice_id, row_to_json(OLD), row_to_json(NEW), current_user_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (action, entity_type, entity_id, before, user_id)
        VALUES ('delete_invoice_item', 'invoice', OLD.invoice_id, row_to_json(OLD), current_user_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_log_invoice_items_changes ON public.invoice_items;
CREATE TRIGGER trg_log_invoice_items_changes
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.log_invoice_items_changes();
