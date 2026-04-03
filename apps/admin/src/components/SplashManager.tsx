import { useState, useEffect } from 'react';
import { SplashScreen } from './SplashScreen';
import { invoke } from '@tauri-apps/api/core';

const STORAGE_KEY = 'tms_admin_splash_timestamp';
const EXPIRE_TIME = 10 * 60 * 1000; // 10 minutes in ms

export function SplashManager({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(() => {
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (!lastShown) return true;
    
    const now = Date.now();
    const timeDiff = now - parseInt(lastShown, 10);
    return timeDiff > EXPIRE_TIME;
  });

  useEffect(() => {
    // Remove the startup black background so Tailwind themes can take over
    document.body.style.backgroundColor = '';

    // If running in Tauri PC App, show the window smoothly only after React mounts it
    if ((window as any).__TAURI_INTERNALS__) {
      setTimeout(() => {
        invoke('show_main_window').catch(console.error);
      }, 300);
    }

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

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      {children}
    </>
  );
}
