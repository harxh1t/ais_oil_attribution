import React from 'react';
import { useCase } from '../../context/CaseContext';
import {
  Eye,
  EyeOff,
  Waves,
  CircleDot,
} from 'lucide-react';
import { CandidateVessel } from '../../data/malibuCase';
import { MapOverlaysState } from '../maps/BaseMap';

export interface WorkspaceLeftRailProps {
  activeLayers: {
    slick: boolean;
    trajectories: boolean;
    vessels: boolean;
    bathymetry: boolean;
    currents: boolean;
    terrain?: boolean;
  };
  toggleLayer: (layer: any) => void;
  displayMode?: '3d' | '2d';
  baseLayer?: string;
  setBaseLayer?: (layer: string) => void;
  mapOverlays?: MapOverlaysState;
  toggleMapOverlay?: (layer: keyof MapOverlaysState) => void;
}

const BASE_MAP_OPTIONS = [
  { id: 'OpenStreetMap', label: 'OpenStreetMap', desc: 'Standard topographic cartography' },
  { id: 'Esri Ocean (Maritime)', label: 'Esri Ocean', desc: 'Bathymetry & maritime depths' },
  { id: 'Satellite Imagery', label: 'Satellite (Maxar)', desc: 'High-res earth observation' },
  { id: 'Dark Mode (Canvas)', label: 'Dark Mode', desc: 'High contrast tactical dark' },
  { id: 'Light Clean', label: 'Light Clean', desc: 'Minimal neutral grey canvas' },
];

