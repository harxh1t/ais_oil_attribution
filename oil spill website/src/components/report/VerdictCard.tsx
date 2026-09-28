import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card } from '../ui';
import { ConfidenceGauge } from './ConfidenceGauge';
import { AttributionRadarChart } from './AttributionRadarChart';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export const VerdictCard: React.FC = () => {
  const { caseData } = useCase();
  const topCandidate = caseData.vessels[0];

  return (
    <Card className="p-6 md:p-8 bg-[var(--ocean-2)] border border-[var(--ocean-1)] shadow-[0_4px_16px_rgba(3,14,34,0.18)] text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-bold text-white mt-1">
            Primary Target: {topCandidate.name}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-light-subtle)] mt-1">
            <span>MMSI: {topCandidate.mmsi}</span>
            <span>Flag: {topCandidate.flag}</span>
            <span>Type: {topCandidate.type}</span>
            <span>Dimensions: {topCandidate.lengthM}m × {topCandidate.beamM}m</span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[var(--ocean-1)] p-4 rounded-[8px] border border-[var(--ocean-1)] text-white">
          <div>
            <div className="text-xs font-mono text-[var(--text-light-subtle)] uppercase font-semibold">Borda Score</div>
            <div className="text-3xl font-mono font-bold text-white">
              {topCandidate.borda} / 20
            </div>
          </div>
          <ConfidenceGauge value={Math.round(topCandidate.confidence * 100)} />
        </div>
      </div>

      {/* Grid: Narrative Summary & Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 border-b border-white/10">
        <div className="lg:col-span-7 space-y-4 text-sm text-[var(--text-light-subtle)] leading-relaxed">
          <div className="flex items-start gap-2.5">
            <div>
              <strong className="text-white">Forensic Spatiotemporal Coincidence:</strong>
              <p className="mt-1">
                Backward Lagrangian hindcast trajectories from the Sentinel-1 SAR slick footprint at 01:50:00Z trace release centroid convergence to coordinates (34.0080°N, 118.7310°W) at 16:40:00Z.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div>
              <strong className="text-white">Kinematic Alignment:</strong>
              <p className="mt-1">
                Closest point of approach was 1.8 km at 14 minutes after release epoch, with high continuity (97%) during the surveillance window.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[var(--ocean-1)] rounded-[6px] border border-[var(--ocean-1)] text-xs font-mono text-[var(--text-light-subtle)]">
            <strong className="text-white">Exclusion Result:</strong> 6 candidate vessels in the surveillance perimeter were evaluated. {caseData.vessels.length - 1} secondary vessels ranked lower across DCPA, TCPA, Fréchet distance, and AIS continuity criteria.
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-[6px] border border-[var(--ocean-1)] shadow-inner">
          <span className="text-xs font-mono font-bold text-[var(--ocean-1)] uppercase mb-2">
            Multi-Criteria Evidence Profile
          </span>
          <AttributionRadarChart />
        </div>
      </div>

      {/* Readout Badges Bottom */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
        {[
          { label: 'Release Window', value: '16:40:00Z', sub: '9.2h hindcast' },
          { label: 'DCPA Distance', value: `${topCandidate.dcpa} km`, sub: 'Closest approach' },
          { label: 'TCPA Delta', value: `${topCandidate.tcpa} min`, sub: 'Temporal offset' },
          { label: 'Confidence', value: `${Math.round(topCandidate.confidence * 100)}%`, sub: 'Attribution likelihood' },
        ].map((item, idx) => (
          <div key={idx} className="p-3 bg-[var(--ocean-1)] rounded-[6px] border border-[var(--ocean-1)]">
            <div className="text-[10px] font-mono text-[var(--text-light-subtle)] uppercase tracking-wider">{item.label}</div>
            <div className="text-base font-mono font-bold text-white mt-0.5">{item.value}</div>
            <div className="text-[11px] text-[var(--text-light-subtle)]/80 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
