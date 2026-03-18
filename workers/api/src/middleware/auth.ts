import type { MiddlewareHandler } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env, Variables } from '../types.js';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized — missing token' }, 401);
  }

  const token = authHeader.slice(7);
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // Extract session ID from JWT payload
  let sessionId: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    sessionId = payload.session_id;
  } catch (e) {
    return c.json({ error: 'Unauthorized — malformed token' }, 401);
  }

  // Verify JWT using Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return c.json({ error: 'Unauthorized — invalid token' }, 401);
  }

  // Check if session is still valid in DB (instant revocation check)
  if (sessionId) {
    const { data: isValid, error: sessionErr } = await supabase.rpc('validate_session', { session_id_param: sessionId });
    if (sessionErr || !isValid) {
      return c.json({ error: 'Unauthorized — session revoked' }, 401);
    }
  }

  // Fetch profile + role + permissions
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, roles(*)')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return c.json({ error: 'Unauthorized — profile not found' }, 401);
  }

  if (!profile.is_active) {
    return c.json({ error: 'Unauthorized — account deactivated' }, 403);
  }

  c.set('userId', user.id);
  c.set('userEmail', user.email ?? '');
  c.set('userRole', profile.roles?.name ?? 'viewer');
  c.set('userPermissions', profile.roles?.permissions ?? {});

  await next();
};

export function requireRole(...roles: string[]): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const role = c.get('userRole');
    if (!roles.includes(role)) {
      return c.json({ error: `Forbidden — requires role: ${roles.join(' or ')}` }, 403);
    }
    await next();
  };
}

export function requirePermission(permission: string): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const role = c.get('userRole');
    if (role === 'super_admin') {
      return await next();
    }
    const permissions = c.get('userPermissions');
    if (!permissions?.[permission]) {
      return c.json({ error: `Forbidden — requires permission: ${permission}` }, 403);
    }
    await next();
  };
}
