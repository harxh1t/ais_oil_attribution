import React from 'react';

export const IssueCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card 1 */}
      <div className="bg-[#0E0B1F] border border-[rgba(167,139,250,0.2)] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-[rgba(167,139,250,0.35)] transition-colors">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#9691B3]">ISSUE 01</span>
            <span className="font-mono text-xs text-[#FB923C] bg-[#FB923C]/10 px-2 py-0.5 rounded border border-[#FB923C]/20">
              Contradictory Metrics
            </span>
          </div>
          <h4 className="font-display font-bold text-lg text-[#F4F2FF]">
            One distance can&apos;t rank ships
          </h4>
          <p className="font-sans text-xs text-[#C0BCDB] leading-relaxed">
            Vessels cross the drift corridor at different times and angles. Ranking by a single measure gives different winners depending on which one you pick.
          </p>
        </div>

        {/* Mini SVG: 4 bars with different winners */}
        <div className="h-24 bg-[#070512] rounded-lg p-2.5 border border-[rgba(167,139,250,0.15)] flex flex-col justify-around text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[#9691B3] w-16">DCPA</span>
            <div className="flex-1 mx-2 bg-[#151230] h-3.5 rounded overflow-hidden flex items-center px-1.5">
              <div className="bg-[#7C3AED] h-2 w-3/4 rounded-sm" />
            </div>
            <span className="text-[#F4F2FF] font-semibold text-right">Meridian Crest</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9691B3] w-16">TCPA</span>
            <div className="flex-1 mx-2 bg-[#151230] h-3.5 rounded overflow-hidden flex items-center px-1.5">
              <div className="bg-[#FB923C] h-2 w-4/5 rounded-sm" />
            </div>
            <span className="text-[#F4F2FF] font-semibold text-right">Pacific Lantern</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9691B3] w-16">Fréchet</span>
            <div className="flex-1 mx-2 bg-[#151230] h-3.5 rounded overflow-hidden flex items-center px-1.5">
              <div className="bg-[#7C3AED] h-2 w-2/3 rounded-sm" />
            </div>
            <span className="text-[#F4F2FF] font-semibold text-right">Meridian Crest</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9691B3] w-16">Continuity</span>
            <div className="flex-1 mx-2 bg-[#151230] h-3.5 rounded overflow-hidden flex items-center px-1.5">
              <div className="bg-[#34D399] h-2 w-full rounded-sm" />
            </div>
            <span className="text-[#F4F2FF] font-semibold text-right">Coastal Vanguard</span>
          </div>
        </div>

        <div className="text-xs font-sans text-[#FB923C] border-t border-[rgba(167,139,250,0.15)] pt-2.5">
          <strong>What goes wrong:</strong> Cherry-picking a metric selects whatever candidate you want to find.
        </div>
      </div>

      {/* Card 2 */}
      <div className="bg-[#0E0B1F] border border-[rgba(167,139,250,0.2)] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-[rgba(167,139,250,0.35)] transition-colors">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#9691B3]">ISSUE 02</span>
            <span className="font-mono text-xs text-[#FB923C] bg-[#FB923C]/10 px-2 py-0.5 rounded border border-[#FB923C]/20">
              Silent Gaps
            </span>
          </div>
          <h4 className="font-display font-bold text-lg text-[#F4F2FF]">
            AIS has holes
          </h4>
          <p className="font-sans text-xs text-[#C0BCDB] leading-relaxed">
            Reception drops out and transponders can go dark. Gaps are usually bridged silently, which makes a ship look more (or less) continuous than it was.
          </p>
        </div>

        {/* Mini SVG: Track with highlighted gap */}
        <div className="h-24 bg-[#070512] rounded-lg p-2.5 border border-[rgba(167,139,250,0.15)] flex items-center justify-center">
          <svg className="w-full h-12" viewBox="0 0 300 40">
            {/* Active observed segment */}
            <line x1="20" y1="20" x2="90" y2="20" stroke="#2DD4BF" strokeWidth="3" />
            <circle cx="20" cy="20" r="4" fill="#2DD4BF" />
            <circle cx="90" cy="20" r="4" fill="#2DD4BF" />
            {/* Interpolated gap */}
            <line x1="90" y1="20" x2="210" y2="20" stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="5,4" />
            <rect x="95" y="6" width="110" height="28" fill="rgba(251,191,36,0.12)" rx="4" />
            <text x="150" y="24" fill="#FBBF24" fontSize="12" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
              38m GAP
            </text>
            {/* Resumed observed segment */}
            <line x1="210" y1="20" x2="280" y2="20" stroke="#2DD4BF" strokeWidth="3" />
            <circle cx="210" cy="20" r="4" fill="#2DD4BF" />
            <circle cx="280" cy="20" r="4" fill="#2DD4BF" />
          </svg>
        </div>

        <div className="text-xs font-sans text-[#FB923C] border-t border-[rgba(167,139,250,0.15)] pt-2.5">
          <strong>What goes wrong:</strong> Missing transponder reports mask intentional evasive maneuvers or transmitter failures.
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-[#0E0B1F] border border-[rgba(167,139,250,0.2)] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-[rgba(167,139,250,0.35)] transition-colors">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#9691B3]">ISSUE 03</span>
            <span className="font-mono text-xs text-[#FB923C] bg-[#FB923C]/10 px-2 py-0.5 rounded border border-[#FB923C]/20">
              False Precision
            </span>
          </div>
          <h4 className="font-display font-bold text-lg text-[#F4F2FF]">
            The drift model is uncertain
          </h4>
          <p className="font-sans text-xs text-[#C0BCDB] leading-relaxed">
            Wind and current fields carry error. A single back-trajectory suggests a precision the physics cannot deliver.
          </p>
        </div>

        {/* Mini SVG: single line vs fan of particles */}
        <div className="h-24 bg-[#070512] rounded-lg p-2.5 border border-[rgba(167,139,250,0.15)] flex items-center justify-center">
          <svg className="w-full h-16" viewBox="0 0 300 60">
            {/* Observation point */}
            <circle cx="260" cy="30" r="4" fill="#2DD4BF" />
            <text x="248" y="50" fill="#2DD4BF" fontSize="12" fontFamily="'JetBrains Mono', monospace">Slick</text>
            {/* Ensemble spread fan */}
            <path d="M 260,30 Q 180,15 50,10" stroke="rgba(244,114,182,0.4)" strokeWidth="1" fill="none" />
            <path d="M 260,30 Q 180,25 50,25" stroke="rgba(244,114,182,0.7)" strokeWidth="1" fill="none" />
            <path d="M 260,30 Q 180,35 50,40" stroke="rgba(244,114,182,0.7)" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
            <path d="M 260,30 Q 180,45 50,52" stroke="rgba(244,114,182,0.4)" strokeWidth="1" fill="none" />
            {/* 95% error ellipse at origin */}
            <ellipse cx="65" cy="30" rx="36" ry="20" fill="none" stroke="#F472B6" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x="65" y="34" fill="#F472B6" fontSize="12" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
              95% Ellipse
            </text>
          </svg>
        </div>

        <div className="text-xs font-sans text-[#FB923C] border-t border-[rgba(167,139,250,0.15)] pt-2.5">
          <strong>What goes wrong:</strong> Deterministic single lines point to exact coordinates that are physically ungrounded.
        </div>
      </div>

      {/* Card 4 */}
      <div className="bg-[#0E0B1F] border border-[rgba(167,139,250,0.2)] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-[rgba(167,139,250,0.35)] transition-colors">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#9691B3]">ISSUE 04</span>
            <span className="font-mono text-xs text-[#FB923C] bg-[#FB923C]/10 px-2 py-0.5 rounded border border-[#FB923C]/20">
              Opaque Scoring
            </span>
          </div>
          <h4 className="font-display font-bold text-lg text-[#F4F2FF]">
            Evidence gets blurred
          </h4>
          <p className="font-sans text-xs text-[#C0BCDB] leading-relaxed">
            Raw observations, interpolations and model output end up in one number that nobody can audit or defend.
          </p>
        </div>

        {/* Mini SVG: 3 layers merging into opaque box */}
        <div className="h-28 bg-[#070512] rounded-lg p-2 border border-[rgba(167,139,250,0.15)] flex items-center justify-center">
          <svg className="w-full h-20" viewBox="0 0 320 70">
            <rect x="10" y="4" width="82" height="18" rx="3" fill="#2DD4BF" opacity="0.9" />
            <text x="51" y="17" fill="#070512" fontSize="12" fontWeight="bold" fontFamily="'Inter', sans-serif" textAnchor="middle">OBSERVED</text>
            <rect x="10" y="26" width="82" height="18" rx="3" fill="#FBBF24" opacity="0.9" />
            <text x="51" y="39" fill="#070512" fontSize="12" fontWeight="bold" fontFamily="'Inter', sans-serif" textAnchor="middle">DERIVED</text>
            <rect x="10" y="48" width="82" height="18" rx="3" fill="#F472B6" opacity="0.9" />
            <text x="51" y="61" fill="#070512" fontSize="12" fontWeight="bold" fontFamily="'Inter', sans-serif" textAnchor="middle">INFERRED</text>

            <path d="M 95,13 L 155,33" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
            <path d="M 95,35 L 155,35" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
            <path d="M 95,57 L 155,37" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />

            {/* Opaque black box */}
            <rect x="160" y="16" width="150" height="38" rx="6" fill="#151230" stroke="#FB7185" strokeWidth="1.5" />
            <text x="235" y="40" fill="#FB7185" fontSize="12" fontFamily="'JetBrains Mono', monospace" fontWeight="bold" textAnchor="middle">
              99.4% &quot;SCORE&quot; ?
            </text>
          </svg>
        </div>

        <div className="text-xs font-sans text-[#FB923C] border-t border-[rgba(167,139,250,0.15)] pt-2.5">
          <strong>What goes wrong:</strong> Black-box aggregations fail cross-examination in maritime inquiries.
        </div>
      </div>
    </div>
  );
};
