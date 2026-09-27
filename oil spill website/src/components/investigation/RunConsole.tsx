import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card } from '../ui';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const RunConsole: React.FC = () => {
  const { runStatus, runProgress, pipelineLogs } = useCase();

  if (runStatus === 'idle') return null;

  return (
    <Card className="p-4 bg-[var(--surface-1)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {runStatus === 'running' && (
            <Loader2 className="w-4 h-4 text-[var(--primary-600)] animate-spin" />
          )}
          {(runStatus === 'completed' || runStatus === 'done') && (
            <CheckCircle2 className="w-4 h-4 text-[var(--observed)]" />
          )}
          {runStatus === 'error' && (
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
          )}
          <span className="text-xs font-mono font-bold text-[var(--text-1)] uppercase">
            {runStatus === 'running' && `Executing Pipeline: ${runProgress}%`}
            {(runStatus === 'completed' || runStatus === 'done') && 'Execution Completed — Attribution Shortlist Verified'}
            {runStatus === 'error' && 'Execution Failed'}
          </span>
        </div>

        <span className="text-xs font-mono text-[var(--text-3)]">
          {runProgress} / 100
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--surface-2)] h-1.5 rounded-full overflow-hidden mt-3">
        <div
          className="bg-[var(--primary-600)] h-full transition-all duration-300"
          style={{ width: `${runProgress}%` }}
        />
      </div>

      {/* Log feed */}
      {pipelineLogs && pipelineLogs.length > 0 && (
        <div className="mt-3 max-h-24 overflow-y-auto font-mono text-[11px] text-[var(--text-2)] space-y-1">
          {pipelineLogs.slice(-4).map((log, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[var(--text-3)]">&gt;</span>
              <span>{log.stage}: {log.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
