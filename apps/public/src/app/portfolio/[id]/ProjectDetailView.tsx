'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Building2, Tag, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GallerySection } from '../../../components/GallerySection';

type Project = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    notes: string | null;
    location: string | null;
    category: string | null;
    event_start_date: string;
    event_end_date: string | null;
    cover_image_url: string | null;
    companies: { name: string; logo_url: string | null } | null;
};

type MediaItem = { id: string; url: string };

const GRADIENT_DEFAULT = 'from-indigo-900 via-purple-900 to-indigo-950';

export function ProjectDetailView({ slug }: { slug: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [photos, setPhotos] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) return;
        async function fetchData() {
            const { data: p } = await supabase
                .from('projects')
                .select('id, slug, title, description, notes, location, category, event_start_date, event_end_date, cover_image_url, companies(name, logo_url)')
                .eq('id', slug)
                .eq('is_published', true)
                .single();

            if (!p) { setNotFound(true); setLoading(false); return; }
            setProject(p as unknown as Project);

            const { data: mediaData } = await supabase
                .from('project_media')
                .select('id, url')
                .eq('project_id', (p as any).id)
                .order('created_at', { ascending: true });
            setPhotos((mediaData ?? []) as MediaItem[]);
            setLoading(false);
        }
        fetchData();
    }, [slug]);

    if (loading) {
        return (
            <div className="pt-16">
                <div className={`relative h-64 sm:h-80 md:h-96 bg-gradient-to-br ${GRADIENT_DEFAULT} animate-pulse`} />
                <div className="container py-12">
                    <div className="h-8 bg-[var(--muted)]/20 rounded w-1/2 mb-4 animate-pulse" />
                    <div className="h-4 bg-[var(--muted)]/10 rounded w-3/4 animate-pulse" />
                </div>
            </div>
        );
    }

    if (notFound || !project) {
        return (
            <div className="pt-16 container py-20 text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 text-[var(--muted)] opacity-30" />
                <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Event Not Found</h1>
                <Link href="/portfolio" className="text-indigo-500 hover:underline">← Back to Portfolio</Link>
            </div>
        );
    }

    const eventDateStr = new Date(project.event_start_date).toLocaleDateString('en-BD', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    const eventYear = new Date(project.event_start_date).getFullYear();

    return (
        <div className="pt-16">
            {/* Hero / Cover */}
            <section className={`relative h-64 sm:h-80 md:h-96 bg-gradient-to-br ${GRADIENT_DEFAULT} overflow-hidden`}>
                {project.cover_image_url && (
                    <img
                        src={project.cover_image_url}
                        alt={project.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                    <div className="container">
                        {project.category && (
                            <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-600 border border-indigo-400/30 text-[10px] text-white font-bold uppercase tracking-wider shadow-lg mb-3">
                                {project.category}
                            </span>
                        )}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
                            {project.title}
                        </h1>
                    </div>
                </div>
            </section>

            {/* Content */}
            <div className="container py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main */}
                    <div className="lg:col-span-2 space-y-10">
                        <Link
                            href="/portfolio"
                            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Portfolio
                        </Link>

                        {project.description && (
                            <div>
                                <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">About This Event</h2>
                                <p className="text-[var(--muted)] leading-relaxed text-base whitespace-pre-line">
                                    {project.description}
                                </p>
                            </div>
                        )}

                        {photos.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
                                    Gallery <span className="text-sm font-normal text-[var(--muted)]">({photos.length} photos)</span>
                                </h2>
                                <GallerySection photos={photos} />
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-5">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                            {project.companies?.logo_url && (
                                <img
                                    src={project.companies.logo_url}
                                    alt={project.companies.name}
                                    className="h-12 object-contain mb-2"
                                />
                            )}
                            <h3 className="font-bold text-[var(--foreground)]">Event Details</h3>
                            {[
                                { icon: Building2, label: 'Client', value: project.companies?.name ?? '—' },
                                { icon: Calendar, label: 'Event Date', value: eventDateStr },
                                { icon: Tag, label: 'Category', value: project.category ?? '—' },
                                { icon: Tag, label: 'Year', value: String(eventYear) },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                        <Icon className="h-4 w-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--muted)]">{label}</p>
                                        <p className="text-sm font-medium text-[var(--foreground)] mt-0.5">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl p-6 text-center">
                            <p className="font-bold text-[var(--foreground)] mb-2">Planning a similar event?</p>
                            <p className="text-xs text-[var(--muted)] mb-4">Get a free consultation from our team.</p>
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full"
                            >
                                Get a Free Quote
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
