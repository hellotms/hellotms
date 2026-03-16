'use client';
import React, { useEffect, useState } from 'react';
import styles from './Bubbles.module.css';

export const FloatingBubbles = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      {[...Array(18)].map((_, i) => {
        const size = Math.random() * 60 + 20; // 20px to 80px
        const left = Math.random() * 100; // 0% to 100%
        const delay = Math.random() * 10; // 0s to 10s
        const duration = Math.random() * 8 + 10; // 10s to 18s
        const swayDuration = Math.random() * 3 + 3; // 3s to 6s
        const swayDistance = `${Math.random() * 40 + 20}px`; // 20px to 60px
        const colorClass = styles[`color-${(i % 5) + 1}`];
        
        return (
          <div
            key={i}
            className={`${styles.bubble} ${colorClass}`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${left}%`,
              animationDelay: `${delay}s`,
              '--duration': `${duration}s`,
              '--sway-duration': `${swayDuration}s`,
              '--sway-distance': swayDistance,
            } as any}
          >
            <div className={styles.shine} />
          </div>
        );
      })}
    </div>
  );
};
