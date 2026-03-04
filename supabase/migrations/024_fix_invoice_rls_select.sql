-- Migration 024: Restore SELECT access for invoices and items
-- Ensure staff can read invoices even after previous policy changes.

DROP POLICY IF EXISTS "invoices_select_auth" ON public.invoices;
DROP POLICY IF EXISTS "invoice_items_select_auth" ON public.invoice_items;

CREATE POLICY "invoices_select_auth" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_active_staff());

CREATE POLICY "invoice_items_select_auth" ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_active_staff());
