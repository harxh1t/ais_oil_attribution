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
            <div>Sensor: {caseData.sarSensor}</div>
            <div>Time: {caseData.sarPassTime}</div>
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
            <div>Current Model: {caseData.environmental.currentSource}</div>
            <div>Hindcast: -{caseData.slickAgeHours} hours</div>
            <div>Release Window: {caseData.inferredReleaseEpoch}</div>
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
            <div>Vessel: {topVessel.name} (MMSI: {topVessel.mmsi})</div>
            <div>DCPA: {topVessel.dcpa.toFixed(2)} km (Rank #{topVessel.rank_dcpa || 1})</div>
            <div>TCPA: {topVessel.tcpa.toFixed(1)} min | Fréchet: {topVessel.frechet.toFixed(2)} km</div>
            <div>Coverage: {topVessel.continuity.toFixed(2)}% ({topVessel.track_points_count || topVessel.track.length} points)</div>
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
              Borda #{topVessel.rank} ({topVessel.borda} pts)
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--primary-700)]">
            Correlated spatiotemporally from {topVessel.tracks_file || 'vessel_tracks.json'} with DCPA of {topVessel.dcpa.toFixed(1)} km and confidence {Math.round(topVessel.confidence * 100)}% ({topVessel.confidence_label || 'MEDIUM'}).
          </div>
        </div>
      </div>
    </div>
  );
};
