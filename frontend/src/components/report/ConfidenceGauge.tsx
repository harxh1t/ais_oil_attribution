import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

interface ConfidenceGaugeProps {
  value?: number; // 0 to 1
  label?: string;
  marginText?: string;
  className?: string;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  value = 0.74,
  label = 'MODERATE-HIGH',
  marginText = '+4 over MV Pacific Lantern',
  className = '',
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 150);
    return () => clearTimeout(timer);
  }, [value]);

  const size = 110;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - animatedValue * circumference;

  return (
    <div className={cn('flex flex-col items-center select-none', className)}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--surface-3)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Value Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--violet-400)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 6px var(--glow-violet))',
            }}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono font-bold text-2xl text-[var(--text-1)] tabular-nums leading-none">
            {value.toFixed(2)}
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-3)] mt-1">
            {Math.round(value * 100)}%
          </span>
        </div>
      </div>

      <div className="mt-2 text-center space-y-0.5 font-mono text-xs">
        <span className="inline-block px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] font-semibold text-[var(--violet-300)]">
          {label}
        </span>
        {marginText && (
          <div className="text-[var(--text-3)] pt-0.5">
            Margin: <span className="text-[var(--text-1)] font-semibold">{marginText}</span>
          </div>
        )}
      </div>
    </div>
  );
};
