import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env, Variables } from '../types.js';

export const auditRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// All audit logging requires auth
auditRoute.use('*', authMiddleware);

auditRoute.post('/', async (c) => {
    try {
        const payload = await c.req.json();
        const { action, entity_type, entity_id, before, after } = payload;

        if (!action || !entity_type) {
            return c.json({ error: 'action and entity_type are required' }, 400);
        }

        const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

        // Server-side enforcement of userId to prevent spoofing
        const userId = c.get('userId');

        const { error } = await supabase.from('audit_logs').insert({
            user_id: userId,
            action,
            entity_type,
            entity_id: entity_id || null,
            before: before || null,
            after: after || null,
        });

        if (error) {
            console.error('[audit] Insert error:', error);
            return c.json({ error: 'Failed to create audit log' }, 500);
        }

        return c.json({ success: true }, 201);
    } catch (err: any) {
        console.error('[audit] POST error:', err);
        return c.json({ error: err.message }, 500);
    }
});
