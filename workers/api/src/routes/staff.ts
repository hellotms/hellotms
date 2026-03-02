import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { staffInviteSchema } from '@hellotms/shared';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { sendEmail, buildInviteEmailHtml } from '../services/brevo.js';
import type { Env, Variables } from '../types.js';

export const staffRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// All staff routes require auth
staffRoute.use('*', authMiddleware);

// POST /staff/invite — invite a new staff member
staffRoute.post('/invite', requirePermission('manage_staff'), async (c) => {
  const body = await c.req.json();
  const parsed = staffInviteSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { email, name, role_id } = parsed.data;
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // Look up role name for email
  const { data: role } = await supabase.from('roles').select('name').eq('id', role_id).single();

  // Create user in Supabase Auth (generates invite link)
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role_id },
    redirectTo: 'https://admin.hellotms.com.bd/auth/callback',
  });

  if (inviteError) {
    console.error('[staff/invite] Error:', inviteError);
    return c.json({ error: inviteError.message }, 500);
  }

  // Upsert profile
  await supabase.from('profiles').upsert({
    id: inviteData.user.id,
    name,
    email,
    role_id,
    is_active: true,
  });

  // Send invitation email via Brevo
  const inviteUrl = `https://admin.hellotms.com.bd/auth/accept-invite`;
  const html = buildInviteEmailHtml({
    recipientName: name,
    inviteUrl,
    role: role?.name ?? 'Staff',
    senderName: 'Marketing Solution',
  });

  await sendEmail(c.env.BREVO_API_KEY, c.env.BREVO_SENDER_EMAIL, c.env.BREVO_SENDER_NAME, {
    to: [{ email, name }],
    subject: 'You\'re invited to Marketing Solution Admin',
    htmlContent: html,
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: c.get('userId'),
    action: 'staff_invited',
    entity_type: 'profile',
    entity_id: inviteData.user.id,
    after: { email, name, role_id },
  });

  return c.json({ message: 'Invitation sent successfully', userId: inviteData.user.id }, 201);
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
