import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scene3D } from '../components/workspace/Scene3D';
import { CanvasOverlays } from '../components/workspace/CanvasOverlays';
import {
  WorkspaceTimeline,
  T_RELEASE_MS,
  T_SAR_MS,
  T_TIMELINE_START_MS,
} from '../components/workspace/WorkspaceTimeline';
import {
  WorkspaceLeftRail,
  WorkspaceLayers,
} from '../components/workspace/WorkspaceLeftRail';
import { WorkspaceRightPanel } from '../components/workspace/WorkspaceRightPanel';
import { BaseMap } from '../components/maps/BaseMap';
import { RouteGuard } from '../components/shared/RouteGuard';
import { useCase } from '../context/CaseContext';
import {
  Layers,
  FileText,
  ArrowLeft,
  CheckCircle,
  Monitor,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/cn';

// Initial default scene layers
const INITIAL_LAYERS: WorkspaceLayers = {
  slick: { visible: true, opacity: 1.0 },
  particles: { visible: true, opacity: 1.0 },
  ellipse: { visible: true, opacity: 1.0 },
  observedTracks: { visible: true, opacity: 1.0 },
  derivedSegments: { visible: true, opacity: 1.0 },
  aisGaps: { visible: true, opacity: 1.0 },
  coastline: { visible: true, opacity: 1.0 },
  grid: { visible: true, opacity: 1.0 },
};

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const Workspace: React.FC = () => {
  const navigate = useNavigate();
  const { selectedVessel, setSelectedVesselId, setTimeCursor } = useCase();

  // 3D Scene Controls State
  const [cameraMode, setCameraMode] = useState<string>('tactical');
  const [layers, setLayers] = useState<WorkspaceLayers>(INITIAL_LAYERS);
  const [vesselVisibility, setVesselVisibility] = useState<Record<string, boolean>>({});

  // Listen for global command palette events (camera presets & layer toggles)
  useEffect(() => {
    const handlePresetEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setCameraMode(custom.detail);
      }
    };
    const handleLayerEvent = (e: Event) => {
      const custom = e as CustomEvent<keyof WorkspaceLayers>;
      if (custom.detail) {
        setLayers((prev) => ({
          ...prev,
          [custom.detail]: {
            ...prev[custom.detail],
            visible: !prev[custom.detail].visible,
          },
        }));
      }
    };

    window.addEventListener('wake:set-camera-preset', handlePresetEvent);
    window.addEventListener('wake:toggle-layer', handleLayerEvent);
    return () => {
      window.removeEventListener('wake:set-camera-preset', handlePresetEvent);
      window.removeEventListener('wake:toggle-layer', handleLayerEvent);
    };
  }, []);

  // Handler for node click in Evidence Graph
  const handleFlyTo = (target: 'slick' | 'release' | string) => {
    if (target === 'slick') {
      setCameraMode('nadir');
    } else if (target === 'release') {
      setCameraMode('release');
    } else {
      setSelectedVesselId(target);
      setCameraMode('follow');
    }
  };

  // Timeline & Playback State (Default: 16:40Z Release Epoch, autoplay once to 01:50Z)
  const [currentSimMs, setCurrentSimMs] = useState<number>(T_RELEASE_MS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true); // Autoplay on first entry
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2);

  // Responsive Drawer & Layout State
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  // WebGL Availability Check
  const [webGLAvailable, setWebGLAvailable] = useState<boolean>(true);

  useEffect(() => {
    setWebGLAvailable(checkWebGLSupport());

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1100) {
        setIsLeftDrawerOpen(false);
        setIsRightDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync simulation progress tau with CaseContext timeCursor
  useEffect(() => {
    const tau =
      currentSimMs <= T_RELEASE_MS
        ? 0
        : currentSimMs >= T_SAR_MS
        ? 1
        : (currentSimMs - T_RELEASE_MS) / (T_SAR_MS - T_RELEASE_MS);
    setTimeCursor(tau);
  }, [currentSimMs, setTimeCursor]);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSimMs((prev) => {
        // Advance sim time: ~12 seconds sim time per 50ms tick at 1x speed
        const advanceMs = playbackSpeed * 12 * 1000;
        const next = prev + advanceMs;

        // Auto-pause when reaching SAR observation pass (01:50:00Z)
        if (next >= T_SAR_MS) {
          setIsPlaying(false);
          return T_SAR_MS;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const isSmallScreen = windowWidth < 768;
  const isTablet = windowWidth < 1100;

  return (
    <RouteGuard>
      {/* Full-viewport application container (no page scroll) */}
      <div className="w-full h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] flex flex-col bg-[#05040F] overflow-hidden select-none">
        {/* Banner Notice for Small Screens or WebGL Unavailable */}
        {(isSmallScreen || !webGLAvailable) && (
          <div className="bg-[var(--surface-2)] border-b border-[var(--border-default)] px-4 py-2 flex items-center justify-between text-xs font-mono text-[var(--text-1)] z-40 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {!webGLAvailable
                  ? '3D WebGL acceleration is unavailable. Displaying 2D tactical projection.'
                  : 'Best on desktop. Displaying simplified 2D tactical projection for mobile viewport.'}
              </span>
            </div>
            <span className="hidden sm:inline text-[var(--text-3)]">
              1 unit = 1 km · Local Frame
            </span>
          </div>
        )}

        {/* MAIN INTERACTIVE WORKSPACE GRID */}
        <div className="flex-1 min-h-0 flex relative overflow-hidden">
          {/* 1. LEFT RAIL (280px on desktop, drawer below 1100px) */}
          <div
            className={cn(
              'w-[280px] shrink-0 h-full transition-all duration-300 z-30',
              isTablet
                ? cn(
                    'fixed inset-y-[64px] left-0 shadow-2xl bg-[var(--surface-1)]',
                    isLeftDrawerOpen ? 'translate-x-0' : '-translate-x-full'
                  )
                : 'relative'
            )}
          >
            <WorkspaceLeftRail
              layers={layers}
              setLayers={setLayers}
              vesselVisibility={vesselVisibility}
              setVesselVisibility={setVesselVisibility}
              onClose={isTablet ? () => setIsLeftDrawerOpen(false) : undefined}
            />
          </div>

          {/* Drawer backdrop for tablet/mobile */}
          {isTablet && (isLeftDrawerOpen || isRightDrawerOpen) && (
            <div
              onClick={() => {
                setIsLeftDrawerOpen(false);
                setIsRightDrawerOpen(false);
              }}
              className="fixed inset-0 top-[64px] bg-black/60 backdrop-blur-xs z-25 transition-opacity"
            />
          )}

          {/* 2. CENTER CANVAS (Flex-1) */}
          <div className="flex-1 h-full min-h-0 relative flex flex-col overflow-hidden">
            {/* Canvas Overlays (Camera Presets, Focus Selector, Simulated Badge, About Popover) */}
            <CanvasOverlays
              cameraMode={cameraMode}
              setCameraMode={setCameraMode}
              onOpenLayersDrawer={isTablet ? () => setIsLeftDrawerOpen(true) : undefined}
            />

            {/* Toggle Drawer Buttons for Tablet/Mobile */}
            {isTablet && (
              <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
                <button
                  onClick={() => setIsRightDrawerOpen(true)}
                  className="p-2 rounded-[6px] bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border-default)] text-[var(--text-2)] hover:text-white shadow-lg cursor-pointer"
                  title="Open Workbench Panel"
                  aria-label="Open Workbench Panel"
                >
                  <FileText className="w-4 h-4 text-[var(--violet-400)]" />
                </button>
              </div>
            )}

            {/* Main 3D Scene Viewport or 2D Fallback */}
            <div className="w-full h-full min-h-0 relative">
              {isSmallScreen || !webGLAvailable ? (
                <div className="w-full h-full relative">
                  <BaseMap />
                </div>
              ) : (
                <Scene3D
                  cameraMode={cameraMode}
                  currentSimMs={currentSimMs}
                  layers={layers}
                  vesselVisibility={vesselVisibility}
                />
              )}
            </div>
          </div>

          {/* 3. RIGHT PANEL (360px on desktop, drawer below 1100px, collapsible) */}
          <div
            className={cn(
              'w-[360px] shrink-0 h-full transition-all duration-300 z-30',
              isTablet
                ? cn(
                    'fixed inset-y-[64px] right-0 shadow-2xl bg-[var(--surface-1)]',
                    isRightDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                  )
                : isRightCollapsed
                ? 'hidden'
                : 'relative'
            )}
          >
            <WorkspaceRightPanel
              isCollapsed={isRightCollapsed}
              onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
              onCloseDrawer={isTablet ? () => setIsRightDrawerOpen(false) : undefined}
              onFlyTo={handleFlyTo}
            />
          </div>

          {/* Right Rail Expand Button when Collapsed (Desktop only) */}
          {!isTablet && isRightCollapsed && (
            <button
              onClick={() => setIsRightCollapsed(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-[var(--surface-1)] border border-[var(--border-default)] border-r-0 rounded-l-[6px] p-2 text-[var(--text-2)] hover:text-white shadow-xl cursor-pointer"
              title="Expand Workbench Panel"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--violet-400)]" />
            </button>
          )}
        </div>

        {/* 4. BOTTOM DOCK (~168px Multi-Row Forensic Timeline) */}
        <div className="w-full h-[168px] shrink-0 z-30">
          <WorkspaceTimeline
            currentSimMs={currentSimMs}
            setCurrentSimMs={setCurrentSimMs}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
          />
        </div>

        {/* 5. SLIM 48px FOOTER ("← BACK TO REPORT" & "FINISH") */}
        <footer className="w-full h-12 shrink-0 bg-[#05040F] border-t border-[var(--border-default)] px-4 flex items-center justify-between text-xs font-mono z-30 select-none">
          {/* Left: Back to Report navigation */}
          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 text-[var(--text-2)] hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-[4px] hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← BACK TO REPORT</span>
          </button>

          {/* Center: Case reference summary */}
          <div className="hidden sm:flex items-center gap-2 text-[var(--text-3)] text-xs">
            <span>Case WAKE-2024-0806-MLB</span>
            <span>·</span>
            <span>Santa Monica Bay</span>
            <span>·</span>
            <span className="text-[var(--text-2)]">
              Lead: {selectedVessel.name} (DCPA {selectedVessel.dcpa.toFixed(1)} km)
            </span>
          </div>

          {/* Right: Finish Action */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-[var(--violet-600)] hover:bg-[var(--violet-500)] text-white font-semibold py-1.5 px-4 rounded-[4px] shadow-[0_0_10px_var(--glow-violet)] transition-all cursor-pointer text-xs"
          >
            <CheckCircle className="w-4 h-4" />
            <span>FINISH</span>
          </button>
        </footer>
      </div>
    </RouteGuard>
  );
};
