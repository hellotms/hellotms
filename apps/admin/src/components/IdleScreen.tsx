import { useState, useEffect } from 'react';
import { LogOut, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdleScreenProps {
  heroSlider: any[];
  onContinue: () => void;
  onSignOut: () => void;
}

export default function IdleScreen({ heroSlider, onContinue, onSignOut }: IdleScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!heroSlider || heroSlider.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlider.length);
    }, 5000); // 5 seconds per slide
    return () => clearInterval(interval);
  }, [heroSlider]);

  const activeSlide = heroSlider?.[currentSlide];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Background Images */}
      {heroSlider && heroSlider.length > 0 ? (
        heroSlider.map((slide, index) => (
          <div
            key={slide.id || index}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            <img
              src={slide.image_url}
              alt={slide.title || "Slider background"}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/80 backdrop-blur-sm" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        {activeSlide ? (
          <div className="max-w-4xl animate-in slide-in-from-bottom-4 fade-in duration-700">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-xl font-lato">
              {activeSlide.title}
            </h1>
            {activeSlide.subtitle && (
              <p className="text-lg md:text-2xl text-white/80 font-medium max-w-2xl mx-auto drop-shadow-md">
                {activeSlide.subtitle}
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-2xl animate-in slide-in-from-bottom-4 fade-in duration-700">
             <h1 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-xl">
               Session Locked
            </h1>
            <p className="text-lg text-white/70">
              Your session has been locked due to inactivity to protect your data.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="relative z-10 pb-16 pt-6 px-6 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300 fill-mode-backwards">
        <button
          onClick={onContinue}
          className="flex items-center justify-center gap-2 bg-[#d6802b]/20 text-white hover:bg-[#d6802b]/40 backdrop-blur-md border border-[#d6802b]/50 px-8 py-3.5 rounded-full font-bold shadow-xl shadow-[#d6802b]/20 transition-all hover:scale-105 active:scale-95 min-w-[220px]"
        >
          <Play className="h-4 w-4" />
          Continue Session
        </button>
        <button
          onClick={onSignOut}
          className="flex items-center justify-center gap-2 bg-red-500/20 text-red-50 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 px-6 py-3.5 rounded-full font-semibold shadow-lg shadow-red-500/10 transition-all hover:scale-105 active:scale-95 min-w-[150px]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
