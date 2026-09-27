import { useEffect, useState, useRef } from 'react';

export interface ScrollFadeOptions {
  fadeInRange?: number;
  fadeOutRange?: number;
  entryDelay?: number;
}

/**
 * Custom hook that calculates background opacity for a single section as the user scrolls
 * towards it (delayed entry + gradual smooth fade-in) or away from it (smooth fade-out).
 * Automatically scales fade distance proportionally when sections are resized.
 */
export function useScrollFadeBackground(options?: ScrollFadeOptions) {
  const sectionRef = useRef<HTMLElement>(null);
  const [opacity, setOpacity] = useState<number>(1);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let ticking = false;

    const updateOpacity = () => {
      try {
        const rect = el.getBoundingClientRect();
        const vh = Math.max(1, typeof window !== 'undefined' ? window.innerHeight || 800 : 800);

        // Delayed entry threshold: wait until the section enters into view before starting to fade in
        const entryDelay = options?.entryDelay ?? Math.min(130, vh * 0.16);

        // Extended gradual fade-in distance so the appearance is smooth and deliberate
        const fadeInRange = Math.max(1, options?.fadeInRange ?? Math.min(520, vh * 0.62));

        // Raw fade in: starts only after section has penetrated past entryDelay
        const rawFadeIn = (vh - entryDelay - (rect.top ?? 0)) / fadeInRange;
        const fadeInProgress = Number.isFinite(rawFadeIn) ? Math.max(0, Math.min(1, rawFadeIn)) : 1;

        // Gradual fade out calibrated proportionally to the section height
        const autoFadeOutRange = Math.max(1, Math.min(Math.max(380, ((rect.height || 400) * 0.55)), vh * 0.72));
        const fadeOutRange = Math.max(1, options?.fadeOutRange ?? autoFadeOutRange);
        const rawFadeOut = (rect.bottom ?? 0) / fadeOutRange;
        const fadeOutProgress = Number.isFinite(rawFadeOut) ? Math.max(0, Math.min(1, rawFadeOut)) : 1;

        // Smoothstep cubic easing (3t^2 - 2t^3) for a natural, non-linear transition
        const easedIn = fadeInProgress * fadeInProgress * (3 - 2 * fadeInProgress);
        const easedOut = fadeOutProgress * fadeOutProgress * (3 - 2 * fadeOutProgress);

        const calculated = Math.min(easedIn, easedOut);
        const safeVal = Number.isFinite(calculated) ? Math.max(0, Math.min(1, calculated)) : 1;
        setOpacity(safeVal);
      } catch {
        setOpacity(1);
      } finally {
        ticking = false;
      }
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateOpacity);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateOpacity();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return { sectionRef, opacity };
}

/**
 * Custom hook that treats multiple adjacent sections as ONE unified block
 * in terms of scroll animation (fading in when scrolling towards the first section,
 * remaining solid across all inner sections, and fading out only when scrolling past the last section).
 */
export function useScrollFadeGroup(sectionIds: string[]) {
  const [opacity, setOpacity] = useState<number>(1);

  useEffect(() => {
    if (!sectionIds.length) return;

    let ticking = false;

    const updateOpacity = () => {
      try {
        const elStart = document.getElementById(sectionIds[0]);
        const elEnd = document.getElementById(sectionIds[sectionIds.length - 1]);
        if (!elStart || !elEnd) return;

        const rectStart = elStart.getBoundingClientRect();
        const rectEnd = elEnd.getBoundingClientRect();
        const vh = Math.max(1, typeof window !== 'undefined' ? window.innerHeight || 800 : 800);

        // Group top from the start element, group bottom from the end element
        const groupTop = rectStart.top ?? 0;
        const groupBottom = rectEnd.bottom ?? 0;

        // Delayed entry threshold: wait until the start section enters ~130px into view before starting to fade in
        const entryDelay = Math.min(130, vh * 0.16);

        // Extended gradual fade-in distance
        const fadeInRange = Math.max(1, Math.min(520, vh * 0.62));

        const rawFadeIn = (vh - entryDelay - groupTop) / fadeInRange;
        const fadeInProgress = Number.isFinite(rawFadeIn) ? Math.max(0, Math.min(1, rawFadeIn)) : 1;

        // Gradual fade out as the bottom leaves the top of the viewport
        const fadeOutRange = Math.max(1, Math.min(380, vh * 0.45));
        const rawFadeOut = groupBottom / fadeOutRange;
        const fadeOutProgress = Number.isFinite(rawFadeOut) ? Math.max(0, Math.min(1, rawFadeOut)) : 1;

        // Smoothstep cubic easing (3t^2 - 2t^3)
        const easedIn = fadeInProgress * fadeInProgress * (3 - 2 * fadeInProgress);
        const easedOut = fadeOutProgress * fadeOutProgress * (3 - 2 * fadeOutProgress);

        const calculated = Math.min(easedIn, easedOut);
        const safeVal = Number.isFinite(calculated) ? Math.max(0, Math.min(1, calculated)) : 1;
        setOpacity(safeVal);
      } catch {
        setOpacity(1);
      } finally {
        ticking = false;
      }
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateOpacity);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateOpacity();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sectionIds.join(',')]);

  return opacity;
}
