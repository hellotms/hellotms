import Link from 'next/link';
import { Zap, Mail, Phone, MapPin, Instagram, Facebook, Youtube, ArrowUpRight } from 'lucide-react';

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
  return (
    <footer className="bg-[var(--surface)] border-t border-[var(--border)]">
      {/* Main grid */}
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-[var(--foreground)]">
                The <span className="text-indigo-500">Marketing</span> Solution
              </span>
            </Link>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
              Bangladesh's premier event management and marketing agency. We turn your vision into unforgettable experiences.
            </p>
            <div className="flex items-center gap-2">
              {[
                { href: '#', icon: Facebook, label: 'Facebook' },
                { href: '#', icon: Instagram, label: 'Instagram' },
                { href: '#', icon: Youtube, label: 'YouTube' },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-[var(--surface-2)] hover:bg-indigo-600 text-[var(--muted)] hover:text-white flex items-center justify-center transition-all"
                >
                  <Icon className="h-4 w-4" />
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
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm text-[var(--foreground)] mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              {[
                { icon: Phone, text: '+880 1700 000 000', href: 'tel:+8801700000000' },
                { icon: Mail, text: 'hello@themarketingsolution.com', href: 'mailto:hello@themarketingsolution.com' },
                { icon: MapPin, text: 'Dhaka, Bangladesh', href: undefined },
              ].map(({ icon: Icon, text, href }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-indigo-400" />
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
