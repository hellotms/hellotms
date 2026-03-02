import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { leadSchema } from '@hellotms/shared';
import type { Env, Variables } from '../types.js';

export const leadsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// GET /leads — list all (auth required)
leadsRoute.get('/', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: leads });
});
