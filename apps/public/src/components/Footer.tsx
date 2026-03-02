import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-black text-white">Hello<span className="text-brand-400">TMS</span></Link>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 max-w-xs">
              Professional event management and photography services across Bangladesh. Capturing memories that last a lifetime.
            </p>
            <div className="flex gap-4 mt-5">
              {[
                { label: 'Facebook', href: '#' },
                { label: 'Instagram', href: '#' },
                { label: 'YouTube', href: '#' },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-800 hover:bg-brand-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition-colors">
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[['Portfolio', '/portfolio'], ['Services', '/services'], ['About Us', '/about'], ['Contact', '/contact']].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="tel:+8801700000000" className="hover:text-white transition-colors">+880 1700 000 000</a></li>
              <li><a href="mailto:hello@hellotms.com.bd" className="hover:text-white transition-colors">hello@hellotms.com.bd</a></li>
              <li className="text-gray-400">Dhaka, Bangladesh</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Hello TMS. All rights reserved.</p>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
