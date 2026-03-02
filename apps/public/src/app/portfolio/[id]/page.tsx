import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Project } from '@hellotms/shared';
import { ArrowLeft, Camera, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const revalidate = 300;

type Props = { params: { id: string } };
type ProjectFull = Project & {
  companies: { name: string; email?: string } | null;
  gallery_urls?: string[];
};

async function getProject(id: string): Promise<ProjectFull | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, companies(name, email)')
    .eq('id', id)
    .eq('status', 'completed')
    .single();
  if (error || !data) return null;
  return data as ProjectFull;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProject(params.id);
  if (!project) return { title: 'Not Found' };
  return {
    title: project.title,
    description: project.description ?? `Event project: ${project.title}`,
    openGraph: {
      images: project.cover_image_url ? [project.cover_image_url] : [],
    },
  };
}

export async function generateStaticParams() {
  const { data } = await supabase.from('projects').select('id').eq('status', 'completed');
  return (data ?? []).map(p => ({ id: p.id }));
}

export default async function ProjectDetailPage({ params }: Props) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const gallery: string[] = project.gallery_urls ?? (project.cover_image_url ? [project.cover_image_url] : []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/portfolio" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-700 mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Portfolio
      </Link>

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-brand-100 to-purple-100 mb-8 relative h-72 sm:h-96">
        {project.cover_image_url ? (
          <Image src={project.cover_image_url} alt={project.title} fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-20 w-20 text-brand-200" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900">{project.title}</h1>
          {project.companies && <p className="text-brand-600 font-medium mt-1">{project.companies.name}</p>}

          {project.description && (
            <p className="mt-5 text-gray-600 leading-relaxed">{project.description}</p>
          )}

          {/* Gallery */}
          {gallery.length > 1 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.map((url, i) => (
                  <div key={i} className="relative h-36 rounded-xl overflow-hidden bg-gray-100">
                    <Image src={url} alt={`${project.title} — ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-3">Project Details</h3>
            <dl className="space-y-2 text-sm">
              {project.event_start_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{formatDate(project.event_start_date)}</span>
                </div>
              )}
              {project.venue && (
                <div className="text-gray-600"><span className="font-medium">Venue: </span>{project.venue}</div>
              )}
            </dl>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-5 text-white">
            <h3 className="font-bold text-lg mb-2">Like what you see?</h3>
            <p className="text-brand-100 text-sm mb-4">Let's create something amazing for you.</p>
            <Link href="/contact" className="block bg-white text-brand-700 hover:bg-brand-50 text-center py-2.5 rounded-xl text-sm font-bold transition-colors">
              Get a Quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
