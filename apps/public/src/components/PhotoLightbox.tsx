'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Photo = { id: string; url: string };

export function PhotoLightbox({ photos, initialIndex, onClose }: {
    photos: Photo[];
    initialIndex: number;
    onClose: () => void;
}) {
    const [current, setCurrent] = useState(initialIndex);

    const prev = useCallback(() => setCurrent(c => (c - 1 + photos.length) % photos.length), [photos.length]);
    const next = useCallback(() => setCurrent(c => (c + 1) % photos.length), [photos.length]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, prev, next]);

    // Prevent body scroll when open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Image */}
            <div onClick={e => e.stopPropagation()} className="relative max-w-5xl max-h-[90vh] w-full px-4">
                <img
                    src={photos[current].url}
                    alt=""
                    className="w-full h-full max-h-[85vh] object-contain rounded-lg"
                    style={{ animation: 'fadeIn 0.2s ease' }}
                />
                {/* Counter */}
                <p className="text-center text-white/50 text-sm mt-3">
                    {current + 1} / {photos.length}
                </p>
            </div>

            {/* Close */}
            <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
                <X className="h-5 w-5" />
            </button>

            {/* Prev */}
            {photos.length > 1 && (
                <>
                    <button
                        onClick={e => { e.stopPropagation(); prev(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); next(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </>
            )}

            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>
        </div>
    );
}
