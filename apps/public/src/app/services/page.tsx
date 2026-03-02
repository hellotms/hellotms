import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import type { SiteSettings } from '@hellotms/shared';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Explore our full range of event management and marketing services.',
};

export const revalidate = 300;

const DEFAULT_SERVICES: { title: string; description?: string; icon?: string }[] = [
  { title: 'Wedding Photography', description: 'Capturing the most important day of your life with elegance and emotion.', icon: '💍' },
  { title: 'Corporate Events', description: 'Professional coverage for conferences, product launches, and team events.', icon: '🏢' },
  { title: 'Event Management', description: 'End-to-end event planning and execution for any scale.', icon: '📋' },
  { title: 'Videography', description: 'Cinematic video production to tell your story beautifully.', icon: '🎬' },
  { title: 'Brand Activation', description: 'Experiential marketing campaigns that connect brands with audiences.', icon: '✨' },
  { title: 'Photo Booth', description: 'Fun and interactive photo booths for weddings, parties, and corporate events.', icon: '📸' },
];

export default async function ServicesPage() {
  const { data } = await supabase.from('site_settings').select('services').eq('id', 1).single();
  const settings = data as SiteSettings | null;
  const services: { title: string; description?: string; icon?: string }[] = ((settings?.services as { title: string }[] | undefined) ?? []).length > 0 ? settings!.services as { title: string; description?: string; icon?: string }[] : DEFAULT_SERVICES;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-brand-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-brand-300 text-sm font-semibold tracking-widest uppercase mb-4">What We Offer</p>
          <h1 className="text-4xl sm:text-5xl font-black">Our Services</h1>
          <p className="mt-5 text-brand-100 text-lg max-w-xl mx-auto">From intimate gatherings to grand productions — we've got you covered.</p>
        </div>
      </section>

      {/* Services grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.title} className="bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-lg hover:border-brand-200 transition-all group">
              {service.icon && <div className="text-5xl mb-5 group-hover:scale-110 transition-transform inline-block">{service.icon}</div>}
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand-700 transition-colors">{service.title}</h3>
              {service.description && <p className="text-gray-500 text-sm leading-relaxed">{service.description}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-600 to-purple-700 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black">Need a custom package?</h2>
          <p className="mt-3 text-brand-100 mb-8">Contact us and we'll design the perfect solution for your event.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 px-8 py-3.5 rounded-full font-bold transition-colors">
            Get in Touch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
