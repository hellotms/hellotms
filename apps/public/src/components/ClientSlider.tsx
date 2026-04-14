import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Company } from '@hellotms/shared';

export default function ClientSlider() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('name');
      
      setCompanies(data || []);
      setLoading(false);
    }
    fetchCompanies();
  }, []);

  if (loading || companies.length === 0) return null;

  // Triple to ensure smooth loop for short lists (matches animate-scroll in globals.css)
  const displayCompanies = [...companies, ...companies, ...companies];

  return (
    <section id="clients" className="py-24 bg-background relative overflow-hidden border-t border-border/40">
      <div className="container px-4 mx-auto mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-4">
          Our Valued Partners
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight max-w-2xl mx-auto leading-tight">
          Trusted by global brands and industry leaders
        </h2>
      </div>

      <div className="relative w-full overflow-hidden">
        {/* Faders */}
        <div className="absolute inset-y-0 left-0 w-32 md:w-64 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 md:w-64 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex items-center gap-16 md:gap-32 w-max px-8 animate-scroll">
          {displayCompanies.map((company, i) => (
            <div
              key={`${company.id}-${i}`}
              className="flex items-center gap-4 transition-transform duration-500 hover:scale-110 group cursor-pointer"
            >
              {company.logo_url ? (
                <div className="relative h-8 md:h-11 w-24">
                  <Image
                    src={company.logo_url}
                    alt={company.name}
                    fill
                    className="object-contain drop-shadow-sm"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center transition-all group-hover:bg-primary/20">
                  <span className="text-[10px] font-black text-primary uppercase">{company.name.slice(0, 2)}</span>
                </div>
              )}
              <span className="text-sm md:text-base font-bold text-muted-foreground/60 group-hover:text-foreground transition-colors tracking-tight">
                {company.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modern minimal background highlights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.08)_0%,transparent_70%)] -z-10 pointer-events-none" />
    </section>
  );
}
