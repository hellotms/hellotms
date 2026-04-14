import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Valued Partners - The Marketing Solution',
  description: 'Trusted by global brands and industry leaders in Bangladesh.',
};

export const revalidate = 0; // Ensure fresh data on every request

export default async function PartnersPage() {
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('name');

  return (
    <main className="min-h-screen pt-24 pb-20 bg-[var(--background)]">
      <div className="container relative z-10 px-4 mx-auto max-w-7xl">
        
        {/* Header Section */}
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-24 mt-12 md:mt-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-black tracking-[0.2em] text-[var(--accent)] uppercase mb-6 shadow-sm">
            Our Valued Partners
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-[var(--foreground)] tracking-tight leading-[1.1] mb-6">
            Trusted by global <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)]">brands</span> and industry <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)]">leaders</span>
          </h1>
          <p className="text-[var(--muted)] text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            Trusted by global brands and industry leaders. We take pride in building lasting relationships and delivering excellence.
          </p>
        </div>

        {/* Partners Grid */}
        {companies && companies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {companies.map((company) => (
              <div 
                key={company.id} 
                className="group relative bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-[var(--accent)]/5 flex flex-col items-center text-center justify-between min-h-[280px]"
              >
                {/* Decorative Pattern on Hover */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative w-full h-32 mb-6">
                  {company.logo_url ? (
                    <Image
                      src={company.logo_url}
                      alt={company.name}
                      fill
                      className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-700 p-2 scale-95 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-[var(--accent)]/5 flex items-center justify-center border border-[var(--border)] border-dashed group-hover:border-[var(--accent)]/30 transition-colors">
                      <span className="text-3xl font-black text-[var(--accent)] opacity-30">
                        {company.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight group-hover:text-[var(--accent)] transition-colors">
                    {company.name}
                  </h3>
                  {company.industry && (
                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] opacity-60">
                      {company.industry}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-[var(--surface)] rounded-3xl border border-[var(--border)]">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No partners listed yet</h3>
            <p className="text-[var(--muted)]">Our partnerships are constantly expanding.</p>
          </div>
        )}
      </div>
    </main>
  );
}
