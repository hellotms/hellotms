import { createClient } from '@supabase/supabase-js';
import type { Env } from './types.js';

async function deleteFile(env: Env, urlStr: string | null | undefined) {
  if (!urlStr) return;
  try {
    const url = new URL(urlStr);
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    if (key && !key.startsWith('http')) {
      await env.MEDIA_BUCKET.delete(key);
      console.log(`[cron] Successfully deleted R2 asset: ${key}`);
    }
  } catch (e) {
    console.warn(`[cron] Could not delete R2 asset ${urlStr}:`, e);
  }
}

export async function scheduledHandler(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const now = new Date().toISOString();
  console.log('[cron] Maintenance job running at', now);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    // 1. Audit log cleanup (30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const { count: auditCount } = await supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', dateStr);
    console.log(`[cron] Audit log cleanup: Deleted ${auditCount} logs.`);

    // 2. Trash bin automated cleanup (recursive R2 purge)
    const { data: expiredItems } = await supabase
      .from('trash_bin')
      .select('*')
      .lt('expires_at', now);

    if (expiredItems && expiredItems.length > 0) {
      console.log(`[cron] Found ${expiredItems.length} expired trash items.`);

      for (const item of expiredItems) {
        // Recursive Asset Cleanup for Project/Company
        if (item.entity_type === 'project') {
          // Invoices
          const { data: invs } = await supabase.from('invoices').select('pdf_url').eq('project_id', item.entity_id);
          for (const inv of invs || []) await deleteFile(env, inv.pdf_url);
          // Ledger
          const { data: entries } = await supabase.from('ledger_entries').select('attachment_url').eq('project_id', item.entity_id);
          for (const entry of entries || []) await deleteFile(env, entry.attachment_url);
          // Media
          const { data: media } = await supabase.from('project_media').select('path').eq('project_id', item.entity_id);
          for (const m of media || []) {
            try { await env.MEDIA_BUCKET.delete(m.path); } catch(e) {}
          }
        } else if (item.entity_type === 'company') {
          const { data: projs } = await supabase.from('projects').select('id').eq('company_id', item.entity_id);
          for (const proj of projs || []) {
            const { data: invs } = await supabase.from('invoices').select('pdf_url').eq('project_id', proj.id);
            for (const inv of invs || []) await deleteFile(env, inv.pdf_url);
            const { data: entries } = await supabase.from('ledger_entries').select('attachment_url').eq('project_id', proj.id);
            for (const entry of entries || []) await deleteFile(env, entry.attachment_url);
            const { data: media } = await supabase.from('project_media').select('path').eq('project_id', proj.id);
            for (const m of media || []) {
              try { await env.MEDIA_BUCKET.delete(m.path); } catch(e) {}
            }
          }
        } else if (item.entity_type === 'invoice') {
          await deleteFile(env, item.entity_data?.pdf_url);
        } else if (item.entity_type === 'ledger') {
          await deleteFile(env, item.entity_data?.attachment_url);
        } else if (item.entity_type === 'collection' && item.entity_data?._is_gallery_photo) {
          try { await env.MEDIA_BUCKET.delete(item.entity_data.path); } catch(e) {}
        } else if (item.entity_type === 'app_version') {
          await deleteFile(env, item.entity_data?.url);
        }

        // Hard delete from main table (Cascade handles children in DB)
        if (item.entity_type !== 'lead') {
          const tableMap: Record<string, string> = {
            project: 'projects',
            company: 'companies',
            invoice: 'invoices',
            ledger: 'ledger_entries',
            collection: 'collections',
            app_version: 'app_versions'
          };
          const table = tableMap[item.entity_type];
          if (table) {
            await supabase.from(table).delete().eq('id', item.entity_id);
          }
        }

        // Finally, delete trash_bin record
        await supabase.from('trash_bin').delete().eq('id', item.id);
      }
      console.log(`[cron] Automated trash cleanup completed.`);
    }

  } catch (err) {
    console.error('[cron] Maintenance failed:', err);
  }
}
