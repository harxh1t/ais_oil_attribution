import React from 'react';

const ITEMS = [
  'Sentinel-1 / Copernicus',
  'OpenDrift',
  'DeepLabV3+',
  'NOAA GFS',
  'HYCOM / CMEMS',
  'DuckDB',
  'GeoParquet',
  'Three.js',
];

export const BuiltOnMarquee: React.FC = () => {
  return (
    <div className="w-full bg-[#0E0B1F] border-y border-[rgba(167,139,250,0.15)] py-3 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6">
        <span className="font-mono text-xs text-[#9691B3] uppercase tracking-wider shrink-0 font-semibold">
          BUILT ON
        </span>
        <div className="h-4 w-px bg-[rgba(167,139,250,0.2)] shrink-0" />
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex items-center gap-8 whitespace-nowrap animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...ITEMS, ...ITEMS, ...ITEMS].map((item, idx) => (
              <span
                key={idx}
                className="font-mono text-xs text-[#9691B3] tracking-wide hover:text-[#F4F2FF] transition-colors"
              >
                {item}
                <span className="text-[rgba(167,139,250,0.4)] ml-8 font-mono">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
