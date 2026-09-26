import { useEffect, useState } from 'react';

export function useScrollSpy(sectionIds: string[], offset = 100): {
  activeId: string;
  scrollProgress: number;
} {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] || '');
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate overall scroll progress (0 to 100%)
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Determine active section based on scroll position
      const scrollPos = window.scrollY + offset;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveId(id);
            return;
          }
        }
      }
      setActiveId(sectionIds[0]);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sectionIds, offset]);

  return { activeId, scrollProgress };
}
