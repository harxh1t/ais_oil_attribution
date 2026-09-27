import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card } from '../ui';
import { Radio, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface VesselGapSegment {
  startPct: number; // 0 to 100
  widthPct: number; // 0 to 100
  label: string;
}

const VESSEL_GAPS_MAP: Record<string, VesselGapSegment[]> = {
  v1: [{ startPct: 5, widthPct: 3, label: '15:55–15:58 (3 min)' }],
  v2: [{ startPct: 35, widthPct: 38, label: '16:25–17:03 (38 min)' }],
  v3: [{ startPct: 12, widthPct: 1, label: '16:02–16:03 (1 min)' }],
  v4: [{ startPct: 55, widthPct: 6, label: '16:45–16:51 (6 min)' }],
  v5: [{ startPct: 20, widthPct: 9, label: '16:10–16:19 (9 min)' }],
  v6: [
    { startPct: 2, widthPct: 22, label: '15:52–16:14 (22 min)' },
    { startPct: 48, widthPct: 20, label: '16:38–16:58 (20 min)' },
  ],
};

export const AisContinuityGantt: React.FC = () => {
  const { caseData, selectedVessel, setSelectedVesselId } = useCase();

  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[var(--violet-400)]" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
            AIS BROADCAST CONTINUITY GANTT (ALL 6 CANDIDATES)
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[var(--observed)]" />
            <span className="text-[var(--text-2)]">Observed AIS Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[var(--danger)]/40 border border-dashed border-[var(--danger)]" />
            <span className="text-[var(--danger)] font-semibold">Signal Gap</span>
          </div>
        </div>
      </div>

      {/* Flagged Callout for MV Pacific Lantern */}
      <div className="p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/40 rounded-[6px] flex items-start gap-2.5 text-xs font-mono">
        <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[var(--text-1)]">
          <span className="font-bold text-[var(--danger)]">
            FLAGGED CONTINUITY ANOMALY · MV Pacific Lantern (Rank #2):
          </span>
          <p className="text-[var(--text-2)] font-sans">
            A 38-minute continuous transponder blackout (16:25–17:03 UTC) covers the entire inferred release epoch (16:40 UTC), creating a critical evidentiary contradiction despite proximity.
          </p>
        </div>
      </div>

      {/* 6-Row Multi-Vessel Gantt Chart */}
      <div className="space-y-2.5 pt-1">
        {caseData.vessels.map((v) => {
          const isSelected = v.id === selectedVessel.id;
          const gaps = VESSEL_GAPS_MAP[v.id] || [];

          return (
            <div
              key={v.id}
              onClick={() => setSelectedVesselId(v.id)}
              className={cn(
                'p-2 rounded-[6px] border transition-colors cursor-pointer space-y-1',
                isSelected
                  ? 'bg-[var(--surface-2)] border-[var(--violet-400)]'
                  : 'bg-[var(--surface-2)]/40 border-[var(--border-subtle)] hover:bg-[var(--surface-2)] hover:border-[var(--border-default)]'
              )}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-1)]">
                    #{v.rank} {v.name}
                  </span>
                  <span className="text-[var(--text-3)]">· {v.type}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      v.continuity >= 90
                        ? 'text-[var(--text-1)]'
                        : v.continuity >= 70
                        ? 'text-[var(--warning)]'
                        : 'text-[var(--danger)]'
                    )}
                  >
                    {v.continuity}% Continuity
                  </span>
                  <span className="text-[var(--text-3)]">
                    ({100 - v.continuity}m missing)
                  </span>
                </div>
              </div>

              {/* Gantt Timeline Bar */}
              <div className="relative w-full h-4 bg-[var(--observed)] rounded-[3px] overflow-hidden border border-[var(--border-subtle)]">
                {/* 50% Inferred Release Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dotted border-[var(--inferred)] z-20 pointer-events-none"
                  style={{ left: '50%' }}
                />

                {/* Shaded Gaps */}
                {gaps.map((gap, gIdx) => (
                  <div
                    key={gIdx}
                    className="absolute top-0 bottom-0 bg-[var(--danger)]/50 border-x border-dashed border-[var(--danger)] z-10"
                    style={{
                      left: `${gap.startPct}%`,
                      width: `${gap.widthPct}%`,
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239, 68, 68, 0.4) 4px, rgba(239, 68, 68, 0.4) 8px)',
                    }}
                    title={`AIS Gap: ${gap.label}`}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Timeline Axis Labels */}
        <div className="relative w-full flex justify-between text-xs font-mono text-[var(--text-3)] pt-1 px-1">
          <span>15:50 UTC (T−50m)</span>
          <div className="flex items-center gap-1 text-[var(--inferred)] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--inferred)]" />
            <span>16:40 UTC · Inferred Release Epoch</span>
          </div>
          <span>17:30 UTC (T+50m)</span>
        </div>
      </div>

      {/* Selected Candidate Detailed Breakdown View */}
      <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[var(--violet-400)]" />
            <span className="font-semibold uppercase tracking-wider text-[var(--text-1)]">
              DETAIL VIEW: {selectedVessel.name}
            </span>
          </div>
          <span className="text-[var(--text-2)] font-sans">
            AIS reports present for {selectedVessel.continuity}% of the 100-minute window.
          </span>
        </div>

        {selectedVessel.gaps.length > 0 ? (
          <div className="bg-[var(--surface-2)] p-3 rounded-[6px] border border-[var(--border-default)] space-y-2 text-xs font-mono">
            <div className="text-[var(--text-3)] uppercase tracking-wider font-semibold">
              DOCUMENTED RECEPTION GAPS IN CRITICAL WINDOW:
            </div>
            {selectedVessel.gaps.map((g, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[var(--text-2)]">
                <span className="text-[var(--danger)] font-bold">
                  {g.start.substring(11, 16)}–{g.end.substring(11, 16)} UTC ({g.durationMinutes} min)
                </span>
                <span className="text-[var(--text-3)] font-sans">{g.reason}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-default)] text-xs font-mono text-[var(--text-2)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--text-3)]" />
            <span>Complete AIS coverage recorded throughout 15:50–17:30 UTC.</span>
          </div>
        )}
      </div>
    </Card>
  );
};
