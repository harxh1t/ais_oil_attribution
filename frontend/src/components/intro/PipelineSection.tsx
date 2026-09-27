import React, { useState, useEffect, useRef } from 'react';
import { StepFigure } from './StepFigure';
import { ChapterHeader, Badge, EvidenceLegend, Readout } from '../ui';
import { ChevronLeft, ChevronRight, Sliders } from 'lucide-react';

interface StepData {
  step: number;
  title: string;
  evidenceClass: 'observed' | 'derived' | 'inferred';
  badgeLabel: string;
  borderStyle: string;
  whyItMatters: string;
  input: string;
  output: string;
  method: string;
  techDesc: string;
}

const STEPS: StepData[] = [
  {
    step: 1,
    title: 'Input Data Acquisition',
    evidenceClass: 'observed',
    badgeLabel: 'Observed',
    borderStyle: 'border-solid border-[var(--observed)]/50',
    whyItMatters: 'Authentic orbital SAR radar imagery and terrestrial/satellite AIS transponder signals form the ground-truth observational baseline.',
    input: 'Sentinel-1 IW GRDH orbit granules, raw NMEA AIS broadcast stream',
    output: 'Calibrated SAR intensity rasters & timestamped AIS position fixes',
    method: 'Copernicus Open Access API & AIS transponder receiver network',
    techDesc: 'Ingests SAR dual-pol (VV/VH) L1 GRD products along with asynchronous AIS position reports within a 200 km bounding polygon.',
  },
  {
    step: 2,
    title: 'SAR Preprocessing & Denoising',
    evidenceClass: 'observed',
    badgeLabel: 'Observed',
    borderStyle: 'border-solid border-[var(--observed)]/50',
    whyItMatters: 'Raw radar backscatter suffers from speckle noise and terrain geometry distortions that must be corrected without destroying slick edges.',
    input: 'Digital Numbers (DN) SAR rasters & orbit state vectors',
    output: 'Radiometrically calibrated Sigma0 (σ°) ortho-rectified backscatter',
    method: 'Thermal noise subtraction, Lee refined speckle filtering, range-Doppler geocoding',
    techDesc: 'Computes radar cross-section σ° values and projects rasters to standard geographic coordinates using Copernicus 30m DEM.',
  },
  {
    step: 3,
    title: 'Oil Spill Segmentation',
    evidenceClass: 'derived',
    badgeLabel: 'Derived',
    borderStyle: 'border-dashed border-[var(--derived)]/50',
    whyItMatters: 'Discharges damp high-frequency capillary waves, creating distinctive low-backscatter dark patches separated from lookalikes (upwelling, low winds).',
    input: 'Calibrated dual-pol backscatter + local incidence angle rasters',
    output: 'Binary spill segmentation mask & pixel probability confidence grid',
    method: 'DeepLabV3+ with ResNet-50 backbone trained on verified maritime discharges',
    techDesc: 'Convolutional feature pyramid extracts contrast deltas between dampened oil patches and surrounding wind-roughened sea surface.',
  },
  {
    step: 4,
    title: 'Spill Geometry & Characterization',
    evidenceClass: 'derived',
    badgeLabel: 'Derived',
    borderStyle: 'border-dashed border-[var(--derived)]/50',
    whyItMatters: 'Morphological metrics—slick elongation, major axis azimuth, surface area—constrain the release mechanism and age.',
    input: 'Binary raster mask',
    output: 'Vector polygon geometry, spatial centroid, principal axis orientation, area',
    method: 'Topological contour extraction, polygon simplification, principal component inertia tensor',
    techDesc: 'Vectorizes connected components into GeoJSON with computed geometric moments, major/minor axis lengths, and perimeter.',
  },
  {
    step: 5,
    title: 'OpenDrift Lagrangian Hindcast',
    evidenceClass: 'inferred',
    badgeLabel: 'Inferred',
    borderStyle: 'border-dotted border-[var(--inferred)]/50',
    whyItMatters: 'Currents and winds continuously displace and stretch surface oil; backward particle advection reconstructs the actual release location and epoch.',
    input: 'Slick polygon, NOAA GFS 0.25° wind field, HYCOM ocean surface current velocity',
    output: 'Back-projected particle cloud, inferred release coordinates, 95% error ellipse',
    method: 'Lagrangian particle advection (OpenDrift) with horizontal turbulent diffusion',
    techDesc: 'Solves reverse Lagrangian advection over a 9.2-hour time window using 1,500 particles with 3% wind drift factor and 0.05 m²/s diffusion.',
  },
  {
    step: 6,
    title: 'AIS Vessel Kinematics Analysis',
    evidenceClass: 'derived',
    badgeLabel: 'Derived',
    borderStyle: 'border-dashed border-[var(--derived)]/50',
    whyItMatters: 'Candidate vessels crossing the corridor must be evaluated against the hindcast origin across both spatial and temporal dimensions.',
    input: 'Raw AIS trajectories within Santa Monica Bay coastal traffic corridor',
    output: 'DCPA, TCPA, discrete Fréchet curve distance, and AIS Continuity index',
    method: 'Spherical trigonometry closest point calculation, Fréchet trajectory alignment, broadcast interval auditing',
    techDesc: 'Reconstructs vessel tracks with cubic spline interpolation for gaps under 15 minutes and flags prolonged transponder blackouts.',
  },
  {
    step: 7,
    title: 'Multi-Criteria Evidence Fusion',
    evidenceClass: 'derived',
    badgeLabel: 'Derived',
    borderStyle: 'border-dashed border-[var(--derived)]/50',
    whyItMatters: 'Single metrics produce contradictory rankings; rank-sum consensus aggregates evidence objectively without arbitrary weighting.',
    input: 'DCPA, TCPA, Fréchet, and Continuity rankings across all 6 candidate vessels',
    output: 'Borda count consensus ranking and normalized attribution confidence scores',
    method: 'Borda Count positional aggregation across 4 orthogonal forensic criteria',
    techDesc: 'Assigns positional points (k-1 to 0) across all 4 criteria matrices to derive an unweighted, auditable attribution rank.',
  },
  {
    step: 8,
    title: 'Forensic Output & 3D Dossier',
    evidenceClass: 'inferred',
    badgeLabel: 'Inferred',
    borderStyle: 'border-dotted border-[var(--inferred)]/50',
    whyItMatters: 'Decision-makers require auditable, reproducible dossiers separating observed ground-truth from model inferences.',
    input: 'Consensus rankings, track interpolations, environmental forcing parameters',
    output: 'Interactive 3D bathymetric reconstruction, JSON dossier, exportable brief',
    method: 'WebGL Three.js spatial reconstruction & structured evidence matrix reporting',
    techDesc: 'Exports complete forensic records with provenance tracking, rank stability sensitivity tables, and reproducible CLI parameters.',
  },
];

