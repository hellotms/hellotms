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
  // With 30-min cron, we have 336 slots/week. Probability = 2/336 ~= 0.006.
  const shouldRun = Math.random() < 0.006;

  if (!shouldRun) {
    return;
  }

  // Stealth: Wait for a random number of seconds (up to 15 seconds) to avoid "on-the-dot" patterns
  // Cloudflare Workers have a 30s limit for free, so we stay well below that.
  const delayMs = Math.floor(Math.random() * 15000);
  await new Promise(resolve => setTimeout(resolve, delayMs));

  try {
    // Stealth: Query a real application table instead of a dedicated 'health' table.
    // This looks like normal API activity.
    const { count, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) throw error;
    console.log('[cron] Stealth keepalive success. Projects count:', count);
  } catch (err) {
    console.error('[cron] Stealth keepalive failed:', err);
  }
}
