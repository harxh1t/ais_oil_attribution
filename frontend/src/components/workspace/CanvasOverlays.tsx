import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Ship,
  Info,
  ChevronDown,
  Layers,
  Compass,
  Command,
  HelpCircle,
  X,
} from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { cn } from '../../utils/cn';

interface CanvasOverlaysProps {
  cameraMode: string;
  setCameraMode: (mode: string) => void;
  onOpenLayersDrawer?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
}

export const CanvasOverlays: React.FC<CanvasOverlaysProps> = ({
  cameraMode,
  setCameraMode,
  onOpenLayersDrawer,
  onOpenCommandPalette,
  onOpenShortcuts,
}) => {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();
  const [showAboutPopover, setShowAboutPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const cameraPresets = [
    { id: 'tactical', label: 'Tactical Iso', desc: 'Azimuth 35°, Elevation 40°' },
    { id: 'nadir', label: 'Nadir Ortho', desc: 'Top-down Nadir Plan' },
    { id: 'release', label: 'Release Point', desc: '6 km Inferred Core Orbit' },
    { id: 'follow', label: 'Track Follow', desc: 'Candidate Kinematic Lock' },
  ];

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAboutPopover(false);
      }
    };
    if (showAboutPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAboutPopover]);

  return (
    <>
      {/* Top Overlay Container */}
      <div className="absolute top-3 inset-x-3 pointer-events-none flex items-center justify-between gap-2 z-20 font-mono text-xs select-none">
        {/* Top-Left: Case Tag & Simulated Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onOpenLayersDrawer && (
            <button
              type="button"
              onClick={onOpenLayersDrawer}
              className="min-[1100px]:hidden p-1.5 rounded bg-[#0b101b]/90 backdrop-blur-md border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer transition-colors"
              title="Toggle Layers & Vessels"
              aria-label="Toggle Layers"
            >
              <Layers className="w-4 h-4 text-violet-400" />
            </button>
          )}

          <div className="bg-[#0b101b]/90 backdrop-blur-md border border-neutral-800 rounded px-3 py-1.5 flex items-center gap-2 shadow-lg">
            <span className="font-bold text-xs text-neutral-100 tracking-wide">
              3D RECONSTRUCTION
            </span>
            <span className="text-neutral-500 font-mono text-xs">·</span>
            <span className="text-neutral-300 font-mono text-xs hidden sm:inline">
              MALIBU CASE
            </span>
            <span className="font-mono text-xs uppercase px-2 py-0.5 rounded border border-neutral-700 text-neutral-300 bg-neutral-800/70 tracking-wider">
              SIMULATED
            </span>
          </div>
        </div>

        {/* Top-Centre: Camera Presets (800ms animated transitions) */}
        <div className="hidden md:flex items-center gap-1 bg-[#0b101b]/90 backdrop-blur-md border border-neutral-800 rounded p-1 shadow-lg pointer-events-auto">
          <Camera className="w-3.5 h-3.5 text-violet-400 mx-1" />
          {cameraPresets.map((cam) => {
            const isActive = cameraMode === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => setCameraMode(cam.id)}
                title={cam.desc}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer font-medium',
                  isActive
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                )}
              >
                {cam.label}
              </button>
            );
          })}
        </div>

        {/* Top-Right: Focus Selector, Command Palette trigger, Shortcuts, and About Popover */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Focus Selector */}
          <div className="relative bg-[#0b101b]/90 backdrop-blur-md border border-neutral-800 rounded px-2.5 py-1 flex items-center gap-1.5 shadow-lg">
            <Ship className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <label
              htmlFor="candidate-focus-select"
              className="text-neutral-400 hidden lg:inline text-xs font-mono"
            >
              FOCUS:
            </label>
            <div className="relative flex items-center">
              <select
                id="candidate-focus-select"
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
                className="appearance-none bg-transparent text-neutral-100 text-xs font-mono pr-5 py-0.5 focus:outline-none cursor-pointer font-medium"
              >
                {caseData.vessels.map((v) => (
                  <option
                    key={v.id}
                    value={v.id}
                    className="bg-[#0b101b] text-neutral-100 text-xs"
                  >
                    #{v.rank} {v.name} ({v.dcpa.toFixed(1)}km)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-0 pointer-events-none" />
            </div>
          </div>

          {/* Command Palette Button (Ctrl/Cmd+K) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenCommandPalette) onOpenCommandPalette();
              else window.dispatchEvent(new CustomEvent('wake:open-command-palette'));
            }}
            className="p-1.5 rounded border border-neutral-800 bg-[#0b101b]/90 backdrop-blur-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shadow-lg flex items-center gap-1 cursor-pointer"
            title="Open Command Palette (⌘K)"
            aria-label="Open Command Palette"
          >
            <Command className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline text-xs font-mono font-medium">⌘K</span>
          </button>

          {/* Shortcuts Overlay Button (?) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenShortcuts) onOpenShortcuts();
              else window.dispatchEvent(new CustomEvent('wake:open-shortcuts'));
            }}
            className="p-1.5 rounded border border-neutral-800 bg-[#0b101b]/90 backdrop-blur-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shadow-lg flex items-center gap-1 cursor-pointer"
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <HelpCircle className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
            <span className="hidden xl:inline text-xs font-mono font-medium">?</span>
          </button>

          {/* About this view button */}
          <button
            type="button"
            onClick={() => setShowAboutPopover(!showAboutPopover)}
            className={cn(
              'p-1.5 rounded border transition-all cursor-pointer shadow-lg flex items-center gap-1.5',
              showAboutPopover
                ? 'bg-violet-600 text-white border-violet-500'
                : 'bg-[#0b101b]/90 backdrop-blur-md border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
            )}
            title="About this spatial view"
            aria-label="About this view"
          >
            <Info className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-mono font-medium">About</span>
          </button>
        </div>
      </div>

      {/* About this View Popover */}
      {showAboutPopover && (
        <div
          ref={popoverRef}
          className="absolute top-14 right-3 max-w-sm w-80 bg-[#0b101b]/95 backdrop-blur-xl border border-neutral-700 rounded-lg p-4 shadow-2xl z-30 font-sans text-xs space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-xs text-neutral-100 tracking-wide font-mono">
                SPATIAL PROJECTION & HINDCAST
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAboutPopover(false)}
              className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-neutral-200 text-xs leading-relaxed font-normal">
            Coordinates are projected into a local kilometre frame centred on the observed slick.
            Particles show the hindcast played forward from the inferred release point.
          </p>

          <div className="space-y-2 pt-1 border-t border-neutral-800 font-mono text-xs">
            <div>
              <div className="text-neutral-400 text-xs uppercase tracking-wider">
                Reference Frame:
              </div>
              <div className="text-neutral-300 text-xs mt-0.5">
                Cartesian metric grid (1 unit = 1 km) centred at 34.017°N, 118.663°W.
              </div>
            </div>
            <div>
              <div className="text-neutral-400 text-xs uppercase tracking-wider">
                Hydrodynamic Forcing:
              </div>
              <div className="text-neutral-300 text-xs mt-0.5">
                NOAA HRRR 3km wind field + ROMS coastal baroclinic ocean current.
              </div>
            </div>
            <div>
              <div className="text-neutral-400 text-xs uppercase tracking-wider">
                Kinematic Provenance:
              </div>
              <div className="text-neutral-300 text-xs mt-0.5">
                Observed S-AIS broadcast points (teal) vs. derived segments (amber).
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800 text-neutral-400 text-xs font-mono">
            Investigative decision support only. Attribution leads are not legal findings.
          </div>
        </div>
      )}
    </>
  );
};
