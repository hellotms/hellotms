-- Marketing Solution — Initial Schema Migration
-- hellotms.com.bd

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- roles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default roles
INSERT INTO public.roles (name, permissions) VALUES
  ('super_admin', '{
    "view_dashboard":true,"manage_companies":true,"manage_projects":true,
    "manage_ledger":true,"manage_invoices":true,"send_invoice":true,
    "manage_leads":true,"manage_staff":true,"manage_roles":true,
    "manage_cms":true,"manage_settings":true,"view_audit_logs":true
  }'::jsonb),
  ('admin', '{
    "view_dashboard":true,"manage_companies":true,"manage_projects":true,
    "manage_ledger":true,"manage_invoices":true,"send_invoice":true,
    "manage_leads":true,"manage_staff":false,"manage_roles":false,
    "manage_cms":true,"manage_settings":false,"view_audit_logs":true
  }'::jsonb),
  ('staff', '{
    "view_dashboard":true,"manage_companies":false,"manage_projects":true,
    "manage_ledger":true,"manage_invoices":true,"send_invoice":false,
    "manage_leads":true,"manage_staff":false,"manage_roles":false,
    "manage_cms":false,"manage_settings":false,"view_audit_logs":false
  }'::jsonb),
  ('viewer', '{
    "view_dashboard":true,"manage_companies":false,"manage_projects":false,
    "manage_ledger":false,"manage_invoices":false,"send_invoice":false,
    "manage_leads":false,"manage_staff":false,"manage_roles":false,
    "manage_cms":false,"manage_settings":false,"view_audit_logs":false
  }'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles (extends auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  role_id     uuid NOT NULL REFERENCES public.roles(id),
  avatar_url  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_id_idx ON public.profiles(role_id);

-- Auto-create profile on user signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'viewer' LIMIT 1;
  INSERT INTO public.profiles (id, name, email, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role_id')::uuid, default_role_id)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- companies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  logo_url    text,
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_slug_idx ON public.companies(slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- projects
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  slug                  text NOT NULL UNIQUE,
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed')),
  event_start_date      date NOT NULL,
  event_end_date        date,
  location              text,
  notes                 text,
  is_published          boolean NOT NULL DEFAULT false,
  is_featured           boolean NOT NULL DEFAULT false,
  project_created_at    date,
  project_completed_at  date,
  created_by            uuid REFERENCES public.profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_company_id_idx    ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS projects_status_idx        ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_is_published_idx  ON public.projects(is_published);
CREATE INDEX IF NOT EXISTS projects_is_featured_idx   ON public.projects(is_featured);
CREATE INDEX IF NOT EXISTS projects_event_start_idx   ON public.projects(event_start_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- ledger_entries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('income','expense')),
  category        text NOT NULL,
  amount          numeric(14,2) NOT NULL CHECK (amount >= 0),
  entry_date      date NOT NULL,
  paid_status     text CHECK (paid_status IN ('paid','unpaid')),
  note            text,
  attachment_url  text,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_entries_project_id_idx ON public.ledger_entries(project_id);
CREATE INDEX IF NOT EXISTS ledger_entries_type_idx       ON public.ledger_entries(type);
CREATE INDEX IF NOT EXISTS ledger_entries_entry_date_idx ON public.ledger_entries(entry_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- collections
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.collections (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount        numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_date  date NOT NULL,
  method        text,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collections_project_id_idx   ON public.collections(project_id);
CREATE INDEX IF NOT EXISTS collections_payment_date_idx ON public.collections(payment_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- invoices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.companies(id),
  invoice_number  text NOT NULL UNIQUE,
  type            text NOT NULL DEFAULT 'invoice' CHECK (type IN ('estimate','invoice')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  total_amount    numeric(14,2) NOT NULL DEFAULT 0,
  due_date        date,
  sent_at         timestamptz,
  paid_at         timestamptz,
  pdf_url         text,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_project_id_idx  ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS invoices_company_id_idx  ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx      ON public.invoices(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- invoice_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description  text NOT NULL,
  quantity     numeric(10,2) NOT NULL DEFAULT 1,
  unit_price   numeric(14,2) NOT NULL DEFAULT 0,
  amount       numeric(14,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON public.invoice_items(invoice_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- leads
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  phone         text,
  email         text,
  event_date    date,
  location      text,
  budget_range  text,
  message       text,
  status        text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_status_idx     ON public.leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- site_settings (singleton)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  id                        integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_title                text NOT NULL DEFAULT 'Marketing Solution',
  hero_subtitle             text,
  hero_cta_primary_label    text,
  hero_cta_primary_url      text,
  hero_cta_secondary_label  text,
  hero_cta_secondary_url    text,
  phone                     text,
  whatsapp                  text,
  services                  jsonb NOT NULL DEFAULT '[]',
  about_content             text,
  contact_info              jsonb NOT NULL DEFAULT '{}',
  socials                   jsonb NOT NULL DEFAULT '{}',
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Seed default row
INSERT INTO public.site_settings (id, hero_title, hero_subtitle, phone, whatsapp, services, contact_info, socials)
VALUES (1,
  'Marketing Solution',
  'Your Premier Events Management Partner',
  '+8801XXXXXXXXX',
  '+8801XXXXXXXXX',
  '[{"id":"1","title":"Corporate Events","description":"Professional corporate event management","icon":"briefcase"},
    {"id":"2","title":"Wedding Ceremonies","description":"Elegant wedding planning and execution","icon":"heart"},
    {"id":"3","title":"Conferences","description":"Large scale conference organization","icon":"users"}]'::jsonb,
  '{"address":"Dhaka, Bangladesh","email":"hello@hellotms.com.bd","phone":"+8801XXXXXXXXX"}'::jsonb,
  '{"facebook":"https://facebook.com/hellotms","instagram":"https://instagram.com/hellotms"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid REFERENCES public.profiles(id),
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx      ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx       ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx   ON public.audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- health_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_logs (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pinged_at  timestamptz NOT NULL DEFAULT now(),
  status     text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error'))
);

CREATE INDEX IF NOT EXISTS health_logs_pinged_at_idx ON public.health_logs(pinged_at DESC);
