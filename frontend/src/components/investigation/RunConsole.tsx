import React, { useState, useEffect } from 'react';
import {
  Rotate3D,
  CheckCircle2,
  Circle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Terminal,
  Clock,
} from 'lucide-react';
import { useCase, WORKFLOW_STEPS } from '../../context/CaseContext';
import { Button, Card, Progress } from '../ui';
import { cn } from '../../utils/cn';

export const RunConsole: React.FC = () => {
  const {
    runStatus,
    runProgress,
    activeWorkflowStep,
    pipelineLogs,
    cancelForensicRun,
    retryRun,
    resetParameters,
  } = useCase();

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (runStatus === 'running') {
      setElapsedSeconds(0);
      const startMs = Date.now();
      timer = setInterval(() => {
        const elapsed = (Date.now() - startMs) / 1000;
        setElapsedSeconds(elapsed);
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [runStatus]);

  if (runStatus === 'error') {
    return (
      <div className="w-full h-full min-h-[550px] lg:min-h-[720px] flex items-center justify-center p-6 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] shadow-2xl">
        <Card className="max-w-xl w-full bg-[var(--surface-2)] border-[var(--warning)]/40 p-6 space-y-5 text-center">
          <div className="w-12 h-12 rounded-[6px] bg-[var(--warning)]/10 border border-[var(--warning)]/30 flex items-center justify-center mx-auto text-[var(--warning)]">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <div className="font-mono text-xs uppercase tracking-wider text-[var(--warning)]">
              EXECUTION ERROR (CTRL+SHIFT+E TRIGGERED)
            </div>
            <h3 className="font-display font-bold text-xl text-[var(--text-1)]">
              Lagrangian Advection Kernel Divergence
            </h3>
            <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed max-w-md mx-auto">
              Simulated numerical instability detected in hydrodynamic current interpolation at boundary coordinates.
              Step 5/8 (Lagrangian Reverse Hindcast) exceeded numerical tolerance thresholds.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2 font-mono text-xs">
            <Button
              variant="secondary"
              size="md"
              onClick={resetParameters}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Reset Parameters
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={retryRun}
              icon={<Rotate3D className="w-4 h-4" />}
            >
              Retry Pipeline Execution
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[550px] lg:min-h-[720px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] p-5 flex flex-col justify-between shadow-2xl font-mono text-xs space-y-4">
      {/* Top Header & Timer */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Rotate3D className="w-5 h-5 text-[var(--violet-400)] animate-spin" />
          <div>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
              EXECUTING WAKE FORENSIC ATTRIBUTION
            </h3>
            <p className="text-xs text-[var(--text-3)]">
              Santa Monica Bay · 8-Step Physics & Kinematic Pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-1)] font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-[var(--violet-400)]" />
            <span>ELAPSED:</span>
            <span className="font-bold tabular-nums">{elapsedSeconds.toFixed(1)} s</span>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={cancelForensicRun}
            icon={<XCircle className="w-3.5 h-3.5" />}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-[var(--text-3)] font-mono">
          <span>PIPELINE PROGRESS</span>
          <span className="text-[var(--text-1)] font-bold">{runProgress}%</span>
        </div>
        <Progress value={runProgress} />
      </div>

      {/* 8-Step Vertical Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-auto">
        {WORKFLOW_STEPS.map((stepItem) => {
          const isDone = stepItem.step < activeWorkflowStep;
          const isRunning = stepItem.step === activeWorkflowStep;
          const isQueued = stepItem.step > activeWorkflowStep;

          return (
            <div
              key={stepItem.step}
              className={cn(
                'flex items-center gap-2.5 p-2.5 rounded-[6px] border transition-colors',
                isRunning
                  ? 'bg-[var(--violet-950)]/40 border-[var(--violet-400)] shadow-[0_0_12px_var(--glow-violet)]'
                  : isDone
                  ? 'bg-[var(--surface-2)] border-[var(--border-default)]'
                  : 'bg-[var(--surface-2)]/40 border-[var(--border-subtle)] opacity-50'
              )}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--violet-400)] shrink-0" />
              ) : isRunning ? (
                <Rotate3D className="w-4 h-4 text-[var(--violet-300)] animate-spin shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-[var(--text-disabled)] shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'font-semibold text-xs truncate',
                      isRunning
                        ? 'text-white'
                        : isDone
                        ? 'text-[var(--text-1)]'
                        : 'text-[var(--text-3)]'
                    )}
                  >
                    [{stepItem.step}/8] {stepItem.title}
                  </span>
                  <span
                    className={cn(
                      'text-xs uppercase font-mono',
                      isRunning
                        ? 'text-[var(--violet-400)] font-bold'
                        : isDone
                        ? 'text-[var(--text-2)]'
                        : 'text-[var(--text-disabled)]'
                    )}
                  >
                    {isRunning ? 'RUNNING' : isDone ? 'DONE' : 'QUEUED'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monospace Streaming Log Terminal */}
      <div className="bg-[var(--bg-void)] border border-[var(--border-default)] rounded-[6px] p-3 space-y-1">
        <div className="flex items-center justify-between text-xs text-[var(--text-3)] pb-1 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[var(--violet-400)]" />
            <span className="font-semibold uppercase tracking-wider">SOLVER KERNEL STREAM</span>
          </div>
          <span>REAL-TIME TELEMETRY</span>
        </div>

        <div className="h-28 overflow-y-auto space-y-1 font-mono text-xs text-[var(--text-2)] pt-1 select-text">
          {pipelineLogs.map((log) => (
            <div key={log.id} className="leading-tight flex items-start gap-1.5">
              <span className="text-[var(--text-disabled)]">&gt;</span>
              <span className="text-[var(--text-3)] shrink-0">[{log.timestamp}]</span>
              <span className="text-[var(--text-1)]">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
