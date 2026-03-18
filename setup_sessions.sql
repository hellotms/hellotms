-- ==============================================================================
-- 🚀 CLEAN SESSION MANAGEMENT SETUP (FIX FOR SIGNATURE MISMATCH)
-- ==============================================================================

-- 1. Drop existing functions to ensure a fresh start
DROP FUNCTION IF EXISTS public.get_user_sessions(uuid);
DROP FUNCTION IF EXISTS public.revoke_session(uuid, uuid);
DROP FUNCTION IF EXISTS public.revoke_other_sessions(uuid, uuid);
DROP FUNCTION IF EXISTS public.revoke_all_sessions(uuid);

-- 2. Re-create the get_user_sessions function with explicit types
-- This matches the columns expected by the frontend: id, created_at, updated_at, user_agent, ip
CREATE OR REPLACE FUNCTION public.get_user_sessions(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_agent TEXT,
  ip TEXT
)
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, 
    s.created_at, 
    s.updated_at, 
    s.user_agent, 
    s.ip::text -- Explicit cast to text
  FROM auth.sessions s
  WHERE s.user_id = user_id_param
  ORDER BY s.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create revocation functions
CREATE OR REPLACE FUNCTION public.revoke_session(session_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.sessions
  WHERE id = session_id_param AND user_id = user_id_param;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.revoke_other_sessions(current_session_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.sessions
  WHERE id != current_session_id_param AND user_id = user_id_param;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.revoke_all_sessions(user_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.sessions
  WHERE user_id = user_id_param;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_session(session_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.sessions WHERE id = session_id_param
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_user_sessions(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_session(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_other_sessions(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_all_sessions(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_session(UUID) TO authenticated, service_role;

-- 5. ⚡️ CRITICAL: FORCE SCHEMA CACHE RELOAD
-- Sometimes PostgREST needs a few pings or a manual reload via the dashboard
NOTIFY pgrst, 'reload schema';

-- 6. VERIFICATION
-- Run this: SELECT * FROM public.get_user_sessions('YOUR_USER_UUID_HERE');
