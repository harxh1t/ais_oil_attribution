import React from 'react';
import { BaseMap, MapOverlaysState } from '../maps/BaseMap';
import { GeospatialLegend } from '../maps/GeospatialLegend';
import { HindcastPlayhead } from './HindcastPlayhead';
import { Info } from 'lucide-react';

export interface ForensicMapProps {
  driftMode?: 'backward' | 'forward';
  baseLayer?: string;
  mapOverlays?: MapOverlaysState;
  showPlayhead?: boolean;
}

export const ForensicMap: React.FC<ForensicMapProps> = ({
  driftMode = 'backward',
  baseLayer = 'OpenStreetMap',
  mapOverlays = {
    slick: true,
    candidates: true,
    cpa: true,
    otherTraffic: true,
    driftOrigin: true,
  },
  showPlayhead = false,
}) => {
  return (
    <div className="w-full h-full min-h-[500px] flex flex-col relative bg-[#041624]">
      {/* Main Leaflet Map Engine */}
      <div className="flex-1 w-full h-full relative z-0">
        <BaseMap driftMode={driftMode} baseLayer={baseLayer} mapOverlays={mapOverlays} />

        {/* Floating "Geospatial Evidence Layers" Legend (bottom-left) */}
        <div className={`absolute ${showPlayhead ? 'bottom-24' : 'bottom-4'} left-4 z-[1000] pointer-events-auto transition-all`}>
          <GeospatialLegend />
        </div>
      </div>

      {/* Geospatial Map Tip & Status Bar matching the requested design */}
      <div className="bg-[var(--surface-1)]/95 backdrop-blur-sm px-4 py-2 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-mono text-[var(--text-2)] z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[var(--ocean-1)] shrink-0" />
          <span>
            <strong className="text-[var(--text-1)]">Interactive Tips:</strong> Toggle map layers and candidate vessels in the left sidebar. Click tracks for telemetry.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-[var(--text-3)]">
          <span>Observation Spread: ~8.00 km radius</span>
          <span>&bull;</span>
          <span>OpenDrift / OpenOil Hindcast</span>
        </div>
      </div>

      {/* Bottom Floating Playhead / Time Scrubber (hidden when 2D is selected) */}
      {showPlayhead && (
        <div className="absolute bottom-10 left-4 right-4 z-[1001] pointer-events-none">
          <div className="pointer-events-auto bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border-default)] rounded-[8px] p-3 shadow-xl">
            <HindcastPlayhead />
          </div>
        </div>
      )}
    </div>
  );
};
