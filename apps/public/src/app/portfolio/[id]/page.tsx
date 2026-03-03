// Server component page — generateStaticParams must be in a server component
// The actual UI is in ProjectDetailView (client component)
import { ProjectDetailView } from './ProjectDetailView';

// Required by output:export for dynamic routes.
// We return a placeholder so Next.js knows the route exists;
// the client component fetches real data by slug at runtime.
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectDetailView slug={params.id} />;
}
