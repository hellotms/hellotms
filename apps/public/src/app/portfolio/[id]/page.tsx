import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Calendar, MapPin, Building2, Camera, Tag } from 'lucide-react';

// ── Demo project data ─────────────────────────────────────────────────────────
const DEMO_PROJECTS: Record<string, {
  title: string;
  company: string;
  category: string;
  location: string;
  eventDate: string;
  description: string;
  gradient: string;
}> = {
  'demo-1': {
    title: 'Grand Corporate Summit 2024',
    company: 'Apex Group',
    category: 'Corporate',
    location: 'Radisson Blu, Dhaka',
    eventDate: 'March 15, 2024',
    description: 'A flagship annual summit bringing together 500+ industry leaders and executives for a day of insights, networking, and inspiration. We managed every aspect — venue design, AV production, catering coordination, and live photography.',
    gradient: 'from-indigo-900 via-purple-900 to-indigo-950',
  },
  'demo-2': {
    title: 'Luxury Wedding — Bashundhara',
    company: 'Private Client',
    category: 'Wedding',
    location: 'Bashundhara Convention City',
    eventDate: 'February 3, 2024',
    description: 'A stunning 500-guest wedding ceremony with a gold and ivory theme. Every detail curated with love — from the floral installations to the cinematic video production and full event management.',
    gradient: 'from-rose-900 via-pink-900 to-rose-950',
  },
  'demo-3': {
    title: 'Product Launch — Tech Expo',
    company: 'StartupBD',
    category: 'Corporate',
    location: 'Dhaka International Trade Fair',
    eventDate: 'January 20, 2024',
    description: 'A high-energy product launch event featuring live demos, keynote presentations, and media coverage. We handled stage design, projection mapping, and full event logistics.',
    gradient: 'from-cyan-900 via-teal-900 to-cyan-950',
  },
};

const GALLERY_COUNT = 6;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const project = DEMO_PROJECTS[params.id];
  if (!project) return { title: 'Project Not Found' };
  return {
    title: project.title,
    description: project.description.slice(0, 160),
    openGraph: { title: project.title, description: project.description.slice(0, 160) },
  };
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = DEMO_PROJECTS[params.id] ?? {
    title: 'Featured Project',
    company: 'Our Client',
    category: 'Event',
    location: 'Dhaka, Bangladesh',
    eventDate: '2024',
    description: 'A beautifully executed event created with passion and precision by The Marketing Solution team.',
    gradient: 'from-violet-900 via-indigo-900 to-violet-950',
  };

  return (
    <div className="pt-16">
      {/* Hero / Cover */}
      <section className={`relative h-64 sm:h-80 md:h-96 bg-gradient-to-br ${project.gradient} overflow-hidden`}>
        <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 text-white/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="container">
            <span className="inline-block px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] text-white/80 font-semibold backdrop-blur-sm mb-3">
              {project.category}
            </span>
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
            {/* Back */}
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Portfolio
            </Link>

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">About This Project</h2>
              <p className="text-[var(--muted)] leading-relaxed text-base">{project.description}</p>
            </div>

            {/* Gallery */}
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: GALLERY_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`relative aspect-square rounded-xl bg-gradient-to-br ${project.gradient} border border-[var(--border)] opacity-70 flex items-center justify-center overflow-hidden`}
                  >
                    <Camera className="h-8 w-8 text-white/20" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] mt-3 text-center">
                Photo gallery will be available after domain setup and Supabase connection.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
              <h3 className="font-bold text-[var(--foreground)]">Project Details</h3>
              {[
                { icon: Building2, label: 'Client', value: project.company },
                { icon: Tag, label: 'Category', value: project.category },
                { icon: Calendar, label: 'Event Date', value: project.eventDate },
                { icon: MapPin, label: 'Location', value: project.location },
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

            {/* CTA */}
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
