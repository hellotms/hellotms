import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Our Services',
  description: 'Comprehensive event management and marketing services — photography, videography, corporate events, weddings, and more.',
};

const SERVICES = [
  {
    icon: '🎪',
    title: 'Event Management',
    description: 'Full-scale event planning and execution for any size — from concept and design to day-of logistics and post-event reporting.',
    features: ['Venue sourcing & setup', 'Guest management', 'Vendor coordination', 'On-site execution team'],
  },
  {
    icon: '📸',
    title: 'Photography',
    description: 'Cinematic, high-resolution photography that captures every emotion, connection, and milestone of your event.',
    features: ['Event & corporate photography', 'Wedding photography', 'Product photography', 'Same-day delivery available'],
  },
  {
    icon: '🎬',
    title: 'Videography & Production',
    description: 'Professional video storytelling with cinematic grade equipment, post-production editing, and brand-aligned delivery.',
    features: ['4K video production', 'Highlight reels', 'Live streaming', 'Drone footage'],
  },
  {
    icon: '🎤',
    title: 'Corporate Events',
    description: 'Conferences, product launches, seminars, and award nights — delivered on-brand, on-budget, on-time.',
    features: ['AV production', 'Stage & set design', 'Keynote support', 'Media coverage'],
  },
  {
    icon: '🌹',
    title: 'Wedding Planning',
    description: 'Your dream wedding, meticulously planned from first consultation to last dance, with love and attention to every detail.',
    features: ['Full wedding coordination', 'Floral & décor', 'Catering management', 'Honeymoon planning'],
  },
  {
    icon: '📊',
    title: 'Brand Activations',
    description: 'Immersive brand experiences that connect your audience, drive engagement, and make your brand unforgettable.',
    features: ['Pop-up events', 'Influencer events', 'Roadshows', 'Experiential marketing'],
  },
];

const PROCESS = [
  { step: '01', title: 'Discovery Call', text: 'We learn about your event, vision, and goals in a free consultation.' },
  { step: '02', title: 'Proposal & Planning', text: 'Our team creates a detailed event plan, timeline, and budget.' },
  { step: '03', title: 'Execution', text: 'We handle every detail so you can enjoy the experience stress-free.' },
  { step: '04', title: 'Delivery & Review', text: 'Deliverables handed over, feedback collected, and excellence ensured.' },
];

export default function ServicesPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 hero-gradient overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="container relative z-10 text-center">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">What We Offer</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--foreground)] mb-5">
            Our <span className="gradient-text">Services</span>
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
            Comprehensive solutions for every event need — creative, strategic, and flawlessly executed from start to finish.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 card-hover group"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h2 className="font-bold text-[var(--foreground)] text-xl mb-2 group-hover:text-indigo-500 transition-colors">
                  {service.title}
                </h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-5">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[var(--muted)]">
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
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)]">
              Our <span className="gradient-text">Process</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map((p) => (
              <div key={p.step} className="relative">
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
            Ready to get <span className="gradient-text">started?</span>
          </h2>
          <p className="text-[var(--muted)] mb-8">Talk to our team and let's plan something extraordinary together.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all hover:shadow-xl hover:shadow-indigo-500/25"
          >
            Request a Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
