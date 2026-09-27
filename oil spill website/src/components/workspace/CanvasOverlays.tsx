import React from 'react';

interface CanvasOverlaysProps {
  cameraView: 'perspective' | 'top' | 'oblique';
}

export const CanvasOverlays: React.FC<CanvasOverlaysProps> = ({ cameraView }) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
      {/* Top Left Compass & Coordinate HUD */}
      <div className="flex items-start justify-between">
        <div className="bg-[var(--surface-1)]/90 backdrop-blur-xs border border-[var(--border-default)] rounded-[6px] p-2.5 font-mono text-[11px] text-[var(--text-2)] shadow-xs pointer-events-auto space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-1)]">VIEW:</span>
            <span className="uppercase">{cameraView}</span>
          </div>
          <div>CENTROID: 33.9180°N, 118.8250°W</div>
          <div>BATHYMETRY: -240m (Continental Slope)</div>
        </div>

        {/* Minimal Compass Widget */}
        <div className="w-10 h-10 rounded-full bg-[var(--surface-1)] border border-[var(--border-default)] shadow-xs flex items-center justify-center font-mono font-bold text-xs text-[var(--text-1)] pointer-events-auto">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[var(--danger)] leading-none font-bold">N</span>
            <span className="text-[8px] text-[var(--text-3)] leading-none mt-0.5">▲</span>
          </div>
        </div>
      </div>
    </div>
  );
};