export const PipelineSection: React.FC = () => {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isEngineeringMode, setIsEngineeringMode] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentStep = STEPS[activeStepIdx];

  // Auto-advance every 9 seconds, pauses on manual interaction
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = 100;
    const totalTicks = 9000 / interval;
    let ticks = 0;

    const timer = setInterval(() => {
      ticks++;
      setProgress((ticks / totalTicks) * 100);

      if (ticks >= totalTicks) {
        ticks = 0;
        setProgress(0);
        setActiveStepIdx((prev) => (prev + 1) % STEPS.length);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, activeStepIdx]);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setIsAutoPlaying(false);
        setActiveStepIdx((prev) => (prev + 1) % STEPS.length);
      } else if (e.key === 'ArrowLeft') {
        setIsAutoPlaying(false);
        setActiveStepIdx((prev) => (prev - 1 + STEPS.length) % STEPS.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStepSelect = (idx: number) => {
    setIsAutoPlaying(false);
    setActiveStepIdx(idx);
    setProgress(0);
  };

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setActiveStepIdx((prev) => (prev - 1 + STEPS.length) % STEPS.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setActiveStepIdx((prev) => (prev + 1) % STEPS.length);
  };

  return (
    <section
      id="pipeline"
      ref={containerRef}
      className="py-[72px] lg:py-[120px] bg-[var(--bg-void)] border-t border-[var(--border-default)] relative overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto px-4 space-y-12">
        {/* Chapter Header + Right Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="flex-1">
            <ChapterHeader
              number="01"
              eyebrow="FORENSIC ATTRIBUTION PIPELINE"
              title="From SAR backscatter to candidate attribution."
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap shrink-0 pb-2">
            <EvidenceLegend compact />
            <button
              onClick={() => setIsEngineeringMode(!isEngineeringMode)}
              className={`h-[36px] px-3.5 rounded-[4px] border text-xs font-mono uppercase tracking-[0.06em] flex items-center gap-2 transition-all cursor-pointer ${
                isEngineeringMode
                  ? 'bg-[var(--violet-600)] border-[var(--violet-400)] text-white shadow-[0_0_12px_var(--glow-violet)]'
                  : 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--violet-300)]" />
              <span>{isEngineeringMode ? 'Engineering View' : 'Workflow View'}</span>
            </button>
          </div>
        </div>

        {/* 8 Step Tabs with 56x40 Thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {STEPS.map((s, idx) => {
            const isSelected = idx === activeStepIdx;
            return (
              <button
                key={s.step}
                onClick={() => handleStepSelect(idx)}
                className={`p-2.5 rounded-[8px] text-left border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative overflow-hidden group ${
                  isSelected
                    ? 'bg-[var(--surface-3)] border-[var(--violet-500)] shadow-[0_4px_16px_var(--glow-violet)] ring-1 ring-[var(--violet-400)]'
                    : 'bg-[var(--surface-1)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {/* 56x40 Thumbnail preview */}
                <div className="w-full h-10 rounded-[4px] bg-[var(--bg-void)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                  <span className="font-mono text-xs text-[var(--text-3)] group-hover:text-white transition-colors tabular-nums font-semibold">
                    0{s.step}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--text-1)] tabular-nums">
                      0{s.step}
                    </span>
                    <Badge variant={s.evidenceClass} size="sm">
                      {s.badgeLabel}
                    </Badge>
                  </div>
                  <div className="font-sans font-medium text-xs text-[var(--text-2)] line-clamp-1">
                    {s.title}
                  </div>
                </div>

                {/* Progress bar on active tab */}
                {isSelected && isAutoPlaying && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--surface-2)]">
                    <div
                      className="h-full bg-[var(--violet-500)] transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail Panel: 2 Columns (7/12 Figure, 5/12 Details) */}
        <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[12px] p-6 sm:p-8 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Figure (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className={`p-1.5 rounded-[10px] border bg-[var(--bg-void)] ${currentStep.borderStyle} shadow-inner`}>
              <StepFigure step={currentStep.step} />
            </div>

            {/* Caption bar + Prev/Next Controls */}
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-3)] px-1">
              <div>
                <span className="text-[var(--text-1)] font-semibold">FIG 0{currentStep.step}</span> · {currentStep.title}{' '}
                <span className="text-[var(--text-3)]/70 hidden sm:inline">(Illustrative rendering)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-1 rounded-[4px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] border border-[var(--border-default)] cursor-pointer"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1 text-[var(--text-1)] tabular-nums">
                  {currentStep.step} / {STEPS.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 rounded-[4px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] border border-[var(--border-default)] cursor-pointer"
                  title="Next Step"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Step Description (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--text-3)] uppercase tracking-wider">
                  STAGE 0{currentStep.step}
                </span>
                <Badge variant={currentStep.evidenceClass} size="sm">
                  {currentStep.badgeLabel}
                </Badge>
              </div>
              <h3 className="font-display font-semibold text-2xl sm:text-3xl text-[var(--text-1)] leading-tight">
                {currentStep.title}
              </h3>
              {/* Source Serif 4 for "why it matters" line */}
              <p className="font-serif text-[17px] sm:text-[18px] leading-[1.7] text-[var(--text-2)] max-w-[68ch]">
                {currentStep.whyItMatters}
              </p>
            </div>

            {/* Readout Rows IN -> OUT -> METHOD */}
            <div className="pt-2">
              <Readout
                rows={[
                  { key: 'INPUT', value: currentStep.input },
                  { key: 'OUTPUT', value: currentStep.output },
                  { key: 'METHOD', value: currentStep.method },
                ]}
              />

              {isEngineeringMode && (
                <div className="mt-4 p-3.5 rounded-[6px] bg-[var(--bg-void)] border border-[var(--violet-500)]/30 text-xs font-mono text-[var(--violet-300)] leading-relaxed">
                  <div className="text-[var(--text-1)] font-bold mb-1 uppercase tracking-wider">
                    TECHNICAL SPECIFICATION:
                  </div>
                  {currentStep.techDesc}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
