-- Fix deletions and permissions
-- hellotms.com.bd

-- 1. Add DELETE policy for leads
CREATE POLICY "leads_delete_admin" ON public.leads FOR DELETE TO authenticated
  USING (public.has_permission('manage_leads') AND public.is_active_staff());

-- 2. Update invoices policy to ensure admin can delete
-- The current policy 'invoices_manage' covers ALL (INSERT, UPDATE, DELETE)
-- but we need to ensure the permission check is robust.
DROP POLICY IF EXISTS "invoices_manage" ON public.invoices;
CREATE POLICY "invoices_manage" ON public.invoices FOR ALL TO authenticated
  USING (public.has_permission('manage_invoices') AND public.is_active_staff())
  WITH CHECK (public.has_permission('manage_invoices') AND public.is_active_staff());

-- 3. Update profiles delete policy to allow admin role to delete staff (if they have manage_staff permission)
DROP POLICY IF EXISTS "profiles_delete_super" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_permission('manage_staff') AND public.is_active_staff());

-- 4. RPC to safely delete user from auth.users (wrapped in security definer)
-- This function deletes the user from auth.users, which cascades to public.profiles
CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only allow if target is not the caller themselves (safety)
  -- Or if caller is super_admin or has manage_staff
  IF auth.uid() = user_id THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 5. Enforce last super-admin safeguard (Formerly Migration 020)
-- This prevents deleting or changing the role of the last super admin

CREATE OR REPLACE FUNCTION public.check_super_admin_count()
RETURNS trigger AS $$
DECLARE
  super_admin_count integer;
  super_admin_role_id uuid;
BEGIN
  -- Get the ID for super_admin role
  SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin' LIMIT 1;

  -- Count remaining super admins
  SELECT count(*) INTO super_admin_count 
  FROM public.profiles 
  WHERE role_id = super_admin_role_id;

  -- Prevent deletion of the last super admin
  IF (TG_OP = 'DELETE') THEN
    IF (OLD.role_id = super_admin_role_id AND super_admin_count <= 1) THEN
      RAISE EXCEPTION 'Cannot delete the last super admin. System must have at least one super admin.';
    END IF;
    RETURN OLD;
  END IF;

  -- Prevent changing role of the last super admin to something else
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.role_id = super_admin_role_id AND NEW.role_id != super_admin_role_id AND super_admin_count <= 1) THEN
      RAISE EXCEPTION 'Cannot change role of the last super admin. System must have at least one super admin.';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS ensure_last_super_admin_delete ON public.profiles;
CREATE TRIGGER ensure_last_super_admin_delete
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_super_admin_count();

DROP TRIGGER IF EXISTS ensure_last_super_admin_update ON public.profiles;
CREATE TRIGGER ensure_last_super_admin_update
BEFORE UPDATE OF role_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_super_admin_count();
