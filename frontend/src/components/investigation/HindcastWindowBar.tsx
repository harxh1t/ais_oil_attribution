import React from 'react';
import { Clock } from 'lucide-react';

export const HindcastWindowBar: React.FC = () => {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-3.5 shadow-xl font-mono text-xs space-y-2.5">
      {/* Header with Δt tag */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--violet-400)]" />
          <span className="font-semibold uppercase tracking-wider text-[var(--text-1)]">
            TEMPORAL RECONSTRUCTION WINDOW
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[var(--text-1)] font-bold">
            Δt 9.2 h
          </span>
          <span className="text-[var(--text-3)]">Advection Interval</span>
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative pt-6 pb-4">
        {/* Baseline track */}
        <div className="h-2 w-full bg-[var(--surface-3)] rounded-full relative overflow-hidden">
          {/* AIS Search Window highlight (derived amber dashed pattern) */}
          <div
            className="absolute top-0 bottom-0 left-[6%] w-[24%] bg-[var(--derived)]/20 border-l border-r border-[var(--derived)] border-dashed"
            title="AIS Candidate Correlation Window (15:50Z - 17:30Z)"
          />
          {/* Advection span */}
          <div
            className="absolute top-0 bottom-0 left-[18%] right-[6%] bg-gradient-to-r from-[var(--inferred)]/30 to-[var(--observed)]/30"
          />
        </div>

        {/* Marker 1: Inferred Release Epoch (16:40Z) */}
        <div
          className="absolute top-0 left-[18%] -translate-x-1/2 flex flex-col items-center group cursor-pointer"
        >
          <div className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--inferred)] border-dashed text-[var(--inferred)] font-bold text-xs shadow-md whitespace-nowrap mb-1">
            16:40Z
          </div>
          <div className="w-3 h-3 rounded-full bg-[var(--inferred)] border-2 border-black" />
          <div className="text-[var(--text-3)] text-xs mt-1 whitespace-nowrap">
            Inferred Release
          </div>
        </div>

        {/* Marker 2: AIS Candidate Search Window (15:50Z - 17:30Z) */}
        <div
          className="absolute -bottom-1 left-[18%] -translate-x-1/2 flex flex-col items-center"
        >
          <div className="text-[var(--derived)] text-xs font-semibold whitespace-nowrap">
            [DERIVED] AIS Corridor 15:50Z–17:30Z
          </div>
        </div>

        {/* Marker 3: SAR Observation (01:50Z) */}
        <div
          className="absolute top-0 right-[6%] translate-x-1/2 flex flex-col items-center group cursor-pointer"
        >
          <div className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--observed)] text-[var(--observed)] font-bold text-xs shadow-md whitespace-nowrap mb-1">
            01:50Z
          </div>
          <div className="w-3 h-3 rounded-full bg-[var(--observed)] border-2 border-black" />
          <div className="text-[var(--text-3)] text-xs mt-1 whitespace-nowrap">
            SAR Observation
          </div>
        </div>
      </div>
    </div>
  );
};
