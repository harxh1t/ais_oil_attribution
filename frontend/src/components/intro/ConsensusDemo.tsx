import React, { useState } from 'react';
import { MALIBU_CASE } from '../../data/malibuCase';
import { Badge } from '../ui';

type MetricKey = 'dcpa' | 'tcpa' | 'frechet' | 'continuity' | 'borda';

interface MetricOption {
  key: MetricKey;
  label: string;
  provenance: 'derived' | 'inferred';
  description: string;
}

const METRICS: MetricOption[] = [
  { key: 'dcpa', label: 'DCPA', provenance: 'derived', description: 'Closest distance to release point (km)' },
  { key: 'tcpa', label: 'TCPA', provenance: 'derived', description: 'Temporal offset at CPA (minutes)' },
  { key: 'frechet', label: 'Fréchet', provenance: 'derived', description: 'Discrete trajectory shape similarity (km)' },
  { key: 'continuity', label: 'Continuity', provenance: 'derived', description: 'AIS reception percentage (%)' },
  { key: 'borda', label: 'Borda consensus', provenance: 'inferred', description: 'Rank-sum positional consensus (out of 20)' },
];

export const ConsensusDemo: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('borda');

  // Sorted candidates based on metric
  const sortedVessels = [...MALIBU_CASE.vessels].sort((a, b) => {
    if (selectedMetric === 'dcpa') return a.dcpa - b.dcpa;
    if (selectedMetric === 'tcpa') return a.tcpa - b.tcpa;
    if (selectedMetric === 'frechet') return a.frechet - b.frechet;
    if (selectedMetric === 'continuity') return b.continuity - a.continuity;
    return b.borda - a.borda; // Borda consensus
  });

  return (
    <div className="bg-[#0E0B1F] border border-[rgba(167,139,250,0.22)] rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Top selector chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(167,139,250,0.15)] pb-4">
        <div>
          <h4 className="font-display font-bold text-lg text-[#F4F2FF] flex items-center gap-2">
            <span>Consensus Ranking Demonstration</span>
            <Badge variant={selectedMetric === 'borda' ? 'inferred' : 'derived'} size="sm">
              {selectedMetric === 'borda' ? 'Inferred · Consensus' : 'Derived · Metric'}
            </Badge>
          </h4>
          <p className="font-sans text-xs text-[#C0BCDB] mt-1">
            Toggle criteria to observe how single kinematic measures disagree versus robust Borda fusion.
          </p>
        </div>

        {/* 5 Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {METRICS.map((m) => {
            const isSelected = selectedMetric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#7C3AED] text-white font-medium shadow-[0_0_12px_rgba(124,58,237,0.4)] ring-1 ring-[#A78BFA]'
                    : 'bg-[#151230] text-[#C0BCDB] hover:text-[#F4F2FF] border border-[rgba(167,139,250,0.18)]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bar Chart View */}
      <div className="space-y-3 font-mono text-xs">
        {sortedVessels.map((v, idx) => {
          const isLeader = idx === 0;

          // Points breakdown for stacked bar in Borda mode:
          // Total scores: 18, 14, 13, 10, 5, 0 out of 20
          let valDisplay = '';
          let barPercent = 0;

          if (selectedMetric === 'dcpa') {
            valDisplay = `${v.dcpa.toFixed(1)} km`;
            barPercent = Math.max(10, Math.min(100, (6.0 - v.dcpa) * 20));
          } else if (selectedMetric === 'tcpa') {
            valDisplay = `${v.tcpa} min`;
            barPercent = Math.max(10, Math.min(100, (80 - v.tcpa) * 1.3));
          } else if (selectedMetric === 'frechet') {
            valDisplay = `${v.frechet.toFixed(1)} km`;
            barPercent = Math.max(10, Math.min(100, (8.0 - v.frechet) * 16));
          } else if (selectedMetric === 'continuity') {
            valDisplay = `${v.continuity}%`;
            barPercent = v.continuity;
          } else {
            valDisplay = `${v.borda} / 20 pts`;
            barPercent = (v.borda / 20) * 100;
          }

          return (
            <div key={v.id} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                      isLeader
                        ? 'bg-[#7C3AED] text-white shadow-[0_0_8px_rgba(124,58,237,0.5)]'
                        : 'bg-[#151230] text-[#9691B3]'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className={`font-sans font-semibold ${isLeader ? 'text-white' : 'text-[#C0BCDB]'}`}>
                    {v.name}
                  </span>
                  <span className="font-mono text-[#9691B3] hidden sm:inline">({v.type})</span>
                </div>
                <span className={`font-mono ${isLeader ? 'text-[#2DD4BF] font-bold' : 'text-[#F4F2FF]'}`}>
                  {valDisplay}
                </span>
              </div>

              {/* Horizontal Bar */}
              <div className="w-full h-3.5 bg-[#070512] rounded-full overflow-hidden p-0.5 border border-[rgba(167,139,250,0.15)] flex">
                {selectedMetric === 'borda' ? (
                  // Stacked segments for Borda: DCPA pts + TCPA pts + Frechet pts + Continuity pts
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#7C3AED] via-[#A78BFA] to-[#2DD4BF]"
                    style={{ width: `${barPercent}%` }}
                  />
                ) : (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLeader ? 'bg-[#2DD4BF]' : 'bg-[#1E1A40]'
                    }`}
                    style={{ width: `${barPercent}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Caption & provenance */}
      <div className="pt-2 border-t border-[rgba(167,139,250,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#9691B3]">
        <p className="font-sans">
          Single metrics disagree. Consensus doesn&apos;t depend on hand-tuned weights. Simulated demonstration data.
        </p>
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <span>PROVENANCE:</span>
          <span className="text-[#FBBF24]">Derived (Metrics)</span>
          <span>·</span>
          <span className="text-[#F472B6]">Inferred (Borda)</span>
        </div>
      </div>
    </div>
  );
};
