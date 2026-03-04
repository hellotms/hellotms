import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import type { Env, Variables } from '../types.js';

export const mediaRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// All upload/media management requires auth
mediaRoute.use('*', authMiddleware);

mediaRoute.post('/upload', async (c) => {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return c.json({ error: 'No file provided' }, 400);
    }

    // Get organizational parameters
    const folder = c.req.query('folder') || 'misc';
    const type = c.req.query('type') || 'file';
    const name = c.req.query('name') || 'unnamed';

    // Generate descriptive filename: folder/type_name_timestamp.ext
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'bin';
    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${folder}/${type}_${safeName}_${timestamp}.${extension}`;
    const contentType = file.type || 'application/octet-stream';

    try {
        console.log(`[Media] Uploading to R2: ${fileName} (${file.size} bytes, ${contentType})`);

        // Upload to R2 Bucket
        await c.env.MEDIA_BUCKET.put(fileName, await file.arrayBuffer(), {
            httpMetadata: { contentType },
        });

        const publicUrl = `${c.env.R2_PUBLIC_URL}/${fileName}`;
        console.log(`[Media] Upload successful: ${publicUrl}`);

        return c.json({
            success: true,
            key: fileName,
            url: publicUrl,
            size: file.size,
            type: contentType
        });
    } catch (err) {
        console.error('[R2 Upload Error]', err);
        return c.json({ error: 'Failed to upload to storage: ' + (err as Error).message }, 500);
    }
});

// Delete endpoint requires manage_projects permission (or super_admin)
mediaRoute.delete('/:key', requirePermission('manage_projects'), async (c) => {
    const { key } = c.req.param();
    try {
        await c.env.MEDIA_BUCKET.delete(key);
        return c.json({ success: true, message: 'Deleted' });
    } catch (err) {
        return c.json({ error: 'Failed to delete' }, 500);
    }
});
