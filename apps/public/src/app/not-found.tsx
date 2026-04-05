'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProjectDetailView } from './portfolio/[id]/ProjectDetailView';

export default function NotFound() {
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Check if the current path starts with /portfolio/
    const path = window.location.pathname;
    const match = path.match(/\/portfolio\/([a-f0-9-]{36})\/?$/i);
    if (match && match[1]) {
      setProjectId(match[1]);
    }
  }, []);

  // If this is a portfolio project page, render the project details instead of 404
  if (projectId) {
    return <ProjectDetailView id={projectId} />;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-9xl font-black text-[var(--accent)]/10 select-none">404</p>
        <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Page not found</h1>
        <p className="mt-2 text-[var(--muted)]">We couldn't find what you were looking for.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 bg-[var(--accent-dark)] text-white hover:bg-[var(--accent)] px-6 py-3 rounded-full font-semibold transition-all">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
