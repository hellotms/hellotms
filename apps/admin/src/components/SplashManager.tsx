import { useState, useEffect } from 'react';
import { SplashScreen } from './SplashScreen';

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
    // If running in Tauri PC App, show the window smoothly only after React mounts it
    if ((window as any).__TAURI_INTERNALS__) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        setTimeout(() => {
          getCurrentWindow().show().catch(console.error);
        }, 150);
      }).catch(console.error);
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
