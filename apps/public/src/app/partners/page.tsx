import type { Metadata } from 'next';
import PartnersClient from './PartnersClient';

export const metadata: Metadata = {
  title: 'Our Valued Partners - The Marketing Solution',
  description: 'Trusted by global brands and industry leaders in Bangladesh.',
};

export default function PartnersPage() {
  return <PartnersClient />;
}
