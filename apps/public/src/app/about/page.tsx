import type { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About Us - The Marketing Solution',
  description: 'Learn about The Marketing Solution — Bangladesh\'s premier event management and marketing agency.',
};

export default function AboutPage() {
  return <AboutClient />;
}
