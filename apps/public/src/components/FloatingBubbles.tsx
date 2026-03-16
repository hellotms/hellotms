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
      {[...Array(20)].map((_, i) => {
        const size = Math.random() * 70 + 30; // 30px to 100px
        const left = Math.random() * 100; // 0% to 100%
        const delay = Math.random() * 15; // 0s to 15s
        const duration = Math.random() * 10 + 12; // 12s to 22s
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
            } as any}
          />
        );
      })}
    </div>
  );
};
