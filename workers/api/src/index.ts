import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import type { Env, Variables } from './types.js';
import { leadsRoute } from './routes/leads.js';
import { staffRoute } from './routes/staff.js';
import { invoicesRoute } from './routes/invoices.js';
import { keepaliveRoute } from './routes/keepalive.js';
import { contactRoute } from './routes/contact.js';
import { mediaRoute } from './routes/media.js';
import { auditRoute } from './routes/audit.js';
import { scheduledHandler } from './cron.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: (origin, c) => {
    const allowedRaw = c.env.ALLOWED_ORIGINS ?? '';
    const allowed = [
      ...allowedRaw.split(',').map((o: string) => o.trim()).filter(Boolean),
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok', service: 'hellotms-api', version: '1.0.0' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route('/leads', leadsRoute);
app.route('/staff', staffRoute);
app.route('/invoices', invoicesRoute);
app.route('/keepalive', keepaliveRoute);
app.route('/contact', contactRoute);
app.route('/media', mediaRoute);
app.route('/audit', auditRoute);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not Found' }, 404));
app.onError((err, c) => {
  console.error('[Worker Error]', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// ─── Exports ──────────────────────────────────────────────────────────────────
export default {
  fetch: app.fetch,
  scheduled: scheduledHandler,
};
