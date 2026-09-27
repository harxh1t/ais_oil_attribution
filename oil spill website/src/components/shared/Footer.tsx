import React from 'react';
import { ExternalLink, CheckCircle, ArrowUp } from 'lucide-react';

interface FooterProps {
  showBackToTop?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ showBackToTop = true }) => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative z-20 w-full bg-[#002433] text-[#D4F6F9] border-t border-[#005B7D] py-6 font-sans text-xs select-none">
      <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: WAKE wordmark + links */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-[3px] bg-[#007D9F] flex items-center justify-center text-white shadow-xs">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h20M7 7l5 5-5 5M12 7l5 5-5 5" />
              </svg>
            </div>
            <span className="font-heading font-bold text-sm text-white tracking-wide">
              WAKE
            </span>
          </div>
          <span className="text-[#007D9F]">·</span>
          <a
            href="https://github.com/harxh1t/ais_oil_attribution"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white text-[#D4F6F9] flex items-center gap-1 transition-colors"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3 text-[#3ED4EB]" />
          </a>
          <span className="text-[#007D9F]">·</span>
          <span className="text-[#D4F6F9]/80">Copyright (c) 2026 Team VAYUU. All Rights Reserved.</span>
          <span className="text-[#007D9F]">·</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>32/32 tests passing</span>
          </span>
        </div>

        {/* Center / Right: Disclaimer and scroll-to-top */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-right">
          <span className="text-[#D4F6F9]/70 text-[11px] max-w-xl">
            Investigative decision support only. Attribution leads are not legal findings.
          </span>
          {showBackToTop && (
            <button
              onClick={handleScrollToTop}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#00384D] hover:bg-[#00526E] text-white text-xs transition-colors border border-[#007D9F]/40 cursor-pointer group"
              title="Scroll back to top"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5 text-[#3ED4EB] transition-transform group-hover:-translate-y-0.5" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
