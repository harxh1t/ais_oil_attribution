/**
 * Smooth in-page navigation helper for HashRouter.
 * Never uses <a href="#..."> which mutates the hash route.
 * Calls scrollIntoView respecting prefers-reduced-motion.
 */
export function scrollToSection(sectionId: string): void {
  const el = document.getElementById(sectionId);
  if (!el) return;

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.scrollIntoView({
    behavior: prefersReduced ? 'auto' : 'smooth',
    block: 'start',
  });
}
