'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const GRADIENT_CLASSES = [
  'from-indigo-900 via-purple-900 to-indigo-950',
  'from-rose-900 via-pink-900 to-rose-950',
  'from-cyan-900 via-teal-900 to-cyan-950',
  'from-amber-900 via-orange-900 to-amber-950',
  'from-emerald-900 via-green-900 to-emerald-950',
  'from-violet-900 via-indigo-900 to-violet-950',
  'from-sky-900 via-blue-900 to-sky-950',
  'from-fuchsia-900 via-purple-900 to-fuchsia-950',
  'from-lime-900 via-green-900 to-lime-950',
];

type Project = {
  id: string;
  title: string;
  location: string | null;
  category: string | null;
  event_start_date: string;
  cover_image_url: string | null;
  companies: { name: string } | null;
};

export default function PortfolioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('id, title, location, category, event_start_date, cover_image_url, companies(name)')
        .eq('is_published', true)
        .order('event_start_date', { ascending: false });

      const projectsData = (data ?? []) as unknown as Project[];
      setProjects(projectsData);

      // Extract unique categories
      const uniqueCats = Array.from(new Set(projectsData.map(p => p.category).filter(Boolean))) as string[];
      setCategories(['All', ...uniqueCats.sort()]);

      setLoading(false);
    }
    fetchProjects();
  }, []);

  const filteredProjects = activeCategory === 'All'
    ? projects
    : projects.filter(p => p.category === activeCategory);

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 hero-gradient overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container relative z-10 text-center">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">Our Work</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--foreground)] mb-5">
            Event <span className="gradient-text">Portfolio</span>
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
            Every event tells a story. Here's a collection of moments we've been proud to create, capture, and celebrate.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="pb-10">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:border-indigo-500/50 hover:text-indigo-400'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="section pt-0">
        <div className="container">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)] animate-pulse">
                  <div className="h-56 bg-[var(--muted)]/20" />
                  <div className="p-5 space-y-2">
                    <div className="h-4 bg-[var(--muted)]/20 rounded w-3/4" />
                    <div className="h-3 bg-[var(--muted)]/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20 text-[var(--muted)]">
              {mounted ? <Camera className="h-12 w-12 mx-auto mb-3 opacity-20" /> : <div className="h-12 w-12 mx-auto mb-3" />}
              <p>No projects found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project, i) => {
                const gradientIdx = i % GRADIENT_CLASSES.length;
                const year = new Date(project.event_start_date).getFullYear();
                return (
                  <Link
                    key={project.id}
                    href={`/portfolio/${project.id}`}
                    className="group rounded-2xl overflow-hidden border border-[var(--border)] card-hover bg-[var(--card)]"
                  >
                    <div className={`relative h-56 bg-gradient-to-br ${GRADIENT_CLASSES[gradientIdx]} overflow-hidden`}>
                      {project.cover_image_url ? (
                        <img
                          src={project.cover_image_url}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        mounted ? <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-white/15 group-hover:text-white/25 transition-colors" /> : <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      {project.category && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 shadow-xl text-[10px] text-white font-bold uppercase tracking-wider">
                            {project.category}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] text-white/80 font-medium backdrop-blur-sm">
                          {year}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h2 className="font-bold text-[var(--foreground)] group-hover:text-indigo-500 transition-colors line-clamp-1 mb-1">
                        {project.title}
                      </h2>
                      <p className="text-sm text-[var(--muted)]">{project.companies?.name ?? '—'}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
