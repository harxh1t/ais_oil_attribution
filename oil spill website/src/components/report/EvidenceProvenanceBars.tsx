import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card, Badge } from '../ui';

export const EvidenceProvenanceBars: React.FC = () => {
  const { caseData } = useCase();
  const topCandidate = caseData.vessels[0];
  const { observed, derived, inferred } = topCandidate.provenance;

  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              Evidentiary Provenance Split
            </h3>
          </div>
          <Badge variant="neutral">Audit Breakdown</Badge>
        </div>

        {/* Triple Split Bar */}
        <div className="mt-5">
          <div className="h-6 w-full rounded-[4px] border border-[var(--border-default)] flex overflow-hidden">
            <div
              style={{ width: `${observed}%` }}
              className="bg-[var(--observed)] h-full transition-all"
              title={`Observed: ${observed}%`}
            />
            <div
              style={{ width: `${derived}%` }}
              className="bg-[var(--derived)] h-full transition-all"
              title={`Derived: ${derived}%`}
            />
            <div
              style={{ width: `${inferred}%` }}
              className="bg-[var(--inferred)] h-full transition-all"
              title={`Inferred: ${inferred}%`}
            />
          </div>

          {/* Breakdown Items */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[var(--observed)]" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-1)]">Observed Evidence</div>
                  <div className="text-[11px] text-[var(--text-3)]">
                    Sentinel-1 SAR C-band calibrated backscatter slick footprint &amp; broadcast AIS
                  </div>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-[var(--text-1)]">
                {observed}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--derived)]" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-1)]">Derived Evidence</div>
                  <div className="text-[11px] text-[var(--text-3)]">
                    Interpolated AIS positions, DCPA, TCPA &amp; Fréchet distance
                  </div>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-[var(--text-1)]">
                {derived}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[var(--inferred)]" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-1)]">Inferred Evidence</div>
                  <div className="text-[11px] text-[var(--text-3)]">
                    OpenDrift backward trajectory physics &amp; 95% release confidence ellipse
                  </div>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-[var(--text-1)]">
                {inferred}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-3)] font-mono">
        Standard for forensic admissibility: Evidence must clearly state observed physical measurements vs. mathematical inferences.
      </div>
    </Card>
  );
};
