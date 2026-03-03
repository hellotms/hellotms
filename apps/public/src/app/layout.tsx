import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'The Marketing Solution',
    template: '%s | The Marketing Solution',
  },
  description: 'Professional event management and marketing services in Bangladesh. We bring your vision to life.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acadome.dev'),
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    siteName: 'The Marketing Solution',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className={outfit.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <Navbar />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
