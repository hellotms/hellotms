'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

type Photo = { id: string; url: string };

export function PhotoLightbox({ photos, initialIndex, onClose }: {
    photos: Photo[];
    initialIndex: number;
    onClose: () => void;
}) {
    const [current, setCurrent] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement>(null);

    const resetTransform = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const prev = useCallback(() => { resetTransform(); setCurrent(c => (c - 1 + photos.length) % photos.length); }, [photos.length]);
    const next = useCallback(() => { resetTransform(); setCurrent(c => (c + 1) % photos.length); }, [photos.length]);

    const handleZoomIn = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setZoom(z => Math.min(z + 0.5, 5));
    };

    const handleZoomOut = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setZoom(z => {
            const newZoom = Math.max(z - 0.5, 1);
            if (newZoom === 1) setPosition({ x: 0, y: 0 });
            return newZoom;
        });
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || zoom <= 1) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

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

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center select-none"
            onClick={onClose}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div 
                className={cn(
                    "relative w-full h-full flex items-center justify-center overflow-hidden",
                    zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                )}
                onClick={e => e.stopPropagation()}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
            >
                <img
                    ref={imgRef}
                    src={photos[current].url}
                    alt=""
                    draggable={false}
                    className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out will-change-transform shadow-2xl"
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    }}
                />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-[110]">
                <div className="flex flex-col">
                    <p className="text-white font-bold text-lg drop-shadow-md">Photo Viewer</p>
                    <p className="text-white/60 text-xs font-medium tracking-wider uppercase">
                        {current + 1} of {photos.length}
                    </p>
                </div>
                
                <button
                    onClick={onClose}
                    className="pointer-events-auto p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white backdrop-blur-md border border-white/10 group"
                    title="Close (Esc)"
                >
                    <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl backdrop-blur-xl border border-white/10 z-[110]">
                <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-20"
                        disabled={zoom <= 1}
                        title="Zoom Out (-)"
                    >
                        <ZoomOut className="h-5 w-5" />
                    </button>
                    <span className="text-white text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={handleZoomIn}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-20"
                        disabled={zoom >= 5}
                        title="Zoom In (+)"
                    >
                        <ZoomIn className="h-5 w-5" />
                    </button>
                </div>

                <button
                    onClick={resetTransform}
                    className={cn(
                        "p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white",
                        zoom === 1 && "opacity-20 pointer-events-none"
                    )}
                    title="Reset View"
                >
                    <Maximize2 className="h-5 w-5" />
                </button>

                {zoom > 1 && (
                    <div className="flex items-center gap-2 pl-2 text-white/40 text-[10px] uppercase font-bold tracking-widest animate-pulse">
                        <Move className="h-3 w-3" /> Drag to Pan
                    </div>
                )}
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
                <>
                    <button
                        onClick={e => { e.stopPropagation(); prev(); }}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-white border border-white/5 backdrop-blur-sm group z-[110]"
                        title="Previous Photo"
                    >
                        <ChevronLeft className="h-8 w-8 group-active:-translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); next(); }}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-white border border-white/5 backdrop-blur-sm group z-[110]"
                        title="Next Photo"
                    >
                        <ChevronRight className="h-8 w-8 group-active:translate-x-1 transition-transform" />
                    </button>
                </>
            )}
        </div>
    );
}
