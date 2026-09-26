import React from 'react';
import { Card } from '../ui';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export const ForwardFitValidation: React.FC = () => {
  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[var(--violet-400)]" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
            FORWARD-FIT VALIDATION (CLOSED-LOOP DRIFT CONFIRMATION)
          </h3>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-[var(--text-3)]">Overlap Score:</span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[var(--violet-950)] text-[var(--violet-300)] border border-[var(--violet-400)]/40 font-bold">
            IoU 0.81 (simulated)
          </span>
        </div>
      </div>

      {/* Visual Graphical Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-center">
        {/* SVG Diagram */}
        <div className="relative w-full h-52 bg-[var(--surface-2)] rounded-[8px] border border-[var(--border-default)] p-4 flex items-center justify-center overflow-hidden">
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--text-3) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          <svg viewBox="0 0 400 160" className="w-full h-full max-w-lg">
            {/* Forward-simulated slick envelope (Violet dashed fill) */}
            <path
              d="M 50,85 C 100,60 220,55 350,75 C 340,95 240,115 65,100 Z"
              fill="rgba(142, 123, 255, 0.18)"
              stroke="var(--violet-400)"
              strokeWidth="2"
              strokeDasharray="5 4"
            />

            {/* Observed Sentinel-1 SAR slick polygon (Teal solid) */}
            <path
              d="M 60,82 C 110,65 210,58 340,78 C 330,92 230,110 70,98 Z"
              fill="rgba(45, 212, 191, 0.22)"
              stroke="var(--observed)"
              strokeWidth="2"
            />

            {/* Intersection area label */}
            <text x="180" y="86" fill="var(--text-1)" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
              IoU = 0.81
            </text>
            <text x="160" y="104" fill="var(--text-3)" fontSize="12" fontFamily="JetBrains Mono">
              81% Spatial Overlap
            </text>

            {/* Inferred Release Origin Point */}
            <circle cx="50" cy="85" r="4" fill="var(--inferred)" stroke="#000" strokeWidth="1.5" />
            <text x="10" y="68" fill="var(--inferred)" fontSize="12" fontFamily="JetBrains Mono">
              Release Origin
            </text>

            {/* Eastward drift vector arrow */}
            <line x1="120" y1="35" x2="260" y2="35" stroke="var(--text-3)" strokeWidth="1.5" strokeDasharray="3 3" />
            <polygon points="260,32 268,35 260,38" fill="var(--text-3)" />
            <text x="140" y="24" fill="var(--text-3)" fontSize="12" fontFamily="JetBrains Mono">
              9.2h Advection Vector (80°)
            </text>
          </svg>
        </div>

        {/* Narrative & Metrics */}
        <div className="space-y-3 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-[var(--text-3)] uppercase tracking-wider block">HYPOTHESIS FIT:</span>
            <div className="flex items-center gap-2 text-[var(--text-1)] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[var(--violet-400)] shrink-0" />
              <span>Forward Advection Re-Convergence</span>
            </div>
            <p className="font-sans text-[var(--text-2)] text-xs leading-relaxed pt-1">
              Starting from the inferred release coordinates (34.008°N, 118.731°W) at 16:40 UTC, forward Lagrangian advection forward-integrates 1,500 particles for 9.2 hours under GFS windage and HYCOM current vectors.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Observed SAR Slick:</span>
              <span className="text-[var(--observed)] font-semibold">4.7 km² (Teal solid)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Forward Simulated Plume:</span>
              <span className="text-[var(--violet-300)] font-semibold">5.1 km² (Violet dashed)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Intersection over Union:</span>
              <span className="text-[var(--text-1)] font-bold">0.81 (High Coherence)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
