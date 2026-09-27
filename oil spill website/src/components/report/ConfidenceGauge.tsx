import React from 'react';

interface ConfidenceGaugeProps {
  value: number;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ value }) => {
  // Arc calculation for SVG half-gauge
  const radius = 38;
  const strokeWidth = 7;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-24 h-14 flex items-end justify-center">
      <svg className="w-24 h-14 overflow-visible" viewBox="0 0 100 55">
        {/* Background track */}
        <path
          d="M 12 50 A 38 38 0 0 1 88 50"
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress track */}
        <path
          d="M 12 50 A 38 38 0 0 1 88 50"
          fill="none"
          stroke="var(--primary-600)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute bottom-0 text-[11px] font-mono font-bold text-[var(--text-2)]">
        {value}%
      </div>
    </div>
  );
};
