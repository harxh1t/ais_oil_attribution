import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Badge } from '../ui';
import { Clock, Waves } from 'lucide-react';

export const HindcastWindowBar: React.FC = () => {
  const { caseData, hindcastHours = 9.2 } = useCase();

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[6px] px-3 py-2 shadow-sm flex flex-wrap items-center gap-4 text-xs font-mono">
      <div className="flex items-center gap-1.5 text-[var(--text-1)]">
        <Clock className="w-3.5 h-3.5 text-[var(--primary-600)]" />
        <span className="font-bold">Temporal Window:</span>
        <span className="text-[var(--text-2)]">01:50:00Z (SAR) &larr; 16:40:00Z</span>
      </div>

      <div className="flex items-center gap-1.5 text-[var(--text-2)] border-l border-[var(--border-subtle)] pl-3">
        <Waves className="w-3.5 h-3.5 text-[var(--observed)]" />
        <span>Current: {caseData.environmental.currentSpeedKts} kt @ {caseData.environmental.currentDirectionDeg}°</span>
      </div>

      <div className="flex items-center gap-1.5 text-[var(--text-2)] border-l border-[var(--border-subtle)] pl-3">
        <Badge variant="neutral">Hindcast {hindcastHours}h</Badge>
      </div>
    </div>
  );
};
