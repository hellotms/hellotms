import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import type { Env, Variables } from '../types.js';

export const appsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// All app management requires auth
appsRoute.use('*', authMiddleware);

// List app versions for a platform (excluding deleted)
appsRoute.get('/:platform', async (c) => {
    const platform = c.req.param('platform');
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', platform)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data });
});

// Add a new app version
appsRoute.post('/', requirePermission('manage_cms'), async (c) => {
    const body = await c.req.json();
    const { platform, version, file_extension, url, size, changelog, is_latest } = body;

    if (!platform || !version || !url || !file_extension) {
        return c.json({ error: 'Platform, version, extension, and URL are required' }, 400);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
        .from('app_versions')
        .insert([{
            platform,
            version,
            file_extension,
            url,
            size,
            changelog,
            is_latest: !!is_latest,
            created_by: c.get('userId')
        }])
        .select()
        .single();

    if (error) return c.json({ error: error.message }, 500);

    // Activity Log
    await supabase.from('audit_logs').insert({
        user_id: c.get('userId'),
        action: 'app_version_added',
        entity_type: 'app_version',
        entity_id: data.id,
        after: data
    });

    return c.json({ data });
});

// Update a version (e.g., mark as latest or edit changelog)
appsRoute.put('/:id', requirePermission('manage_cms'), async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    // Fetch before for audit
    const { data: before } = await supabase.from('app_versions').select('*').eq('id', id).single();

    const { data, error } = await supabase
        .from('app_versions')
        .update(body)
        .eq('id', id)
        .select()
        .single();

    if (error) return c.json({ error: error.message }, 500);

    // Activity Log
    await supabase.from('audit_logs').insert({
        user_id: c.get('userId'),
        action: 'app_version_updated',
        entity_type: 'app_version',
        entity_id: id,
        before,
        after: data
    });

    return c.json({ data });
});

// Soft Delete a version (Move to Recycle Bin)
appsRoute.delete('/:id', requirePermission('manage_cms'), async (c) => {
    const id = c.req.param('id');
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    // 1. Fetch version data
    const { data: version, error: fetchError } = await supabase
        .from('app_versions')
        .select('*')
        .eq('id', id)
        .single();
    
    if (fetchError || !version) return c.json({ error: 'Version not found' }, 404);

    // 2. Insert into trash_bin
    const { error: trashError } = await supabase.from('trash_bin').insert({
        entity_type: 'app_version',
        entity_id: id,
        entity_name: `${version.platform} v${version.version} (${version.file_extension})`,
        entity_data: version,
        deleted_by: c.get('userId'),
    });

    if (trashError) return c.json({ error: `Trash error: ${trashError.message}` }, 500);

    // 3. Mark as deleted
    const { error: updateError } = await supabase
        .from('app_versions')
        .update({ deleted_at: new Date().toISOString(), is_latest: false })
        .eq('id', id);

    if (updateError) return c.json({ error: updateError.message }, 500);

    // 4. Activity Log
    await supabase.from('audit_logs').insert({
        user_id: c.get('userId'),
        action: 'app_version_deleted',
        entity_type: 'app_version',
        entity_id: id,
        before: version
    });

    return c.json({ success: true });
});
