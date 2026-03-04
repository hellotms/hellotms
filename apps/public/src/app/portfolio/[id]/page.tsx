// Server component page — generateStaticParams must be in a server component
// The actual UI is in ProjectDetailView (client component)
import { ProjectDetailView } from './ProjectDetailView';
import { supabase } from '@/lib/supabase';

// Required by output:export for dynamic routes.
// We fetch all published project IDs so Next.js can pre-render them.
export async function generateStaticParams() {
  const { data: projects } = await supabase
    .from('projects')
    .select('id');

  if (!projects || projects.length === 0) {
    return [{ id: '_' }];
  }

  return projects.map((p) => ({
    id: p.id,
  }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectDetailView slug={params.id} />;
}
