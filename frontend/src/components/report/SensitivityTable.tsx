import React from 'react';
import { Card } from '../ui';
import { SlidersHorizontal, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { RANK_STABILITY_CASES } from '../../data/malibuCase';
import { cn } from '../../utils/cn';

export const SensitivityTable: React.FC = () => {
  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[var(--violet-400)]" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
            SENSITIVITY & RANK STABILITY (7 PERTURBATION SCENARIOS)
          </h3>
        </div>
        <span className="font-mono text-xs text-[var(--text-3)]">
          Numerical Robustness Testing
        </span>
      </div>

      {/* Summary Banner Line */}
      <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-default)] flex items-center gap-2.5 text-xs font-mono">
        <div className="w-2 h-2 rounded-full bg-[var(--violet-400)] shrink-0" />
        <span className="text-[var(--text-1)] font-sans text-xs">
          <strong>Summary:</strong> Rank #1 holds in 6 of 7 perturbations and changes only when the release epoch shifts by +25 min.
        </span>
      </div>

      {/* 7-Row Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-3)]">
              <th className="py-2.5 px-3 font-semibold">PERTURBATION PARAMETER</th>
              <th className="py-2.5 px-3 font-semibold">LEAD CANDIDATE</th>
              <th className="py-2.5 px-3 font-semibold">RUNNER-UP</th>
              <th className="py-2.5 px-3 font-semibold text-right">SCORE DELTA</th>
              <th className="py-2.5 px-3 font-semibold text-center">STATUS</th>
              <th className="py-2.5 px-3 font-semibold">INTERPRETATION (SIMULATED)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {RANK_STABILITY_CASES.map((row, idx) => {
              const isSwap = row.outcome === 'rank_swap';

              return (
                <tr
                  key={idx}
                  className={cn(
                    'transition-colors',
                    isSwap ? 'bg-[var(--danger)]/5 hover:bg-[var(--danger)]/10' : 'hover:bg-[var(--surface-2)]/60'
                  )}
                >
                  {/* Parameter */}
                  <td className="py-2.5 px-3 font-bold text-[var(--text-1)] whitespace-nowrap">
                    {row.parameter}
                  </td>

                  {/* Lead Candidate */}
                  <td className="py-2.5 px-3 text-[var(--text-2)] whitespace-nowrap">
                    <span className={cn('font-semibold', isSwap ? 'text-[var(--danger)]' : 'text-[var(--violet-300)]')}>
                      {row.leadVessel}
                    </span>
                  </td>

                  {/* Runner Up */}
                  <td className="py-2.5 px-3 text-[var(--text-3)] whitespace-nowrap">
                    {row.runnerUp}
                  </td>

                  {/* Score Delta */}
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    <span className={cn('font-semibold', isSwap ? 'text-[var(--danger)]' : 'text-[var(--text-1)]')}>
                      {row.scoreDelta}
                    </span>
                  </td>

                  {/* Status Chip (Neutral styling: ✓ STABLE / ⇄ SWAP) */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {isSwap ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--surface-3)] border border-[var(--border-strong)] text-[var(--text-1)] font-semibold text-xs">
                        <RefreshCw className="w-3 h-3 text-[var(--danger)]" />
                        <span>⇄ SWAP</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-2)] font-semibold text-xs">
                        <Check className="w-3 h-3 text-[var(--violet-400)]" />
                        <span>✓ STABLE</span>
                      </span>
                    )}
                  </td>

                  {/* Interpretation (simulated) */}
                  <td className="py-2.5 px-3 text-[var(--text-3)] font-sans text-xs max-w-md">
                    {row.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
