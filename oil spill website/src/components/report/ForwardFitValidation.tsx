import React from 'react';
import { Card, Badge } from '../ui';
import { CheckCircle2 } from 'lucide-react';

export const ForwardFitValidation: React.FC = () => {
  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              Forward-Fit Validation Check
            </h3>
          </div>
          <Badge variant="observed" noIcon>Passed (IoU: 0.84)</Badge>
        </div>

        <div className="mt-4 space-y-4 text-xs text-[var(--text-2)] leading-relaxed">
          <p>
            To eliminate reverse-time numerical diffusion artifacts, WAKE re-runs the physics engine forward in time: particles are seeded at the candidate release coordinates at <strong>01:50:00Z</strong> and advected through time to <strong>16:40:00Z</strong>.
          </p>

          <div className="p-3.5 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)] space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Spatial IoU Overlap:</span>
              <span className="font-bold text-[var(--text-1)]">0.84 (84% spatial match)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Centroid Offset at T=0:</span>
              <span className="font-bold text-[var(--text-1)]">0.31 km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Area Conservation Ratio:</span>
              <span className="font-bold text-[var(--text-1)]">0.96 (Simulated vs Observed)</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[var(--text-1)]">
            <span>Forward simulation independently reproduces the observed satellite slick shape, orientation, and elongation.</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
