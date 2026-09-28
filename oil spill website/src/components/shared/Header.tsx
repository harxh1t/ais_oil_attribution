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
  { id: 'example', label: 'Incident Case' },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadExample } = useCase();
  const isHomePage = location.pathname === '/';
  const isWorkspace = location.pathname === '/workspace';

  const { activeId } = useScrollSpy(SECTION_IDS, 120);
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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 z-50 bg-[var(--primary-600)] text-white px-3 py-1.5 rounded-[4px] text-xs font-mono"
      >
        Skip to main content
      </a>

      {/* Sticky white header bar on all pages, 64px, 1px bottom border */}
      <header className="sticky top-0 z-40 w-full h-[64px] bg-white/95 backdrop-blur-md border-b border-[var(--border-default)] select-none shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className={`relative h-full flex items-center justify-between gap-4 ${containerClasses}`}>
          {/* Left: Simple wordmark */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 z-10"
          >
            <div className="w-7 h-7 rounded-[4px] bg-[var(--ocean-1)] flex items-center justify-center text-white shadow-xs">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h20M7 7l5 5-5 5M12 7l5 5-5 5" />
              </svg>
            </div>
            <span className="font-heading font-bold text-[18px] text-[var(--text-1)] tracking-tight">
              WAKE
            </span>
          </div>

          {/* Center: Stepper on pages 02-04 or nav links on home */}
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
                      isActive
                        ? 'text-[var(--text-1)] font-bold'
                        : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    {sec.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--ocean-2)] rounded-full transition-all duration-150" />
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
                    className="bg-[var(--ocean-1)] text-white hover:bg-[var(--ocean-2)]"
                  >
                    Start Investigation
                  </Button>
                </div>
                {/* Mobile Hamburger Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="min-[900px]:hidden p-2 rounded-[4px] bg-white text-[var(--text-1)] hover:bg-[var(--surface-1)] border border-[var(--border-default)] cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Home page) */}
      {isHomePage && mobileMenuOpen && (
        <div
          ref={mobileDrawerRef}
          className="fixed inset-x-0 top-[64px] z-30 bg-white border-b border-[var(--border-default)] p-6 shadow-lg flex flex-col gap-3 min-[900px]:hidden text-[var(--text-1)]"
        >
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => handleNavClick(sec.id)}
              className="text-left font-sans text-sm font-medium text-[var(--text-2)] hover:text-[var(--text-1)] py-2 border-b border-[var(--border-subtle)]"
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
