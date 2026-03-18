-- ==============================================================================
-- SESSION MANAGEMENT SETUP SCRIPT (RUN THIS IN SUPABASE SQL EDITOR)
-- ==============================================================================

-- 1. Create the functions in the public schema
-- These use SECURITY DEFINER to bypass RLS since auth.sessions is protected.

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
  SELECT s.id, s.created_at, s.updated_at, s.user_agent, s.ip
  FROM auth.sessions s
  WHERE s.user_id = user_id_param
  ORDER BY s.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

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

-- 2. Grant execution permissions (though service_role has them anyway)
GRANT EXECUTE ON FUNCTION public.get_user_sessions(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_session(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_other_sessions(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_all_sessions(UUID) TO service_role;

-- 3. FORCE CACHE RELOAD (Critically important for PostgREST to see the new functions)
NOTIFY pgrst, 'reload schema';

-- VERIFICATION: Run this to see if they exist
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_user_sessions%';
