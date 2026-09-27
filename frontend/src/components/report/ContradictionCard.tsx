import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useCase } from '../../context/CaseContext';

export const ContradictionCard: React.FC = () => {
  const { setSelectedVesselId } = useCase();

  return (
    <div className="w-full bg-[var(--surface-1)] border-2 border-[var(--danger)] rounded-[8px] p-5 shadow-2xl space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 flex items-center justify-center text-[var(--danger)] shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--danger)]">
                CRITICAL CONTRADICTION DETECTED
              </span>
              <span className="font-mono text-xs text-[var(--text-3)]">·</span>
              <button
                type="button"
                onClick={() => setSelectedVesselId('v2')}
                className="font-display font-bold text-sm text-[var(--text-1)] hover:text-[var(--violet-300)] underline cursor-pointer"
              >
                MV Pacific Lantern (Rank #2)
              </button>
            </div>

            <p className="font-serif text-[15px] sm:text-[16px] text-[var(--text-1)] leading-relaxed">
              Contradiction detected · MV Pacific Lantern. It has the best TCPA (9 min) but a 38-minute AIS gap covering the inferred release window. Proximity evidence is strong while observational continuity is weak. This may be a dropout or a coverage gap.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-default)] flex items-start gap-2 text-xs font-mono text-[var(--text-2)]">
        <HelpCircle className="w-4 h-4 text-[var(--text-3)] shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="text-[var(--text-1)]">Forensic Standard:</strong> In physical attribution pipelines, high temporal proximity cannot establish attribution without observational continuity during the discharge epoch. Missing transmissions may stem from coastal antenna occlusion, VHF interference, receiver sensitivity loss, or manual transponder inactivation.
        </span>
      </div>
    </div>
  );
};
