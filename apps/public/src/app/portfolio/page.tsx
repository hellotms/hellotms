import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Camera } from 'lucide-react';
import type { Project } from '@hellotms/shared';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Browse our portfolio of professional events and photography projects.',
};

export const revalidate = 300;

async function getProjects(): Promise<(Project & { companies: { name: string } | null })[]> {
  const { data } = await supabase
    .from('projects')
    .select('id, title, cover_image_url, status, created_at, companies(name)')
    .eq('status', 'completed')
    .order('updated_at', { ascending: false });
  return (data ?? []) as unknown as (Project & { companies: { name: string } | null })[];
}

export default async function PortfolioPage() {
  const projects = await getProjects();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900">Our Portfolio</h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">Every event tells a story. Here are some of ours.</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No projects published yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/portfolio/${project.id}`} className="group rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all bg-white">
              <div className="relative h-56 bg-gradient-to-br from-brand-50 to-purple-50">
                {project.cover_image_url ? (
                  <Image src={project.cover_image_url} alt={project.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="h-14 w-14 text-brand-200" />
                  </div>
                )}
              </div>
              <div className="p-5 bg-white">
                <h2 className="font-bold text-gray-900 text-lg group-hover:text-brand-700 transition-colors line-clamp-1">{project.title}</h2>
                {project.companies && <p className="text-sm text-gray-400 mt-1">{project.companies.name}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
