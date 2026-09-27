import React, { useState } from 'react';
import { Card } from '../ui';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export const LimitationsAccordion: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const limitations = [
    {
      title: 'Current Velocity Grid Spatial Resolution (3 km)',
      desc: 'NOAA ROMS hydrodynamic current predictions operate at 3-kilometer horizontal grid cells. Sub-mesoscale coastal eddies under 500 meters are parameterized via turbulent diffusion rather than explicitly resolved.'
    },
    {
      title: 'Dark Vessel Sensor Coverage Outside Satellite Footprint',
      desc: 'If an unregistered vessel with no Class-A AIS transponder or radar cross-section was present during the night window, attribution is constrained to vessels appearing in terrestrial/satellite AIS receivers.'
    },
    {
      title: 'SAR Wind Squelch & Look-Angle Thresholds',
      desc: 'SAR slick detectability requires surface winds between 2.0 m/s (minimum to generate capillary ripple backscatter) and 12.0 m/s (maximum before wave action mixes the oil film into the water column).'
    }
  ];

  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              Operational Caveats &amp; Model Limitations
            </h3>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {limitations.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="border border-[var(--border-subtle)] rounded-[6px] overflow-hidden"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-3 bg-[var(--surface-2)] text-left flex items-center justify-between hover:bg-[var(--surface-3)] transition-colors"
                >
                  <span className="text-xs font-bold text-[var(--text-1)]">
                    {item.title}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[var(--text-3)]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)]" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-3 bg-[var(--surface-1)] text-xs text-[var(--text-2)] leading-relaxed border-t border-[var(--border-subtle)]">
                    {item.desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-3)] font-mono">
        Caveat disclosures comply with maritime forensic standards.
      </div>
    </Card>
  );
};
