'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Zap, Mail, Phone, MapPin, Instagram, Facebook, Youtube, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SiteSettings } from '@hellotms/shared';

const LINKS = {
  company: [
    { href: '/about', label: 'About Us' },
    { href: '/services', label: 'Services' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/contact', label: 'Contact' },
  ],
  services: [
    { href: '/services', label: 'Event Management' },
    { href: '/services', label: 'Photography' },
    { href: '/services', label: 'Videography' },
    { href: '/services', label: 'Corporate Events' },
    { href: '/services', label: 'Wedding Planning' },
  ],
};

export function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadSettings() {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data as SiteSettings);
    }
    loadSettings();
  }, []);

  const socials = settings?.socials as any;
  const contact = settings?.contact_info as any;

  const socialLinks = [
    { href: socials?.facebook || '#', icon: Facebook, label: 'Facebook', active: !!socials?.facebook },
    { href: socials?.instagram || '#', icon: Instagram, label: 'Instagram', active: !!socials?.instagram },
    { href: socials?.youtube || '#', icon: Youtube, label: 'YouTube', active: !!socials?.youtube },
  ].filter(s => s.active);

  const contactItems = [
    { icon: Phone, text: contact?.phone || '+880 1700 000 000', href: contact?.phone ? `tel:${contact.phone.replace(/\s/g, '')}` : undefined },
    { icon: Mail, text: contact?.email || 'hello@themarketingsolution.com', href: contact?.email ? `mailto:${contact.email}` : undefined },
    { icon: MapPin, text: contact?.address || 'Dhaka, Bangladesh', href: undefined },
  ];

  return (
    <footer className="bg-[var(--surface)] border-t border-[var(--border)]">
      {/* Main grid */}
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-6 group w-fit">
              {settings?.company_logo_url ? (
                <div className="relative w-10 h-10 transition-transform group-hover:scale-105 duration-300">
                  <img
                    src={settings.company_logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/40 transition-shadow">
                  {mounted ? <Zap className="h-4 w-4 text-white" /> : <div className="h-4 w-4" />}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm md:text-base text-[var(--foreground)] tracking-tight leading-none">
                  The <span className="text-indigo-500">Marketing</span> Solution
                </span>
                {settings?.site_motto && (
                  <span className="text-[10px] text-[var(--muted)] font-medium leading-tight mt-1">
                    {settings.site_motto}
                  </span>
                )}
              </div>
            </Link>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
              {settings?.hero_subtitle}
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-[var(--surface-2)] hover:bg-indigo-600 text-[var(--muted)] hover:text-white flex items-center justify-center transition-all"
                >
                  {mounted ? <Icon className="h-4 w-4" /> : <div className="h-4 w-4" />}
                </a>
              ))}
            </div>
          </div>

          {/* Company links */}
          <div>
            <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5">
              {LINKS.company.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1 group"
                  >
                    {l.label}
                    {mounted ? <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /> : <div className="h-3 w-3" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2.5">
              {LINKS.services.map((l, i) => (
                <li key={i}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1 group"
                  >
                    {l.label}
                    {mounted ? <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /> : <div className="h-3 w-3" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              {contactItems.map(({ icon: Icon, text, href }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    {mounted ? <Icon className="h-3.5 w-3.5 text-indigo-400" /> : <div className="h-3.5 w-3.5" />}
                  </div>
                  {href ? (
                    <a href={href} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                      {text}
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--muted)]">{text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--border)]">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span>© {new Date().getFullYear()} The Marketing Solution. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

