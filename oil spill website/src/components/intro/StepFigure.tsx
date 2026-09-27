import React from 'react';

interface StepFigureProps {
  step: number;
}

export const StepFigure: React.FC<StepFigureProps> = ({ step }) => {
  // Return clean, informative SVG technical diagrams for each pipeline step
  return (
    <div className="w-full h-full flex flex-col justify-center">
      <div className="flex-1 min-h-[220px] flex items-center justify-center p-2">
        <svg viewBox="0 0 460 220" className="w-full h-full max-h-[220px]">
          <defs>
            <pattern id={`step-grid-${step}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-default)" strokeWidth="0.5" strokeOpacity="0.5" />
            </pattern>
          </defs>
          <rect width="460" height="220" fill="#FFFFFF" fillOpacity="0.4" />
          <rect width="460" height="220" fill={`url(#step-grid-${step})`} />

          {step === 1 && (
            <g>
              <rect x="40" y="40" width="160" height="130" rx="4" fill="var(--surface-1)" stroke="var(--border-strong)" strokeWidth="1.5" />
              <text x="120" y="70" fill="var(--text-1)" fontSize="11" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor="middle">Copernicus SAR</text>
              <text x="120" y="90" fill="var(--text-3)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">GRD C-Band Product</text>
              <circle cx="120" cy="120" r="14" fill="var(--primary-50)" stroke="var(--primary-600)" strokeWidth="1.5" />
              <text x="120" y="124" fill="var(--primary-600)" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">S1</text>

              <line x1="200" y1="105" x2="260" y2="105" stroke="var(--primary-600)" strokeWidth="2" strokeDasharray="3,3" />

              <rect x="260" y="40" width="160" height="130" rx="4" fill="var(--surface-1)" stroke="var(--observed)" strokeWidth="1.5" />
              <text x="340" y="70" fill="var(--observed)" fontSize="11" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor="middle">Calibrated Array</text>
              <text x="340" y="90" fill="var(--text-3)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">σ° Backscatter (dB)</text>
              <ellipse cx="340" cy="125" rx="30" ry="12" fill="var(--observed)" fillOpacity="0.2" stroke="var(--observed)" strokeWidth="1.5" />
            </g>
          )}

          {step === 2 && (
            <g>
              <rect x="50" y="50" width="360" height="120" rx="6" fill="var(--surface-1)" stroke="var(--border-default)" strokeWidth="1" />
              <path d="M 80 140 Q 140 60 220 120 T 380 90" fill="none" stroke="var(--border-strong)" strokeWidth="2" />
              <line x1="80" y1="110" x2="380" y2="110" stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="4,4" />
              <text x="230" y="100" fill="var(--danger)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Adaptive Squelch Threshold (µ - 2.8σ)</text>
              <text x="230" y="145" fill="var(--observed)" fontSize="11" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" textAnchor="middle">Low-backscatter slick dampening identified</text>
            </g>
          )}

          {step === 3 && (
            <g>
              <ellipse cx="230" cy="100" rx="90" ry="40" fill="var(--observed)" fillOpacity="0.25" stroke="var(--observed)" strokeWidth="2" />
              <circle cx="230" cy="100" r="4" fill="var(--observed)" />
              <line x1="140" y1="100" x2="320" y2="100" stroke="var(--text-1)" strokeWidth="1" strokeDasharray="2,2" />
              <text x="230" y="125" fill="var(--text-1)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Major Axis: 14.2 km</text>
              <text x="230" y="160" fill="var(--text-3)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Centroid: 33.955°N, 118.775°W • 2.42 km²</text>
            </g>
          )}

          {step === 4 && (
            <g>
              <ellipse cx="360" cy="70" rx="35" ry="16" fill="var(--observed)" fillOpacity="0.3" stroke="var(--observed)" strokeWidth="1.5" />
              <text x="360" y="105" fill="var(--observed)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">T=0h Observation</text>
              <path d="M 360 70 C 280 90, 200 120, 100 150" fill="none" stroke="var(--inferred)" strokeWidth="2" strokeDasharray="4,4" />
              <circle cx="100" cy="150" r="6" fill="var(--inferred)" />
              <text x="100" y="180" fill="var(--inferred)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Release Origin (T - 14.8h)</text>
            </g>
          )}

          {step === 5 && (
            <g>
              {Array.from({ length: 30 }).map((_, i) => {
                const rx = 180 + Math.sin(i * 1.5) * 60;
                const ry = 110 + Math.cos(i * 2.3) * 35;
                return <circle key={i} cx={rx} cy={ry} r="2.5" fill="var(--inferred)" fillOpacity="0.7" />;
              })}
              <ellipse cx="180" cy="110" rx="70" ry="42" fill="none" stroke="var(--inferred)" strokeWidth="1.5" strokeDasharray="3,3" />
              <text x="180" y="175" fill="var(--inferred)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                N=250 Particle Ensemble (95% Boundary)
              </text>
            </g>
          )}

          {step === 6 && (
            <g>
              <path d="M 40 180 L 140 130 L 220 100" fill="none" stroke="var(--derived)" strokeWidth="2" />
              <path d="M 220 100 L 320 70" fill="none" stroke="var(--derived)" strokeWidth="2" strokeDasharray="4,4" />
              <path d="M 320 70 L 420 40" fill="none" stroke="var(--derived)" strokeWidth="2" />
              <circle cx="140" cy="130" r="3.5" fill="var(--surface-1)" stroke="var(--derived)" strokeWidth="1.5" />
              <circle cx="320" cy="70" r="3.5" fill="var(--surface-1)" stroke="var(--derived)" strokeWidth="1.5" />
              <rect x="200" y="45" width="130" height="20" rx="3" fill="var(--surface-1)" stroke="var(--derived)" strokeWidth="1" />
              <text x="265" y="58" fill="var(--derived)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
                AIS GAP: 4h 12m
              </text>
            </g>
          )}

          {step === 7 && (
            <g>
              <ellipse cx="230" cy="110" rx="55" ry="32" fill="var(--inferred)" fillOpacity="0.15" stroke="var(--inferred)" strokeWidth="1.5" strokeDasharray="3,3" />
              <line x1="80" y1="160" x2="380" y2="60" stroke="var(--derived)" strokeWidth="2" />
              <circle cx="230" cy="110" r="5" fill="var(--primary-600)" />
              <text x="230" y="80" fill="var(--primary-600)" fontSize="11" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" textAnchor="middle">
                Spatiotemporal Intersection &lt; 420m
              </text>
              <text x="230" y="165" fill="var(--text-2)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                Kinematic Coincidence: 01:50:00Z
              </text>
            </g>
          )}

          {step === 8 && (
            <g>
              <rect x="60" y="40" width="340" height="40" rx="4" fill="var(--surface-1)" stroke="var(--border-strong)" strokeWidth="1" />
              <text x="80" y="65" fill="var(--text-1)" fontSize="11" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700">1. Target Bulk Carrier</text>
              <text x="360" y="65" fill="var(--primary-600)" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">88%</text>

              <rect x="60" y="90" width="340" height="35" rx="4" fill="var(--surface-1)" stroke="var(--border-subtle)" strokeWidth="1" />
              <text x="80" y="112" fill="var(--text-2)" fontSize="10" fontFamily="Arial, Helvetica, sans-serif">2. Coastal Tanker</text>
              <text x="360" y="112" fill="var(--text-3)" fontSize="10" fontFamily="JetBrains Mono">12%</text>

              <rect x="60" y="135" width="340" height="35" rx="4" fill="var(--surface-1)" stroke="var(--border-subtle)" strokeWidth="1" />
              <text x="80" y="157" fill="var(--text-2)" fontSize="10" fontFamily="Arial, Helvetica, sans-serif">3. Container Feeder</text>
              <text x="360" y="157" fill="var(--text-3)" fontSize="10" fontFamily="JetBrains Mono">4%</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
