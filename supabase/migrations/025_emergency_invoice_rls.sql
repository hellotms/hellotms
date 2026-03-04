-- Migration 025: EMERGENCY RLS FIX for Invoices
-- Simplifies the policy to ensure authenticated users can insert/select if they are staff.

DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_modify" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;
DROP POLICY IF EXISTS "invoices_select_auth" ON public.invoices;

-- Basic staff check without permission JSON complexity to rule out issues
CREATE POLICY "invoices_insert_simple" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "invoices_select_simple" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "invoices_all_staff" ON public.invoices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true));

-- Repeat for invoice_items
DROP POLICY IF EXISTS "invoice_items_insert" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_modify" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_delete" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_select_auth" ON public.invoice_items;

CREATE POLICY "invoice_items_all_staff" ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true));
