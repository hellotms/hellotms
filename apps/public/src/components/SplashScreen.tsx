'use client';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 0: Black
    // 1: "Innovate" drifts in
    // 2: "Engage" drifts in
    // 3: "Grow" drifts in
    // 4: Golden Rectangle enters & masks center
    // 5: Rectangle leaves & reveals name
    // 6: Final Pause
    // 7: Fade Out

    const timers = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 800),
      setTimeout(() => setStep(3), 1200),
      setTimeout(() => setStep(4), 2500),
      setTimeout(() => setStep(5), 4000),
      setTimeout(() => setStep(6), 6500),
      setTimeout(() => setStep(7), 7500),
      setTimeout(() => onComplete(), 8500)
    ];

    return () => timers.forEach(t => clearTimeout(t));
  }, [onComplete]);

  return (
    <div className={cn(
      "fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-1000 overflow-hidden",
      step === 7 ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      <div className="relative flex flex-col items-center justify-center w-full h-full px-4">

        {/* Step 1-3: Motto side-by-side sequential drift reveal */}
        <div className={cn(
          "flex items-center justify-center gap-3 md:gap-6 transition-opacity duration-500 font-outfit flex-wrap",
          step >= 1 && step < 4 ? "opacity-100" : "opacity-0 invisible"
        )}>
          <span className={cn(
            "text-white text-base md:text-lg font-bold tracking-wider transition-all duration-500 ease-out",
            step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>Innovate</span>
          <span className={cn(
            "text-white/50 text-xs md:text-sm transition-all duration-500",
            step >= 2 ? "opacity-100" : "opacity-0 invisible"
          )}>●</span>
          <span className={cn(
            "text-white text-base md:text-lg font-bold tracking-wider transition-all duration-500 ease-out",
            step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>Engage</span>
          <span className={cn(
            "text-white/50 text-xs md:text-sm transition-all duration-500",
            step >= 3 ? "opacity-100" : "opacity-0 invisible"
          )}>●</span>
          <span className={cn(
            "text-white text-base md:text-lg font-bold tracking-wider transition-all duration-500 ease-out",
            step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>Grow</span>
        </div>

        {/* Step 4-6: Company Name with Gold "Unmasking" Reveal */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="relative overflow-hidden px-5 md:px-7 py-[7px] md:py-[9px]">
            {/* The Company Name (Revealed underneath) */}
            <h1 className={cn(
              "text-[1.125rem] md:text-[1.35rem] font-bold text-white tracking-wide text-center transition-opacity duration-300",
              step >= 5 ? "opacity-100" : "opacity-0"
            )}>
              The Marketing Solution
            </h1>

            {/* The Masking Rectangle (The "Reveal Box") */}
            <div
              className={cn(
                "absolute top-0 bottom-0 bg-[#d6802b] z-20 transition-all cubic-bezier(0.76, 0, 0.24, 1)",
                step < 4 && "-left-full w-full",
                step === 4 && "left-0 w-full duration-[700ms]",
                step >= 5 && "left-full w-full duration-[800ms]"
              )}
            />
          </div>
        </div>

      </div>
    </div>
  );
}









