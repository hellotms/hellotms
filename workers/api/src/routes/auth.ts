import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, buildPasswordResetEmailHtml } from '../services/brevo.js';
import type { Env, Variables } from '../types.js';

export const authRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// POST /auth/forgot-password
authRoute.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'Email is required' }, 400);

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    // 1. Check if user exists in profiles
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', email)
      .single();

    if (profileErr || !profile) {
      // For security, don't reveal if user exists or not
      return c.json({ message: 'If an account exists for this email, a temporary password has been sent.' });
    }

    const userId = profile.id;

    // 2. Generate temp password
    const tempPassword = generateTempPassword();

    // 3. Update auth user password via admin API
    const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(userId, {
      password: tempPassword
    });

    if (updateAuthErr) {
      console.error('[auth/forgot-password] Auth update error:', updateAuthErr);
      return c.json({ error: 'Failed to reset password' }, 500);
    }

    // 4. Force logout: revoke all sessions
    await supabase.rpc('revoke_all_sessions', { user_id_param: userId });

    // 5. Update profile to force password change
    await supabase.from('profiles').update({
      force_password_change: true,
      last_password_reset_at: new Date().toISOString()
    }).eq('id', userId);

    // 6. Fetch branding for email
    const { data: settings } = await supabase
      .from('site_settings')
      .select('hero_title, public_site_url')
      .eq('id', 1)
      .single();

    const companyName = 'The Marketing Solution';
    const companyUrl = settings?.public_site_url ?? 'themarketingsolution.com.bd';
    const loginUrl = (companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`).replace(/\/$/, '') + '/admin';

    // 7. Send Email via Brevo
    const html = buildPasswordResetEmailHtml({
      recipientName: profile.name,
      loginUrl,
      tempPassword,
      companyName,
      companyUrl: companyUrl,
    });

    const emailRes = await sendEmail(c.env.BREVO_API_KEY, c.env.BREVO_SENDER_EMAIL, c.env.BREVO_SENDER_NAME, {
      to: [{ email: profile.email, name: profile.name }],
      subject: `Security: Your ${companyName} temporary password`,
      htmlContent: html,
    });

    if (!emailRes.success) {
      console.error('[auth/forgot-password] Email failed:', emailRes.error);
      return c.json({ error: 'Failed to send recovery email. Please contact support.' }, 500);
    }

    return c.json({ message: 'Temporary password sent successfully' });

  } catch (err: any) {
    console.error('[auth/forgot-password] Uncaught error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
