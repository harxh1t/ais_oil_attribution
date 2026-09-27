import React from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink, CheckCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  const location = useLocation();

  // Hidden on /workspace as required
  if (location.pathname === '/workspace') {
    return null;
  }

  return (
    <footer className="w-full bg-[#05040F] border-t border-[rgba(167,139,250,0.18)] py-8 font-sans text-xs text-[#9691B3] select-none">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: WAKE wordmark + links */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-display font-black text-sm text-white tracking-wider">
            WAKE
          </span>
          <span>·</span>
          <a
            href="https://github.com/harxh1t/ais_oil_attribution"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3 text-[#A78BFA]" />
          </a>
          <span>·</span>
          <span>MIT License</span>
          <span>·</span>
          <span className="flex items-center gap-1 text-[#34D399]">
            <CheckCircle className="w-3 h-3" />
            <span>32/32 tests passing</span>
          </span>
        </div>

        {/* Right: Disclaimer and simulated note */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-right">
          <span className="text-[#C0BCDB]">
            Investigative decision support only. Attribution leads are not legal findings.
          </span>
          <span className="hidden sm:inline text-[rgba(167,139,250,0.3)]">·</span>
          <span className="font-mono text-xs text-[#A78BFA]">
            Simulated demonstration data
          </span>
        </div>
      </div>
    </footer>
  );
};
