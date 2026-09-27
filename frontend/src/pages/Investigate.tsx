import React, { useEffect } from 'react';
import { ForensicMap } from '../components/investigation/ForensicMap';
import { RunConsole } from '../components/investigation/RunConsole';
import { InvestigationSetup } from '../components/investigation/InvestigationSetup';
import { LiveCliCard } from '../components/investigation/LiveCliCard';
import { HindcastWindowBar } from '../components/investigation/HindcastWindowBar';
import { HindcastPlayhead } from '../components/investigation/HindcastPlayhead';
import { EvidenceLegend } from '../components/ui';
import { JourneyFooter } from '../components/shared/JourneyFooter';
import { useCase } from '../context/CaseContext';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const Investigate: React.FC = () => {
  const {
    runStatus,
    triggerErrorState,
    scenarioScoreDelta,
  } = useCase();

  // Keyboard shortcut Ctrl+Shift+E to trigger simulated error state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        triggerErrorState();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerErrorState]);

  const isRunning = runStatus === 'running';
  const isError = runStatus === 'error';
  const isDone = runStatus === 'done' || runStatus === 'completed';

  return (
    <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-pad)] py-6 space-y-6">
      {/* 1. TITLE ROW */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div className="space-y-1.5">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--violet-400)] font-semibold">
            STAGE 02 · INVESTIGATION
          </div>
          <h1 className="font-display font-bold text-[32px] sm:text-[40px] leading-tight text-[var(--text-1)]">
            Set up the investigation
          </h1>
          <p className="font-sans text-[15px] text-[var(--text-2)] max-w-2xl">
            Enter the observation, choose how WAKE should reason about it, and run the pipeline.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <EvidenceLegend compact />
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)] border border-[var(--border-strong)] px-2.5 py-1 rounded-[4px] whitespace-nowrap bg-[var(--surface-1)]">
            SIMULATED DEMONSTRATION DATA
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN GRID LAYOUT
          ≥1280px: grid-cols-[440px_1fr]
          1100px-1279px: stack or 400px/1fr
          <900px: map goes first (order-1), form second (order-2)
      */}
      <div className="flex flex-col min-[1100px]:grid min-[1280px]:grid-cols-[440px_1fr] min-[1100px]:grid-cols-[400px_1fr] gap-6 items-start">
        {/* LEFT COLUMN: Form Cards + Sticky Action Bar */}
        <div className="w-full order-2 min-[900px]:order-1 space-y-4">
          <InvestigationSetup />
        </div>

        {/* RIGHT COLUMN: Map Area (replaced by RunConsole while running/error), Live CLI, Window Bar */}
        <div className="w-full order-1 min-[900px]:order-2 space-y-4 min-w-0">
          {/* Map Card OR Run Console */}
          <div className="relative w-full rounded-[10px] overflow-hidden shadow-2xl bg-[var(--surface-1)]">
            {isRunning || isError ? (
              <RunConsole />
            ) : (
              <div className="space-y-3">
                <ForensicMap />
                <HindcastPlayhead />
              </div>
            )}
          </div>

          {/* FOCUSED CANDIDATE STRIP (Visible after run complete) */}
          {isDone && (
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-3.5 font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[var(--text-3)] uppercase tracking-wider">FOCUSED CANDIDATE:</span>
                <span className="text-[var(--text-1)] font-bold text-sm">
                  {scenarioScoreDelta.leadName}
                </span>
                <span className="text-[var(--text-3)]">· Tanker</span>
                {scenarioScoreDelta.isSwap ? (
                  <span className="flex items-center gap-1 text-[var(--warning)] border border-[var(--warning)]/40 px-2 py-0.5 rounded-[4px] bg-[var(--warning)]/10 text-xs font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>⇄ SENSITIVITY SWAP</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[var(--text-2)] border border-[var(--border-strong)] px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--violet-400)]" />
                    <span>RUN COMPLETE</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[var(--text-2)] flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-3)]">DCPA:</span>
                  <span className="text-[var(--text-1)] font-semibold">{scenarioScoreDelta.leadDcpa.toFixed(1)} km</span>
                  <span className="text-[var(--derived)] border border-[var(--derived)]/40 px-1 py-0.2 rounded-[3px] text-xs font-mono">
                    DERIVED
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-3)]">TCPA:</span>
                  <span className="text-[var(--text-1)] font-semibold">{scenarioScoreDelta.leadTcpa} min</span>
                  <span className="text-[var(--derived)] border border-[var(--derived)]/40 px-1 py-0.2 rounded-[3px] text-xs font-mono">
                    DERIVED
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-3)]">Continuity:</span>
                  <span className="text-[var(--text-1)] font-semibold">{scenarioScoreDelta.continuity}%</span>
                  <span className="text-[var(--derived)] border border-[var(--derived)]/40 px-1 py-0.2 rounded-[3px] text-xs font-mono">
                    DERIVED
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-3)]">Rank:</span>
                  <span className="text-[var(--violet-400)] font-bold">{scenarioScoreDelta.scoreText}</span>
                </div>
              </div>
            </div>
          )}

          {/* SIGNATURE FEATURE: LIVE CLI CARD */}
          <LiveCliCard />

          {/* HINDCAST WINDOW BAR */}
          <HindcastWindowBar />
        </div>
      </div>

      {/* 3. JOURNEY FOOTER */}
      <JourneyFooter />
    </div>
  );
};
