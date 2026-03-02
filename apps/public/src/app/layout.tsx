import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    default: 'Hello TMS | Marketing Solution',
    template: '%s | Hello TMS',
  },
  description: 'Professional event management and photography services in Bangladesh.',
  metadataBase: new URL('https://hellotms.com.bd'),
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: 'https://hellotms.com.bd',
    siteName: 'Hello TMS',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
