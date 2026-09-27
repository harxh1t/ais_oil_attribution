import React, { useState } from 'react';
import { Badge, Button } from '../ui';
import { Play, RotateCcw } from 'lucide-react';

export const ConsensusDemo: React.FC = () => {
  const [dispersionStep, setDispersionStep] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    setDispersionStep(1);
    setIsPlaying(false);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Badge variant="neutral">Ensemble Dispersion</Badge>
          <span className="text-xs font-mono text-[var(--text-light-subtle)]">
            N = 250 particle tracers across ROMS current fields
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDispersionStep((prev) => (prev % 5) + 1)}
          >
            Advance Step ({dispersionStep}/5)
          </Button>
          <Button size="sm" variant="ghost" className="text-[var(--text-light-subtle)] hover:text-white hover:bg-[var(--ocean-2)]" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="mt-4 w-full bg-white rounded-[6px] border border-[var(--border-default)] p-3 overflow-hidden">
        <svg viewBox="0 0 720 280" className="w-full h-auto max-h-[280px] bg-white" aria-label="Ensemble particle distribution demo">
          <defs>
            <pattern id="demo-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-default)" strokeWidth="0.5" strokeOpacity="0.5" />
            </pattern>
          </defs>

          <rect width="720" height="280" fill="#FFFFFF" />
          <rect width="720" height="280" fill="url(#demo-grid)" />

          {/* Current arrows background */}
          <g stroke="var(--border-strong)" strokeWidth="1" opacity="0.4">
            <line x1="80" y1="180" x2="160" y2="150" />
            <line x1="240" y1="160" x2="320" y2="130" />
            <line x1="400" y1="140" x2="480" y2="110" />
          </g>

          {/* Slick origin observation */}
          <circle cx="560" cy="110" r="6" fill="var(--observed)" />
          <text x="560" y="90" fill="var(--observed)" fontSize="11" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor="middle">
            SAR Slick Detection (T=0)
          </text>

          {/* Particle cloud dispersion backwards */}
          {Array.from({ length: 45 }).map((_, i) => {
            const spreadFactor = dispersionStep * 16;
            const progress = (dispersionStep / 5);
            const baseX = 560 - progress * 360;
            const baseY = 110 + progress * 70;
            // Pseudo-random deterministic offsets
            const offsetX = Math.sin(i * 12.3) * spreadFactor;
            const offsetY = Math.cos(i * 7.7) * (spreadFactor * 0.55);

            return (
              <circle
                key={i}
                cx={baseX + offsetX}
                cy={baseY + offsetY}
                r={2}
                fill="var(--inferred)"
                fillOpacity={0.6}
              />
            );
          })}

          {/* Calculated 95% Confidence Ellipse */}
          <ellipse
            cx={560 - (dispersionStep / 5) * 360}
            cy={110 + (dispersionStep / 5) * 70}
            rx={dispersionStep * 18 + 14}
            ry={dispersionStep * 10 + 8}
            fill="var(--inferred)"
            fillOpacity="0.1"
            stroke="var(--inferred)"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />

          {/* Candidate Vessel Track passing through */}
          <path
            d="M 100 240 L 200 180 L 300 140 L 400 110 L 500 80"
            fill="none"
            stroke="var(--derived)"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
          <circle cx="200" cy="180" r="4" fill="var(--surface-1)" stroke="var(--derived)" strokeWidth="2" />
          <text x="210" y="195" fill="var(--derived)" fontSize="10" fontFamily="JetBrains Mono" fontWeight="600">
            Candidate Track (MMSI 352002881)
          </text>

          <circle cx={560 - (dispersionStep / 5) * 360} cy={110 + (dispersionStep / 5) * 70} r="4" fill="var(--inferred)" />
          <text
            x={560 - (dispersionStep / 5) * 360}
            y={110 + (dispersionStep / 5) * 70 + 26}
            fill="var(--text-1)"
            fontSize="10"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="600"
            textAnchor="middle"
          >
            T - {(dispersionStep * 2.8).toFixed(1)}h Back-Projected Centroid
          </text>
        </svg>
      </div>
    </div>
  );
};
