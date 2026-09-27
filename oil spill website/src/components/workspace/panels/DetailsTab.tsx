import React from 'react';
import { useCase } from '../../../context/CaseContext';
import { Badge } from '../../ui';
import { CandidateVessel } from '../../../data/malibuCase';

export const DetailsTab: React.FC = () => {
  const { caseData, selectedVesselId } = useCase();
  const vessel: CandidateVessel =
    caseData.vessels.find((v: CandidateVessel) => v.id === selectedVesselId) || caseData.vessels[0];

  return (
    <div className="space-y-5 text-xs">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[var(--text-1)]">
            {vessel.name}
          </h4>
          <Badge variant={vessel.rank === 1 ? 'inferred' : 'neutral'}>
            Borda #{vessel.rank} ({vessel.borda}/20)
          </Badge>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-3)] mt-0.5 block">
          Registry &amp; Kinematic Assessment
        </span>
      </div>

      <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)] space-y-2 font-mono">
        <div className="flex justify-between">
          <span className="text-[var(--text-3)]">MMSI:</span>
          <span className="font-bold text-[var(--text-1)]">{vessel.mmsi}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-3)]">Vessel Type:</span>
          <span className="text-[var(--text-1)]">{vessel.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-3)]">Flag State:</span>
          <span className="text-[var(--text-1)]">{vessel.flag}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-3)]">Length / Beam:</span>
          <span className="text-[var(--text-1)]">{vessel.lengthM}m × {vessel.beamM}m</span>
        </div>
      </div>

      <div className="space-y-2">
        <span className="font-mono font-bold text-[var(--text-3)] uppercase tracking-wider text-[10px] block">
          Kinematic Coincidence Metrics
        </span>

        <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)] space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">DCPA Distance:</span>
            <span className="font-bold text-[var(--text-1)]">{vessel.dcpa} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">|TCPA| Delta:</span>
            <span className="text-[var(--text-1)]">{vessel.tcpa} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">Fréchet Distance:</span>
            <span className="text-[var(--text-1)]">{vessel.frechet} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">AIS Continuity:</span>
            <span className={vessel.continuity < 80 ? "text-[var(--derived)] font-bold" : "text-[var(--text-2)]"}>
              {vessel.continuity}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
