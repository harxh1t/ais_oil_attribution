import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts';
import { useCase } from '../../context/CaseContext';
import { Card, Button } from '../ui';
import { Layers, ArrowLeftRight } from 'lucide-react';

export const AttributionRadarChart: React.FC = () => {
  const { caseData, selectedVessel } = useCase();
  const [showComparison, setShowComparison] = useState<boolean>(true);

  const v1 = caseData.vessels[0]; // MV Meridian Crest
  const v2 = caseData.vessels[1]; // MV Pacific Lantern

  // Normalise metrics to 0-100 where higher is better
  // DCPA: range [1.8, 12.6] km -> 100 = closest
  // TCPA: range [9, 74] min -> 100 = tightest
  // Fréchet: range [2.4, 14.5] km -> 100 = closest path fit
  // Continuity: range [0, 100]% -> 100 = continuous
  const normalize = (v: typeof v1) => {
    const dcpaScore = Math.max(0, Math.min(100, Math.round(100 - ((v.dcpa - 1.8) / (12.6 - 1.8)) * 100)));
    const tcpaScore = Math.max(0, Math.min(100, Math.round(100 - ((v.tcpa - 9) / (74 - 9)) * 100)));
    const frechetScore = Math.max(0, Math.min(100, Math.round(100 - ((v.frechet - 2.4) / (14.5 - 2.4)) * 100)));
    const continuityScore = v.continuity;

    return {
      dcpaScore,
      tcpaScore,
      frechetScore,
      continuityScore,
    };
  };

  const selectedNorm = normalize(selectedVessel);
  const v1Norm = normalize(v1);
  const v2Norm = normalize(v2);

  // If selected vessel is v1 or v2, comparison compares v1 (#1) vs v2 (#2).
  // If selected is v3-v6, compare selected with #1 lead.
  const isSelectedLeader = selectedVessel.id === v1.id;
  const compareTarget = isSelectedLeader ? v2 : v1;
  const compareNorm = isSelectedLeader ? v2Norm : v1Norm;

  const radarData = [
    {
      metric: 'Spatial DCPA Proximity',
      [selectedVessel.name]: selectedNorm.dcpaScore,
      [compareTarget.name]: compareNorm.dcpaScore,
      fullMark: 100,
    },
    {
      metric: 'Temporal TCPA Fit',
      [selectedVessel.name]: selectedNorm.tcpaScore,
      [compareTarget.name]: compareNorm.tcpaScore,
      fullMark: 100,
    },
    {
      metric: 'Trajectory Fréchet Fit',
      [selectedVessel.name]: selectedNorm.frechetScore,
      [compareTarget.name]: compareNorm.frechetScore,
      fullMark: 100,
    },
    {
      metric: 'AIS Transmission Continuity',
      [selectedVessel.name]: selectedNorm.continuityScore,
      [compareTarget.name]: compareNorm.continuityScore,
      fullMark: 100,
    },
  ];

  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-4 flex flex-col justify-between shadow-2xl h-full min-h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--violet-400)]" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
              MULTI-METRIC ATTRIBUTION RADAR
            </h3>
          </div>
          <p className="font-mono text-xs text-[var(--text-3)] mt-0.5">
            Normalised 4-axis performance (100 = optimum)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowComparison(!showComparison)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-2)] hover:text-[var(--text-1)] text-xs font-mono transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--violet-400)]" />
          <span>{showComparison ? 'Hide Comparison' : `Overlay ${compareTarget.name}`}</span>
        </button>
      </div>

      {/* Recharts Radar */}
      <div className="w-full h-[320px] my-auto">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: 'var(--text-2)', fontSize: 12, fontFamily: 'JetBrains Mono' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: 'var(--text-3)', fontSize: 12 }}
              stroke="var(--border-subtle)"
            />

            {/* Selected Vessel Radar */}
            <Radar
              name={selectedVessel.name}
              dataKey={selectedVessel.name}
              stroke="var(--violet-400)"
              fill="var(--violet-400)"
              fillOpacity={0.4}
              strokeWidth={2}
            />

            {/* Comparison Target Radar */}
            {showComparison && (
              <Radar
                name={compareTarget.name}
                dataKey={compareTarget.name}
                stroke="#FBBF24"
                fill="#FBBF24"
                fillOpacity={0.2}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border-default)',
                borderRadius: '6px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
                color: 'var(--text-1)',
              }}
            />
            <Legend
              wrapperStyle={{
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
                paddingTop: '8px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Analytical Note */}
      <div className="pt-2 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-3)] flex items-center justify-between">
        <span>
          Selected: <strong className="text-[var(--violet-300)]">{selectedVessel.name}</strong> (#{selectedVessel.rank})
        </span>
        {showComparison && (
          <span className="text-[var(--derived)]">
            Reference: <strong>{compareTarget.name}</strong> (#{compareTarget.rank})
          </span>
        )}
      </div>
    </Card>
  );
};
