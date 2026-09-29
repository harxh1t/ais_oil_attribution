import React, { useState } from 'react';
import { useCase } from '../../context/CaseContext';
import { Card } from '../ui';
import { CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const RunConsole: React.FC = () => {
  const { runStatus, runProgress, pipelineLogs, serverOnline, lastRunId } = useCase();
  const [showAllLogs, setShowAllLogs] = useState<boolean>(false);

  if (runStatus === 'idle') return null;

  const displayLogs = showAllLogs ? pipelineLogs : pipelineLogs.slice(-6);

  const getStageBadgeColor = (stage: string) => {
    const s = stage.toUpperCase();
    if (s.includes('INIT') || s.includes('START')) return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30';
    if (s.includes('ENV')) return 'bg-teal-500/10 text-teal-600 border-teal-500/30';
    if (s.includes('PERCEPTION') || s.includes('SEGMENT') || s.includes('DEEPLAB')) return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    if (s.includes('HYDRO') || s.includes('DRIFT') || s.includes('OPENDRIFT')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (s.includes('ORIGIN') || s.includes('GATE')) return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    if (s.includes('AIS') || s.includes('INTERSECT') || s.includes('VESSEL')) return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30';
    if (s.includes('FUSION') || s.includes('BORDA') || s.includes('KINEMATIC')) return 'bg-pink-500/10 text-pink-700 border-pink-500/30';
    if (s.includes('ARTIFACT') || s.includes('OUTPUT') || s.includes('BUNDLE')) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
  };

  return (
    <Card className="p-4 bg-[var(--surface-1)] border border-[var(--border-default)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {runStatus === 'running' && (
            <Loader2 className="w-4 h-4 text-[#00A7CC] animate-spin" />
          )}
          {(runStatus === 'completed' || runStatus === 'done') && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          {runStatus === 'error' && (
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
          )}
          <span className="text-xs font-mono font-bold text-[var(--text-1)] uppercase tracking-wide">
            {runStatus === 'running' && `Live Server Execution: ${runProgress}%`}
            {(runStatus === 'completed' || runStatus === 'done') && 'Execution Completed — Attribution Shortlist Verified'}
            {runStatus === 'error' && 'Server Execution Failed'}
          </span>

          {lastRunId && (runStatus === 'completed' || runStatus === 'done') && (
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-[var(--surface-2)] text-[var(--text-2)] rounded border border-[var(--border-subtle)]">
              RUN: {lastRunId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {serverOnline ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SERVER :8000
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
              LOCAL FALLBACK
            </span>
          )}

          <span className="text-xs font-mono font-bold text-[var(--text-2)]">
            {runProgress} / 100
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--surface-2)] h-1.5 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full transition-all duration-300 ${
            runStatus === 'running'
              ? 'bg-gradient-to-r from-[#00A7CC] to-[#3ED4EB] animate-pulse'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${runProgress}%` }}
        />
      </div>

      {/* Live Server Log Feed */}
      {pipelineLogs && pipelineLogs.length > 0 && (
        <div className="mt-3">
          <div className="max-h-36 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-1 scrollbar-thin">
            {displayLogs.map((log, idx: number) => (
              <div
                key={log.id || idx}
                className="flex items-start gap-2 text-[var(--text-2)] hover:bg-black/5 p-1 rounded transition-colors"
              >
                <span className="text-[var(--text-3)] select-none shrink-0 font-bold">&gt;</span>
                {log.timestamp && (
                  <span className="text-[var(--text-3)] text-[10px] shrink-0 font-mono">
                    {log.timestamp}
                  </span>
                )}
                <span
                  className={`px-1.5 py-0.5 rounded text-[9.5px] border uppercase font-semibold shrink-0 ${getStageBadgeColor(
                    log.stage
                  )}`}
                >
                  {log.stage}
                </span>
                <span className="text-[var(--text-1)] font-medium break-all">{log.message}</span>
              </div>
            ))}
          </div>

          {pipelineLogs.length > 6 && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowAllLogs(!showAllLogs)}
                className="text-[10px] font-mono text-[var(--primary-600)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showAllLogs ? (
                  <>
                    Show Recent <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Show All {pipelineLogs.length} Logs <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
