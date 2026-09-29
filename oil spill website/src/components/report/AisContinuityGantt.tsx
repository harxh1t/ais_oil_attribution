import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card, Badge } from '../ui';
import { CandidateVessel } from '../../data/malibuCase';

export const AisContinuityGantt: React.FC = () => {
  const { caseData } = useCase();

  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              AIS Transponder Continuity Gantt
            </h3>
          </div>
          <Badge variant="neutral">Continuity Audit</Badge>
        </div>

        {/* Timeline Visualization */}
        <div className="mt-5 space-y-4">
          {caseData.vessels.slice(0, 4).map((vessel: CandidateVessel) => {
            const hasGap = vessel.gaps.length > 0;
            return (
              <div key={vessel.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-[var(--text-1)]">
                    {vessel.name} ({vessel.mmsi})
                  </span>
                  <span className="text-[var(--text-3)]">
                    {hasGap ? `${vessel.continuity}% continuity` : '100% continuous'}
                  </span>
                </div>

                {/* Timeline Bar */}
                <div className="h-6 w-full bg-[var(--surface-2)] rounded-[4px] border border-[var(--border-subtle)] flex overflow-hidden relative">
                  {hasGap ? (
                    <>
                      {/* Before gap */}
                      <div className="w-[30%] bg-[var(--observed)]/40 h-full border-r border-[var(--surface-1)]" />
                      {/* Deliberate transponder blackout */}
                      <div className="w-[25%] bg-[var(--derived)]/30 h-full border-r border-[var(--surface-1)] flex items-center justify-center">
                        <span className="text-[10px] font-mono font-bold text-[var(--derived)]">
                          GAP
                        </span>
                      </div>
                      {/* After gap */}
                      <div className="w-[45%] bg-[var(--observed)]/40 h-full" />
                    </>
                  ) : (
                    <div className="w-full bg-[var(--observed)]/40 h-full flex items-center px-2">
                      <span className="text-[10px] font-mono text-[var(--text-2)]">
                        Continuous broadcast ({vessel.continuity}%)
                      </span>
                    </div>
                  )}

                  {/* Discharge window marker (11:00:00Z at DCPA 0.0 km) */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-[var(--inferred)]"
                    style={{ left: '50%' }}
                    title={`Estimated Discharge Window (${new Date(caseData.inferredReleaseEpoch).toISOString().slice(11, 19)}Z)`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
