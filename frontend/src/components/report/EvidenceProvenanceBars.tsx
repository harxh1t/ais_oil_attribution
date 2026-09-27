import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card } from '../ui';
import { ShieldCheck, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export const EvidenceProvenanceBars: React.FC = () => {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();

  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--observed)]" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
            EVIDENCE PROVENANCE BREAKDOWN PER CANDIDATE
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[var(--observed)]" />
            <span className="text-[var(--observed)] font-semibold">Observed AIS Broadcasts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[var(--derived)]" />
            <span className="text-[var(--derived)] font-semibold">Derived Gap Interpolations</span>
          </div>
        </div>
      </div>

      {/* Stacked Bars for all 6 Vessels */}
      <div className="space-y-3 pt-1">
        {caseData.vessels.map((v) => {
          const isSelected = v.id === selectedVesselId;
          const obsPct = v.provenance.observed;
          const derPct = v.provenance.derived;
          const totalPoints = v.track.length;
          const obsCount = Math.round((obsPct / 100) * totalPoints);
          const derCount = totalPoints - obsCount;

          return (
            <div
              key={v.id}
              onClick={() => setSelectedVesselId(v.id)}
              className={cn(
                'p-2.5 rounded-[6px] border transition-colors cursor-pointer space-y-1.5',
                isSelected
                  ? 'bg-[var(--surface-2)] border-[var(--violet-400)] shadow-[0_0_10px_var(--glow-violet)]'
                  : 'bg-[var(--surface-2)]/50 border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--surface-2)]'
              )}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-1)]">
                    #{v.rank} {v.name}
                  </span>
                  <span className="text-[var(--text-3)]">({v.type})</span>
                  {isSelected && (
                    <span className="px-1.5 py-0.2 rounded-[3px] bg-[var(--violet-950)] text-[var(--violet-300)] border border-[var(--violet-400)]/40 text-xs">
                      SELECTED
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-[var(--observed)]">
                    {obsPct}% Observed ({obsCount} pts)
                  </span>
                  <span className="text-[var(--text-3)]">·</span>
                  <span className="text-[var(--derived)]">
                    {derPct}% Derived ({derCount} pts)
                  </span>
                </div>
              </div>

              {/* Stacked Bar */}
              <div
                className="w-full h-3 rounded-[3px] bg-[var(--surface-3)] overflow-hidden flex border border-[var(--border-subtle)]"
                title={`${v.name}: ${obsPct}% Observed (${obsCount} raw points), ${derPct}% Derived (${derCount} interpolated points)`}
              >
                <div
                  className="h-full bg-[var(--observed)] transition-all duration-500"
                  style={{ width: `${obsPct}%` }}
                />
                <div
                  className="h-full bg-[var(--derived)] transition-all duration-500"
                  style={{ width: `${derPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Methodological Note Beneath */}
      <div className="flex items-start gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-3)] leading-relaxed">
        <Info className="w-4 h-4 text-[var(--violet-400)] shrink-0 mt-0.5" />
        <p>
          Inferred elements (hindcast, error ellipse, Borda ranking) are model outputs and are not counted in point provenance. Point counts reflect the 100-minute critical reconstruction window (15:50–17:30 UTC, N=76 points per candidate).
        </p>
      </div>
    </Card>
  );
};
