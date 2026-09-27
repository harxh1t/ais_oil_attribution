import React, { useState } from 'react';
import { Copy, Check, X, Terminal } from 'lucide-react';
import { Button } from '../ui';

interface CliModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLI_COMMAND = `ais-oil-investigate \\
  --lat 34.016944 --lon -118.663056 \\
  --time "2024-08-06 01:50:00" \\
  --spread 12.0 \\
  --regime delayed \\
  --ranking-method borda \\
  --enable-forward-fit \\
  --output-dir results/malibu_case`;

export const CliModal: React.FC<CliModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(CLI_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0E0B1F] border border-[rgba(167,139,250,0.3)] rounded-2xl p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(167,139,250,0.15)] pb-3">
          <div className="flex items-center gap-2 text-[#F4F2FF] font-display font-bold">
            <Terminal className="w-5 h-5 text-[#A78BFA]" />
            <span>WAKE Headless CLI Command</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#9691B3] hover:text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="font-sans text-xs text-[#C0BCDB]">
          Execute the complete Malibu forensic investigation pipeline in headless automation or CI batch verification:
        </p>

        <div className="relative bg-[#05040F] border border-[rgba(167,139,250,0.2)] rounded-xl p-4 font-mono text-xs text-[#2DD4BF] overflow-x-auto">
          <pre>{CLI_COMMAND}</pre>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied to Clipboard' : 'Copy CLI Command'}
          </Button>
        </div>
      </div>
    </div>
  );
};
