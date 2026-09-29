import React from 'react';
import { useCase } from '../context/CaseContext';
import { Scene3D } from '../components/workspace/Scene3D';
import { WorkspaceTimeline } from '../components/workspace/WorkspaceTimeline';
import { WorkspaceLeftRail } from '../components/workspace/WorkspaceLeftRail';
import { WorkspaceRightPanel } from '../components/workspace/WorkspaceRightPanel';
import { CanvasOverlays } from '../components/workspace/CanvasOverlays';
import { ForensicMap } from '../components/investigation/ForensicMap';
import { Footer } from '../components/shared/Footer';

export const Workspace: React.FC = () => {
  const { caseData } = useCase();
  const [displayMode, setDisplayMode] = React.useState<'3d' | '2d'>('2d');
  const [activeLayers, setActiveLayers] = React.useState<{
    slick: boolean;
    trajectories: boolean;
    vessels: boolean;
    bathymetry: boolean;
    currents: boolean;
    terrain?: boolean;
  }>({
    slick: true,
    trajectories: true,
    vessels: true,
    bathymetry: false,
    currents: true,
    terrain: false,
  });

  const [cameraView, setCameraView] = React.useState<'perspective' | 'top' | 'oblique'>('perspective');

  const [baseLayer, setBaseLayer] = React.useState<string>('OpenStreetMap');
  const [mapOverlays, setMapOverlays] = React.useState({
    slick: true,
    candidates: true,
    cpa: true,
    otherTraffic: true,
    driftOrigin: true,
  });

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const toggleMapOverlay = (overlayKey: keyof typeof mapOverlays) => {
    setMapOverlays(prev => ({ ...prev, [overlayKey]: !prev[overlayKey] }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
      {/* 3D / 2D Workspace Sub-header */}
      <div className="h-12 bg-[var(--surface-1)] border-b border-[var(--border-default)] px-4 flex items-center justify-between z-10 shrink-0">
        {/* Left Side: Mode Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--surface-2)] p-0.5 rounded-[6px] border border-[var(--border-subtle)] text-xs font-mono">
            <button
              onClick={() => setDisplayMode('3d')}
              className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                displayMode === '3d'
                  ? 'bg-[var(--primary-600)] text-white shadow-sm'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
              title="3D Hydrodynamic Spatial Canvas"
            >
              3D Spatial
            </button>
            <button
              onClick={() => setDisplayMode('2d')}
              className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                displayMode === '2d'
                  ? 'bg-[var(--primary-600)] text-white shadow-sm'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
              title="2D Geographic GIS Map"
            >
              2D Map
            </button>
          </div>
        </div>

        {/* Right Side: View Angle & Camera Toggles (when 3D) */}
        <div className="flex items-center gap-2">
          {displayMode === '3d' && (
            <div className="flex items-center bg-[var(--surface-2)] p-0.5 rounded-[6px] border border-[var(--border-subtle)] text-xs font-mono">
              <button
                onClick={() => setCameraView('perspective')}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  cameraView === 'perspective'
                    ? 'bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                Perspective
              </button>
              <button
                onClick={() => setCameraView('top')}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  cameraView === 'top'
                    ? 'bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                Top-Down
              </button>
              <button
                onClick={() => setCameraView('oblique')}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  cameraView === 'oblique'
                    ? 'bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                Oblique
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Rail (Layer Toggles & Candidate Vessels in bottom half) */}
        <WorkspaceLeftRail
          activeLayers={activeLayers}
          toggleLayer={toggleLayer}
          displayMode={displayMode}
          baseLayer={baseLayer}
          setBaseLayer={setBaseLayer}
          mapOverlays={mapOverlays}
          toggleMapOverlay={toggleMapOverlay}
        />

        {/* Central Workspace Area */}
        <div className="flex-1 min-w-0 relative bg-[#041624] overflow-hidden flex flex-col">
          {displayMode === '3d' ? (
            <>
              {/* Three.js / Canvas Scene */}
              <div className="flex-1 w-full h-full relative min-w-0">
                <Scene3D
                  layers={activeLayers}
                  cameraView={cameraView}
                />
                {/* 2D Canvas Overlays & Compass */}
                <CanvasOverlays cameraView={cameraView} />
              </div>

              {/* Bottom Floating Timeline Scrubber */}
              <div className="h-16 bg-[var(--surface-1)]/95 backdrop-blur-sm border-t border-[var(--border-default)] px-4 flex items-center shrink-0 z-20">
                <WorkspaceTimeline />
              </div>
            </>
          ) : (
            /* 2D GIS Map View */
            <div className="flex-1 w-full h-full relative min-w-0">
              <ForensicMap
                driftMode="backward"
                baseLayer={baseLayer}
                mapOverlays={mapOverlays}
              />
            </div>
          )}
        </div>

        {/* Right Tabbed Panel (Evidence Graph, Scenario Lab, Copilot, Details) */}
        <WorkspaceRightPanel />
      </div>

      <div className="shrink-0 overflow-y-auto max-h-[80px]">
        <Footer showBackToTop={false} />
      </div>
    </div>
  );
};
