import React from 'react';

export const GeospatialLegend: React.FC = () => {
  return (
    <div className="bg-[#002B3D]/90 backdrop-blur-md border border-[var(--border-default)] rounded-[6px] p-3 text-xs shadow-xl text-white pointer-events-auto min-w-[210px]">
      <div className="font-bold text-[13px] text-[#8FEFF6] pb-2 mb-2 border-b border-[var(--border-default)] flex items-center justify-between">
        <span>Geospatial Evidence Layers</span>
      </div>

      <div className="space-y-2 text-[11px] font-sans">
        {/* Observed Spill Envelope */}
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-[#E03E3E] shrink-0 border border-white/40 shadow-xs" />
          <span className="text-[#E6FAFC]">Observed Spill Envelope</span>
        </div>

        {/* Slick Centerline */}
        <div className="flex items-center gap-2.5">
          <div className="w-4 flex items-center justify-center shrink-0">
            <span className="w-full border-t-2 border-dashed border-[#F59E0B]" />
          </div>
          <span className="text-[#E6FAFC]">Slick Centerline</span>
        </div>

        {/* Selected Vessel Track */}
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-[3px] bg-[#EF4444] rounded-full shrink-0 shadow-xs" />
          <span className="text-[#E6FAFC] font-semibold">Selected Vessel Track (Red)</span>
        </div>

        {/* Candidate Vessel Paths */}
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-[2px] bg-[#CBD5E1] rounded-full shrink-0" />
          <span className="text-[#CBD5E1]">Candidate Tracks (Light Grey)</span>
        </div>

        {/* Drift Backtrack Origin */}
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-[#F59E0B] shrink-0 border border-white/60 shadow-xs" />
          <span className="text-[#E6FAFC]">Drift Backtrack Origin</span>
        </div>
      </div>
    </div>
  );
};
