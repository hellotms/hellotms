import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env, Variables } from '../types.js';

export const keepaliveRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

keepaliveRoute.get('/', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  try {
    // Lightweight query to keep Supabase project active
    await supabase.from('health_logs').select('id').limit(1);

    await supabase.from('health_logs').insert({ status: 'ok' });

    return c.json({
      status: 'ok',
      message: 'Supabase keepalive ping successful',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[keepalive] Error:', err);
    return c.json({ status: 'error', message: String(err) }, 500);
  }
});
