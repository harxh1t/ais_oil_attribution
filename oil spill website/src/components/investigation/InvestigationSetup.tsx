import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card } from '../ui';
import { AttributionImage } from '../../data/attributionImages';

interface InvestigationSetupProps {
  selectedImage?: AttributionImage;
}

export const InvestigationSetup: React.FC<InvestigationSetupProps> = ({ selectedImage }) => {
  const { caseData, parameters } = useCase();

  // Use release origin point where PACIFIC GLORY was at CPA (0.0 km) from the user's JSON
  const lat = caseData.inferredReleasePoint?.lat ?? parameters.lat;
  const lon = caseData.inferredReleasePoint?.lon ?? parameters.lon;

  return (
    <Card className="p-5 sm:p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--text-1)]">Run Parameters</h2>
          </div>
          <span className="text-xs font-mono text-[var(--ocean-1)] font-semibold">vessel_tracks.json</span>
        </div>

        <div className="mt-4 space-y-4">
          {/* Incident Target Data */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] font-mono block">
              Incident Coordinates (WGS84)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-[var(--text-2)] mb-1 block">Latitude</span>
                <div className="p-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-mono text-[var(--text-1)]">
                  {lat.toFixed(4)}° N
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--text-2)] mb-1 block">Longitude</span>
                <div className="p-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-mono text-[var(--text-1)]">
                  {Math.abs(lon).toFixed(4)}° W
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] font-mono block">
              Temporal AIS Window
            </label>
            <div>
              <span className="text-xs text-[var(--text-2)] mb-1 block">Observation &amp; Voyage Window</span>
              <div className="p-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-mono text-[var(--text-1)] flex items-center justify-between">
                <span>09:00:00Z – 13:00:00Z (2024-05-15)</span>
              </div>
            </div>
          </div>

          {/* Active Vessels Feed from JSON */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] font-mono block">
              Active Candidate Feed (from JSON)
            </label>
            <div className="p-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-mono text-[var(--text-1)] space-y-1">
              {caseData.vessels.map((v) => (
                <div key={v.id} className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold">#{v.rank} {v.name}</span>
                  <span className="text-[var(--text-3)]">{v.track_points_count ?? v.track.length} pts ({v.mmsi})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
