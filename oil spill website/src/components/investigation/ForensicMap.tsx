import React from 'react';
import { BaseMap } from '../maps/BaseMap';
import { HindcastPlayhead } from './HindcastPlayhead';

export interface ForensicMapProps {
  driftMode?: 'backward' | 'forward';
}

export const ForensicMap: React.FC<ForensicMapProps> = ({ driftMode = 'backward' }) => {
  return (
    <div className="w-full h-full min-h-[500px] flex flex-col relative bg-[var(--surface-2)]">
      {/* Main Leaflet Map Engine */}
      <div className="flex-1 w-full h-full relative z-0">
        <BaseMap driftMode={driftMode} />
      </div>

      {/* Bottom Floating Playhead / Time Scrubber */}
      <div className="absolute bottom-4 left-4 right-4 z-[1001] pointer-events-none">
        <div className="pointer-events-auto bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-3 shadow-lg">
          <HindcastPlayhead />
        </div>
      </div>
    </div>
  );
};
