import React, { useState } from 'react';
import { Card, Button, Badge } from '../ui';
import { Terminal, X, Copy, Check } from 'lucide-react';

interface CliModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CliModal: React.FC<CliModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const cliSnippet = `# 1. Install WAKE Forensic CLI
curl -sSL https://get.wake-forensics.org | bash

# 2. Authenticate Copernicus Hub & NOAA API
wake auth configure --sar-provider copernicus --ocean-model noaa-roms

# 3. Ingest SAR Scene & Execute Lagrangian Hindcast
wake run --case CA-MALIBU-001 \\
  --sar-acq "2026-03-14T16:40:00Z" \\
  --lat 33.9550 --lon -118.7750 \\
  --hindcast-hours 14.8 \\
  --ensemble-size 250 \\
  --ais-coincidence --format pdf,json`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cliSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--primary-600)]" />
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              WAKE Headless Analyst CLI
            </h3>
            <Badge variant="neutral">Terminal Reference</Badge>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-[var(--text-2)] mb-3">
            Every investigation performed in the WAKE GUI can be executed headlessly in automated coastal surveillance pipelines or integrated into maritime law enforcement command workflows:
          </p>

          <div className="bg-[var(--ocean-1)] text-white p-4 rounded-[6px] border border-[var(--ocean-2)] font-mono text-xs overflow-x-auto shadow-inner">
            <pre className="whitespace-pre leading-relaxed">{cliSnippet}</pre>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-xs font-mono text-[var(--text-3)]">
            Version 2.4.0 • Linux / macOS / Windows
          </span>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-[var(--observed)]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy Snippet'}
            </Button>
            <Button size="sm" variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
