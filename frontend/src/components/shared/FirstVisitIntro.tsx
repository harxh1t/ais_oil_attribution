import React, { useState, useEffect } from 'react';

export const FirstVisitIntro: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Check sessionStorage
    try {
      const seen = sessionStorage.getItem('wake_intro_seen');
      if (seen) return;
      sessionStorage.setItem('wake_intro_seen', 'true');
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 1200);

      return () => clearTimeout(timer);
    } catch {
      // Ignore storage errors in sandboxed iframes
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center cursor-pointer select-none transition-opacity duration-300"
    >
      <div className="relative flex flex-col items-center gap-4">
        {/* Wake-ripple animated SVG */}
        <div className="w-16 h-16 relative flex items-center justify-center">
          <svg className="w-16 h-16 text-[#6A4DFF]" viewBox="0 0 48 48" fill="none">
            {/* Pulsing concentric rings (wake ripples) */}
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="animate-ping opacity-40 origin-center"
              style={{ animationDuration: '1.2s' }}
            />
            <circle
              cx="24"
              cy="24"
              r="12"
              stroke="#8E7BFF"
              strokeWidth="2"
              className="opacity-70"
            />
            {/* Center chevron mark */}
            <path
              d="M16 24h16M22 18l6 6-6 6"
              stroke="#F5F5FA"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="font-display font-black text-2xl tracking-[0.2em] text-[#F5F5FA] animate-pulse">
          WAKE
        </div>

        <div className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--violet-300)]">
          Forensic Attribution Engine
        </div>
      </div>
    </div>
  );
};
