-- 011_update_super_admin_permissions.sql

UPDATE public.roles
SET permissions = '{
  "view_dashboard": true,
  "view_reports": true,
  "manage_companies": true,
  "manage_projects": true,
  "view_projects": true,
  "manage_ledger": true,
  "view_ledger": true,
  "send_invoice": true,
  "manage_staff": true,
  "view_staff": true,
  "manage_roles": true,
  "manage_leads": true,
  "view_leads": true,
  "manage_cms": true,
  "manage_settings": true,
  "view_audit_logs": true
}'::jsonb
WHERE name = 'super_admin';
