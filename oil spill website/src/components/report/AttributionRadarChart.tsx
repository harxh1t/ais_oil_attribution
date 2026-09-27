import React from 'react';

export const AttributionRadarChart: React.FC = () => {
  // 5 axes: Spatial Fit, Temporal Fit, AIS Gap, Drift Alignment, Kinematic Plausibility
  // Values for Top Candidate (88%)
  const scores = [0.92, 0.88, 0.95, 0.86, 0.90];
  const labels = ['Spatial', 'Temporal', 'AIS Gap', 'Drift Fit', 'Kinematics'];

  const size = 180;
  const center = size / 2;
  const radius = 65;

  const points = scores.map((score, i) => {
    const angle = (i * 2 * Math.PI) / scores.length - Math.PI / 2;
    const r = score * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const gridLevels = [0.33, 0.66, 1.0];

  return (
    <div className="relative w-[200px] h-[190px] flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Polygon Web */}
        {gridLevels.map((level, idx) => {
          const gridPoints = Array.from({ length: 5 }).map((_, i) => {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            const r = level * radius;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ');

          return (
            <polygon
              key={idx}
              points={gridPoints}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth="0.75"
            />
          );
        })}

        {/* Axis Lines */}
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="var(--border-subtle)"
              strokeWidth="0.75"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={points}
          fill="var(--primary-600)"
          fillOpacity="0.2"
          stroke="var(--primary-600)"
          strokeWidth="1.75"
        />

        {/* Axis Labels */}
        {labels.map((label, i) => {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const r = radius + 15;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle) + 4;
          return (
            <text
              key={i}
              x={x}
              y={y}
              fill="var(--text-3)"
              fontSize="9"
              fontFamily="Arial, Helvetica, sans-serif"
              fontWeight="600"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
