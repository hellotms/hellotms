import { ProjectDetailView } from './ProjectDetailView';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Optional: revalidate every hour

// Required by output:export for dynamic routes.
// We fetch all published project IDs so Next.js can pre-render them.
export async function generateStaticParams() {
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('is_published', true)
    .is('deleted_at', null);

  if (!projects || projects.length === 0) {
    return [{ id: '_' }];
  }

  return projects.map((p) => ({
    id: p.id,
  }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectDetailView id={params.id} />;
}
