-- Migration 026: Fix RLS helper functions and ensure persistent access
-- Standardize functions to always return boolean (never null)
-- This fixes potential 403 Forbidden errors when profile lookups return no rows.

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT (r.permissions->>perm)::boolean 
     FROM public.profiles p
     JOIN public.roles r ON r.id = p.role_id
     WHERE p.id = auth.uid()
     LIMIT 1), 
    false
  );
$$;

-- Ensure invoices policies are robust
DROP POLICY IF EXISTS "invoices_insert_simple" ON public.invoices;
DROP POLICY IF EXISTS "invoices_select_simple" ON public.invoices;
DROP POLICY IF EXISTS "invoices_all_staff" ON public.invoices;
DROP POLICY IF EXISTS "invoices_manage" ON public.invoices;
DROP POLICY IF EXISTS "invoices_select_auth" ON public.invoices;

CREATE POLICY "invoices_access_staff" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

-- Ensure invoice_items follow
DROP POLICY IF EXISTS "invoice_items_all_staff" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_manage" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_select_auth" ON public.invoice_items;

CREATE POLICY "invoice_items_access_staff" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

-- Audit logs
DROP POLICY IF EXISTS "audit_logs_insert_auth" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_auth" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
