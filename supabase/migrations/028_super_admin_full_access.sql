-- Super Admin Full Access Sync
-- This migration ensures the super_admin role has all current permissions set to true. 
-- Note: Code logic already bypasses these checks, but this keeps the data consistent.

UPDATE roles
SET permissions = (
  SELECT jsonb_object_agg(key, true)
  FROM (
    SELECT UNNEST(ARRAY[
      'view_dashboard', 'view_reports', 'manage_companies', 'manage_projects', 
      'view_projects', 'manage_ledger', 'view_ledger', 'manage_invoices', 
      'send_invoice', 'manage_staff', 'view_staff', 'manage_roles', 
      'manage_leads', 'view_leads', 'manage_cms', 'manage_settings', 
      'manage_notices', 'view_notices', 'view_audit_logs'
    ]) as key
  ) as perms
)
WHERE name = 'super_admin';
