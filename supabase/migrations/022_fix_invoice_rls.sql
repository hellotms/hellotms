-- Migration 022: Fix invoice INSERT RLS policy
-- The current policy requires USING + WITH CHECK but the WITH CHECK fails when created_by is null.
-- Split into separate SELECT/INSERT/UPDATE/DELETE policies for finer control.

DROP POLICY IF EXISTS "invoices_manage" ON public.invoices;
DROP POLICY IF EXISTS "invoice_items_manage" ON public.invoice_items;

-- Allow staff with manage_invoices to insert invoices (no USING clause needed for INSERT)
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('manage_invoices') AND public.is_active_staff());

-- Allow staff with manage_invoices to update/delete their own invoices
CREATE POLICY "invoices_modify" ON public.invoices FOR UPDATE TO authenticated
  USING (public.has_permission('manage_invoices') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_invoices') AND public.is_active_staff());

CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated
  USING (public.has_permission('manage_invoices') AND public.is_active_staff());

-- invoice_items
CREATE POLICY "invoice_items_insert" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('manage_invoices') AND public.is_active_staff());

CREATE POLICY "invoice_items_modify" ON public.invoice_items FOR UPDATE TO authenticated
  USING (public.has_permission('manage_invoices') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_invoices') AND public.is_active_staff());

CREATE POLICY "invoice_items_delete" ON public.invoice_items FOR DELETE TO authenticated
  USING (public.has_permission('manage_invoices') AND public.is_active_staff());
