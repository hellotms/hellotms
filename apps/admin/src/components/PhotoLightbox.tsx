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
    const [zoom, setZoom] = useState(1);

    const prev = useCallback(() => { setZoom(1); setCurrent(c => (c - 1 + photos.length) % photos.length); }, [photos.length]);
    const next = useCallback(() => { setZoom(1); setCurrent(c => (c + 1) % photos.length); }, [photos.length]);

    const handleZoomIn = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setZoom(z => Math.min(z + 0.5, 5));
    };

    const handleZoomOut = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setZoom(z => Math.max(z - 0.5, 0.5));
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        if (e.deltaY < 0) {
            handleZoomIn();
        } else {
            handleZoomOut();
        }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === '+' || e.key === '=') handleZoomIn();
            if (e.key === '-') handleZoomOut();
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
            <div onClick={e => e.stopPropagation()} onWheel={handleWheel} className="relative max-w-5xl max-h-[90vh] w-full px-4 overflow-hidden flex flex-col items-center justify-center">
                <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center overflow-auto custom-scrollbar">
                    <img
                        src={photos[current].url}
                        alt=""
                        className="max-w-full max-h-full object-contain transition-transform duration-200"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                    />
                </div>
                {/* Counter */}
                <p className="text-center text-white/50 text-sm mt-3">
                    {current + 1} / {photos.length}
                </p>
            </div>

            {/* Close */}
            <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white z-50"
                title="Close (Esc)"
            >
                <X className="h-5 w-5" />
            </button>

            {/* Zoom Controls */}
            <div className="absolute bottom-5 right-5 flex items-center gap-2 bg-white/10 p-1.5 rounded-xl z-50 backdrop-blur-sm">
                <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white disabled:opacity-50"
                    disabled={zoom <= 0.5}
                    title="Zoom Out (-)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <span className="text-white text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white disabled:opacity-50"
                    disabled={zoom >= 5}
                    title="Zoom In (+)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
            </div>

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
