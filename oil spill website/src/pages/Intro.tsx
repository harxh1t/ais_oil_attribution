import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { PipelineSection } from '../components/intro/PipelineSection';
import { ChallengesSection } from '../components/intro/ChallengesSection';
import { ApproachSection } from '../components/intro/ApproachSection';
import { CaseSection } from '../components/intro/CaseSection';
import { NewsShuffleCards } from '../components/intro/NewsShuffleCards';
import { Footer } from '../components/shared/Footer';
import { scrollToSection } from '../utils/scrollTo';
import { Button } from '../components/ui';
import { useScrollFadeBackground, useScrollFadeGroup } from '../hooks/useScrollFadeBackground';

export const Intro: React.FC = () => {
  const navigate = useNavigate();
  const { loadExample } = useCase();
  const { sectionRef: overviewRef, opacity: overviewOpacity } = useScrollFadeBackground({
    fadeOutRange: 620,
    fadeInRange: 520,
    entryDelay: 120,
  });
  const approachCaseGroupOpacity = useScrollFadeGroup(['approach', 'example']);

  const handleStartInvestigation = () => {
    loadExample();
    navigate('/investigate');
  };

  const handleSeeHowItWorks = () => {
    scrollToSection('pipeline');
  };

  return (
    <div className="w-full flex flex-col bg-transparent min-h-screen">
      {/* HERO SECTION (#overview) - White background that appears/disappears as you scroll */}
      <section
        id="overview"
        ref={overviewRef}
        className="relative w-full bg-transparent pt-16 sm:pt-20 pb-16 sm:pb-20 min-h-[1050px] sm:min-h-[1120px] overflow-hidden shadow-xs flex flex-col justify-between"
      >
        {/* Subtle Maritime & Bathymetric Chart Watermark on fading white background */}
        <div
          style={{ opacity: Number.isFinite(overviewOpacity) ? overviewOpacity : 1 }}
          className="absolute inset-0 pointer-events-none select-none overflow-hidden bg-slate-100 border-b border-[var(--border-default)] transition-opacity duration-500 ease-out"
          aria-hidden="true"
        >
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 950"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <defs>
              {/* Subtle Nautical Grid Pattern */}
              <pattern id="overview-marine-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E2E8F0" strokeWidth="0.75" strokeDasharray="2 4" />
                <circle cx="0" cy="0" r="0.8" fill="#CBD5E1" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#overview-marine-grid)" opacity="0.65" />

            {/* Bathymetric Depth Contour Lines (Isobars / Ocean Wave Curves) */}
            <path
              d="M -100,100 C 260,70 520,160 840,110 C 1120,70 1300,140 1560,90"
              stroke="#94A3B8"
              strokeWidth="1.2"
              strokeDasharray="6 6"
              opacity="0.28"
            />
            <path
              d="M -60,200 C 320,150 560,250 920,180 C 1180,130 1370,220 1580,170"
              stroke="#94A3B8"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.24"
            />
            <path
              d="M -20,290 C 370,240 640,320 1000,260 C 1240,210 1420,290 1620,250"
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="8 6"
              opacity="0.2"
            />
            <path
              d="M -50,410 C 310,360 680,450 1040,380 C 1280,330 1440,420 1650,370"
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="6 4"
              opacity="0.18"
            />
            <path
              d="M -80,530 C 280,480 620,570 980,500 C 1220,450 1410,540 1640,490"
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="8 6"
              opacity="0.15"
            />
            <path
              d="M -40,650 C 330,590 710,690 1070,620 C 1310,570 1470,660 1680,610"
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="6 4"
              opacity="0.13"
            />
            <path
              d="M -70,770 C 290,710 650,810 1010,740 C 1250,690 1430,780 1660,730"
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="8 6"
              opacity="0.11"
            />

            {/* Bathymetric Depth Labels */}
            <text x="840" y="104" fill="#94A3B8" opacity="0.4" fontSize="9" fontFamily="JetBrains Mono, monospace">-200m isobath</text>
            <text x="920" y="174" fill="#94A3B8" opacity="0.4" fontSize="9" fontFamily="JetBrains Mono, monospace">-500m isobath</text>
            <text x="1000" y="254" fill="#94A3B8" opacity="0.4" fontSize="9" fontFamily="JetBrains Mono, monospace">-1000m (offshore basin)</text>
            <text x="1040" y="374" fill="#94A3B8" opacity="0.35" fontSize="9" fontFamily="JetBrains Mono, monospace">-1500m deep trench</text>
            <text x="980" y="494" fill="#94A3B8" opacity="0.3" fontSize="9" fontFamily="JetBrains Mono, monospace">-2500m abyssal plain</text>
            <text x="1070" y="614" fill="#94A3B8" opacity="0.25" fontSize="9" fontFamily="JetBrains Mono, monospace">-3500m oceanic trench</text>
            <text x="1010" y="734" fill="#94A3B8" opacity="0.22" fontSize="9" fontFamily="JetBrains Mono, monospace">-4500m hadal zone</text>

            {/* Nautical Compass Rose & Radar Range Rings on right side */}
            <g transform="translate(1190, 360)" opacity="0.32">
              <circle r="135" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
              <circle r="90" stroke="#94A3B8" strokeWidth="0.8" />
              <circle r="45" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="2 4" />
              <circle r="3.5" fill="#94A3B8" />

              {/* Cardinal axis crosshairs */}
              <line x1="-150" y1="0" x2="150" y2="0" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="-150" x2="0" y2="150" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />

              {/* Cardinal labels */}
              <text x="0" y="-140" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">N 000°</text>
              <text x="144" y="3.5" textAnchor="start" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">E 090°</text>
              <text x="0" y="148" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">S 180°</text>
              <text x="-144" y="3.5" textAnchor="end" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">W 270°</text>

              {/* Diagonal ticks */}
              <line x1="-65" y1="-65" x2="-58" y2="-58" stroke="#94A3B8" strokeWidth="1" />
              <line x1="65" y1="-65" x2="58" y2="-58" stroke="#94A3B8" strokeWidth="1" />
              <line x1="-65" y1="65" x2="-58" y2="58" stroke="#94A3B8" strokeWidth="1" />
              <line x1="65" y1="65" x2="58" y2="58" stroke="#94A3B8" strokeWidth="1" />
            </g>

            {/* Vessel Track & Ship Wireframe Vector */}
            <g transform="translate(1040, 180)" opacity="0.35">
              {/* AIS Vessel Trajectory vector */}
              <path
                d="M -180,150 L -60,85 L 80,35 L 210,5"
                stroke="#64748B"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              {/* Waypoints */}
              <circle cx="-60" cy="85" r="3" stroke="#64748B" strokeWidth="1.2" fill="#FFFFFF" />
              <text x="-52" y="98" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">15:20Z</text>

              <circle cx="80" cy="35" r="3" stroke="#64748B" strokeWidth="1.2" fill="#FFFFFF" />
              <text x="88" y="48" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">16:40Z (Release)</text>

              {/* Stylized Vessel Hull Icon (Cargo ship profile) */}
              <g transform="translate(80, 35) rotate(-22)">
                {/* Hull profile */}
                <path
                  d="M -22,0 L -18,6 L 16,6 L 24,0 L 16,-4 L -18,-4 Z"
                  stroke="#475569"
                  strokeWidth="1.2"
                  fill="#F1F5F9"
                />
                {/* Superstructure / Wheelhouse */}
                <rect x="-12" y="-3" width="8" height="6" stroke="#475569" strokeWidth="1" fill="#E2E8F0" />
                {/* Heading line */}
                <line x1="24" y1="0" x2="40" y2="0" stroke="#475569" strokeWidth="1.2" strokeDasharray="2 2" />
                <polygon points="40,0 34,-2.5 34,2.5" fill="#475569" />
              </g>

              {/* Vessel Telemetry Annotation */}
              <text x="135" y="20" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="500">
                AIS TRACK • COG 248° • SOG 12.4 kt
              </text>
            </g>

            {/* Spatial Navigation Coordinates along bottom */}
            <g transform="translate(48, 920)" opacity="0.35">
              <text fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                CHART DATUM: WGS-84 • OFFSHORE MARITIME CORRIDOR • LAT 34° 02' 14" N · LON 118° 42' 55" W
              </text>
            </g>
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 w-full flex flex-col items-start">
          {/* Top: Clean typography and action buttons */}
          <div className="space-y-6 max-w-3xl">
            {/* H1 Heading */}
            <h1 className="font-sans font-bold text-3xl sm:text-4xl lg:text-[46px] text-[var(--text-1)] leading-[1.15] tracking-tight">
              When an oil spill appears at sea, the real question is not only where it is, but{' '}
              <span className="text-[var(--primary-600)]">where it came from.</span>
            </h1>

            {/* Paragraph */}
            <p className="font-sans text-[17px] text-[var(--text-2)] leading-relaxed max-w-[64ch]">
              WAKE reconstructs offshore discharges by combining Sentinel-1 SAR imagery, AIS vessel tracks and hydrodynamic drift modelling, to produce a ranked, auditable shortlist of vessels that could be responsible.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="md"
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

          {/* Shuffle Cards below the Start Investigation button, centered in terms of width */}
          <div className="mt-12 w-full flex justify-center">
            <NewsShuffleCards />
          </div>
        </div>
      </section>

      {/* WORKFLOW PIPELINE (#pipeline) */}
      <PipelineSection />

      {/* CHALLENGES / THE PRACTICAL PROBLEM (#challenges) */}
      <ChallengesSection />

      {/* OUR APPROACH (#approach) */}
      <ApproachSection bgOpacity={approachCaseGroupOpacity} />

      {/* EXAMPLE CASE (#case) */}
      <CaseSection bgOpacity={approachCaseGroupOpacity} />

      {/* COMPACT FOOTER ROW */}
      <Footer />
    </div>
  );
};
