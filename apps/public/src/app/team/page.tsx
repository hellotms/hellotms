import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { Facebook, Linkedin, Twitter } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Team - The Marketing Solution',
  description: 'Meet the expert team behind The Marketing Solution.',
};

export const revalidate = 0; // Ensure fresh data on every request

export default async function TeamPage() {
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen pt-24 pb-20 bg-[var(--background)]">
      <div className="container relative z-10 px-4 mx-auto max-w-7xl">
        
        {/* Header Section */}
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-24 mt-12 md:mt-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-black tracking-[0.2em] text-[var(--accent)] uppercase mb-6 shadow-sm">
            Our People
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-[var(--foreground)] tracking-tight leading-[1.1] mb-6">
            Meet the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)]">Experts</span>
          </h1>
          <p className="text-[var(--muted)] text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            A diverse collective of creative minds, analytical thinkers, and dedicated professionals committed to elevating your brand.
          </p>
        </div>

        {/* Team Grid */}
        {teamMembers && teamMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div 
                key={member.id} 
                className="group relative aspect-[3/4] bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] overflow-hidden transition-all duration-700 hover:shadow-2xl hover:shadow-[var(--accent)]/20"
              >
                {/* Full Card Image */}
                <div className="absolute inset-0 w-full h-full">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url}
                      alt={member.name}
                      fill
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/40 flex items-center justify-center">
                      <span className="text-5xl font-black text-[var(--accent)] opacity-50 uppercase">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Glassmorphic Overlay Content */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="absolute inset-0 flex flex-col justify-end p-8 translate-y-6 group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                  {/* Designation Badge (Slides in first) */}
                  <div className="mb-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 delay-100">
                    <span className="px-3 py-1 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/30 backdrop-blur-md text-[10px] font-black tracking-widest text-[var(--accent)] uppercase">
                      {member.designation}
                    </span>
                  </div>

                  {/* Name (Hidden by default, reveal on hover) */}
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4 drop-shadow-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 delay-150">
                    {member.name}
                  </h3>
                  
                  {/* Social Links (Fade in with extra delay) */}
                  <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 delay-250">
                    {member.linkedin_url && (
                      <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {member.facebook_url && (
                      <a href={member.facebook_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#1877f2] hover:border-[#1877f2] transition-all">
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {member.twitter_url && (
                      <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#000] hover:border-[#333] transition-all">
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Decorative Accent Line */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--accent)] scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-[var(--surface)] rounded-3xl border border-[var(--border)]">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Our team is growing</h3>
            <p className="text-[var(--muted)]">Check back soon to meet our latest talents.</p>
          </div>
        )}
      </div>
    </main>
  );
}
