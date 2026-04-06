'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ArrowRight, Camera, Users, Star, Award, Play, CheckCircle, Sparkles, TrendingUp, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { HeroSlider } from '@/components/HeroSlider';
import ClientSlider from '@/components/ClientSlider';
import { HeroSlide } from '@hellotms/shared';

const DEMO_STATS = [
  { icon: Camera, value: '500+', label: 'Events Executed' },
  { icon: Users, value: '300+', label: 'Happy Clients' },
  { icon: Star, value: '4.9', label: 'Average Rating' },
  { icon: Award, value: '8+', label: 'Years of Excellence' },
];

const DEMO_SERVICES = [
  { icon: '🎪', title: 'Event Management', description: 'End-to-end event planning and execution — from concept to standing ovation.' },
  { icon: '📸', title: 'Photography', description: 'Cinematic photography that captures every emotion and detail of your event.' },
  { icon: '🎬', title: 'Videography', description: 'Professional video production with cinematic storytelling and post-production.' },
  { icon: '🎤', title: 'Corporate Events', description: 'Conferences, seminars, product launches — we deliver on brand, always.' },
  { icon: '🌹', title: 'Wedding Planning', description: 'Your dream wedding, flawlessly curated with love and precision.' },
  { icon: '📊', title: 'Brand Activations', description: 'Immersive campaigns that connect your brand to the right audience.' },
];

const GRADIENT_BG_CLASSES = [
  'from-indigo-900 to-purple-900',
  'from-rose-900 to-pink-900',
  'from-cyan-900 to-teal-900',
  'from-amber-900 to-orange-900',
  'from-emerald-900 to-green-900',
  'from-violet-900 to-indigo-900',
];

const WHY_US = [
  { icon: TrendingUp, title: '8+ Years of Expertise', text: 'Decade of delivering premium events with unmatched quality.' },
  { icon: Globe, title: 'Pan-Bangladesh Reach', text: 'We operate across Dhaka, Chittagong, Sylhet and beyond.' },
  { icon: CheckCircle, title: 'End-to-End Service', text: 'Concept, logistics, execution — one team handles it all.' },
  { icon: Sparkles, title: 'Award-Winning Team', text: 'A passionate crew of creatives, planners, and storytellers.' },
];

type Project = {
  id: string;
  title: string;
  cover_image_url: string | null;
  location: string | null;
  companies: { name: string } | null;
};

const BrandText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(The Marketing Solution)/i);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === 'the marketing solution'
          ? <span key={i} className="text-[#d6802b] font-bold">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
};


