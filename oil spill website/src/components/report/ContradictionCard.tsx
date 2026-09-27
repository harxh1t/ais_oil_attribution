import React from 'react';
import { Card, Badge } from '../ui';
import { HelpCircle, AlertCircle } from 'lucide-react';

export const ContradictionCard: React.FC = () => {
  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              Contradiction &amp; Counter-Factual Analysis
            </h3>
          </div>
          <Badge variant="neutral">Zero Conflicts</Badge>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)]">
            <div className="text-xs font-bold text-[var(--text-1)]">
              Hypothesis A: Natural Submarine Seep Activity
            </div>
            <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
              Nearest active geological hydrocarbon seeps (Coal Oil Point / Point Dume) are 42km west. Prevailing surface current vector (275° to 095°) cannot advect natural seep oil to this location within the 14-hour window.
            </p>
            <div className="mt-2 text-[11px] font-mono text-[var(--observed)] font-semibold">
              Status: Refuted (Geospatial &amp; Chemical Impossibility)
            </div>
          </div>

          <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)]">
            <div className="text-xs font-bold text-[var(--text-1)]">
              Hypothesis B: Nearby Tanker (Candidate #2)
            </div>
            <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
              Tanker was within 6.1km at 02:40Z. However, continuous AIS reception confirms transit speed of 14.2 kt along the commercial fairway with zero deviation; release point was 5.8km upwind of its track.
            </p>
            <div className="mt-2 text-[11px] font-mono text-[var(--observed)] font-semibold">
              Status: Excluded by Vector Distance
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-3)] font-mono">
        All negative control tests documented for court disclosure.
      </div>
    </Card>
  );
};
