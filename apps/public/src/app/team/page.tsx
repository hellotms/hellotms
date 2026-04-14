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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
            {teamMembers.map((member) => (
              <div 
                key={member.id} 
                className="group relative bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-3xl p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-[var(--accent)]/5 overflow-hidden"
              >
                {/* Background Highlight on Hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-bl-full -z-10 translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500" />
                
                <div className="relative mb-6 mx-auto w-40 h-40">
                  {member.photo_url ? (
                    <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg group-hover:shadow-[var(--accent)]/20 transition-all duration-500 border border-[var(--border)] group-hover:border-[var(--accent)]/30">
                      <Image
                        src={member.photo_url}
                        alt={member.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/30 flex items-center justify-center border border-[var(--border)]">
                      <span className="text-4xl font-black text-[var(--accent)] opacity-50">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight mb-1 group-hover:text-[var(--accent)] transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-[14px] font-bold text-[var(--muted)] mb-5">
                    {member.designation}
                  </p>
                  
                  {/* Social Links */}
                  <div className="flex items-center justify-center gap-3">
                    {member.linkedin_url && (
                      <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] hover:text-[#0077b5] hover:border-[#0077b5]/30 hover:bg-[#0077b5]/5 transition-all">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {member.facebook_url && (
                      <a href={member.facebook_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] hover:text-[#1877f2] hover:border-[#1877f2]/30 hover:bg-[#1877f2]/5 transition-all">
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {member.twitter_url && (
                      <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] hover:text-[#1da1f2] hover:border-[#1da1f2]/30 hover:bg-[#1da1f2]/5 transition-all">
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
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
