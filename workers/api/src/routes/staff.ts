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
  try {
    const body = await c.req.json();
    const parsed = staffInviteSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const { email, name, role_id } = parsed.data;
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    // Verify role exists
    const { data: role, error: roleError } = await supabase.from('roles').select('name').eq('id', role_id).single();
    if (roleError || !role) {
      return c.json({ error: 'Selected role is invalid' }, 400);
    }

    const tempPassword = generateTempPassword();

    // Create Auth User
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, role_id },
    });

    if (createError) {
      console.error('[staff/invite] Auth error:', createError);
      const isConflict = createError.message.includes('already registered') || createError.message.includes('already exists');
      return c.json({ error: createError.message }, isConflict ? 400 : 500);
    }

    const userId = authData.user.id;

    // Create Profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      name,
      email,
      role_id,
      is_active: true,
      force_password_change: true,
    });

    if (profileError) {
      console.error('[staff/invite] Profile error:', profileError);
      return c.json({ error: 'Failed to create staff profile' }, 500);
    }

    // Fetch branding
    const { data: settings } = await supabase
      .from('site_settings')
      .select('hero_title, public_site_url')
      .eq('id', 1)
      .single();

    const companyName = settings?.hero_title ?? 'Marketing Solution';
    const companyUrl = settings?.public_site_url ?? 'hellotms.com.bd';
    const loginUrl = (companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`).replace(/\/$/, '') + '/admin';

    // Send Invite Email
    const html = buildInviteEmailHtml({
      recipientName: name,
      inviteUrl: loginUrl,
      role: role?.name ?? 'Staff',
      senderName: companyName,
      tempPassword,
      companyName,
      companyUrl: companyUrl,
    });

    const emailRes = await sendEmail(c.env.BREVO_API_KEY, c.env.BREVO_SENDER_EMAIL, c.env.BREVO_SENDER_NAME, {
      to: [{ email, name }],
      subject: `You're invited to ${companyName} Admin`,
      htmlContent: html,
    });

    if (!emailRes.success) {
      console.warn('[staff/invite] Email failed:', emailRes.error);
      // We still return 201 because the user was created, but warn about email
    }

    // Log Action
    await supabase.from('audit_logs').insert({
      user_id: c.get('userId'),
      action: 'staff_invited',
      entity_type: 'profile',
      entity_id: userId,
      after: { email, name, role_id },
    });

    return c.json({
      message: emailRes.success ? 'Staff invited successfully' : 'Staff created, but invitation email failed to send',
      userId,
      tempPassword
    }, 201);

  } catch (err: any) {
    console.error('[staff/invite] Uncaught error:', err);
    return c.json({ error: err.message || 'Internal Server Error' }, 500);
  }
});

// PUT /staff/:id/role
staffRoute.put('/:id/role', requirePermission('manage_staff'), async (c) => {
  const { id } = c.req.param();
  const { role_id } = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { error } = await supabase.from('profiles').update({ role_id }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  // Sync to auth.users metadata as well
  await supabase.auth.admin.updateUserById(id, {
    user_metadata: { role_id }
  });

  await supabase.from('audit_logs').insert({
    user_id: c.get('userId'),
    action: 'staff_role_updated',
    entity_type: 'profile',
    entity_id: id,
    after: { role_id },
  });

  return c.json({ message: 'Role updated successfully' });
});

// PUT /staff/:id/activate
staffRoute.put('/:id/activate', requirePermission('manage_staff'), async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from('audit_logs').insert({
    user_id: c.get('userId'),
    action: 'staff_activated',
    entity_type: 'profile',
    entity_id: id,
  });

  return c.json({ message: 'Staff member activated' });
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

  return c.json({ message: 'Staff member deactivated' });
});

// ... 

// PUT /staff/:id/reset-password
staffRoute.put('/:id/reset-password', async (c) => {
  const { id } = c.req.param();

  const callerPerms = c.get('userPermissions');
  if (!callerPerms || !callerPerms.manage_staff) {
    return c.json({ error: 'Only administrators can reset passwords' }, 403);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('name, email, last_password_reset_at')
    .eq('id', id)
    .single();

  if (profileErr || !profile) {
    return c.json({ error: 'Staff profile not found' }, 404);
  }

  // 30-minute cooldown (1800000 ms)
  if (profile.last_password_reset_at) {
    const lastReset = new Date(profile.last_password_reset_at).getTime();
    const now = Date.now();
    const diff = now - lastReset;
    const cooldown = 30 * 60 * 1000;

    if (diff < cooldown) {
      const remaining = Math.ceil((cooldown - diff) / 60000);
      return c.json({ error: `Please wait ${remaining} minutes before resetting again.` }, 429);
    }
  }

  // Fetch branding
  const { data: settings } = await supabase
    .from('site_settings')
    .select('hero_title, public_site_url')
    .eq('id', 1)
    .single();

  const companyName = settings?.hero_title ?? 'Marketing Solution';
  const companyUrl = settings?.public_site_url ?? 'hellotms.com.bd';
  const loginUrl = (companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`).replace(/\/$/, '') + '/admin';

  const tempPassword = generateTempPassword();

  const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(id, {
    password: tempPassword
  });

  if (updateAuthErr) return c.json({ error: updateAuthErr.message }, 500);

  // Force logout: instantly terminate all sessions for the targeted user
  await supabase.rpc('revoke_all_sessions', { user_id_param: id });

  // Update profile audit and timestamp
  await supabase.from('profiles').update({
    force_password_change: true,
    last_password_reset_at: new Date().toISOString()
  }).eq('id', id);

  const html = buildPasswordResetEmailHtml({
    recipientName: profile.name,
    loginUrl,
    tempPassword,
    companyName,
    companyUrl: companyUrl,
  });

  await sendEmail(c.env.BREVO_API_KEY, c.env.BREVO_SENDER_EMAIL, c.env.BREVO_SENDER_NAME, {
    to: [{ email: profile.email, name: profile.name }],
    subject: `Security: Your ${companyName} Password was reset`,
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

  // We use the secure RPC to fetch sessions because querying auth schema directly fails on hosted Supabase
  const { data, error } = await supabase.rpc('get_user_sessions', { user_id_param: userId });

  if (error) {
    console.error('[staff/sessions] Error fetching sessions:', error);
    return c.json({ error: error.message }, 500);
  }

  return c.json({ data: data || [] });
});

// DELETE /staff/me/sessions/:id — revoke a specific session
staffRoute.delete('/me/sessions/:id', async (c) => {
  const { id } = c.req.param();
  const userId = c.get('userId');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { error: sessionErr } = await supabase.rpc('revoke_session', { session_id_param: id, user_id_param: userId });

  if (sessionErr) return c.json({ error: sessionErr.message }, 500);
  return c.json({ success: true, message: 'Session revoked' });
});

// DELETE /staff/me/sessions — revoke ALL OTHER sessions
staffRoute.delete('/me/sessions', async (c) => {
  const userId = c.get('userId');
  const currentSessionId = c.req.header('X-Session-Id');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { error: revokeErr } = await supabase.rpc(
    currentSessionId ? 'revoke_other_sessions' : 'revoke_all_sessions',
    currentSessionId ? { current_session_id_param: currentSessionId, user_id_param: userId } : { user_id_param: userId }
  );

  if (revokeErr) return c.json({ error: revokeErr.message }, 500);
  return c.json({ success: true, message: 'Other sessions revoked' });
});
