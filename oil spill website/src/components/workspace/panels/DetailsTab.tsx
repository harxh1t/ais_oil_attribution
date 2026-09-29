import React from 'react';
import { useCase } from '../../../context/CaseContext';
import { Badge } from '../../ui';
import { CandidateVessel } from '../../../data/malibuCase';

export const DetailsTab: React.FC = () => {
  const { caseData, selectedVesselId } = useCase();
  const vessel: CandidateVessel =
    caseData.vessels.find((v: CandidateVessel) => v.id === selectedVesselId) || caseData.vessels[0];

  return (
    <div className="space-y-4 text-xs">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[var(--text-1)]">
            {vessel.name}
          </h4>
          <Badge variant={vessel.rank === 1 ? 'inferred' : 'neutral'}>
            Rank #{vessel.rank} (Borda: {vessel.borda} pts)
          </Badge>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-3)] mt-0.5 block">
          Source: {vessel.tracks_file || 'vessel_tracks.json'} ({vessel.track_points_count || vessel.track.length} points)
        </span>
      </div>

      {/* Registry & Attribution Confidence */}
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
          <span className="text-[var(--text-3)]">Attribution Confidence:</span>
          <span className="font-bold text-emerald-600">
            {(vessel.confidence * 100).toFixed(1)}% ({vessel.confidence_label || (vessel.rank === 1 ? 'MEDIUM' : 'LOW')})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-3)]">Coverage Completeness:</span>
          <span className="text-[var(--text-1)]">{(vessel.continuity).toFixed(2)}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <span className="font-mono font-bold text-[var(--text-3)] uppercase tracking-wider text-[10px] block">
          Forensic Metrics (from Rankings JSON)
        </span>

        <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)] space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">DCPA Distance:</span>
            <span className="font-bold text-[var(--text-1)]">{vessel.dcpa.toFixed(2)} km (Rank #{vessel.rank_dcpa || vessel.rank})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">TCPA Offset:</span>
            <span className="text-[var(--text-1)]">{vessel.tcpaSigned > 0 ? '+' : ''}{vessel.tcpaSigned} min (Rank #{vessel.rank_tcpa || vessel.rank})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">Fréchet Distance:</span>
            <span className="text-[var(--text-1)]">{vessel.frechet.toFixed(2)} km (Rank #{vessel.rank_frechet || vessel.rank})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-3)]">Total Track Points:</span>
            <span className="text-[var(--text-1)]">
              {vessel.track_points_count || vessel.track.length} points
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