export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState(DEMO_SERVICES);
  const [whyUsContent, setWhyUsContent] = useState('With 8+ years of experience and hundreds of successful events, The Marketing Solution is the trusted partner for brands and individuals who refuse to settle for ordinary.');
  const [whyUsFeatures, setWhyUsFeatures] = useState<any[]>(WHY_US.map(w => ({ title: w.title, description: w.text, iconStr: null, IconComp: w.icon })));
  const [heroSlider, setHeroSlider] = useState<HeroSlide[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [heroContent, setHeroContent] = useState({ title: 'We Create Unforgettable Experiences', motto: 'Bangladesh\'s Premier Marketing Agency', subtitle: '' });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const [projectsResp, settingsResp] = await Promise.all([
        supabase
          .from('projects')
          .select('id, title, cover_image_url, location, companies(name)')
          .eq('is_published', true)
          .is('deleted_at', null)
          .order('event_start_date', { ascending: false })
          .limit(6),
        supabase
          .from('site_settings')
          .select('services_page_config, about_content, services, hero_title, site_motto, hero_subtitle, hero_slider, company_logo_url')
          .eq('id', 1)
          .single()
      ]);

      setProjects((projectsResp.data ?? []) as unknown as Project[]);
      if (settingsResp.data) {
        setSiteSettings(settingsResp.data);
        if (settingsResp.data.services_page_config?.services) {
          setServices(settingsResp.data.services_page_config.services.slice(0, 6));
        }
        if (settingsResp.data.about_content) {
          setWhyUsContent(settingsResp.data.about_content);
        }
        if (settingsResp.data.services && settingsResp.data.services.length > 0) {
          setWhyUsFeatures(settingsResp.data.services.map((s: any) => ({
            title: s.title || s.name,
            description: s.description,
            iconStr: s.icon || '✨',
            IconComp: null
          })).slice(0, 4));
        }

        setHeroSlider(settingsResp.data.hero_slider || []);
        const slides = settingsResp.data.hero_slider || [];
        setHeroContent({
          title: slides[0]?.title || settingsResp.data.hero_title || 'We Create Unforgettable Experiences',
          motto: settingsResp.data.site_motto || 'Bangladesh\'s Premier Marketing Agency',
          subtitle: slides[0]?.subtitle || settingsResp.data.hero_subtitle || 'From intimate gatherings to grand spectacles — The Marketing Solution delivers events that leave lasting impressions.'
        });
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] lg:min-h-screen flex items-center pt-16 overflow-hidden">
        <HeroSlider
          slides={heroSlider}
          onSlideChange={(index) => {
            const slide = heroSlider[index];
            if (slide) {
              setHeroContent(prev => ({
                ...prev,
                title: slide.title || siteSettings?.hero_title || 'We Create Unforgettable Experiences',
                subtitle: slide.subtitle || siteSettings?.hero_subtitle || 'From intimate gatherings to grand spectacles — The Marketing Solution delivers events that leave lasting impressions.'
              }))
            }
          }}
        />

        <div className="container relative z-10 py-20 flex justify-end">
          <div className="max-w-2xl text-right animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white mb-6 ml-auto">
              {mounted ? <Sparkles className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5" />}
              <span className="text-[11px] font-normal italic tracking-wider font-[family-name:var(--font-lato)]">
                empowering brands by
              </span>
              {siteSettings?.company_logo_url && (
                <div className="relative h-7 w-20">
                  <Image 
                    src={siteSettings.company_logo_url} 
                    alt="The Marketing Solution Logo" 
                    fill 
                    className="object-contain"
                  />
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-white mb-6 drop-shadow-md min-h-[2.2em] flex items-end justify-end">
              <BrandText text={heroContent.title} />
            </h1>

            <p className="text-base sm:text-lg text-white/80 max-w-xl ml-auto pl-6 leading-relaxed mb-10 font-medium drop-shadow-sm border-l-2 border-primary/30 min-h-[100px] flex items-start justify-end">
              <BrandText text={heroContent.subtitle} />
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
              >
                Start Your Project <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:-translate-y-0.5"
              >
                <Play className="h-4 w-4 fill-current text-white" /> View Portfolio
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-16 max-w-3xl ml-auto">
              {DEMO_STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/20 shadow-2xl shadow-black/80 hover:border-primary/50 transition-all flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-2 shadow-inner">
                    {mounted ? <Icon className="h-5 w-5 text-white drop-shadow-sm" /> : <div className="h-5 w-5" />}
                  </div>
                  <p className="text-xl font-black text-white drop-shadow-md">{value}</p>
                  <p className="text-[10px] font-bold text-white/90 uppercase tracking-widest mt-0.5 drop-shadow-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ── Services ─────────────────────────────────────── */}
      <section className="section relative overflow-hidden bg-white dark:bg-[#050505]">
        {/* Video Background */}
        <div className="absolute inset-0 z-0 text-white">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-50"
          >
            <source src="https://pub-d74fef399a584bd1a3f644d818273e03.r2.dev/site/The_Marketing_Solution_BG.mp4" type="video/mp4" />
          </video>
          {/* Adaptive Overlay */}
          <div className="absolute inset-0 bg-white/40 dark:bg-black/70 z-[1]" />
        </div>

        <div className="container relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black mb-4 flex items-center justify-center gap-3 text-black dark:text-white">
              {mounted ? <Sparkles className="h-8 w-8 text-black dark:text-white" /> : <div className="h-8 w-8" />}
              Our Services
            </h2>
            <p className="mt-4 text-[var(--muted)] max-w-xl mx-auto">
              Comprehensive solutions for every event need — creative, strategic, and flawlessly executed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/80 dark:hover:bg-black/60 hover:border-black/30 dark:hover:border-white/30 hover:-translate-y-1 group relative overflow-hidden shadow-lg dark:shadow-2xl dark:shadow-black/50"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="font-bold text-black dark:text-white text-lg mb-2 transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-[var(--accent)] font-semibold hover:text-[var(--accent-light)] transition-colors"
            >
              Explore all services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Portfolio Preview ─────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Our Work</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--foreground)]">
              Recent <span className="text-[#d6802b]">Projects</span>
            </h2>
            <p className="mt-4 text-[var(--muted)] max-w-xl mx-auto">
              A glimpse into our finest events — each one a story of passion, precision, and creativity.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-[var(--muted)]/10 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10">
              <Camera className="h-12 w-12 text-[var(--muted)] opacity-20 mx-auto mb-3" />
              <p className="text-[var(--muted)]">No projects published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project, i) => (
                <Link
                  key={project.id}
                  href={`/portfolio/${project.id}`}
                  className="group relative rounded-2xl overflow-hidden border border-[var(--border)] card-hover bg-[var(--card)]"
                >
                  <div className={`relative h-52 bg-gradient-to-br ${GRADIENT_BG_CLASSES[i % GRADIENT_BG_CLASSES.length]} flex items-center justify-center`}>
                    {project.cover_image_url ? (
                      <Image 
                        src={project.cover_image_url} 
                        alt={project.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <Camera className="h-12 w-12 text-white/20 group-hover:text-white/30 transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] text-white/80 font-medium backdrop-blur-sm">
                        {project.location ?? 'Bangladesh'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--card)]">
                    <h3 className="font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-1">{project.companies?.name ?? '—'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 bg-[var(--accent-dark)] hover:bg-[var(--accent)] text-white px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-[var(--accent)]/25"
            >
              View Full Portfolio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Us ───────────────────────────────────────── */}
      <section className="section bg-[var(--surface)]">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-3">Why Choose Us</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--foreground)] leading-tight mb-6">
                Excellence in Every <span className="text-[#d6802b]">Detail</span>
              </h2>
              <p className="text-[var(--muted)] leading-relaxed mb-8 max-w-lg">
                <BrandText text={whyUsContent} />
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-[var(--accent)] font-semibold hover:text-[var(--accent-light)] transition-colors"
              >
                Learn more about us <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whyUsFeatures.map(({ iconStr, IconComp, title, description }, idx) => (
                <div key={idx} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 card-hover">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center mb-3 text-xl">
                    {iconStr ? iconStr : (mounted && IconComp ? <IconComp className="h-5 w-5 text-[var(--accent)]" /> : <div className="h-5 w-5" />)}
                  </div>
                  <h4 className="font-bold text-[var(--foreground)] text-sm mb-1.5">{title}</h4>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden border border-[#d6802b]/20 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl dark:backdrop-blur-2xl p-8 sm:p-14 text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#d6802b]/5 dark:bg-[#d6802b]/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[var(--muted)] dark:text-white/60 text-xs font-medium mb-5">
                {mounted ? <Sparkles className="h-3 w-3" /> : <div className="h-3 w-3" />} Limited bookings this quarter
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black dark:text-white mb-4 leading-tight">
                Ready to Create Something <span className="text-[#d6802b]">Extraordinary?</span>
              </h2>
              <p className="text-neutral-600 dark:text-white/60 max-w-xl mx-auto mb-8 text-lg">
                Let's talk about your event. Our team is ready to make it the best day of your life.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-[#d6802b] text-white hover:bg-[#d6802b]/90 px-8 py-4 rounded-xl font-bold text-base transition-all hover:shadow-xl hover:shadow-[#d6802b]/20 hover:-translate-y-0.5"
              >
                Get a Free Consultation <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* ── Client Slider ─────────────────────────────────── */}
      <ClientSlider />
    </div>
  );
}
