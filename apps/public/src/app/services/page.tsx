import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ServicesPageConfig } from '@hellotms/shared';

export async function generateMetadata(): Promise<Metadata> {
  const { data: settings } = await supabase.from('site_settings').select('services_page_config').eq('id', 1).single();
  const config = settings?.services_page_config as ServicesPageConfig | undefined;

  return {
    title: config?.hero.badge || 'Our Services',
    description: config?.hero.description || 'Comprehensive event management and marketing services.',
  };
}

export default async function ServicesPage() {
  const { data: settings } = await supabase.from('site_settings').select('services_page_config').eq('id', 1).single();
  
  if (!settings?.services_page_config) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h1 className="text-2xl font-bold">Services configuration not found.</h1>
        <p className="text-muted-foreground mt-2">Please set up the services page in the admin portal.</p>
      </div>
    );
  }

  const config = settings.services_page_config as ServicesPageConfig;

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 hero-gradient overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="container relative z-10 text-center">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">{config.hero.badge}</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--foreground)] mb-5">
            {config.hero.title_primary} <span className="gradient-text">{config.hero.title_highlight}</span>
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
            {config.hero.description}
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.services.map((service, idx) => (
              <div
                key={idx}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 card-hover group"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h2 className="font-bold text-[var(--foreground)] text-xl mb-2 group-hover:text-indigo-500 transition-colors">
                  {service.title}
                </h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-5">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((f, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <CheckCircle className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section bg-[var(--surface)]">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">{config.process.badge}</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)]">
              {config.process.title_primary} <span className="gradient-text">{config.process.title_highlight}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.process.steps.map((p, idx) => (
              <div key={idx} className="relative">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 card-hover h-full">
                  <div className="text-4xl font-black gradient-text-cool mb-4 leading-none">{p.step}</div>
                  <h3 className="font-bold text-[var(--foreground)] mb-2">{p.title}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] mb-4">
            {config.cta.title_primary} <span className="gradient-text">{config.cta.title_highlight}</span>
          </h2>
          <p className="text-[var(--muted)] mb-8">{config.cta.description}</p>
          <Link
            href={config.cta.button_url}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all hover:shadow-xl hover:shadow-indigo-500/25"
          >
            {config.cta.button_label} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
