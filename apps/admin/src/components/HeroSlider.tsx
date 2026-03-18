import { useState, useEffect } from 'react';
import { HeroSlide } from '@hellotms/shared';
import { cn } from '@/lib/utils';

interface HeroSliderProps {
  slides: HeroSlide[];
  onSlideChange?: (index: number) => void;
}

export function HeroSlider({ slides, onSlideChange }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (current + 1) % slides.length;
      setCurrent(nextIndex);
      onSlideChange?.(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, current, onSlideChange]);

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
        </div>
      ))}
      
      
      {/* Slider Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrent(i);
                onSlideChange?.(i);
              }}
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
