import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import type { Env, Variables } from '../types.js';

export const appsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// All app management requires auth
appsRoute.use('*', authMiddleware);

// List app versions for a platform
appsRoute.get('/:platform', async (c) => {
    const platform = c.req.param('platform');
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', platform)
        .order('created_at', { ascending: false });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data });
});

// Add a new app version (Requires manage_cms or similar)
appsRoute.post('/', requirePermission('manage_cms'), async (c) => {
    const body = await c.req.json();
    const { platform, version, url, size, changelog, is_latest } = body;

    if (!platform || !version || !url) {
        return c.json({ error: 'Platform, version, and URL are required' }, 400);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
        .from('app_versions')
        .insert([{
            platform,
            version,
            url,
            size,
            changelog,
            is_latest: !!is_latest,
            created_by: c.get('userId')
        }])
        .select()
        .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data });
});

// Update a version (e.g., mark as latest or edit changelog)
appsRoute.put('/:id', requirePermission('manage_cms'), async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
        .from('app_versions')
        .update(body)
        .eq('id', id)
        .select()
        .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data });
});

// Delete a version
appsRoute.delete('/:id', requirePermission('manage_cms'), async (c) => {
    const id = c.req.param('id');
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    const { error } = await supabase
        .from('app_versions')
        .delete()
        .eq('id', id);

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true });
});
