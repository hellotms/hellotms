import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import type { SiteSettings } from '@hellotms/shared';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Hello TMS and our journey in professional event management.',
};

export const revalidate = 300;

const TEAM_HIGHLIGHTS = [
  { stat: '8+', label: 'Years in Business' },
  { stat: '500+', label: 'Events Delivered' },
  { stat: '300+', label: 'Satisfied Clients' },
  { stat: '99%', label: 'Client Satisfaction' },
];

export default async function AboutPage() {
  const { data } = await supabase.from('site_settings').select('about_content').eq('id', 1).single();
  const settings = data as Pick<SiteSettings, 'about_content'> | null;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-brand-900 text-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-brand-400 text-sm font-semibold tracking-widest uppercase mb-4">Our Story</p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight">We Are Hello TMS</h1>
          <p className="mt-5 text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
            A passionate team dedicated to making every event unforgettable through creativity, professionalism, and heart.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {TEAM_HIGHLIGHTS.map(({ stat, label }) => (
              <div key={label}>
                <p className="text-4xl font-black text-brand-700">{stat}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none text-gray-600">
          {settings?.about_content ? (
            settings.about_content.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="mb-4 leading-relaxed">{para}</p>
            ))
          ) : (
            <p>Hello TMS is a leading event management and marketing solutions company based in Bangladesh. We specialise in corporate events, weddings, product launches, and brand activations. From intimate gatherings to large-scale productions, our experienced team delivers flawless execution every time.</p>
          )}
        </div>

        {/* Values */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: '🎯', title: 'Our Mission', text: 'To deliver memorable experiences that reflect our clients\' vision with precision and creativity.' },
            { icon: '🌟', title: 'Our Vision', text: 'To be the most trusted event management partner in Bangladesh.' },
            { icon: '💡', title: 'Our Values', text: 'Integrity, creativity, dedication, and a relentless focus on client satisfaction.' },
          ].map(v => (
            <div key={v.title} className="bg-gray-50 rounded-2xl p-6">
              <div className="text-3xl mb-3">{v.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-50 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Star className="h-10 w-10 text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900">Ready to work with us?</h2>
          <p className="text-gray-500 mt-2 mb-6">Let's create something extraordinary together.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-7 py-3.5 rounded-full font-bold transition-colors">
            Start a Conversation <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
