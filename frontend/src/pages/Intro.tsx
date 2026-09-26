import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { HeroOcean } from '../components/hero/HeroOcean';
import { HeroOverlay } from '../components/hero/HeroOverlay';
import { BuiltOnMarquee } from '../components/shared/BuiltOnMarquee';
import { PipelineSection } from '../components/intro/PipelineSection';
import { ChallengesSection } from '../components/intro/ChallengesSection';
import { ApproachSection } from '../components/intro/ApproachSection';
import { CaseSection } from '../components/intro/CaseSection';
import { FirstVisitIntro } from '../components/shared/FirstVisitIntro';
import { scrollToSection } from '../utils/scrollTo';
import { Button } from '../components/ui';
import { ChevronDown } from 'lucide-react';

export const Intro: React.FC = () => {
  const navigate = useNavigate();
  const { loadExample } = useCase();

  const handleStartInvestigation = () => {
    loadExample();
    navigate('/investigate');
  };

  const handleSeeHowItWorks = () => {
    scrollToSection('pipeline');
  };

  return (
    <div className="w-full flex flex-col bg-[var(--bg-void)] min-h-screen">
      {/* 1.2s First Visit Intro (skippable by click or Escape, stored in sessionStorage) */}
      <FirstVisitIntro />

      {/* 2. HERO SECTION (#overview) */}
      <section
        id="overview"
        className="relative w-full min-h-[calc(100vh-var(--header-h))] max-h-[920px] flex items-center overflow-hidden bg-[var(--bg-void)]"
      >
        {/* Layer 1: WebGL Fragment Shader "SAR sea" */}
        <HeroOcean />

        {/* Layer 2: 16-second Analyst Story Overlay */}
        <HeroOverlay />

        {/* Soft dark gradient scrim behind left copy (>= 4.5:1 contrast, transparent at ~65% width) */}
        <div className="absolute inset-y-0 left-0 w-full md:w-[65%] bg-gradient-to-r from-black via-black/90 to-transparent pointer-events-none z-[5]" />

        {/* Content Container (z-10, left copy max-w-2xl / 68ch) */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 w-full py-16 lg:py-24">
          <div className="max-w-2xl space-y-6">
            {/* Eyebrow chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] font-mono text-xs text-[var(--violet-400)] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-500)] animate-pulse" />
              <span className="uppercase tracking-[0.08em] font-medium">MARITIME OIL-SPILL FORENSICS</span>
            </div>

            {/* H1 Heading */}
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--text-1)] leading-[1.08] tracking-tight">
              When an oil spill appears at sea, the real question is not only where it is, but{' '}
              <span className="bg-gradient-to-r from-[var(--violet-300)] via-[var(--violet-400)] to-[var(--violet-600)] bg-clip-text text-transparent">
                where it came from.
              </span>
            </h1>

            {/* Sub-copy: 18px, text-2 (#B9B9C9), contrast >= 4.5:1, max 68ch */}
            <p className="font-sans text-[18px] text-[var(--text-2)] leading-relaxed max-w-[64ch]">
              WAKE reconstructs offshore discharges by combining capillary-wave dampening in Sentinel-1 C-band SAR with Lagrangian particle advection (OpenDrift) and multi-temporal AIS kinematics, ranking the vessels that could have caused them with auditable evidence.
            </p>

            {/* Action Buttons: rectangular 44px JetBrains Mono uppercase with trailing arrow */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="md"
                withArrow
                onClick={handleStartInvestigation}
              >
                Start Investigation
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleSeeHowItWorks}
              >
                See how it works
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom-left: Evidence Line Style Legend */}
        <div className="absolute bottom-5 left-4 z-20 hidden sm:flex items-center gap-4 px-3 py-1.5 rounded-[4px] bg-[var(--surface-1)]/90 border border-[var(--border-default)] backdrop-blur-md text-xs font-sans text-[var(--text-2)] whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-[var(--observed)] rounded-full inline-block" />
            <span className="font-medium text-[var(--text-1)]">Observed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 border-t-2 border-dashed border-[var(--derived)] inline-block" />
            <span className="font-medium text-[var(--text-1)]">Derived</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 border-t-2 border-dotted border-[var(--inferred)] inline-block" />
            <span className="font-medium text-[var(--text-1)]">Inferred</span>
          </div>
        </div>

        {/* Scroll indicator prompt */}
        <button
          onClick={handleSeeHowItWorks}
          className="absolute bottom-5 right-6 z-20 hidden md:flex items-center gap-1.5 text-xs font-mono text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer uppercase tracking-wider"
        >
          <span>Explore Pipeline</span>
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </button>
      </section>

      {/* 3. BUILT-ON INFINITE MARQUEE */}
      <BuiltOnMarquee />

      {/* 4. WORKFLOW PIPELINE (#pipeline) */}
      <PipelineSection />

      {/* 5. CHALLENGES / THE PRACTICAL PROBLEM (#challenges) */}
      <ChallengesSection />

      {/* 6. OUR APPROACH (#approach) */}
      <ApproachSection />

      {/* 7. EXAMPLE CASE (#case) */}
      <CaseSection />
    </div>
  );
};
