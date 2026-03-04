import { createClient } from '@supabase/supabase-js';
import type { Env } from './types.js';

export async function scheduledHandler(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  console.log('[cron] Scheduled keepalive running at', new Date().toISOString());

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Stochastic check: run ~2 times a week. 
  // With hourly cron, probability is 2/168 ~= 0.0119. 
  // We'll use 0.015 to be safer (roughly 2.5 times a week).
  const shouldRun = Math.random() < 0.015;

  if (!shouldRun) {
    console.log('[cron] Skipping keepalive for this hour.');
    return;
  }

  try {
    // Ping Supabase with a lightweight query
    const { count, error } = await supabase
      .from('health_logs')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    // Log the successful ping
    await supabase.from('health_logs').insert({ status: 'ok' });
    console.log('[cron] Keepalive OK. health_logs count:', count);
  } catch (err) {
    console.error('[cron] Keepalive FAILED:', err);
    try {
      const supabaseRetry = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
      await supabaseRetry.from('health_logs').insert({ status: 'error' });
    } catch (logErr) {
      console.error('[cron] Could not log failure:', logErr);
    }
  }
}
