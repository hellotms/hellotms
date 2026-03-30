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
        // Pass the file (Blob) directly to avoid loading entire file into memory (ArrayBuffer)
        await c.env.MEDIA_BUCKET.put(fileName, file as any, {
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

// Delete endpoint requires manage_cms permission
mediaRoute.delete('/*', requirePermission('manage_cms'), async (c) => {
    // Get the key from the remainder of the path
    const key = c.req.path.split('/media/')[1];
    
    if (!key) return c.json({ error: 'No key provided' }, 400);

    try {
        console.log(`[Media] Deleting from R2: ${key}`);
        await c.env.MEDIA_BUCKET.delete(key);
        return c.json({ success: true, message: 'Deleted' });
    } catch (err) {
        console.error('[R2 Delete Error]', err);
        return c.json({ error: 'Failed to delete' }, 500);
    }
});
