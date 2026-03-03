import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acadome.dev';

// Demo project IDs — replace with DB fetch after Supabase setup
const DEMO_PROJECT_IDS = ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5', 'demo-6'];

export default function sitemap(): MetadataRoute.Sitemap {
    const staticPages: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
        { url: `${SITE_URL}/portfolio`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
        { url: `${SITE_URL}/services`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ];

    const projectPages: MetadataRoute.Sitemap = DEMO_PROJECT_IDS.map((id) => ({
        url: `${SITE_URL}/portfolio/${id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    return [...staticPages, ...projectPages];
}
