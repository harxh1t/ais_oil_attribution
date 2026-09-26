import React, { useState } from 'react';
import { ConsensusDemo } from './ConsensusDemo';
import { ComparisonTable } from './ComparisonTable';
import { ChapterHeader, Stat } from '../ui';
import { ArrowRight } from 'lucide-react';

interface ProblemAnswer {
  problem: string;
  solutionTitle: string;
  solutionDesc: string;
  tags: string[];
}

const ROWS: ProblemAnswer[] = [
  {
    problem: 'Temporal gap',
    solutionTitle: 'Backward hindcast to the release epoch',
    solutionDesc:
      'OpenDrift particles run in reverse using GFS winds and HYCOM/CMEMS currents, so vessels are compared with where the oil started. Regimes (Contemporaneous < 1 h, Delayed > 1 h) are detected automatically, and an optional forward-fit check projects the inferred source forward and compares it with the observed slick.',
    tags: ['OpenDrift', 'Regime detection'],
  },
  {
    problem: "One distance can't rank",
    solutionTitle: 'Four metrics, one Borda consensus',
    solutionDesc:
      'DCPA, TCPA, discrete Fréchet distance and AIS Continuity each rank the candidates; Borda Count aggregates the ranks without arbitrary weights.',
    tags: ['DCPA · TCPA', 'Fréchet · Borda'],
  },
  {
    problem: 'AIS holes',
    solutionTitle: 'Gaps are scored, not hidden',
    solutionDesc:
      'An AIS Continuity Index measures completeness. Interpolated stretches are tagged Derived and drawn dashed, and gaps stay visible in every view.',
    tags: ['Continuity Index', 'Provenance'],
  },
  {
    problem: 'Model uncertainty',
    solutionTitle: 'An ensemble, not a single line',
    solutionDesc:
      'The hindcast is a particle cloud with a 95% error ellipse, so uncertainty is part of the answer.',
    tags: ['Particle ensemble', '95% ellipse'],
  },
  {
    problem: 'Blurred evidence',
    solutionTitle: 'Three evidence classes, end to end',
    solutionDesc:
      'Observed, Derived and Inferred are separated in every table, map and timeline, and each case exports an auditable bundle (reports and a 3D studio).',
    tags: ['Observed', 'Derived', 'Inferred'],
  },
];

export const ApproachSection: React.FC = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section
      id="approach"
      className="py-[72px] lg:py-[120px] bg-[var(--bg-void)] border-t border-[var(--border-default)] relative overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto px-4 space-y-16">
        {/* Chapter Header */}
        <ChapterHeader
          number="03"
          eyebrow="OUR APPROACH"
          title="How WAKE closes the gap."
        />

        {/* (a) PROBLEM -> ANSWER 5 rows */}
        <div className="space-y-3">
          {ROWS.map((row, idx) => {
            const isHovered = hoveredIdx === idx;
            const isDimmed = hoveredIdx !== null && !isHovered;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`p-6 rounded-[10px] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  isHovered
                    ? 'bg-[var(--surface-3)] border-[var(--violet-500)] shadow-[0_4px_24px_var(--glow-violet)] ring-1 ring-[var(--violet-400)]'
                    : isDimmed
                    ? 'bg-[var(--surface-1)]/40 border-[var(--border-subtle)] opacity-50'
                    : 'bg-[var(--surface-1)] border-[var(--border-default)]'
                }`}
              >
                {/* Left: Problem Chip */}
                <div className="flex items-center gap-3 md:w-1/4 shrink-0">
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--warning)] bg-[var(--warning)]/10 border border-[var(--warning)]/30 px-3 py-1 rounded-[4px] whitespace-nowrap">
                    {row.problem}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--violet-400)] hidden md:block shrink-0" />
                </div>

                {/* Right: Solution Card Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-display font-semibold text-base text-[var(--text-1)]">
                      {row.solutionTitle}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {row.tags.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="font-mono text-xs text-[var(--violet-300)] bg-[var(--surface-2)] px-2 py-0.5 rounded-[4px] border border-[var(--border-subtle)] uppercase tracking-wider"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="font-serif text-[15px] sm:text-[16px] leading-[1.65] text-[var(--text-2)]">
                    {row.solutionDesc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* (b) INTERACTIVE Consensus Demo */}
        <ConsensusDemo />

        {/* (c) COMPARISON TABLE */}
        <ComparisonTable />

        {/* (d) STAT COUNTERS USING <Stat /> */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-[var(--border-subtle)]">
          <Stat number="8" label="Workflow Stages" />
          <Stat number="3" label="Evidence Classes" />
          <Stat number="4+1" label="Metrics + Borda" />
          <Stat number="32/32" label="Forensic Tests Passing" />
        </div>
      </div>
    </section>
  );
};
