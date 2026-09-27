import React from 'react';
import { useCase } from '../../../context/CaseContext';

export const EvidenceGraphTab: React.FC = () => {
  const { caseData } = useCase();
  const topVessel = caseData.vessels[0];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-[var(--text-1)]">
          Forensic Evidence Provenance Chain
        </h4>
        <p className="text-xs text-[var(--text-3)] mt-0.5">
          Nodes linked by physical and kinematic inference models
        </p>
      </div>

      {/* Structured Graph / Chain Nodes */}
      <div className="space-y-3">
        {/* Node 1: SAR Slick */}
        <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)]">
              SAR Detection Footprint
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-[var(--text-2)] space-y-0.5">
            <div>Sensor: Sentinel-1 SAR C-Band</div>
            <div>Time: 01:50:00Z</div>
            <div>Footprint: {caseData.slick.areaKm2} km² ({caseData.slick.lengthKm} km length)</div>
          </div>
        </div>

        {/* Link arrow */}
        <div className="flex justify-center">
          <div className="h-4 w-[1px] bg-[var(--border-strong)]" />
        </div>

        {/* Node 2: Backward Hydrodynamics */}
        <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)]">
              Lagrangian Back-Trajectory
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-[var(--text-2)] space-y-0.5">
            <div>Current Model: HYCOM / CMEMS 1/12°</div>
            <div>Hindcast: -9.2 hours</div>
            <div>Release Window: 16:40:00Z</div>
          </div>
        </div>

        {/* Link arrow */}
        <div className="flex justify-center">
          <div className="h-4 w-[1px] bg-[var(--border-strong)]" />
        </div>

        {/* Node 3: Target Vessel Kinematics */}
        <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)]">
              Candidate Trajectory &amp; Spatiotemporal Fit
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-[var(--text-2)] space-y-0.5">
            <div>Vessel: {topVessel.name}</div>
            <div>DCPA: {topVessel.dcpa} km | TCPA: {topVessel.tcpa} min</div>
            <div>AIS Continuity: {topVessel.continuity}%</div>
          </div>
        </div>

        {/* Link arrow */}
        <div className="flex justify-center">
          <div className="h-4 w-[1px] bg-[var(--border-strong)]" />
        </div>

        {/* Node 4: Determination */}
        <div className="p-3 bg-[var(--primary-50)] rounded-[6px] border border-[var(--primary-300)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--primary-700)]">
              Attribution Determination
            </span>
            <span className="text-xs font-mono font-bold text-[var(--primary-600)]">
              Borda #{topVessel.rank} ({topVessel.borda}/20)
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--primary-700)]">
            Correlated spatiotemporally with no viable counter-hypotheses.
          </div>
        </div>
      </div>
    </div>
  );
};
