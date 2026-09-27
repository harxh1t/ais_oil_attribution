import React from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Ship,
  Sliders,
  ChevronDown,
  X,
} from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { EvidenceLegend } from '../ui';
import { cn } from '../../utils/cn';

export interface SceneLayerState {
  visible: boolean;
  opacity: number;
}

export interface WorkspaceLayers {
  slick: SceneLayerState;
  particles: SceneLayerState;
  ellipse: SceneLayerState;
  observedTracks: SceneLayerState;
  derivedSegments: SceneLayerState;
  aisGaps: SceneLayerState;
  coastline: SceneLayerState;
  grid: SceneLayerState;
}

interface WorkspaceLeftRailProps {
  layers: WorkspaceLayers;
  setLayers: React.Dispatch<React.SetStateAction<WorkspaceLayers>>;
  vesselVisibility: Record<string, boolean>;
  setVesselVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onClose?: () => void;
}

const LAYER_CONFIG: { key: keyof WorkspaceLayers; label: string; badge: string; color: string }[] = [
  { key: 'slick', label: 'Observed Slick', badge: 'OBS', color: 'text-[var(--teal-400)]' },
  { key: 'particles', label: 'Hindcast Particles', badge: 'INF', color: 'text-[var(--pink-400)]' },
  { key: 'ellipse', label: '95% Error Ellipse', badge: 'INF', color: 'text-[var(--pink-400)]' },
  { key: 'observedTracks', label: 'Observed Tracks', badge: 'OBS', color: 'text-[var(--teal-400)]' },
  { key: 'derivedSegments', label: 'Derived Segments', badge: 'DER', color: 'text-[var(--amber-400)]' },
  { key: 'aisGaps', label: 'AIS Gaps (Hatch)', badge: 'DER', color: 'text-[var(--amber-400)]' },
  { key: 'coastline', label: 'Coastline & Land', badge: 'MAP', color: 'text-[var(--text-2)]' },
  { key: 'grid', label: 'Metric Grid (1 km)', badge: 'MAP', color: 'text-[var(--text-2)]' },
];

export const WorkspaceLeftRail: React.FC<WorkspaceLeftRailProps> = ({
  layers,
  setLayers,
  vesselVisibility,
  setVesselVisibility,
  onClose,
}) => {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();

  const toggleLayerVisible = (key: keyof WorkspaceLayers) => {
    setLayers((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }));
  };

  const updateLayerOpacity = (key: keyof WorkspaceLayers, val: number) => {
    setLayers((prev) => ({
      ...prev,
      [key]: { ...prev[key], opacity: val },
    }));
  };

  const toggleVesselVisible = (vesselId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVesselVisibility((prev) => ({
      ...prev,
      [vesselId]: prev[vesselId] === false ? true : false,
    }));
  };

  return (
    <aside className="w-full h-full flex flex-col justify-between bg-[var(--surface-1)] border-r border-[var(--border-default)] select-none overflow-hidden font-mono text-xs">
      {/* Top Header */}
      <div className="p-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--violet-400)]" />
          <span className="font-display font-bold text-xs text-[var(--text-1)] tracking-wider">
            SCENE INSPECTOR
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[var(--text-3)] hover:text-white hover:bg-[var(--surface-2)] cursor-pointer"
            aria-label="Close left drawer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Section 1: Layers & Opacities */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
            <span>LAYERS & VISIBILITY</span>
            <Sliders className="w-3.5 h-3.5" />
          </div>

          <div className="space-y-2 pt-1">
            {LAYER_CONFIG.map(({ key, label, badge, color }) => {
              const layer = layers[key];
              return (
                <div
                  key={key}
                  className="p-2 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleLayerVisible(key)}
                        className={cn(
                          'p-1 rounded-[3px] transition-colors cursor-pointer',
                          layer.visible
                            ? 'text-[var(--violet-400)] hover:bg-[var(--surface-3)]'
                            : 'text-[var(--text-3)] hover:text-white'
                        )}
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <span className={cn('text-xs font-medium', layer.visible ? 'text-[var(--text-1)]' : 'text-[var(--text-3)] line-through')}>
                        {label}
                      </span>
                    </div>
                    <span className={cn('text-xs font-mono px-1 py-0.2 rounded border border-[var(--border-default)]', color)}>
                      {badge}
                    </span>
                  </div>

                  {layer.visible && (
                    <div className="flex items-center gap-2 px-1 pt-0.5">
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={layer.opacity}
                        onChange={(e) => updateLayerOpacity(key, parseFloat(e.target.value))}
                        className="w-full h-1 bg-[var(--surface-3)] accent-[var(--violet-500)] rounded-lg cursor-pointer"
                        title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
                      />
                      <span className="text-xs text-[var(--text-3)] font-mono tabular-nums w-8 text-right">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Candidate Vessels */}
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
            <span>CANDIDATE VESSELS</span>
            <Ship className="w-3.5 h-3.5" />
          </div>

          <div className="space-y-1.5 pt-1">
            {caseData.vessels.map((vessel) => {
              const isSelected = vessel.id === selectedVesselId;
              const isVisible = vesselVisibility[vessel.id] !== false;

              return (
                <div
                  key={vessel.id}
                  onClick={() => setSelectedVesselId(vessel.id)}
                  className={cn(
                    'p-2 rounded-[6px] border transition-all cursor-pointer flex flex-col gap-1',
                    isSelected
                      ? 'bg-[var(--violet-950)]/40 border-[var(--violet-500)] shadow-[0_0_10px_var(--glow-violet)]'
                      : 'bg-[var(--surface-2)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-5 h-5 rounded-[3px] text-xs font-bold flex items-center justify-center font-mono',
                          vessel.rank === 1
                            ? 'bg-[var(--violet-500)]/25 text-[var(--violet-300)] border border-[var(--violet-500)]/50 font-bold'
                            : 'bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-default)]'
                        )}
                      >
                        #{vessel.rank}
                      </span>
                      <span className="font-semibold text-xs text-[var(--text-1)] truncate max-w-[130px]">
                        {vessel.name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => toggleVesselVisible(vessel.id, e)}
                      className={cn(
                        'p-1 rounded-[3px] text-xs transition-colors cursor-pointer',
                        isVisible
                          ? 'text-[var(--text-2)] hover:text-white'
                          : 'text-[var(--text-3)] hover:text-white'
                      )}
                      title={isVisible ? 'Hide vessel track' : 'Show vessel track'}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Telemetry bar & confidence */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-3)] font-mono pt-1">
                    <span>DCPA {vessel.dcpa.toFixed(1)} km</span>
                    <span className="text-[var(--text-2)] font-semibold">
                      {Math.round(vessel.confidence * 100)}% conf
                    </span>
                  </div>

                  {/* Mini confidence progress bar */}
                  <div className="w-full h-1 bg-[var(--surface-3)] rounded-full overflow-hidden mt-0.5">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        vessel.confidence >= 0.7
                          ? 'bg-[var(--violet-400)]'
                          : vessel.confidence >= 0.4
                          ? 'bg-[var(--violet-600)]'
                          : 'bg-red-400'
                      )}
                      style={{ width: `${vessel.confidence * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pinned Evidence Legend at Bottom */}
      <div className="p-3 border-t border-[var(--border-default)] bg-[var(--surface-1)]">
        <EvidenceLegend compact />
      </div>
    </aside>
  );
};
