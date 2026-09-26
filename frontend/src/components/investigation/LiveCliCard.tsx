import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { useCase } from '../../context/CaseContext';

export const LiveCliCard: React.FC = () => {
  const { parameters } = useCase();
  const [copied, setCopied] = useState<boolean>(false);

  // Construct raw string for clipboard
  const lines: string[] = ['ais-oil-investigate \\'];
  lines.push(`  --lat ${parameters.lat.toFixed(6)} \\`);
  lines.push(`  --lon ${parameters.lon.toFixed(6)} \\`);
  lines.push(`  --time "${parameters.observationTime}" \\`);
  lines.push(`  --spread ${parameters.spreadKm.toFixed(1)} \\`);
  lines.push(`  --regime ${parameters.regime} \\`);
  lines.push(`  --ranking-method ${parameters.rankingMethod} \\`);
  if (parameters.enableForwardFit) {
    lines.push('  --enable-forward-fit \\');
  }
  lines.push(`  --output-dir ${parameters.outputDir}`);
  const fullCommandString = lines.join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCommandString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface-2)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--violet-400)]" />
          <span className="font-mono font-semibold text-xs tracking-wider uppercase text-[var(--text-1)]">
            LIVE CLI INVOCATION
          </span>
          <span className="font-mono text-xs text-[var(--text-3)] border border-[var(--border-default)] px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-void)]">
            bash
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 bg-[var(--surface-1)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--border-default)] px-2.5 py-1 rounded-[4px] font-mono text-xs transition-colors cursor-pointer"
          title="Copy command to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--violet-400)]" />
              <span className="text-[var(--violet-400)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Block with coloured React spans (no dangerouslySetInnerHTML) */}
      <div className="p-3.5 font-mono text-xs bg-[var(--bg-void)] text-[var(--text-1)] overflow-x-auto leading-relaxed select-all">
        <div>
          <span className="text-[var(--text-1)] font-bold">ais-oil-investigate</span>{' '}
          <span className="text-[var(--text-3)]">\</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--violet-400)]">--lat</span>{' '}
          <span className="text-[var(--text-1)]">{parameters.lat.toFixed(6)}</span>{' '}
          <span className="text-[var(--text-3)]">\</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--violet-400)]">--lon</span>{' '}
          <span className="text-[var(--text-1)]">{parameters.lon.toFixed(6)}</span>{' '}
          <span className="text-[var(--text-3)]">\</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--violet-400)]">--time</span>{' '}
          <span className="text-[var(--text-1)]">"{parameters.observationTime}"</span>{' '}
          <span className="text-[var(--text-3)]">\</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--violet-400)]">--spread</span>{' '}
          <span className="text-[var(--text-1)]">{parameters.spreadKm.toFixed(1)}</span>{' '}
          <span className="text-[var(--text-3)]">\</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--violet-400)]">--regime</span>{' '}
          <span className="text-[var(--text-1)]">{parameters.regime}</span>{' '}
          <span className="text-[var(--text-3)]">\</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--violet-400)]">--ranking-method</span>{' '}
          <span className="text-[var(--text-1)]">{parameters.rankingMethod}</span>{' '}
          <span className="text-[var(--text-3)]">\</span>
        </div>
        {parameters.enableForwardFit && (
          <div className="pl-4">
            <span className="text-[var(--violet-400)]">--enable-forward-fit</span>{' '}
            <span className="text-[var(--text-3)]">\</span>
          </div>
        )}
        <div className="pl-4">
          <span className="text-[var(--violet-400)]">--output-dir</span>{' '}
          <span className="text-[var(--text-1)]">{parameters.outputDir}</span>
        </div>
      </div>
    </div>
  );
};
