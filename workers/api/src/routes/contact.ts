import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env, Variables } from '../types.js';

export const contactRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /contact — public: receive contact form submissions
contactRoute.post('/', async (c) => {
    const body = await c.req.json();
    const { name, email, phone, company, message, service } = body;

    if (!name || !email || !message) {
        return c.json({ error: 'name, email and message are required' }, 400);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    const { error } = await supabase.from('contact_submissions').insert({
        name,
        email,
        phone: phone ?? null,
        company: company ?? null,
        message,
        service: service ?? null,
        status: 'new',
    });

    if (error) {
        console.error('[contact/submit] Error:', error);
        return c.json({ error: 'Failed to submit' }, 500);
    }

    return c.json({ message: 'Thank you! We will get back to you shortly.' }, 201);
});

// GET /contact — authenticated: list all submissions
contactRoute.get('/', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    const status = c.req.query('status');
    let query = supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ data });
});

// PUT /contact/:id/status — mark as seen/replied
contactRoute.put('/:id/status', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

    const { id } = c.req.param();
    const { status, replied_by } = await c.req.json();

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

    const update: Record<string, unknown> = { status };
    if (status === 'replied') {
        update.replied_at = new Date().toISOString();
        if (replied_by) update.replied_by = replied_by;
    }

    const { error } = await supabase.from('contact_submissions').update(update).eq('id', id);
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ message: 'Status updated' });
});
