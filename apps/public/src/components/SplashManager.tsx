'use client';
import { useState, useEffect } from 'react';
import { SplashScreen } from './SplashScreen';

let hasShownGlobal = false;

export function SplashManager({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(!hasShownGlobal);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showSplash) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => { document.body.style.overflow = ''; };
  }, [showSplash]);

  const handleComplete = () => {
    setShowSplash(false);
    hasShownGlobal = true;
  };

  // Wait for mounting to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      <div className={showSplash ? "hidden" : "block"}>
        {children}
      </div>
    </>
  );
}
