import React, { useState, useRef, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { InvestigationSetup } from '../components/investigation/InvestigationSetup';
import { LiveCliCard } from '../components/investigation/LiveCliCard';
import { RunConsole } from '../components/investigation/RunConsole';
import { CdsLoginModal } from '../components/investigation/CdsLoginModal';
import { AttributionImageDropdown } from '../components/investigation/AttributionImageDropdown';
import { ATTRIBUTION_IMAGES, AttributionImage } from '../data/attributionImages';
import { JourneyFooter } from '../components/shared/JourneyFooter';
import { Footer } from '../components/shared/Footer';
import { Card, Button } from '../components/ui';
import { Terminal, ArrowRight, ArrowLeft, Database, ChevronDown, Wind, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import backwardDriftImg from '../assets/images/backward_drift_map.svg';
import forwardDriftImg from '../assets/images/forward_drift_map.svg';
import forwardDriftAnim from '../assets/images/forward_drift_animation.gif';
import backwardDriftAnim from '../assets/images/backward_drift_animation.gif';
import segmentationOverlayImg from '../assets/images/segmentation_overlay.png';
import sarPreprocessedImg from '../assets/images/sar_preprocessed.png';

export const Investigate: React.FC = () => {
  const { runStatus, startForensicRun, artifacts } = useCase();
  const [showCli, setShowCli] = useState<boolean>(true);
  const [driftMode, setDriftMode] = useState<'forward' | 'backward'>('backward');
  const [isCdsModalOpen, setIsCdsModalOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<AttributionImage>(ATTRIBUTION_IMAGES[0]);
  const [windCurrentSource, setWindCurrentSource] = useState<string | null>(null);
  const [isWindDropdownOpen, setIsWindDropdownOpen] = useState<boolean>(false);
  const windDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic artifacts: prefer backend output when available, fallback to bundled assets
  const forwardAnimSrc = artifacts?.forwardAnimation || forwardDriftAnim;
  const backwardAnimSrc = artifacts?.backwardAnimation || backwardDriftAnim;
  const forwardMapSrc = artifacts?.forwardMap || forwardDriftImg;
  const backwardMapSrc = artifacts?.backwardMap || backwardDriftImg;
  const sarPreprocessedSrc = artifacts?.sarPreprocessed || sarPreprocessedImg;
  const segmentationOverlaySrc = artifacts?.segmentationOverlay || segmentationOverlayImg;
  const [cdsUser, setCdsUser] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('cds_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.account || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Close wind/current dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (windDropdownRef.current && !windDropdownRef.current.contains(e.target as Node)) {
        setIsWindDropdownOpen(false);
      }
    };
    if (isWindDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isWindDropdownOpen]);

  return (
    <div className="w-full bg-white min-h-[calc(100vh-64px)] flex flex-col justify-between">
      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-default)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[var(--primary-600)] uppercase">
                STEP 2 OF 4
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-1)] mt-1">
              Forensic Investigation Desk
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Wind/Current Data Source Dropdown (wider button) */}
            <div className="relative" ref={windDropdownRef}>
              <button
                type="button"
                onClick={() => setIsWindDropdownOpen(!isWindDropdownOpen)}
                className={cn(
                  'min-w-[270px] sm:min-w-[310px] h-[36px] flex items-center justify-between gap-2.5 px-3.5 rounded-[6px] cursor-pointer shadow-xs transition-all text-xs font-medium select-none',
                  'bg-[var(--surface-1)] border border-[var(--border-default)] text-[var(--text-1)] hover:bg-[var(--surface-2)] hover:border-[var(--ocean-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-3)]'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Wind className="w-3.5 h-3.5 text-[var(--ocean-2)] shrink-0" />
                  <span className="truncate font-semibold">
                    {windCurrentSource ? windCurrentSource : 'No data selected for wind/current'}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 text-[var(--text-2)] transition-transform duration-200 shrink-0',
                    isWindDropdownOpen && 'rotate-180 text-[var(--text-1)]'
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              {isWindDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[300px] sm:w-[350px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] shadow-[0_12px_32px_rgba(0,40,60,0.22)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3 bg-[var(--surface-1)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-1)]">
                        Wind / Current Data Source
                      </h4>
                      <p className="text-[10px] text-[var(--text-3)] font-mono">
                        Select hydrodynamic forcing provider
                      </p>
                    </div>
                    {windCurrentSource && (
                      <button
                        type="button"
                        onClick={() => {
                          setWindCurrentSource(null);
                          setIsWindDropdownOpen(false);
                        }}
                        className="text-[10px] font-mono text-[var(--text-3)] hover:text-red-600 transition-colors cursor-pointer"
                      >
                        Reset to None
                      </button>
                    )}
                  </div>

                  <div className="p-1.5 space-y-1">
                    {/* Option 1: NOAA/Hycom */}
                    <button
                      type="button"
                      onClick={() => {
                        setWindCurrentSource('NOAA/Hycom');
                        setIsWindDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full text-left p-2.5 rounded-[6px] transition-colors cursor-pointer flex items-start justify-between gap-2',
                        windCurrentSource === 'NOAA/Hycom'
                          ? 'bg-[var(--surface-2)] text-[var(--ocean-1)]'
                          : 'hover:bg-[var(--surface-2)] text-[var(--text-1)]'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">NOAA/Hycom</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-3)] mt-0.5 leading-snug">
                          HYCOM hydrodynamic ocean currents + GFS surface wind fields
                        </p>
                      </div>
                      {windCurrentSource === 'NOAA/Hycom' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </button>

                    {/* Option 2: CDS */}
                    <button
                      type="button"
                      onClick={() => {
                        setWindCurrentSource('CDS');
                        setIsWindDropdownOpen(false);
                        setIsCdsModalOpen(true);
                      }}
                      className={cn(
                        'w-full text-left p-2.5 rounded-[6px] transition-colors cursor-pointer flex items-start justify-between gap-2',
                        windCurrentSource === 'CDS'
                          ? 'bg-[var(--surface-2)] text-[var(--ocean-1)]'
                          : 'hover:bg-[var(--surface-2)] text-[var(--text-1)]'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">CDS</span>
                          <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono bg-[var(--ocean-1)] text-white font-medium">
                            Opens Login Window
                          </span>
                          {cdsUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-3)] mt-0.5 leading-snug">
                          Copernicus Climate Data Store (authenticates ERA5 atmospheric reanalysis)
                        </p>
                      </div>
                      {windCurrentSource === 'CDS' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </button>

                    {/* Option 3: PacIOOS */}
                    <button
                      type="button"
                      onClick={() => {
                        setWindCurrentSource('PacIOOS');
                        setIsWindDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full text-left p-2.5 rounded-[6px] transition-colors cursor-pointer flex items-start justify-between gap-2',
                        windCurrentSource === 'PacIOOS'
                          ? 'bg-[var(--surface-2)] text-[var(--ocean-1)]'
                          : 'hover:bg-[var(--surface-2)] text-[var(--text-1)]'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">PacIOOS</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-3)] mt-0.5 leading-snug">
                          Pacific Islands Ocean Observing System coastal current vectors
                        </p>
                      </div>
                      {windCurrentSource === 'PacIOOS' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCli(!showCli)}
            >
              <Terminal className="w-4 h-4 mr-1.5" />
              {showCli ? 'Hide Live CLI' : 'Show Live CLI'}
            </Button>

            {/* Run Attribution Pipeline Button with 22 Images Dropdown */}
            <div className="relative">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={runStatus === 'running'}
                className="flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>
                  {runStatus === 'running'
                    ? 'Simulating Physics...'
                    : `Run Attribution Pipeline (${selectedImage.name})`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </Button>

              <AttributionImageDropdown
                isOpen={isDropdownOpen}
                onClose={() => setIsDropdownOpen(false)}
                onSelectAndRun={(img) => {
                  setSelectedImage(img);
                  setIsDropdownOpen(false);
                  startForensicRun();
                }}
                selectedImageId={selectedImage.id}
                isRunning={runStatus === 'running'}
              />
            </div>
          </div>
        </div>

        {/* Status banner when pipeline is running or completed */}
        <RunConsole />

        {/* Live CLI Bar (Collapsible) */}
        {showCli && (
          <LiveCliCard />
        )}

        {/* Deeplab Image Model Detection Box */}
        <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] p-4 sm:p-5 shadow-sm transition-all flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-1)]">
                Deeplab Image Model Detection:
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Deeplab Detection 1 */}
            <div className="flex flex-col bg-white/60 border border-[var(--border-subtle)] rounded-[8px] p-3 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5">
                <span className="text-xs sm:text-sm font-bold text-[var(--text-1)]">
                  Preprocessed image
                </span>
              </div>
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-[6px] bg-slate-950/5 min-h-[280px]">
                <img
                  src={sarPreprocessedSrc}
                  alt="sar_preprocessed"
                  className="w-full max-h-[420px] object-contain rounded-[4px]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Deeplab Detection 2 */}
            <div className="flex flex-col bg-white/60 border border-[var(--border-subtle)] rounded-[8px] p-3 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5">
                <span className="text-xs sm:text-sm font-bold text-[var(--text-1)]">
                  Detected Spill
                </span>
              </div>
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-[6px] bg-slate-950/5 min-h-[280px]">
                <img
                  src={segmentationOverlaySrc}
                  alt="segmentation_overlay"
                  title="segmentation_overlay"
                  className="w-full max-h-[420px] object-contain rounded-[4px]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Parameters on Left, Map & Visuals on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Investigation Setup & Controls (4 cols) */}
          <div className="lg:col-span-4 flex flex-col h-full">
            <InvestigationSetup selectedImage={selectedImage} />
          </div>

          {/* Right Column: Forensic Map (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-full">
            <Card className="p-0 overflow-hidden border border-[var(--border-default)] flex-1 min-h-[580px] flex flex-col">
              <div className="p-4 bg-[var(--surface-1)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--text-1)]">
                    Geospatial Forensics: AIS Corridors &amp; {driftMode === 'forward' ? 'Forward Drift' : 'Backward Drift'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDriftMode('forward')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-[6px] border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs',
                      driftMode === 'forward'
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                        : 'bg-[var(--surface-1)] border-[var(--border-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]'
                    )}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    forward drift
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriftMode('backward')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-[6px] border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs',
                      driftMode === 'backward'
                        ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                        : 'bg-[var(--surface-1)] border-[var(--border-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]'
                    )}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    backward drift
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[480px]">
                <img
                  src={forwardAnimSrc}
                  alt="forward_animation.gif"
                  title="forward_animation.gif"
                  className={cn(
                    'w-full h-full object-contain transition-opacity duration-150',
                    driftMode === 'forward' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                  )}
                />
                <img
                  src={backwardAnimSrc}
                  alt="backward_animation.gif"
                  title="backward_animation.gif"
                  className={cn(
                    'w-full h-full object-contain transition-opacity duration-150',
                    driftMode === 'backward' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                  )}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* Forensic Diagnostics & Spatiotemporal Correlation (2 equal boxes side-by-side, then 1 long box width-wise) */}
        <div className="space-y-6 pt-2">
          {/* 2 Equal Boxes Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1 */}
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] aspect-square flex flex-col p-4 sm:p-5 overflow-hidden shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-1)] mb-3 shrink-0">
                Backward Drift Map
              </h3>
              <div className="flex-1 min-h-0 w-full rounded-[8px] overflow-hidden bg-white/70 border border-[var(--border-subtle)] flex items-center justify-center p-2">
                <img
                  src={backwardMapSrc}
                  alt="Backward Drift Map"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Box 2 */}
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] aspect-square flex flex-col p-4 sm:p-5 overflow-hidden shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-1)] mb-3 shrink-0">
                Forward Drift Map
              </h3>
              <div className="flex-1 min-h-0 w-full rounded-[8px] overflow-hidden bg-white/70 border border-[var(--border-subtle)] flex items-center justify-center p-2">
                <img
                  src={forwardMapSrc}
                  alt="forward_drift_map"
                  title="forward_drift_map"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Journey Footer aligned inside the container */}
        <JourneyFooter />
      </div>

      <Footer />

      {/* Copernicus CDS Login Modal */}
      <CdsLoginModal
        isOpen={isCdsModalOpen}
        onClose={() => setIsCdsModalOpen(false)}
        onLoginSuccess={(account) => setCdsUser(account)}
      />
    </div>
  );
};
