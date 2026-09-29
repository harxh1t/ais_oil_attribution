import React, { useState } from 'react';
import { useCase } from '../../context/CaseContext';
import { Card, Button, Badge } from '../ui';
import { Terminal, Copy, Check, Code, Play } from 'lucide-react';

export const LiveCliCard: React.FC = () => {
  const {
    caseData,
    selectedImage,
    serverOnline,
    serverCliCommand,
    serverTerminalOutput,
    runStatus,
  } = useCase();

  const [activeTab, setActiveTab] = useState<'terminal' | 'cli'>('terminal');
  const [copied, setCopied] = useState<boolean>(false);

  // Dynamic CLI command based on currently selected image or server CLI command
  const effectiveCommand =
    serverCliCommand ||
    `python src/ais_oil_attribution/continuous_pipeline.py --image "22 Zenodo tif images/${selectedImage?.name || '00131.tif'}"`;

  const copyContent = () => {
    const textToCopy = activeTab === 'terminal' ? serverTerminalOutput : effectiveCommand;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 bg-[var(--ocean-1)] border border-[var(--ocean-2)] shadow-[0_4px_16px_rgba(3,14,34,0.18)] text-white">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--ocean-2)]">
        <div className="flex items-center gap-3">
          {/* Unix-style window buttons */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block shadow-sm" />
          </div>

          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--ocean-3)]" />
            <span className="text-xs font-mono font-bold text-white tracking-wide uppercase">
              Live Server Terminal &amp; CLI
            </span>
          </div>

          {/* Server status indicator */}
          {serverOnline ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE :8000
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              OFFLINE
            </span>
          )}
        </div>

        {/* Tab Switcher & Copy Button */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md p-0.5 bg-[#011722] border border-[var(--ocean-2)] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-[var(--ocean-2)] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-3 h-3 text-emerald-400" />
              stdout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cli')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cli'
                  ? 'bg-[var(--ocean-2)] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3 h-3 text-[#3ED4EB]" />
              CLI Command
            </button>
          </div>

          <Button
            size="sm"
            variant="secondary"
            className="border border-[var(--ocean-3)]/40 hover:bg-[var(--ocean-3)] text-xs h-7"
            onClick={copyContent}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1 text-[var(--ocean-3)]" />
                Copy {activeTab === 'terminal' ? 'Log' : 'Command'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Terminal Window */}
      {activeTab === 'terminal' ? (
        <div className="mt-3 bg-[#011722] p-3.5 rounded-[6px] border border-[var(--ocean-2)] font-mono text-xs text-slate-300 leading-relaxed shadow-inner max-h-72 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--ocean-2)]/60 text-[10px] text-slate-400">
            <span>Server Process Stream (continuous_pipeline.py)</span>
            <span className="text-emerald-400 font-semibold">
              {runStatus === 'running' ? '● EXECUTING' : 'IDLE / READY'}
            </span>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11.5px] text-slate-200 selection:bg-cyan-900 selection:text-white">
            {serverTerminalOutput}
            {runStatus === 'running' && (
              <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
            )}
          </pre>
        </div>
      ) : (
        <div className="mt-3 bg-[#011722] p-3.5 rounded-[6px] border border-[var(--ocean-2)] font-mono text-xs text-slate-300 leading-relaxed shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--ocean-2)]/60 text-[10px] text-slate-400">
            <span className="text-[var(--ocean-3)] font-semibold">
              # Headless CLI Reproduction Command
            </span>
            <span className="text-slate-400">
              Environment: PYTHONPATH=src
            </span>
          </div>
          <pre className="whitespace-pre text-emerald-400 font-mono text-[12px] overflow-x-auto py-1">
            {effectiveCommand}
          </pre>
          <div className="mt-2 pt-2 border-t border-[var(--ocean-2)]/60 text-[11px] text-slate-400">
            Outputs will be saved directly to{' '}
            <code className="text-[#3ED4EB]">pipeline_runs/</code> and available for live browser
            analysis.
          </div>
        </div>
      )}
    </Card>
  );
};
