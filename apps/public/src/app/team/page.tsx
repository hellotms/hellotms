import type { Metadata } from 'next';
import TeamClient from './TeamClient';

export const metadata: Metadata = {
  title: 'Our Team - The Marketing Solution',
  description: 'Meet the expert team behind The Marketing Solution.',
};

export default function TeamPage() {
  return <TeamClient />;
}
