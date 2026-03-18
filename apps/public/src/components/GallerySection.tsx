'use client';
import { useState } from 'react';
import { PhotoLightbox } from './PhotoLightbox';

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
                        className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/10 transition-all group"
                    >
                        <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
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
