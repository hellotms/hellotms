import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { leadSchema } from '@hellotms/shared';
import type { Env, Variables } from '../types.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

export const leadsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// Public route: submit a lead (no auth required)

leadsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('leads')
    .insert({ ...parsed.data, status: 'new' })
    .select()
    .single();

  if (error) {
    console.error('[leads] Insert error:', error);
    return c.json({ error: 'Failed to submit lead' }, 500);
  }

  return c.json({ data, message: 'Lead submitted successfully' }, 201);
});

// GET /leads — list all (requires view_leads permission)
leadsRoute.get('/', authMiddleware, requirePermission('view_leads'), async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: leads });
});

// PUT /leads/:id — update status/notes (requires manage_contact_forms)
leadsRoute.put('/:id', authMiddleware, requirePermission('manage_contact_forms'), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const userId = c.get('userId');
  
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  
  const update: Record<string, any> = { ...body };
  
  // If status is being updated to contacted or closed, track who did it
  if (body.status === 'contacted' || body.status === 'closed') {
    update.replied_at = new Date().toISOString();
    update.replied_by = userId;
  }

  const { error } = await supabase.from('leads').update(update).eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Lead updated' });
});

// DELETE /leads/:id — delete lead (requires manage_contact_forms)
leadsRoute.delete('/:id', authMiddleware, requirePermission('manage_contact_forms'), async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'Lead deleted' });
});

