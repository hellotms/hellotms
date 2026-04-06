import type { Metadata } from 'next';
import { Outfit, Lato } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SplashManager } from '@/components/SplashManager';
import { JsonLd } from '@/components/JsonLd';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
});

import { supabase } from '@/lib/supabase';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  const siteName = 'The Marketing Solution';
  const description = settings?.hero_subtitle || 'Professional event management and marketing services in Bangladesh. We bring your vision to life.';
  const logoUrl = settings?.company_logo_url || '/favicon.svg';

  return {
    title: {
      default: `${siteName} | Premier Event Management & Marketing Agency`,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: [
      'Event Management Bangladesh',
      'Corporate Event Planning Dhaka',
      'Brand Activations Bangladesh',
      'Best Event Agency Dhaka',
      'The Marketing Solution Agency',
      'Event Logistics Experts',
      'Wedding Planning Dhaka',
      'Corporate Videography Bangladesh',
    ],
    authors: [{ name: 'The Marketing Solution' }],
    creator: 'The Marketing Solution',
    publisher: 'The Marketing Solution',
    formatDetection: {
      email: false,
      address: true,
      telephone: true,
    },
    metadataBase: new URL(settings?.public_site_url || 'https://themarketingsolution.com.bd'),
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
    },
    openGraph: {
      title: siteName,
      description,
      url: settings?.public_site_url || 'https://themarketingsolution.com.bd',
      siteName,
      images: [
        {
          url: logoUrl,
          width: 800,
          height: 600,
          alt: siteName,
        },
      ],
      locale: 'en_BD',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description,
      images: [logoUrl],
      creator: '@TheMarketingSol',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'YOUR_VERIFICATION_ID', // Can be set later
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${lato.variable}`} suppressHydrationWarning>
      <body className={`${outfit.className} ${lato.className}`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <SplashManager>
            <JsonLd />
            <Navbar />
            <main>{children}</main>
            <Footer />
          </SplashManager>
        </ThemeProvider>
      </body>
    </html>
  );
}
