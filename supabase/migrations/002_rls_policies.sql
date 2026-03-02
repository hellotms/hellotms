-- RLS Policies for Marketing Solution
-- hellotms.com.bd

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: get current user's role name
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT r.name
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((r.permissions->>perm)::boolean, false)
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(is_active, false)
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs      ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- roles policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "roles_read_all_auth" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_write_super_admin" ON public.roles FOR ALL TO authenticated
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_permission('manage_staff'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_permission('manage_staff'))
  WITH CHECK (id = auth.uid() OR public.has_permission('manage_staff'));
CREATE POLICY "profiles_insert_service" ON public.profiles FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "profiles_delete_super" ON public.profiles FOR DELETE TO authenticated
  USING (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- companies policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "companies_select_auth" ON public.companies FOR SELECT TO authenticated
  USING (public.is_active_staff());
CREATE POLICY "companies_modify_auth" ON public.companies FOR ALL TO authenticated
  USING (public.has_permission('manage_companies') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_companies') AND public.is_active_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- projects policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Public can read published projects
CREATE POLICY "projects_public_read" ON public.projects FOR SELECT TO anon
  USING (is_published = true);
-- Auth staff can read all
CREATE POLICY "projects_auth_read" ON public.projects FOR SELECT TO authenticated
  USING (public.is_active_staff());
-- Manage permission required for write
CREATE POLICY "projects_manage" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('manage_projects') AND public.is_active_staff());
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (public.has_permission('manage_projects') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_projects') AND public.is_active_staff());
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (public.has_permission('manage_projects') AND public.get_my_role() IN ('super_admin','admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- ledger_entries policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "ledger_select_auth" ON public.ledger_entries FOR SELECT TO authenticated
  USING (public.is_active_staff() AND deleted_at IS NULL);
CREATE POLICY "ledger_manage" ON public.ledger_entries FOR ALL TO authenticated
  USING (public.has_permission('manage_ledger') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_ledger') AND public.is_active_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- collections policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "collections_select_auth" ON public.collections FOR SELECT TO authenticated
  USING (public.is_active_staff());
CREATE POLICY "collections_manage" ON public.collections FOR ALL TO authenticated
  USING (public.has_permission('manage_ledger') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_ledger') AND public.is_active_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- invoices policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "invoices_select_auth" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_active_staff());
CREATE POLICY "invoices_manage" ON public.invoices FOR ALL TO authenticated
  USING (public.has_permission('manage_invoices') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_invoices') AND public.is_active_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- invoice_items policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "invoice_items_select_auth" ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_active_staff());
CREATE POLICY "invoice_items_manage" ON public.invoice_items FOR ALL TO authenticated
  USING (public.has_permission('manage_invoices') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_invoices') AND public.is_active_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- leads policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Public can INSERT (contact form)
CREATE POLICY "leads_public_insert" ON public.leads FOR INSERT TO anon WITH CHECK (true);
-- Auth staff read/update
CREATE POLICY "leads_auth_read" ON public.leads FOR SELECT TO authenticated
  USING (public.has_permission('manage_leads') AND public.is_active_staff());
CREATE POLICY "leads_auth_update" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_permission('manage_leads') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_leads') AND public.is_active_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- site_settings policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT TO anon USING (true);
CREATE POLICY "site_settings_auth_read" ON public.site_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "site_settings_manage" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_permission('manage_cms'))
  WITH CHECK (public.has_permission('manage_cms'));

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "audit_logs_insert_service" ON public.audit_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "audit_logs_insert_auth" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_logs_read_auth" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_permission('view_audit_logs'));

-- ─────────────────────────────────────────────────────────────────────────────
-- health_logs policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "health_logs_service" ON public.health_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "health_logs_read_admin" ON public.health_logs FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('super_admin','admin'));
