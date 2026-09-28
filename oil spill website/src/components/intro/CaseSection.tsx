import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { ChapterHeader, Card, Button, Readout } from '../ui';
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { CandidateVessel } from '../../data/malibuCase';

interface CaseSectionProps {
  bgOpacity?: number;
}

export const CaseSection: React.FC<CaseSectionProps> = ({ bgOpacity = 1 }) => {
  const navigate = useNavigate();
  const { caseData } = useCase();
  const topCandidate = caseData.vessels[0];
  const safeOpacity = Number.isFinite(bgOpacity) ? bgOpacity : 1;

  return (
    <section
      id="example"
      className="relative py-20 bg-transparent overflow-hidden scroll-mt-16"
    >
      {/* Naval Architecture & Vessel Hull Blueprint on fading white background */}
      <div
        style={{ opacity: safeOpacity }}
        className="absolute inset-0 pointer-events-none select-none overflow-hidden bg-slate-100 border-t border-[var(--border-subtle)] transition-opacity duration-300 ease-out"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 850"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {/* Subtle drafting grid background */}
          <defs>
            <pattern id="naval-blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F1F5F9" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#naval-blueprint-grid)" opacity="0.7" />

          {/* Naval Architecture Body Plan (Hull Station Curvature Lines) on Right */}
          <g transform="translate(1200, 420)" opacity="0.32">
            <line x1="0" y1="-280" x2="0" y2="280" stroke="#94A3B8" strokeWidth="1" strokeDasharray="6 3" />
            <line x1="-180" y1="240" x2="180" y2="240" stroke="#94A3B8" strokeWidth="1.2" />
            <text x="6" y="-270" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">¢ CENTERLINE</text>
            <text x="80" y="254" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">BASE LINE (KEEL)</text>

            {/* Forebody & Afterbody Hull Stations (Nested Architectural Curves) */}
            <path d="M 0,240 C 20,220 50,150 70,60 C 85,-20 95,-120 100,-220" stroke="#94A3B8" strokeWidth="1.2" />
            <path d="M 0,240 C 35,210 75,130 105,40 C 125,-40 135,-140 140,-220" stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 0,240 C 55,200 110,120 140,20 C 160,-60 168,-150 170,-220" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 2" />
            <path d="M 0,240 L 130,240 C 170,230 180,180 180,60 L 180,-220" stroke="#64748B" strokeWidth="1.4" />

            <path d="M 0,240 C -30,215 -60,140 -80,50 C -95,-30 -100,-130 -105,-220" stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 0,240 C -50,195 -95,110 -125,20 C -145,-60 -150,-150 -155,-220" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 0,240 L -120,240 C -160,230 -170,180 -170,60 L -170,-220" stroke="#64748B" strokeWidth="1.2" />

            {/* Waterlines */}
            <line x1="-160" y1="160" x2="170" y2="160" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2 4" />
            <text x="175" y="163" fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono, monospace">WL 4M</text>
            <line x1="-170" y1="80" x2="175" y2="80" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2 4" />
            <text x="180" y="83" fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono, monospace">WL 8M</text>
            <line x1="-175" y1="0" x2="180" y2="0" stroke="#64748B" strokeWidth="1" />
            <text x="185" y="3" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">DESIGN WATERLINE (DWL)</text>
            <line x1="-180" y1="-80" x2="180" y2="-80" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2 4" />
            <text x="185" y="-77" fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono, monospace">WL 16M</text>
          </g>

          {/* Official International Plimsoll Load Line Mark on Left */}
          <g transform="translate(160, 260)" opacity="0.38">
            <circle cx="0" cy="0" r="38" stroke="#64748B" strokeWidth="2.5" />
            <line x1="-54" y1="0" x2="54" y2="0" stroke="#64748B" strokeWidth="2.5" />

            {/* Classification Society Letters (e.g. AB = American Bureau of Shipping) */}
            <text x="-26" y="-8" fill="#475569" fontSize="13" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700">A</text>
            <text x="16" y="-8" fill="#475569" fontSize="13" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700">B</text>

            {/* Seasonal Draft Load Lines */}
            <line x1="85" y1="-60" x2="85" y2="60" stroke="#64748B" strokeWidth="2" />
            
            <line x1="85" y1="-50" x2="120" y2="-50" stroke="#64748B" strokeWidth="1.8" />
            <text x="126" y="-46" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">TF</text>

            <line x1="85" y1="-28" x2="120" y2="-28" stroke="#64748B" strokeWidth="1.8" />
            <text x="126" y="-24" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">F</text>

            <line x1="85" y1="-8" x2="120" y2="-8" stroke="#64748B" strokeWidth="1.8" />
            <text x="126" y="-4" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">T</text>

            <line x1="85" y1="0" x2="120" y2="0" stroke="#64748B" strokeWidth="2.2" />
            <text x="126" y="4" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="700">S</text>

            <line x1="85" y1="18" x2="120" y2="18" stroke="#64748B" strokeWidth="1.8" />
            <text x="126" y="22" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">W</text>

            <line x1="85" y1="38" x2="120" y2="38" stroke="#64748B" strokeWidth="1.8" />
            <text x="126" y="42" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">WNA</text>

            <text x="-50" y="62" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">
              INTERNATIONAL LOAD LINE (PLIMSOLL MARK)
            </text>
          </g>

          {/* Vessel Bow Draft Scale Numbers on far left */}
          <g transform="translate(60, 480)" opacity="0.32">
            <line x1="24" y1="-120" x2="24" y2="160" stroke="#CBD5E1" strokeWidth="1" />
            <text x="0" y="-100" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">14M</text>
            <text x="0" y="-50" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">12M</text>
            <text x="0" y="0" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">10M</text>
            <text x="0" y="50" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">8M</text>
            <text x="0" y="100" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">6M</text>
            <text x="0" y="150" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">4M</text>
            <text x="32" y="30" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono, monospace">HULL DRAFT</text>
          </g>

          {/* Tanker Double-Hull Cargo Compartment Cross-Section along Bottom */}
          <g transform="translate(320, 720)" opacity="0.3">
            <path d="M 0,0 L 520,0 C 550,0 560,40 560,70 L 560,80 L -40,80 L -40,70 C -40,40 -30,0 0,0 Z" stroke="#64748B" strokeWidth="1.5" />
            <path d="M 30,16 L 490,16 C 505,16 515,35 515,65 L 5,65 C 5,35 15,16 30,16 Z" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 2" />
            <line x1="260" y1="16" x2="260" y2="65" stroke="#64748B" strokeWidth="1.5" />
            <text x="80" y="44" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">CARGO OIL TANK (PORT)</text>
            <text x="310" y="44" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">CARGO OIL TANK (STBD)</text>
            <text x="140" y="76" fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono, monospace">DOUBLE BOTTOM WATER BALLAST VOID</text>
          </g>
        </svg>
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <ChapterHeader
          stepNumber="04"
          eyebrow="Case Study"
          title="Incident Case: Santa Monica Bay & Malibu Coast"
          description="A complete end-to-end incident demonstrating satellite detection, reverse hydrodynamic reconstruction, transponder gap interpolation, and shortlisted vessel attribution."
        />

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Case Summary Card */}
          <div className="lg:col-span-2">
            <Card className="p-6 md:p-8 bg-white/90 backdrop-blur-md border border-white/60 shadow-[0_18px_40px_-4px_rgba(15,23,42,0.22),0_8px_18px_-2px_rgba(15,23,42,0.12)]">
              <div className="pb-6 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--primary-600)] uppercase">
                      CASE ID: {caseData.id}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-1)] mt-1">
                    {caseData.name}
                  </h3>
                </div>
              </div>

              {/* Readouts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-[var(--border-subtle)]">
                <Readout
                  label="SAR Acquisition"
                  value="01:50:00Z"
                  sub="Sentinel-1 SAR C-Band"
                />
                <Readout
                  label="Reconstructed Release"
                  value="16:40:00Z"
                  sub="T - 9.2h back-calculated"
                />
                <Readout
                  label="Slick Area"
                  value={`${caseData.slick.areaKm2} km²`}
                  sub={`Length: ${caseData.slick.lengthKm} km`}
                />
                <Readout
                  label="Top Vessel Attribution"
                  value={`Borda #${topCandidate.rank} (${topCandidate.borda}/20)`}
                  sub={topCandidate.name}
                />
              </div>

              {/* Case Findings Narrative */}
              <div className="py-6 space-y-4 text-sm text-[var(--text-2)] leading-relaxed border-b border-[var(--border-subtle)]">
                <p>
                  Sentinel-1 synthetic aperture radar acquired an anomalous low-backscatter slick signature extending across the outer channel approach. Hydrodynamic back-projection using regional ocean modelling system (HYCOM/CMEMS) current vectors and coastal wind shear traces the slick release origin 9.2 hours prior to satellite acquisition.
                </p>
                <p>
                  Kinematic reconstruction of coastal shipping reveals that <strong className="text-[var(--text-1)]">{topCandidate.name}</strong> correlates closely with the spatiotemporal release window, while other candidates either passed prior or downstream of the release ellipse.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[var(--text-3)] font-mono">
                  <ShieldCheck className="w-4 h-4 text-[var(--observed)]" />
                  <span>Audited against NOAA GFS winds, HYCOM currents &amp; AIS transponder feeds</span>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/report')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Read Attribution Report
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/investigate')}
                  >
                    Open in Investigation Desk
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Metrics / Shortlist Card — Light Blue */}
          <div className="space-y-6">
            <Card className="p-6 bg-[var(--surface-1)] border border-[var(--border-default)] shadow-[0_20px_45px_-4px_rgba(3,14,34,0.15),0_10px_22px_-4px_rgba(3,14,34,0.08)] text-[var(--text-1)]">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-1)] font-mono mb-4 flex items-center justify-between">
                <span>Candidate Vessels</span>
                <span className="text-xs text-[var(--text-2)] font-normal">Ranked by Borda</span>
              </h4>
              <div className="space-y-3">
                {caseData.vessels.map((vessel: CandidateVessel, idx: number) => (
                  <div
                    key={vessel.id}
                    className="p-3 rounded-[6px] bg-[var(--ocean-2)] border border-[var(--ocean-3)]/30 flex items-center justify-between transition-colors hover:border-[var(--ocean-3)]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-[var(--ocean-1)] text-white">
                          #{idx + 1}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {vessel.name}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-light-subtle)] font-mono mt-0.5">
                        MMSI: {vessel.mmsi} • {vessel.type}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-white">
                        {vessel.borda}/20
                      </div>
                      <span className="text-[10px] text-[var(--text-light-subtle)]/80 uppercase font-mono">
                        Borda Pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-[var(--ocean-2)] border border-[var(--ocean-1)] shadow-[0_20px_45px_-4px_rgba(3,14,34,0.45),0_10px_22px_-4px_rgba(3,14,34,0.32)] text-white">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-light-subtle)] font-mono mb-3">
                Evidentiary Classification
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-700/80 border border-emerald-500/40" />
                    <span className="text-[var(--text-light-subtle)]">Observed (Satellite SAR)</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {topCandidate.provenance.observed}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-700/80 border border-sky-500/40" />
                    <span className="text-[var(--text-light-subtle)]">Derived (AIS Interpolation)</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {topCandidate.provenance.derived}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-700/80 border border-rose-500/40" />
                    <span className="text-[var(--text-light-subtle)]">Inferred (Back-Trajectory)</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {topCandidate.provenance.inferred}%
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
