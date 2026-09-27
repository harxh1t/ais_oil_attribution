import React, { useState } from 'react';
import { useCase } from '../../context/CaseContext';
import { Card, Button, Badge } from '../ui';
import { Terminal, Copy, Check } from 'lucide-react';

export const LiveCliCard: React.FC = () => {
  const { caseData, hindcastHours = 9.2, ensembleSize = 1500 } = useCase();
  const [copied, setCopied] = useState<boolean>(false);

  const command = `wake hindcast --case ${caseData.id} \\
  --sar-acq "2024-08-06T01:50:00Z" \\
  --coords ${caseData.observationCentroid.lat.toFixed(4)},${caseData.observationCentroid.lon.toFixed(4)} \\
  --hours ${hindcastHours} \\
  --ensemble ${ensembleSize} \\
  --model hycom_gfs \\
  --out-format json,pdf`;

  const copyCommand = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 bg-[var(--ocean-1)] border border-[var(--ocean-2)] shadow-[0_4px_16px_rgba(3,14,34,0.18)] text-white">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--ocean-2)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--ocean-3)]" />
          <span className="text-xs font-mono font-bold text-white tracking-wide">
            LIVE CLI REPRODUCTION PIPELINE
          </span>
          <Badge variant="neutral">Deterministic</Badge>
        </div>

        <Button size="sm" variant="secondary" className="border border-[var(--ocean-3)]/40 hover:bg-[var(--ocean-3)]" onClick={copyCommand}>
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Copied CLI
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1 text-[var(--ocean-3)]" />
              Copy Shell Command
            </>
          )}
        </Button>
      </div>

      <div className="mt-3 bg-[#011722] p-3.5 rounded-[6px] border border-[var(--ocean-2)] font-mono text-xs text-[var(--text-light-subtle)] overflow-x-auto leading-relaxed shadow-inner">
        <div className="text-[var(--ocean-3)] mb-1 font-semibold"># Execute attribution pipeline via WAKE headless analyst CLI</div>
        <pre className="whitespace-pre text-white">{command}</pre>
      </div>
    </Card>
  );
};
