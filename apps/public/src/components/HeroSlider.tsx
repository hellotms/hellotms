'use client';
import { useState, useEffect } from 'react';
import { HeroSlide } from '@hellotms/shared';
import { cn } from '@/lib/utils';

interface HeroSliderProps {
  slides: HeroSlide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (!slides || slides.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-background to-amber-900/10 -z-10" />
    );
  }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-in-out",
            index === current ? "opacity-100" : "opacity-0"
          )}
        >
          <img
            src={slide.image_url}
            alt={slide.title || "Hero Slide"}
            className="w-full h-full object-cover"
          />
          {/* Overlay for better readability */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Per-slide text overlay */}
          {(slide.title || slide.subtitle) && (
            <div className="absolute bottom-20 right-10 md:right-20 max-w-xl text-right z-10 animate-fade-up">
              {slide.title && (
                <h2 className="text-2xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">
                  {slide.title}
                </h2>
              )}
              {slide.subtitle && (
                <p className="text-sm md:text-lg text-white/80 font-medium drop-shadow-md">
                  {slide.subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Visual Slant/Slash Overlay */}
      <div className="absolute inset-0 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none" 
           style={{ clipPath: 'polygon(100% 0, 100% 100%, 20% 100%, 50% 0)' }} />
      
      {/* Slider Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === current ? "bg-primary w-8" : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
