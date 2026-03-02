import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-9xl font-black text-brand-100 select-none">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-500">We couldn't find what you were looking for.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700 px-6 py-3 rounded-full font-semibold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
