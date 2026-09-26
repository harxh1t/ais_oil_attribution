import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { scrollToSection } from '../../utils/scrollTo';
import { JourneyStepper } from './JourneyStepper';
import { Button } from '../ui';
import { Menu, X, ArrowRight } from 'lucide-react';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'approach', label: 'Our Approach' },
  { id: 'case', label: 'Example Case' },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadExample } = useCase();
  const isHomePage = location.pathname === '/';
  const isWorkspace = location.pathname === '/workspace';

  const { activeId, scrollProgress } = useScrollSpy(SECTION_IDS, 120);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartInvestigation = () => {
    loadExample();
    navigate('/investigate');
    setMobileMenuOpen(false);
  };

  const handleNavClick = (sectionId: string) => {
    if (!isHomePage) {
      navigate('/');
      setTimeout(() => scrollToSection(sectionId), 100);
    } else {
      scrollToSection(sectionId);
    }
    setMobileMenuOpen(false);
  };

  // Header container width rules:
  // - Page 01: max-w-7xl mx-auto px-4
  // - Pages 02 & 03: max-w-[var(--page-max)] mx-auto px-[var(--page-pad)]
  // - Page 04: w-full px-4 (full-bleed 16px)
  const containerClasses = isHomePage
    ? 'max-w-7xl mx-auto px-4'
    : isWorkspace
    ? 'w-full px-4'
    : 'max-w-[var(--page-max)] mx-auto px-[var(--page-pad)]';

  return (
    <>
      {/* Skip to Content Accessibility Link */}
      <a
        href="#overview"
        onClick={(e) => {
          e.preventDefault();
          scrollToSection('overview');
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 z-50 bg-[var(--violet-600)] text-white px-3 py-1.5 rounded-[4px] text-xs font-mono"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 w-full h-[64px] bg-[var(--bg-void)]/90 backdrop-blur-xl border-b border-[var(--border-default)] select-none">
        <div className={`relative h-full flex items-center justify-between gap-4 ${containerClasses}`}>
          {/* Left: Logo (always left-aligned with page content) */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0 z-10"
          >
            <div className="w-8 h-8 rounded-[4px] bg-gradient-to-br from-[var(--violet-500)] to-[var(--violet-700)] flex items-center justify-center shadow-[0_0_12px_var(--glow-violet)] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M2 12h20M7 7l5 5-5 5M12 7l5 5-5 5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-lg text-[var(--text-1)] tracking-wider">
                WAKE
              </span>
            </div>
          </div>

          {/* Center: Truly centered stepper on pages 02-04 or anchor bar on home */}
          {isHomePage ? (
            <nav className="hidden min-[900px]:flex items-center gap-6 whitespace-nowrap">
              {SECTIONS.map((sec) => {
                const isActive = activeId === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => handleNavClick(sec.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`font-sans text-sm font-medium transition-colors relative py-1 cursor-pointer ${
                      isActive ? 'text-[var(--text-1)]' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    {sec.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--violet-500)] rounded-full transition-all duration-300" />
                    )}
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto flex items-center justify-center">
              <JourneyStepper />
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3 shrink-0 z-10">
            {isHomePage ? (
              <>
                <div className="hidden min-[900px]:block">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartInvestigation}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Start Investigation →
                  </Button>
                </div>
                {/* Mobile Hamburger Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="min-[900px]:hidden p-2 rounded-[4px] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--border-default)] cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--text-3)] border border-[var(--border-default)] bg-[var(--surface-1)] px-2.5 py-1 rounded-[4px]">
                  WAKE-2024-0806-MLB
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2px Scroll-Progress Bar along bottom edge (Home page only) */}
        {isHomePage && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-[var(--violet-600)] via-[var(--violet-400)] to-[var(--violet-300)] transition-all duration-100 ease-out"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* Mobile Drawer Navigation (Home page) */}
      {isHomePage && mobileMenuOpen && (
        <div
          ref={mobileDrawerRef}
          className="fixed inset-x-0 top-[64px] z-30 bg-[var(--surface-1)] border-b border-[var(--border-default)] p-6 shadow-2xl flex flex-col gap-4 min-[900px]:hidden"
        >
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => handleNavClick(sec.id)}
              className="text-left font-sans text-base font-medium text-[var(--text-2)] hover:text-white py-2 border-b border-[var(--border-subtle)]"
            >
              {sec.label}
            </button>
          ))}
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleStartInvestigation}
              className="w-full justify-center"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Start Investigation
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
