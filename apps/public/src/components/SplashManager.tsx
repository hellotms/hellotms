'use client';
import { useState, useEffect } from 'react';
import { SplashScreen } from './SplashScreen';

const STORAGE_KEY = 'tms_public_splash_timestamp';
const EXPIRE_TIME = 60 * 60 * 1000; // 1 hour in ms

export function SplashManager({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (!lastShown) {
      setShowSplash(true);
    } else {
      const now = Date.now();
      const timeDiff = now - parseInt(lastShown, 10);
      if (timeDiff > EXPIRE_TIME) {
        setShowSplash(true);
      }
    }
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
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
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
