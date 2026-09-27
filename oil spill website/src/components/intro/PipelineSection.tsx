import React, { useState, useEffect, useRef } from 'react';
import { StepFigure } from './StepFigure';
import { ChapterHeader } from '../ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    borderStyle: 'border-solid border-[var(--observed)]',
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
    borderStyle: 'border-solid border-[var(--observed)]',
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
    borderStyle: 'border-dashed border-[var(--derived)]',
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
    borderStyle: 'border-dashed border-[var(--derived)]',
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
    borderStyle: 'border-dotted border-[var(--inferred)]',
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
    borderStyle: 'border-dashed border-[var(--derived)]',
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
    borderStyle: 'border-dashed border-[var(--derived)]',
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
    borderStyle: 'border-dotted border-[var(--inferred)]',
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
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStep = STEPS[activeStepIdx];

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveStepIdx((prev) => (prev + 1) % STEPS.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveStepIdx((prev) => (prev - 1 + STEPS.length) % STEPS.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStepSelect = (idx: number) => {
    setActiveStepIdx(idx);
  };

  const handlePrev = () => {
    setActiveStepIdx((prev) => (prev - 1 + STEPS.length) % STEPS.length);
  };

  const handleNext = () => {
    setActiveStepIdx((prev) => (prev + 1) % STEPS.length);
  };

  return (
    <section
      id="pipeline"
      ref={containerRef}
      className="py-16 lg:py-24 bg-transparent border-b border-[var(--border-default)] scroll-mt-16"
    >
      <div className="max-w-7xl mx-auto px-4 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-[var(--border-subtle)]">
          <ChapterHeader
            number="01"
            eyebrow="FORENSIC ATTRIBUTION PIPELINE"
            title="From SAR backscatter to candidate attribution."
            titleClassName="text-white"
          />
        </div>

        {/* 8 Step Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {STEPS.map((s, idx) => {
            const isSelected = idx === activeStepIdx;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => handleStepSelect(idx)}
                className={`p-3 rounded-[8px] text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-xs ${
                  isSelected
                    ? 'bg-[var(--ocean-1)]/80 backdrop-blur-md text-white border-white/60 shadow-md ring-2 ring-[var(--ocean-2)]/60'
                    : 'bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/40 hover:border-white/60 text-[var(--text-1)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-xs font-bold tabular-nums ${isSelected ? 'text-white' : 'text-[var(--ocean-1)]'}`}>
                    0{s.step}
                  </span>
                </div>

                <div className={`font-sans font-medium text-xs line-clamp-2 leading-snug ${isSelected ? 'text-white' : 'text-[var(--text-1)]'}`}>
                  {s.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel: 2 Columns */}
        <div className="bg-white/25 backdrop-blur-xl border border-white/40 rounded-[10px] p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.22)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-[var(--text-1)]">
          {/* Left Column: Figure (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className={`p-1.5 rounded-[6px] border bg-white/40 backdrop-blur-sm border-white/40 ${currentStep.borderStyle}`}>
              <StepFigure step={currentStep.step} />
            </div>

            {/* Prev/Next Controls */}
            <div className="flex items-center justify-end text-xs font-sans text-slate-200 px-1">
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-[4px] bg-white/40 hover:bg-white/60 text-white border border-white/40 cursor-pointer transition-colors"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <span className="px-1 text-slate-200 tabular-nums">
                  {currentStep.step} / {STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-[4px] bg-white/40 hover:bg-white/60 text-white border border-white/40 cursor-pointer transition-colors"
                  title="Next Step"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Step Description (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2.5">
              <h3 className="font-sans font-bold text-xl sm:text-2xl text-white leading-snug">
                {currentStep.title}
              </h3>
              <p className="font-sans text-[15px] sm:text-[16px] leading-relaxed text-slate-200">
                {currentStep.whyItMatters}
              </p>
            </div>

            {/* Readout Rows IN -> OUT -> METHOD */}
            <div className="pt-2">
              <div className="bg-white/40 backdrop-blur-sm rounded-[6px] p-3.5 border border-white/40 divide-y divide-white/30 shadow-xs">
                {[
                  { key: 'INPUT', value: currentStep.input },
                  { key: 'OUTPUT', value: currentStep.output },
                  { key: 'METHOD', value: currentStep.method },
                ].map((row, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-4 font-mono text-xs">
                    <span className="text-xs uppercase text-[var(--text-2)] font-medium tracking-wider">
                      {row.key}
                    </span>
                    <span className="text-xs text-[var(--text-1)] font-semibold text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {isEngineeringMode && (
                <div className="mt-4 p-3.5 rounded-[6px] bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-2)] leading-relaxed">
                  <div className="text-[var(--text-1)] font-semibold mb-1 uppercase tracking-wider">
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
