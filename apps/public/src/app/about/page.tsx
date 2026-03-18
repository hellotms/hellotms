import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Target, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about The Marketing Solution — Bangladesh\'s premier event management and marketing agency.',
};

const TEAM_VALUES = [
  { icon: Heart, title: 'Passion-Driven', text: 'Every event is a labor of love. We pour our hearts into every detail from the first meeting to the final curtain call.' },
  { icon: Target, title: 'Results-Focused', text: 'We don\'t just plan events — we create experiences that meet your goals, exceed expectations, and measure success.' },
  { icon: Sparkles, title: 'Creative Excellence', text: 'Innovation is at our core. We bring fresh ideas and creative solutions to every brief, no matter the scale.' },
  { icon: Users, title: 'Client-Centric', text: 'Your vision is our mission. We listen, we collaborate, and we build something extraordinary together.' },
];

const MILESTONES = [
  { year: '2016', title: 'Founded', text: 'Started as a small photography studio in Dhaka.' },
  { year: '2018', title: 'First Major Event', text: 'Managed our first 1,000-guest corporate gala.' },
  { year: '2020', title: 'Full-Service Agency', text: 'Expanded to full event management and brand activations.' },
  { year: '2024', title: 'Industry Leader', text: '500+ events, 300+ clients, and still growing.' },
];

export const revalidate = 60; // Revalidate every minute

export default async function AboutPage() {
  const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 1).single();

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 hero-gradient overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="container relative z-10 text-center">
          <p className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-3">Our Story</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--foreground)] mb-5">
            About <span className="text-[#d6802b]">The Marketing Solution</span>
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto leading-relaxed">
            {settings?.hero_subtitle || 'We are Bangladesh\'s premier event management and marketing agency — a team of passionate creatives, strategic planners, and relentless executors.'}
          </p>
        </div>
      </section>

      {/* Mission / Split */}
      <section className="section">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual */}
            <div className="relative group">
              <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-white via-slate-50 to-[#d6802b]/30 dark:from-neutral-900 dark:via-black dark:to-[#d6802b]/40 flex items-center justify-center overflow-hidden border border-[#d6802b]/30 shadow-2xl shadow-[#d6802b]/10 transition-transform duration-500 group-hover:scale-[1.02]">
                <div className="text-center p-8 relative z-10">
                  <div className="text-7xl mb-6 filter drop-shadow-lg transform transition-transform duration-500 group-hover:scale-110">🎯</div>
                  <p className="text-neutral-800 dark:text-white/80 text-lg font-medium italic max-w-xs mx-auto leading-relaxed drop-shadow-sm">
                    "Our mission is to transform <span className="text-[#d6802b] font-bold">ordinary moments</span> into <span className="text-[#d6802b] font-bold">extraordinary memories</span>."
                  </p>
                </div>
                {/* Decorative glow */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#d6802b]/20 blur-3xl rounded-full" />
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#d6802b]/10 blur-3xl rounded-full" />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-5 -right-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-xl">
                <p className="text-2xl font-black text-[var(--foreground)]">500+</p>
                <p className="text-xs text-[var(--muted)]">Events Executed</p>
              </div>
            </div>

            {/* Text */}
            <div>
              <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Our Mission</p>
              <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] mb-5 leading-tight">
                Transforming Visions Into <span className="text-[#d6802b]">Unforgettable Experiences</span>
              </h2>
              {settings?.about_content ? (
                <div className="text-[var(--muted)] leading-relaxed mb-8 whitespace-pre-wrap">
                  {settings.about_content}
                </div>
              ) : (
                <p className="text-[var(--muted)] leading-relaxed mb-8">
                  Please update the about story in the administrative dashboard to display your content here.
                </p>
              )}
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-[var(--accent-dark)] hover:bg-[var(--accent)] text-white px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-[var(--accent)]/25"
              >
                Work With Us <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section bg-[var(--surface)]">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-3">Our Values</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)]">
              What <span className="text-[#d6802b]">Drives Us</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TEAM_VALUES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 card-hover">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <h3 className="font-bold text-[var(--foreground)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline / Milestones */}
      <section className="section">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Our Journey</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)]">
              Key <span className="text-[#d6802b]">Milestones</span>
            </h2>
          </div>
          <div className="relative space-y-6">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-[var(--border)] hidden sm:block" />
            {MILESTONES.map((m) => (
              <div key={m.year} className="flex gap-5 items-start">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-[var(--accent-dark)] flex items-center justify-center text-white text-xs font-black">
                  {m.year}
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex-1 card-hover">
                  <h3 className="font-bold text-[var(--foreground)] mb-1">{m.title}</h3>
                  <p className="text-sm text-[var(--muted)]">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
