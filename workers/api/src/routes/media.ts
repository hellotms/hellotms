import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import type { Env, Variables } from '../types.js';

export const mediaRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// All upload/media management requires auth
mediaRoute.use('*', authMiddleware);

mediaRoute.post('/upload', async (c) => {
    const formData = await c.req.parseBody();
    const file = formData['file'] as File | null;

    if (!file) {
        return c.json({ error: 'No file provided' }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${safeName}`;
    const contentType = file.type || 'application/octet-stream';

    try {
        // Upload to R2 Bucket
        await c.env.MEDIA_BUCKET.put(fileName, await file.arrayBuffer(), {
            httpMetadata: { contentType },
        });

        // We use the R2_PUBLIC_URL which can be r2.dev or a custom domain later
        const publicUrl = `${c.env.R2_PUBLIC_URL}/${fileName}`;

        return c.json({
            success: true,
            key: fileName,
            url: publicUrl,
            size: file.size,
            type: contentType
        });
    } catch (err) {
        console.error('[R2 Upload Error]', err);
        return c.json({ error: 'Failed to upload to storage' }, 500);
    }
});

// Optional: Delete endpoint
mediaRoute.delete('/:key', async (c) => {
    const { key } = c.req.param();
    try {
        await c.env.MEDIA_BUCKET.delete(key);
        return c.json({ success: true, message: 'Deleted' });
    } catch (err) {
        return c.json({ error: 'Failed to delete' }, 500);
    }
});
