import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Radio,
  Sliders,
  Folder,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Play,
  Copy,
  Check,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { Card, Button, Slider, Toggle } from '../ui';
import { cn } from '../../utils/cn';

export const InvestigationSetup: React.FC = () => {
  const {
    parameters,
    updateParameter,
    resetParameters,
    loadExample,
    pickOnMap,
    setPickOnMap,
    startForensicRun,
    isFormValid,
    formValidationError,
    activeScenario,
    setActiveScenario,
    runStatus,
  } = useCase();

  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [bordaInfoOpen, setBordaInfoOpen] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Split paste handler for Lat/Lon
  const handlePasteCoord = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text && (text.includes(',') || text.includes(' '))) {
      const parts = text.split(/[, ]+/).filter(Boolean);
      if (parts.length >= 2) {
        const parsedLat = parseFloat(parts[0]);
        const parsedLon = parseFloat(parts[1]);
        if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
          e.preventDefault();
          updateParameter('lat', parsedLat);
          updateParameter('lon', parsedLon);
        }
      }
    }
  };

  const copyCoords = async () => {
    const formatted = `${parameters.lat.toFixed(6)}, ${parameters.lon.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    } catch {
      // fallback
    }
  };

  // Compute plain language time difference
  const computeTimeDelta = () => {
    const obsMs = new Date(parameters.observationTime).getTime();
    const releaseEpochMs = new Date('2024-08-05T16:40:00Z').getTime();
    if (isNaN(obsMs)) return 'Invalid observation time';
    const deltaHours = ((obsMs - releaseEpochMs) / (1000 * 3600)).toFixed(1);
    return `Observed ${deltaHours} h after the estimated release epoch`;
  };

  const handleScenarioChange = (scenarioKey: string) => {
    setActiveScenario(scenarioKey);
    if (scenarioKey === 'baseline') {
      updateParameter('windSpeedKts', 9.8);
      updateParameter('windDirectionDeg', 290);
      updateParameter('currentSpeedKts', 0.35);
      updateParameter('diffusionRate', 0.18);
      updateParameter('backtrackingHours', 9.2);
    } else if (scenarioKey === 'wind_plus20') {
      updateParameter('windSpeedKts', 11.8);
    } else if (scenarioKey === 'wind_minus20') {
      updateParameter('windSpeedKts', 7.8);
    } else if (scenarioKey === 'spread_plus25') {
      updateParameter('diffusionRate', 0.23);
    } else if (scenarioKey === 'epoch_plus25') {
      updateParameter('backtrackingHours', 8.8);
    }
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* 1. CASE PARAMETERS CARD */}
      <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--violet-400)] font-bold">
              01
            </span>
            <h3 className="font-display font-semibold text-sm tracking-wider uppercase text-[var(--text-1)]">
              CASE PARAMETERS
            </h3>
          </div>
          <span className="font-mono text-xs text-[var(--text-3)] border border-[var(--border-default)] px-2 py-0.5 rounded-[4px]">
            CLI FLAGS
          </span>
        </div>

        {/* 01 SPATIAL ORIGIN */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
              01 SPATIAL ORIGIN
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCoords}
                className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
                title="Copy coordinates"
              >
                {copiedCoords ? (
                  <Check className="w-3.5 h-3.5 text-[var(--violet-400)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPickOnMap(!pickOnMap)}
                className={cn(
                  'px-2 py-0.5 rounded-[4px] border text-xs transition-colors cursor-pointer flex items-center gap-1',
                  pickOnMap
                    ? 'bg-[var(--violet-600)] text-white border-[var(--violet-400)] shadow-[0_0_8px_var(--glow-violet)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border-default)] hover:text-[var(--text-1)]'
                )}
              >
                <MapPin className="w-3 h-3" />
                <span>{pickOnMap ? 'Picking On Map...' : 'Pick On Map'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[var(--text-3)] block mb-1">LATITUDE</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  value={parameters.lat}
                  onChange={(e) => updateParameter('lat', parseFloat(e.target.value) || 0)}
                  onPaste={handlePasteCoord}
                  className="w-full bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] rounded-[4px] px-2.5 py-1.5 pr-8 text-xs font-mono focus:outline-none focus:border-[var(--violet-400)]"
                  placeholder="34.016944"
                />
                <span className="absolute right-2.5 top-1.5 text-[var(--text-3)] text-xs">°N</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--text-3)] block mb-1">LONGITUDE</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  value={parameters.lon}
                  onChange={(e) => updateParameter('lon', parseFloat(e.target.value) || 0)}
                  onPaste={handlePasteCoord}
                  className="w-full bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] rounded-[4px] px-2.5 py-1.5 pr-8 text-xs font-mono focus:outline-none focus:border-[var(--violet-400)]"
                  placeholder="-118.663056"
                />
                <span className="absolute right-2.5 top-1.5 text-[var(--text-3)] text-xs">°W</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-3)] font-sans">
            Paste "lat, lon" to auto-split or toggle "Pick on map" to click/drag.
          </p>
        </div>

        {/* 02 OBSERVATION TIME (UTC) */}
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
              02 OBSERVATION TIME (UTC)
            </span>
            <button
              type="button"
              onClick={() => updateParameter('observationTime', '2024-08-06T01:50:00Z')}
              className="text-xs text-[var(--violet-400)] hover:text-[var(--violet-300)] bg-[var(--surface-2)] border border-[var(--border-strong)] px-2 py-0.5 rounded-[4px] transition-colors cursor-pointer"
            >
              Use SAR pass (01:50:00Z)
            </button>
          </div>

          <div className="space-y-1">
            <input
              type="text"
              value={parameters.observationTime}
              onChange={(e) => updateParameter('observationTime', e.target.value)}
              className="w-full bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] rounded-[4px] px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--violet-400)]"
              placeholder="2024-08-06T01:50:00Z"
            />
            <div className="flex items-center gap-1 text-xs text-[var(--text-2)] font-sans pt-0.5">
              <Clock className="w-3.5 h-3.5 text-[var(--violet-400)] shrink-0" />
              <span>{computeTimeDelta()}</span>
            </div>
          </div>
        </div>

        {/* 03 SPREAD */}
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
              03 SEARCH SPREAD RADIUS
            </span>
            <div className="flex items-center gap-1 text-[var(--text-1)] font-bold">
              <input
                type="number"
                min="1"
                max="50"
                step="0.5"
                value={parameters.spreadKm}
                onChange={(e) => updateParameter('spreadKm', parseFloat(e.target.value) || 12)}
                className="w-16 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[4px] px-1.5 py-0.5 text-right text-xs font-mono focus:outline-none"
              />
              <span className="text-[var(--text-3)]">km</span>
            </div>
          </div>
          <Slider
            label=""
            min={1}
            max={50}
            step={0.5}
            value={parameters.spreadKm}
            onChange={(val) => updateParameter('spreadKm', val)}
          />
        </div>

        {/* 04 REGIME */}
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
              04 ADVECTION REGIME
            </span>
            <span className="text-xs text-[var(--violet-400)] bg-[var(--surface-2)] border border-[var(--border-strong)] px-2 py-0.5 rounded-[4px]">
              Δt = 9.2 h
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-default)]">
            {[
              { id: 'auto' as const, label: 'Auto-detect' },
              { id: 'contemporaneous' as const, label: 'Contemporaneous' },
              { id: 'delayed' as const, label: 'Delayed (>1 h)' },
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => updateParameter('regime', reg.id)}
                className={cn(
                  'px-2 py-1.5 rounded-[4px] text-xs font-mono transition-colors text-center cursor-pointer',
                  parameters.regime === reg.id
                    ? 'bg-[var(--violet-600)] text-white font-bold shadow-[0_0_8px_var(--glow-violet)]'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                )}
              >
                {reg.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-3)] font-sans">
            Delayed regime (&gt;1 h) engages full backward Lagrangian drift modeling through GFS winds and HYCOM ocean currents.
          </p>
        </div>

        {/* 05 RANKING METHOD */}
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
              05 RANKING METHOD
            </span>
            <button
              type="button"
              onClick={() => setBordaInfoOpen(!bordaInfoOpen)}
              className="text-xs text-[var(--violet-400)] hover:text-[var(--violet-300)] flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Why Borda?</span>
            </button>
          </div>

          {bordaInfoOpen && (
            <div className="p-2.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] text-xs text-[var(--text-2)] font-sans leading-relaxed">
              Borda count eliminates arbitrary weighting biases by assigning rank-order points across orthogonal physical criteria (DCPA, TCPA, Fréchet alignment, and AIS continuity). No single parameter dominates the outcome.
            </div>
          )}

          <select
            value={parameters.rankingMethod}
            onChange={(e) => updateParameter('rankingMethod', e.target.value as 'borda' | 'weighted')}
            className="w-full bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] rounded-[4px] px-2.5 py-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="borda">Borda Count (default consensus)</option>
            <option value="weighted">Weighted score (config weights)</option>
          </select>
        </div>

        {/* 06 FORWARD FIT */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
              06 FORWARD FIT VERIFICATION
            </span>
            <Toggle
              checked={parameters.enableForwardFit}
              onChange={(checked) => updateParameter('enableForwardFit', checked)}
            />
          </div>
          <p className="text-xs text-[var(--text-3)] font-sans">
            Projects the inferred source forward and compares it with the observed slick.
          </p>
        </div>

        {/* 07 OUTPUT DIRECTORY */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
              07 OUTPUT DIRECTORY
            </span>
            <Folder className="w-3.5 h-3.5 text-[var(--violet-400)]" />
          </div>
          <input
            type="text"
            value={parameters.outputDir}
            onChange={(e) => updateParameter('outputDir', e.target.value)}
            className="w-full bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] rounded-[4px] px-2.5 py-1.5 text-xs font-mono focus:outline-none"
            placeholder="results/malibu_case"
          />
        </div>
      </Card>

      {/* 2. SENTINEL-1 ACQUISITION READOUT */}
      <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-[var(--text-3)]">
          <Radio className="w-3.5 h-3.5 text-[var(--violet-400)]" />
          <span className="font-semibold uppercase tracking-wider text-[var(--text-1)] text-xs">
            SENTINEL-1 ACQUISITION
          </span>
        </div>
        <div className="p-2.5 bg-[var(--surface-2)] rounded-[4px] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-2)] leading-relaxed">
          Mode IW · Polarisation VV+VH · Acquired 2024-08-06 01:50:00 UTC · Slick 11.6 km long, 4.7 km² (simulated).
        </div>
      </Card>

      {/* 3. ENVIRONMENTAL FORCING & SOLVER (COLLAPSIBLE) */}
      <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-3.5 space-y-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--violet-400)]" />
            <span className="font-display font-semibold text-xs tracking-wider uppercase text-[var(--text-1)]">
              ENVIRONMENTAL FORCING & SOLVER (ADVANCED)
            </span>
          </div>
          {advancedOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-3)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-3)]" />
          )}
        </button>

        {advancedOpen && (
          <div className="space-y-4 pt-2 border-t border-[var(--border-subtle)]">
            {/* Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-3)] uppercase tracking-wider">
                  Sensitivity Presets
                </span>
                <button
                  type="button"
                  onClick={() => handleScenarioChange('baseline')}
                  className="text-xs text-[var(--violet-400)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Solver</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'baseline', label: 'Baseline (0806)' },
                  { id: 'wind_plus20', label: 'Wind +20% (GFS)' },
                  { id: 'wind_minus20', label: 'Wind −20% (GFS)' },
                  { id: 'spread_plus25', label: 'Spread +25%' },
                  { id: 'epoch_plus25', label: 'Epoch +25m (17:05Z)' },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleScenarioChange(sc.id)}
                    className={cn(
                      'px-2 py-1.5 rounded-[4px] border text-xs font-mono text-left transition-colors cursor-pointer',
                      activeScenario === sc.id
                        ? 'bg-[var(--violet-600)] text-white border-[var(--violet-400)] font-bold'
                        : 'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border-default)] hover:text-[var(--text-1)]'
                    )}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders with Badges */}
            <div className="space-y-3">
              {/* Wind Speed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[var(--text-2)]">Wind Speed (GFS)</span>
                  <span className="font-mono text-xs text-[var(--derived)] border border-[var(--derived)]/40 px-1.5 py-0.2 rounded-[3px]">
                    DERIVED · EXTERNAL MODEL
                  </span>
                </div>
                <Slider
                  label=""
                  min={2}
                  max={25}
                  step={0.2}
                  value={parameters.windSpeedKts}
                  onChange={(v) => updateParameter('windSpeedKts', v)}
                />
              </div>

              {/* Surface Current */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[var(--text-2)]">Current Speed (HYCOM)</span>
                  <span className="font-mono text-xs text-[var(--derived)] border border-[var(--derived)]/40 px-1.5 py-0.2 rounded-[3px]">
                    DERIVED · EXTERNAL MODEL
                  </span>
                </div>
                <Slider
                  label=""
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={parameters.currentSpeedKts}
                  onChange={(v) => updateParameter('currentSpeedKts', v)}
                />
              </div>

              {/* Turbulent Diffusion */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[var(--text-2)]">Diffusion Tensor Rate</span>
                  <span className="font-mono text-xs text-[var(--text-2)] border border-[var(--border-strong)] px-1.5 py-0.2 rounded-[3px]">
                    MODEL PARAMETER
                  </span>
                </div>
                <Slider
                  label=""
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  value={parameters.diffusionRate}
                  onChange={(v) => updateParameter('diffusionRate', v)}
                />
              </div>

              {/* Reverse Hindcast Window */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[var(--text-2)]">Reverse Hindcast Window</span>
                  <span className="font-mono text-xs text-[var(--text-2)] border border-[var(--border-strong)] px-1.5 py-0.2 rounded-[3px]">
                    MODEL PARAMETER
                  </span>
                </div>
                <Slider
                  label=""
                  min={4}
                  max={24}
                  step={0.2}
                  value={parameters.backtrackingHours}
                  onChange={(v) => updateParameter('backtrackingHours', v)}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* STICKY ACTION BAR */}
      <div className="sticky bottom-0 bg-[var(--surface-1)] border border-[var(--border-default)] p-3 rounded-[8px] shadow-2xl space-y-2 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadExample}
            icon={<Sparkles className="w-3.5 h-3.5" />}
            title="Load Malibu demonstration dataset"
          >
            LOAD MALIBU EXAMPLE
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={resetParameters}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Reset form fields"
          >
            RESET
          </Button>
        </div>

        <div className="relative">
          <Button
            size="lg"
            variant="primary"
            disabled={!isFormValid || runStatus === 'running'}
            onClick={startForensicRun}
            className="w-full justify-center"
            icon={<Play className="w-4 h-4 fill-current" />}
          >
            INITIALIZE FORENSIC ATTRIBUTION →
          </Button>

          {!isFormValid && formValidationError && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--warning)] font-mono mt-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{formValidationError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
