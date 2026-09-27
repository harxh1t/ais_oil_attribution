import React from 'react';
import { useCase } from '../context/CaseContext';
import { Scene3D } from '../components/workspace/Scene3D';
import { WorkspaceTimeline } from '../components/workspace/WorkspaceTimeline';
import { WorkspaceLeftRail } from '../components/workspace/WorkspaceLeftRail';
import { WorkspaceRightPanel } from '../components/workspace/WorkspaceRightPanel';
import { CanvasOverlays } from '../components/workspace/CanvasOverlays';
import { Footer } from '../components/shared/Footer';
export const Workspace: React.FC = () => {
  const { caseData } = useCase();
  const [activeLayers, setActiveLayers] = React.useState<{
    slick: boolean;
    trajectories: boolean;
    vessels: boolean;
    bathymetry: boolean;
    currents: boolean;
  }>({
    slick: true,
    trajectories: true,
    vessels: true,
    bathymetry: false,
    currents: true
  });

  const [cameraView, setCameraView] = React.useState<'perspective' | 'top' | 'oblique'>('perspective');

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
      {/* 3D Workspace Sub-header */}
      <div className="h-12 bg-[var(--surface-1)] border-b border-[var(--border-default)] px-4 flex items-center justify-end z-10 shrink-0">
        {/* View Angle & Quick Layer Toggles */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Rail (Layer Toggles & Vessel Selector) */}
        <WorkspaceLeftRail
          activeLayers={activeLayers}
          toggleLayer={toggleLayer}
        />

        {/* Central 3D Canvas Area */}
        <div className="flex-1 min-w-0 relative bg-[#041624] overflow-hidden flex flex-col">
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
