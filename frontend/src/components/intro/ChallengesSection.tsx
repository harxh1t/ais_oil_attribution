import React from 'react';
import { GapFigure } from './GapFigure';
import { IssueCards } from './IssueCards';
import { ChapterHeader } from '../ui';
import { Clock, AlertTriangle, ArrowLeftRight } from 'lucide-react';

export const ChallengesSection: React.FC = () => {
  return (
    <section
      id="challenges"
      className="py-[72px] lg:py-[120px] bg-[var(--bg-base)] border-t border-[var(--border-default)] relative overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto px-4 space-y-16">
        {/* Chapter Header */}
        <ChapterHeader
          number="02"
          eyebrow="THE PRACTICAL PROBLEM"
          title="Finding the slick is the easy part."
        />

        {/* BLOCK A: Flagship The Temporal Gap Dilemma */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left copy & callouts (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] font-mono text-xs text-[var(--inferred)]">
                <Clock className="w-3.5 h-3.5" />
                <span>THE TEMPORAL GAP</span>
              </div>
              <h3 className="font-display font-semibold text-2xl sm:text-3xl text-[var(--text-1)] leading-tight">
                The culprit is never where the slick was photographed.
              </h3>
              {/* Long-form paragraph in Source Serif 4 */}
              <p className="font-serif text-[17px] sm:text-[19px] leading-[1.7] text-[var(--text-2)] max-w-[68ch]">
                By the time a satellite captures a slick, the discharging vessel is usually hours away. Winds and currents have carried the oil, stretched it and reshaped it, so matching ships to the slick&apos;s position at image time points at the wrong place.
              </p>
            </div>

            {/* Callouts */}
            <div className="space-y-3 pt-2">
              {/* Callout 1 (Warning / Naive error) */}
              <div className="p-4 rounded-[8px] bg-[var(--danger)]/10 border border-[var(--danger)]/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[var(--danger)]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>The naive error</span>
                </div>
                <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed">
                  Matching vessels to the slick&apos;s coordinates at acquisition time produces false leads, or no candidates at all.
                </p>
              </div>

              {/* Callout 2 (WAKE bridge) */}
              <div className="p-4 rounded-[8px] bg-[var(--violet-600)]/15 border border-[var(--violet-400)]/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[var(--violet-300)]">
                  <ArrowLeftRight className="w-4 h-4 shrink-0" />
                  <span>The WAKE bridge</span>
                </div>
                <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed">
                  Run the drift backwards to the release epoch, then compare vessels with where the oil started, not where it was found.
                </p>
              </div>
            </div>
          </div>

          {/* Right interactive spatial attribution card (6 cols) */}
          <div className="lg:col-span-6">
            <GapFigure />
          </div>
        </div>

        {/* BLOCK B: 2x2 Issue Cards Grid */}
        <div className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
          <div className="font-mono text-xs text-[var(--text-3)] uppercase tracking-[0.08em] font-semibold">
            ADDITIONAL CRITICAL FAILURE MODES
          </div>
          <IssueCards />
        </div>
      </div>
    </section>
  );
};
