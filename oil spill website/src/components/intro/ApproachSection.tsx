import React from 'react';
import { ChapterHeader, Card } from '../ui';
import { ConsensusDemo } from './ConsensusDemo';
import { ComparisonTable } from './ComparisonTable';
import { useScrollFadeBackground } from '../../hooks/useScrollFadeBackground';

interface ApproachSectionProps {
  bgOpacity?: number;
}

export const ApproachSection: React.FC<ApproachSectionProps> = ({ bgOpacity }) => {
  const localHook = useScrollFadeBackground();
  const rawOpacity = bgOpacity !== undefined ? bgOpacity : localHook.opacity;
  const opacity = Number.isFinite(rawOpacity) ? rawOpacity : 1;
  const sectionRef = bgOpacity !== undefined ? undefined : localHook.sectionRef;

  return (
    <section
      id="approach"
      ref={sectionRef}
      className="relative py-20 bg-transparent overflow-hidden scroll-mt-16"
    >
      {/* Organic Ocean Swells & Liquid Flow Ribbon Art on fading white background */}
      <div
        style={{ opacity }}
        className="absolute inset-0 pointer-events-none select-none overflow-hidden bg-slate-100 border-t border-[var(--border-subtle)] transition-opacity duration-300 ease-out"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {/* Gentle Expanding Liquid Ripple Rings (Right) */}
          <g transform="translate(1180, 240)" opacity="0.32">
            <ellipse cx="0" cy="0" rx="340" ry="110" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="6 4" />
            <ellipse cx="0" cy="0" rx="270" ry="85" stroke="#E2E8F0" strokeWidth="1.2" />
            <ellipse cx="0" cy="0" rx="200" ry="62" stroke="#CBD5E1" strokeWidth="0.9" strokeDasharray="3 3" />
            <ellipse cx="0" cy="0" rx="130" ry="40" stroke="#E2E8F0" strokeWidth="1.2" />
            <ellipse cx="0" cy="0" rx="60" ry="18" stroke="#94A3B8" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#94A3B8" />
          </g>

          {/* Organic Wave Crest / Eddy Spiral Ribbon (Upper Left) */}
          <g transform="translate(180, 190)" opacity="0.32">
            <path
              d="M -120,-60 C -40,-90 60,-80 120,-30 C 180,20 190,90 140,140 C 90,190 10,180 -40,130 C -80,90 -70,20 -20,-10 C 20,-30 70,-20 90,15"
              stroke="#CBD5E1"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            <path
              d="M -100,-40 C -30,-65 50,-60 100,-20 C 150,20 160,80 120,120 C 80,160 20,150 -20,110 C -50,80 -40,30 0,10"
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
            <ellipse cx="40" cy="50" rx="70" ry="35" stroke="#CBD5E1" strokeWidth="0.9" strokeDasharray="2 3" />
            <circle cx="40" cy="50" r="2" fill="#94A3B8" />
          </g>

          {/* Micro-Droplet & Bubble Dispersions Along Fluid Streamlines */}
          <g opacity="0.35">
            <circle cx="340" cy="110" r="3" stroke="#CBD5E1" strokeWidth="1" fill="#F8FAFC" />
            <circle cx="355" cy="98" r="1.5" fill="#CBD5E1" />
            <circle cx="370" cy="115" r="2" stroke="#94A3B8" strokeWidth="0.8" fill="none" />
            <circle cx="680" cy="210" r="3.5" stroke="#CBD5E1" strokeWidth="1" fill="#F1F5F9" />
            <circle cx="700" cy="225" r="2" fill="#CBD5E1" />
            <circle cx="715" cy="205" r="1.5" fill="#94A3B8" />

            <circle cx="480" cy="460" r="3" stroke="#CBD5E1" strokeWidth="1" fill="#F8FAFC" />
            <circle cx="505" cy="445" r="2" fill="#CBD5E1" />
            <circle cx="520" cy="470" r="1.5" fill="#94A3B8" />
            <circle cx="960" cy="410" r="4" stroke="#CBD5E1" strokeWidth="1" fill="#F1F5F9" />
            <circle cx="985" cy="395" r="2" fill="#CBD5E1" />

            <circle cx="220" cy="740" r="2.5" stroke="#94A3B8" strokeWidth="0.8" fill="none" />
            <circle cx="235" cy="755" r="1.5" fill="#CBD5E1" />
            <circle cx="780" cy="760" r="3" stroke="#CBD5E1" strokeWidth="1" fill="#F8FAFC" />
            <circle cx="800" cy="745" r="2" fill="#CBD5E1" />
          </g>

          {/* Sweeping Suminagashi / Ocean Swell Ribbon Streamlines */}
          <g opacity="0.4">
            {/* Upper Swell Stream */}
            <path
              d="M -100,120 C 240,60 520,240 880,140 C 1180,50 1340,180 1560,110"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <path
              d="M -80,145 C 260,85 540,265 900,165 C 1200,75 1360,205 1580,135"
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
            <path
              d="M -60,170 C 280,110 560,290 920,190 C 1220,100 1380,230 1600,160"
              stroke="#CBD5E1"
              strokeWidth="0.8"
              strokeDasharray="4 6"
            />
            <path
              d="M -40,195 C 300,135 580,315 940,215 C 1240,125 1400,255 1620,185"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            />
            <path
              d="M -20,220 C 320,160 600,340 960,240 C 1260,150 1420,280 1640,210"
              stroke="#CBD5E1"
              strokeWidth="0.8"
              strokeDasharray="2 4"
            />

            {/* Mid Ocean Deep Current Ribbon */}
            <path
              d="M -120,480 C 180,360 480,580 820,440 C 1140,320 1320,520 1580,410"
              stroke="#CBD5E1"
              strokeWidth="1.4"
            />
            <path
              d="M -100,510 C 200,390 500,610 840,470 C 1160,350 1340,550 1600,440"
              stroke="#E2E8F0"
              strokeWidth="1.8"
            />
            <path
              d="M -80,540 C 220,420 520,640 860,500 C 1180,380 1360,580 1620,470"
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeDasharray="8 6"
            />
            <path
              d="M -90,430 C 220,520 540,380 880,490 C 1180,580 1380,380 1610,480"
              stroke="#CBD5E1"
              strokeWidth="0.9"
              strokeDasharray="3 5"
            />

            {/* Lower Swell Ribbon */}
            <path
              d="M -60,760 C 280,680 620,840 980,720 C 1260,620 1420,780 1640,690"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <path
              d="M -40,790 C 300,710 640,870 1000,750 C 1280,650 1440,810 1660,720"
              stroke="#E2E8F0"
              strokeWidth="1.6"
            />
            <path
              d="M -20,820 C 320,740 660,900 1020,780 C 1300,680 1460,840 1680,750"
              stroke="#CBD5E1"
              strokeWidth="0.8"
              strokeDasharray="4 4"
            />
          </g>

          {/* Water Caustics / Sub-surface Light Refraction Mesh (Right Bottom) */}
          <g transform="translate(1080, 620)" opacity="0.25">
            <path
              d="M 0,0 C 40,-25 90,-15 120,10 C 150,35 130,80 90,95 C 50,110 10,85 -10,50 C -30,15 -10,-10 30,-5"
              stroke="#CBD5E1"
              strokeWidth="1"
            />
            <path
              d="M 120,10 C 160,0 210,20 230,55 C 250,90 220,130 180,140 C 140,150 100,120 90,95"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            />
            <path
              d="M 90,95 C 105,140 85,190 45,210 C 5,230 -35,200 -50,160 C -65,120 -30,80 10,85"
              stroke="#CBD5E1"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
          </g>

          {/* Secondary Liquid Ripple Flow on Left */}
          <g transform="translate(140, 680)" opacity="0.32">
            <ellipse cx="0" cy="0" rx="220" ry="70" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="5 5" />
            <ellipse cx="0" cy="0" rx="160" ry="50" stroke="#E2E8F0" strokeWidth="1.2" />
            <ellipse cx="0" cy="0" rx="90" ry="28" stroke="#CBD5E1" strokeWidth="0.8" />
          </g>
        </svg>
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <ChapterHeader
          stepNumber="03"
          eyebrow="Methodology & Rigor"
          title="Multi-hypothesis consensus & sensitivity auditing"
          description="WAKE does not simply pick the closest ship. It simulates backward hydrodynamic trajectories across ensemble ocean-current perturbations, computes spatial-temporal intersections with all candidate tracks, and subjects results to rigorous sensitivity stress-testing."
        />

        <div className="mt-12 space-y-12">
          {/* Interactive Ensemble Consensus Simulator — Dark Midnight Navy */}
          <Card className="p-6 md:p-8 bg-[var(--ocean-1)] border border-[var(--ocean-2)] shadow-[0_20px_45px_-4px_rgba(3,14,34,0.45),0_10px_22px_-4px_rgba(3,14,34,0.32)] text-white">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">
                Ensemble Hindcast Particle Dispersion (Lagrangian Physics)
              </h3>
              <p className="text-sm text-[var(--text-light-subtle)] mt-1">
                Explore how ocean surface currents and wind shear back-project candidate release zones.
              </p>
            </div>
            <ConsensusDemo />
          </Card>

          {/* Comparison Table vs Traditional Practices */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[var(--text-1)]">
                Technical Comparison: Conventional Inspection vs. WAKE
              </h3>
              <p className="text-sm text-[var(--text-2)] mt-1">
                Admissibility standards require documented algorithmic provenance and physics-based error bounds.
              </p>
            </div>
            <ComparisonTable />
          </div>
        </div>
      </div>
    </section>
  );
};
