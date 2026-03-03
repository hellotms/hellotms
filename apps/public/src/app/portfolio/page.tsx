'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Camera } from 'lucide-react';

// ── Demo data ────────────────────────────────────────────────
const DEMO_PROJECTS = [
  { id: 'demo-1', title: 'Grand Corporate Summit 2024', company: 'Apex Group', category: 'Corporate', year: '2024' },
  { id: 'demo-2', title: 'Luxury Wedding — Bashundhara', company: 'Private Client', category: 'Wedding', year: '2024' },
  { id: 'demo-3', title: 'Product Launch — Tech Expo', company: 'StartupBD', category: 'Corporate', year: '2024' },
  { id: 'demo-4', title: 'Music Festival Dhaka 2024', company: 'EventCo', category: 'Festival', year: '2024' },
  { id: 'demo-5', title: 'Fashion Week Bangladesh', company: 'StyleHouse', category: 'Fashion', year: '2023' },
  { id: 'demo-6', title: 'NGO Annual Gala Dinner', company: 'HopeFoundation', category: 'Charity', year: '2023' },
  { id: 'demo-7', title: 'University Convocation', company: 'BUET', category: 'Academic', year: '2023' },
  { id: 'demo-8', title: 'International Trade Fair', company: 'BGMEA', category: 'Corporate', year: '2023' },
  { id: 'demo-9', title: 'Celebrity Birthday Gala', company: 'Private Client', category: 'Social', year: '2023' },
];

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

// Unique categories derived from data
const CATEGORIES = ['All', ...Array.from(new Set(DEMO_PROJECTS.map((p) => p.category)))];

export default function PortfolioPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered =
    activeCategory === 'All'
      ? DEMO_PROJECTS
      : DEMO_PROJECTS.filter((p) => p.category === activeCategory);

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

      {/* Category filter */}
      <div className="sticky top-16 z-30 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="container">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${activeCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                  : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-indigo-500/40'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="section">
        <div className="container">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[var(--muted)]">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No projects in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((project) => {
                // Keep original index for consistent gradient colour
                const gradientIdx = DEMO_PROJECTS.indexOf(project) % GRADIENT_CLASSES.length;
                return (
                  <Link
                    key={project.id}
                    href={`/portfolio/${project.id}`}
                    className="group rounded-2xl overflow-hidden border border-[var(--border)] card-hover bg-[var(--card)]"
                  >
                    {/* Image area */}
                    <div className={`relative h-56 bg-gradient-to-br ${GRADIENT_CLASSES[gradientIdx]} overflow-hidden`}>
                      <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-white/15 group-hover:text-white/25 transition-colors" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] text-white/80 font-medium backdrop-blur-sm">
                          {project.year}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-4">
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] text-white/80 font-medium backdrop-blur-sm">
                          {project.category}
                        </span>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="p-5">
                      <h2 className="font-bold text-[var(--foreground)] group-hover:text-indigo-500 transition-colors line-clamp-1 mb-1">
                        {project.title}
                      </h2>
                      <p className="text-sm text-[var(--muted)]">{project.company}</p>
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
