'use client';
import { useState } from 'react';
import { PhotoLightbox } from './PhotoLightbox';

import { Maximize2 } from 'lucide-react';

type Photo = { id: string; url: string };

export function GallerySection({ photos }: { photos: Photo[] }) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo, i) => (
                    <button
                        key={photo.id}
                        onClick={() => setLightboxIndex(i)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all group"
                    >
                        <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3">
                            <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg border border-white/30 shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                                <Maximize2 className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {lightboxIndex !== null && (
                <PhotoLightbox
                    photos={photos}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </>
    );
}
