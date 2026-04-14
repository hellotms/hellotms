'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import type { SiteSettings } from '@hellotms/shared';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/team', label: 'Our Team' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/partners', label: 'Valued Partners' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data as SiteSettings);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-[var(--border)] shadow-sm dark:shadow-black/50'
        : 'bg-transparent'
        }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group" suppressHydrationWarning>
            {settings?.company_logo_url ? (
              <div className="relative w-10 h-10 transition-transform group-hover:scale-105 duration-300">
                <img
                  src={settings.company_logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center shadow-lg group-hover:shadow-[var(--accent)]/40 transition-shadow">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-sm md:text-lg text-[#d6802b] tracking-tight leading-none">
                The Marketing Solution
              </span>
              {settings?.site_motto && (
                <span className="text-[10px] md:text-xs text-[var(--muted)] font-medium leading-tight">
                  {settings.site_motto}
                </span>
              )}
            </div>
          </Link>

          {/* Actions & Desktop Nav */}
          <div className="flex items-center gap-2">
            {/* Desktop nav - tucked closely to the right */}
            <nav className="hidden md:flex items-center gap-1 mr-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all"
            >
              {mounted ? (
                theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>

            {/* CTA — desktop */}
            <Link
              href="/contact"
              className="hidden md:inline-flex items-center gap-1.5 bg-[var(--accent-dark)] hover:bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[var(--accent)]/25"
            >
              Get a Quote
            </Link>

            {/* Mobile toggle */}
            <button
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Open menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {isOpen && (
          <div
            className="md:hidden pb-4 border-t border-[var(--border)] mt-1 pt-3 space-y-1"
            onClick={() => setIsOpen(false)}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <Link
                href="/contact"
                className="flex items-center justify-center bg-[var(--accent-dark)] hover:bg-[var(--accent)] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Get a Quote
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
