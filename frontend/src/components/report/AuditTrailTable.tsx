import React, { useState } from 'react';
import { Card } from '../ui';
import { FileCode, Copy, Check, Hash } from 'lucide-react';

interface AuditFile {
  name: string;
  size: string;
  format: string;
  hash: string;
  description: string;
}

const AUDIT_FILES: AuditFile[] = [
  {
    name: 'input.json',
    size: '14.2 KB',
    format: 'JSON',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description: 'Validated CLI parameters, SAR bounding box, and forcing field metadata',
  },
  {
    name: 'attribution.json',
    size: '28.4 KB',
    format: 'JSON',
    hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    description: 'Forensic dossier payload with Borda consensus scores and candidate breakdowns',
  },
  {
    name: 'attribution_scores.parquet',
    size: '64.1 KB',
    format: 'Parquet',
    hash: 'f45b3a1c998246e72b49c0d12e843f5167a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
    description: 'Tabular metric matrix (DCPA, TCPA, Fréchet, continuity) with sensitivity records',
  },
  {
    name: 'reconstructed_tracks.parquet',
    size: '118.5 KB',
    format: 'Parquet',
    hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    description: 'Resampled 100-minute candidate trajectories with point-level provenance tags',
  },
  {
    name: 'final_report.html',
    size: '42.8 KB',
    format: 'HTML',
    hash: 'c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7',
    description: 'Standalone self-contained investigative dossier export',
  },
  {
    name: 'workstation.html',
    size: '56.2 KB',
    format: 'HTML',
    hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    description: 'Interactive analytical workstation bundle with embedded map overlays',
  },
  {
    name: 'reconstruction_3d_v3.html',
    size: '84.6 KB',
    format: 'HTML',
    hash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    description: 'Three.js forensic trajectory & drift particles spatial reconstruction',
  },
];

export const AuditTrailTable: React.FC = () => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => {
      setCopiedHash(null);
    }, 2000);
  };

  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-[var(--violet-400)]" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
            FORENSIC AUDIT TRAIL & ARTIFACT REPOSITORY
          </h3>
        </div>
        <span className="font-mono text-xs text-[var(--text-3)]">
          Deterministic Pipeline Artifacts (results/malibu_case/)
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-3)]">
              <th className="py-2.5 px-3 font-semibold">ARTIFACT FILE</th>
              <th className="py-2.5 px-3 font-semibold">FORMAT</th>
              <th className="py-2.5 px-3 font-semibold text-right">SIZE</th>
              <th className="py-2.5 px-3 font-semibold">EXAMPLE HASH (SHA-256)</th>
              <th className="py-2.5 px-3 font-semibold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {AUDIT_FILES.map((file) => {
              const isCopied = copiedHash === file.hash;
              const shortHash = `${file.hash.substring(0, 10)}...${file.hash.substring(file.hash.length - 8)}`;

              return (
                <tr key={file.name} className="hover:bg-[var(--surface-2)]/60 transition-colors">
                  <td className="py-2.5 px-3 text-[var(--text-1)] font-semibold whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-[var(--violet-400)] shrink-0" />
                      <div>
                        <span>{file.name}</span>
                        <div className="text-[var(--text-3)] font-sans text-xs">{file.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-2)] whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-[var(--surface-3)] border border-[var(--border-subtle)]">
                      {file.format}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-2)] text-right tabular-nums whitespace-nowrap">
                    {file.size}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-3)] whitespace-nowrap font-mono">
                    <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-2)]">
                      {shortHash}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleCopy(file.hash)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--border-default)] transition-colors cursor-pointer text-xs"
                      title="Copy full SHA-256 hash"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                          <span className="text-[var(--success)]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
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
