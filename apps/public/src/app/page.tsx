import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import type { SiteSettings, Project } from '@hellotms/shared';
import { ArrowRight, Camera, Users, Star, Award } from 'lucide-react';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await supabase.from('site_settings').select('hero_title, hero_subtitle').eq('id', 1).single();
  return {
    title: data?.hero_title ?? 'Hello TMS | Marketing Solution',
    description: data?.hero_subtitle ?? 'Professional event management in Bangladesh',
  };
}

async function getSiteSettings(): Promise<SiteSettings | null> {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  return data as SiteSettings | null;
}

async function getFeaturedProjects(): Promise<Project[]> {
  const { data } = await supabase
    .from('projects')
    .select('id, title, cover_image_url, status, companies(name)')
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(6);
  return (data ?? []) as unknown as Project[];
}

const STATS = [
  { icon: Camera, value: '500+', label: 'Events Captured' },
  { icon: Users, value: '300+', label: 'Happy Clients' },
  { icon: Star, value: '4.9', label: 'Average Rating' },
  { icon: Award, value: '8+', label: 'Years Experience' },
];

export default async function HomePage() {
  const [settings, projects] = await Promise.all([getSiteSettings(), getFeaturedProjects()]);

  const services = (settings?.services ?? []) as { title: string; description?: string; icon?: string }[];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-purple-900 text-white py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-brand-300 text-sm font-semibold tracking-widest uppercase mb-4">Marketing Solution</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
            {settings?.hero_title ?? 'Capturing Every Moment'}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-brand-100 max-w-2xl mx-auto leading-relaxed">
            {settings?.hero_subtitle ?? 'Professional event photography and management services across Bangladesh.'}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="bg-white text-brand-800 hover:bg-brand-50 px-8 py-3.5 rounded-full font-bold text-base transition-all hover:shadow-lg hover:-translate-y-0.5">
              {settings?.hero_cta_primary_label ?? 'Get a Free Quote'} →
            </Link>
            <Link href="/portfolio" className="border-2 border-brand-300 text-white hover:bg-brand-800/50 px-8 py-3.5 rounded-full font-semibold text-base transition-all">
              View Our Work
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-brand-50 rounded-xl mx-auto mb-3">
                  <Icon className="h-6 w-6 text-brand-600" />
                </div>
                <p className="text-3xl font-black text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="py-16 sm:py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Our Services</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">End-to-end event management and creative services</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all group">
                  {service.icon && <div className="text-4xl mb-4">{service.icon}</div>}
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand-700 transition-colors">{service.title}</h3>
                  {service.description && <p className="mt-2 text-sm text-gray-500 leading-relaxed">{service.description}</p>}
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/services" className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700">
                View all services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Portfolio */}
      {projects.length > 0 && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Recent Work</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">A glimpse of our finest events and productions</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link key={project.id} href={`/portfolio/${project.id}`} className="group rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all">
                  <div className="relative h-52 bg-gradient-to-br from-brand-100 to-purple-100">
                    {project.cover_image_url ? (
                      <Image src={project.cover_image_url} alt={project.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-brand-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-4 bg-white">
                    <h3 className="font-bold text-gray-900 group-hover:text-brand-700 transition-colors">{project.title}</h3>
                    {(project as Project & { companies?: { name: string } | null }).companies && (
                      <p className="text-xs text-gray-400 mt-1">{((project as Project & { companies?: { name: string } | null }).companies as { name: string }).name}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/portfolio" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-semibold transition-colors">
                View Full Portfolio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About Teaser */}
      {settings?.about_content && (
        <section className="py-16 sm:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-6">About Us</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{settings.about_content}</p>
            <Link href="/about" className="inline-flex items-center gap-2 mt-8 text-brand-600 font-semibold hover:text-brand-700">
              Read more <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-brand-700 to-purple-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black">Ready to plan your event?</h2>
          <p className="mt-3 text-brand-100">Let's discuss how we can make your vision a reality.</p>
          <Link href="/contact" className="mt-8 inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 px-8 py-3.5 rounded-full font-bold transition-colors">
            Contact Us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