export const WorkspaceLeftRail: React.FC<WorkspaceLeftRailProps> = ({
  activeLayers,
  toggleLayer,
  displayMode = '2d',
  baseLayer = 'OpenStreetMap',
  setBaseLayer,
  mapOverlays = {
    slick: true,
    candidates: true,
    cpa: true,
    otherTraffic: true,
    driftOrigin: true,
  },
  toggleMapOverlay,
}) => {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();

  return (
    <div className="w-72 sm:w-80 bg-[var(--surface-1)] border-r border-[var(--border-default)] flex flex-col shrink-0 z-10 h-full overflow-hidden select-none">
      {/* ========================================================= */}
      {/* TOP HALF: MAP LAYER CHANGER & FORENSIC CONTROLS          */}
      {/* ========================================================= */}
      <div className="h-1/2 flex flex-col min-h-0 border-b border-[var(--border-default)] overflow-hidden">
        {/* Top Half Header */}
        <div className="h-9 px-3.5 bg-[var(--surface-2)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--text-1)] uppercase tracking-wider">
              Map Layer Changer
            </span>
          </div>
        </div>

        {/* Scrollable Layer Changer Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {displayMode === '2d' ? (
            <>
              {/* Section 1: Base Map Tile Switcher */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--text-3)] uppercase mb-2">
                  <span>Base Map Tile Layer</span>
                </div>

                <div className="space-y-1">
                  {BASE_MAP_OPTIONS.map((opt) => {
                    const isSelected = baseLayer === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setBaseLayer?.(opt.id)}
                        className={`w-full px-2.5 py-1.5 rounded-[5px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--surface-2)] border-[var(--ocean-1)] text-[var(--text-1)] shadow-xs'
                            : 'bg-transparent border-transparent text-[var(--text-2)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text-1)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-[var(--ocean-1)] ring-2 ring-[var(--ocean-3)]'
                                : 'border border-[var(--text-3)]'
                            }`}
                          />
                          <div className="truncate">
                            <span className="font-semibold block truncate leading-tight">{opt.label}</span>
                            <span className="text-[10px] text-[var(--text-3)] block truncate leading-tight font-mono">{opt.desc}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold text-[var(--ocean-1)] shrink-0 ml-1">
                            ACTIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: 2D Forensic Overlays */}
              <div className="pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--text-3)] uppercase mb-2">
                  <span>Forensic Overlays</span>
                </div>

                <div className="space-y-1.5">
                  {/* Overlay: Observed Slick */}
                  <button
                    type="button"
                    onClick={() => toggleMapOverlay?.('slick')}
                    className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                      mapOverlays.slick
                        ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                        : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0" />
                      <span className="font-medium truncate">Observed Slick &amp; Spread</span>
                    </div>
                    {mapOverlays.slick ? (
                      <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)] shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                    )}
                  </button>

                  {/* Overlay: Top Candidate Tracks */}
                  <button
                    type="button"
                    onClick={() => toggleMapOverlay?.('candidates')}
                    className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                      mapOverlays.candidates
                        ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                        : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--ocean-1)] shrink-0" />
                      <span className="font-medium truncate">Top Candidate Tracks (Rank 1-3)</span>
                    </div>
                    {mapOverlays.candidates ? (
                      <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)] shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                    )}
                  </button>

                  {/* Overlay: Closest Approach (CPA) Points */}
                  <button
                    type="button"
                    onClick={() => toggleMapOverlay?.('cpa')}
                    className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                      mapOverlays.cpa
                        ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                        : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CircleDot className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                      <span className="font-medium truncate">Closest Approach (CPA) Points</span>
                    </div>
                    {mapOverlays.cpa ? (
                      <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)] shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                    )}
                  </button>

                  {/* Overlay: Other Maritime Traffic */}
                  <button
                    type="button"
                    onClick={() => toggleMapOverlay?.('otherTraffic')}
                    className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                      mapOverlays.otherTraffic
                        ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                        : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-500 bg-slate-400/40 shrink-0" />
                      <span className="font-medium truncate">Other Maritime Traffic</span>
                    </div>
                    {mapOverlays.otherTraffic ? (
                      <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)] shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                    )}
                  </button>

                  {/* Overlay: Drift Origin Estimate (Backtrack) */}
                  <button
                    type="button"
                    onClick={() => toggleMapOverlay?.('driftOrigin')}
                    className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                      mapOverlays.driftOrigin
                        ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                        : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0" />
                      <span className="font-medium truncate">Drift Origin Estimate (Backtrack)</span>
                    </div>
                    {mapOverlays.driftOrigin ? (
                      <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)] shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* 3D Mode Layers */
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--text-3)] uppercase mb-2">
                <span>3D Spatial Layers</span>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleLayer('slick')}
                  className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                    activeLayers.slick
                      ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                      : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--observed)]" />
                    <span className="font-medium">Observed Slick Polygon</span>
                  </div>
                  {activeLayers.slick ? <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)]" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                </button>

                <button
                  type="button"
                  onClick={() => toggleLayer('trajectories')}
                  className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                    activeLayers.trajectories
                      ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                      : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--inferred)]" />
                    <span className="font-medium">Lagrangian Trajectories</span>
                  </div>
                  {activeLayers.trajectories ? <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)]" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                </button>

                <button
                  type="button"
                  onClick={() => toggleLayer('vessels')}
                  className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                    activeLayers.vessels
                      ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                      : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--derived)]" />
                    <span className="font-medium">AIS Vessel Tracks</span>
                  </div>
                  {activeLayers.vessels ? <Eye className="w-3.5 h-3.5 text-[var(--ocean-1)]" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                </button>

                <button
                  type="button"
                  onClick={() => toggleLayer('currents')}
                  className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                    activeLayers.currents
                      ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                      : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Waves className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-medium">HYCOM Current Vectors</span>
                  </div>
                  {activeLayers.currents ? <Eye className="w-3.5 h-3.5 text-red-400" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                </button>

                <button
                  type="button"
                  onClick={() => toggleLayer('bathymetry')}
                  className={`w-full px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between border transition-all text-left cursor-pointer ${
                    activeLayers.bathymetry
                      ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                      : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                        activeLayers.bathymetry
                          ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                          : 'bg-[var(--surface-4)]'
                      }`}
                    />
                    <span className="font-medium">Seabed Topography (Waves)</span>
                  </div>
                  {activeLayers.bathymetry ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM HALF: CANDIDATE VESSELS SHORTLIST                  */}
      {/* ========================================================= */}
      <div className="h-1/2 flex flex-col min-h-0 overflow-hidden">
        {/* Bottom Half Header */}
        <div className="h-9 px-3.5 bg-[var(--surface-2)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--text-1)] uppercase tracking-wider">
              Candidate Vessels
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--border-subtle)]">
            {caseData.vessels.length} vessels
          </span>
        </div>

        {/* Scrollable Candidate Vessels List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
          {caseData.vessels.map((vessel: CandidateVessel) => {
            const isSelected = selectedVesselId === vessel.id;
            return (
              <button
                key={vessel.id}
                type="button"
                onClick={() => setSelectedVesselId(vessel.id)}
                className={`w-full p-2.5 rounded-[6px] text-left border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-[var(--ocean-1)] text-white border-[var(--ocean-1)] shadow-md ring-2 ring-[var(--ocean-3)]'
                    : 'bg-[var(--surface-2)]/70 border-[var(--border-subtle)] hover:bg-[var(--surface-2)] hover:border-[var(--ocean-2)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shrink-0 ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : vessel.rank === 1
                          ? 'bg-red-500/15 text-red-700 border border-red-500/30'
                          : vessel.rank === 2
                          ? 'bg-sky-500/15 text-sky-700 border border-sky-500/30'
                          : 'bg-slate-500/15 text-slate-700 border border-slate-500/30'
                      }`}
                    >
                      #{vessel.rank}
                    </span>
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[var(--text-1)]'}`}>
                      {vessel.name}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold shrink-0 ${isSelected ? 'text-white' : 'text-[var(--ocean-1)]'}`}>
                    {vessel.borda} pts
                  </span>
                </div>

                <div
                  className={`text-[10px] font-mono mt-1 flex items-center justify-between ${
                    isSelected ? 'text-white/80' : 'text-[var(--text-3)]'
                  }`}
                >
                  <span>MMSI: {vessel.mmsi}</span>
                  <span className="truncate max-w-[120px] text-right">{vessel.type}</span>
                </div>

                <div
                  className={`text-[10px] font-mono mt-0.5 flex items-center justify-between ${
                    isSelected ? 'text-white/70' : 'text-[var(--text-3)]'
                  }`}
                >
                  <span>DCPA: {vessel.dcpa.toFixed(2)} km</span>
                  <span>Conf: {Math.round(vessel.confidence * 100)}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Release coordinates stamp at the bottom */}
        <div className="p-2 border-t border-[var(--border-subtle)] bg-[var(--surface-2)] text-[10px] font-mono text-[var(--text-3)] flex items-center justify-between shrink-0">
          <span>ORIGIN:</span>
          <span className="font-semibold text-[var(--text-2)]">
            {caseData.inferredReleasePoint.lat.toFixed(4)}°N, {Math.abs(caseData.inferredReleasePoint.lon).toFixed(4)}°W
          </span>
        </div>
      </div>
    </div>
  );
};
