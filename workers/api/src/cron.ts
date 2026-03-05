import { createClient } from '@supabase/supabase-js';
import type { Env } from './types.js';

export async function scheduledHandler(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  console.log('[cron] Audit log cleanup check running at', new Date().toISOString());

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const { count, error } = await supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', dateStr);

    if (error) throw error;
    console.log(`[cron] Cleanup successful. Deleted ${count} audit logs older than ${dateStr}`);
  } catch (err) {
    console.error('[cron] Cleanup failed:', err);
  }
}
