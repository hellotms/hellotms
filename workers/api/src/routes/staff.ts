import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { staffInviteSchema } from '@hellotms/shared';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { sendEmail, buildInviteEmailHtml, buildPasswordResetEmailHtml } from '../services/brevo.js';
import type { Env, Variables } from '../types.js';

export const staffRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

staffRoute.use('*', authMiddleware);

// Helper: generate a secure temp password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pwd = '';
  pwd += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 22)];
  pwd += 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 22)];
  pwd += '23456789'[Math.floor(Math.random() * 8)];
  pwd += '!@#$'[Math.floor(Math.random() * 4)];
  for (let i = 4; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

// POST /staff/invite — invite with temp password
staffRoute.post('/invite', requirePermission('manage_staff'), async (c) => {
  const body = await c.req.json();
  const parsed = staffInviteSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { email, name, role_id } = parsed.data;
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { data: role } = await supabase.from('roles').select('name').eq('id', role_id).single();

  const tempPassword = generateTempPassword();

  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, role_id },
  });

  if (createError) {
    console.error('[staff/invite] Error creating user:', createError);
    return c.json({ error: createError.message }, 500);
  }

  await (supabase as any).from('profiles').upsert({
    id: createdUser.user.id,
    name,
    email,
    role_id,
    is_active: true,
    force_password_change: true,
  });

  const loginUrl = `https://ad.acadome.dev`;
  const html = buildInviteEmailHtml({
    recipientName: name,
    inviteUrl: loginUrl,
    role: role?.name ?? 'Staff',
    senderName: 'Marketing Solution',
    tempPassword,
  });

  await sendEmail(c.env.BREVO_API_KEY, c.env.BREVO_SENDER_EMAIL, c.env.BREVO_SENDER_NAME, {
    to: [{ email, name }],
    subject: "You're invited to Marketing Solution Admin",
    htmlContent: html,
  });

  await supabase.from('audit_logs').insert({
    user_id: c.get('userId'),
    action: 'staff_invited',
    entity_type: 'profile',
    entity_id: createdUser.user.id,
    after: { email, name, role_id },
  });

  return c.json({ message: 'Staff invited successfully', userId: createdUser.user.id, tempPassword }, 201);
});

// PUT /staff/:id/role
staffRoute.put('/:id/role', requirePermission('manage_roles'), async (c) => {
  const { id } = c.req.param();
  const { role_id } = await c.req.json();
  if (!role_id) return c.json({ error: 'role_id is required' }, 400);

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const { data: before } = await supabase.from('profiles').select('role_id').eq('id', id).single();
  const { error } = await supabase.from('profiles').update({ role_id }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from('audit_logs').insert({
    user_id: c.get('userId'),
    action: 'role_changed',
    entity_type: 'profile',
    entity_id: id,
    before: before ?? {},
    after: { role_id },
  });

  return c.json({ message: 'Role updated successfully' });
});

// PUT /staff/:id/deactivate
staffRoute.put('/:id/deactivate', requirePermission('manage_staff'), async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from('audit_logs').insert({
    user_id: c.get('userId'),
    action: 'staff_deactivated',
    entity_type: 'profile',
    entity_id: id,
  });

  return c.json({ message: 'Staff deactivated' });
});

// PUT /staff/:id/activate
staffRoute.put('/:id/activate', requirePermission('manage_staff'), async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ message: 'Staff activated' });
});

// PUT /staff/:id/reset-password
staffRoute.put('/:id/reset-password', async (c) => {
  const { id } = c.req.param();

  // Custom auth check to ensure caller is Super Admin. In Supabase we don't naturally 
  // expose 'userRoleName' in Variables, we check permissions:
  const callerPerms = c.get('userPermissions');
  // 'manage_roles' and 'manage_staff' are the highest markers of super admin / admin
  if (!callerPerms || !callerPerms.manage_staff) {
    return c.json({ error: 'Only administrators can reset passwords' }, 403);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // First, get the staff info
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', id)
    .single();

  if (profileErr || !profile) {
    return c.json({ error: 'Staff profile not found' }, 404);
  }

  // Generate new Temp Password
  const tempPassword = generateTempPassword();

  // Update Auth layer
  const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(id, {
    password: tempPassword
  });

  if (updateAuthErr) return c.json({ error: updateAuthErr.message }, 500);

  // Mark as needing password change so they get redirected to /setup
  await (supabase as any).from('profiles').update({ force_password_change: true }).eq('id', id);

  // Send Email
  const loginUrl = `https://ad.acadome.dev`; // Adjust via env if needed
  const html = buildPasswordResetEmailHtml({
    recipientName: profile.name,
    loginUrl,
    tempPassword
  });

  await sendEmail(c.env.BREVO_API_KEY, c.env.BREVO_SENDER_EMAIL, c.env.BREVO_SENDER_NAME, {
    to: [{ email: profile.email, name: profile.name }],
    subject: "Security: Your Ad.Acadome.Dev Password was reset",
    htmlContent: html,
  });

  return c.json({ message: 'Password reset successfully', tempPassword });
});

// PUT /staff/:id/profile — update profile (self or manage_staff admin)
staffRoute.put('/:id/profile', async (c) => {
  const { id } = c.req.param();
  const userId = c.get('userId');
  const permissions = c.get('userPermissions');
  if (id !== userId && !permissions?.manage_staff) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const body = await c.req.json();

  const { error } = await supabase
    .from('profiles')
    .update({
      name: body.name,
      phone: body.phone,
      bio: body.bio,
      avatar_url: body.avatar_url,
      force_password_change: false,
    })
    .eq('id', id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Profile updated successfully' });
});

// GET /staff — list all staff
staffRoute.get('/', requirePermission('manage_staff'), async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from('profiles')
    .select('*, roles(name, permissions)')
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data });
});

// ─── Session Management (Logged Devices) ─────────────────────────────────────

// GET /staff/me/sessions
staffRoute.get('/me/sessions', async (c) => {
  const userId = c.get('userId');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // We query the auth schema directly using service role
  const { data, error } = await (supabase as any)
    .schema('auth')
    .from('sessions')
    .select('id, created_at, updated_at, user_agent, ip')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[staff/sessions] Error fetching sessions:', error);
    return c.json({ error: error.message }, 500);
  }

  return c.json({ data });
});

// DELETE /staff/me/sessions/:id — revoke a specific session
staffRoute.delete('/me/sessions/:id', async (c) => {
  const { id } = c.req.param();
  const userId = c.get('userId');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // Correct way to revoke a session via service role:
  const { error: sessionErr } = await (supabase as any)
    .schema('auth')
    .from('sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (sessionErr) return c.json({ error: sessionErr.message }, 500);
  return c.json({ success: true, message: 'Session revoked' });
});

// DELETE /staff/me/sessions — revoke ALL OTHER sessions
staffRoute.delete('/me/sessions', async (c) => {
  const userId = c.get('userId');
  const currentSessionId = c.req.header('X-Session-Id'); // Admin should pass this if they want to keep current
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  let query = (supabase as any)
    .schema('auth')
    .from('sessions')
    .delete()
    .eq('user_id', userId);

  if (currentSessionId) {
    query = query.neq('id', currentSessionId);
  }

  const { error: revokeErr } = await query;

  if (revokeErr) return c.json({ error: revokeErr.message }, 500);
  return c.json({ success: true, message: 'Other sessions revoked' });
});
