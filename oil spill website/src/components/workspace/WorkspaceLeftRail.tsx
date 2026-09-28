import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Layers, Eye, EyeOff, Ship, Waves } from 'lucide-react';
import { CandidateVessel } from '../../data/malibuCase';

interface WorkspaceLeftRailProps {
  activeLayers: {
    slick: boolean;
    trajectories: boolean;
    vessels: boolean;
    bathymetry: boolean;
    currents: boolean;
    terrain?: boolean;
  };
  toggleLayer: (layer: any) => void;
}

export const WorkspaceLeftRail: React.FC<WorkspaceLeftRailProps> = ({
  activeLayers,
  toggleLayer
}) => {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();

  return (
    <div className="w-64 bg-[var(--surface-1)] border-r border-[var(--border-default)] flex flex-col justify-between shrink-0 z-10 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Layer Controls */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--text-3)] uppercase mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Forensic Layers</span>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => toggleLayer('slick')}
              className={`w-full p-2 rounded-[6px] text-xs flex items-center justify-between border transition-colors ${
                activeLayers.slick
                  ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                  : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--observed)]" />
                <span className="font-medium">Observed Slick Polygon</span>
              </div>
              {activeLayers.slick ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => toggleLayer('trajectories')}
              className={`w-full p-2 rounded-[6px] text-xs flex items-center justify-between border transition-colors ${
                activeLayers.trajectories
                  ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                  : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--inferred)]" />
                <span className="font-medium">Lagrangian Trajectories</span>
              </div>
              {activeLayers.trajectories ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => toggleLayer('vessels')}
              className={`w-full p-2 rounded-[6px] text-xs flex items-center justify-between border transition-colors ${
                activeLayers.vessels
                  ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                  : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--derived)]" />
                <span className="font-medium">AIS Vessel Tracks</span>
              </div>
              {activeLayers.vessels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => toggleLayer('currents')}
              className={`w-full p-2 rounded-[6px] text-xs flex items-center justify-between border transition-colors ${
                activeLayers.currents
                  ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                  : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Waves className="w-3.5 h-3.5 text-red-500" />
                <span className="font-medium">HYCOM Current Vectors</span>
              </div>
              {activeLayers.currents ? <Eye className="w-3.5 h-3.5 text-red-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => toggleLayer('bathymetry')}
              className={`w-full p-2 rounded-[6px] text-xs flex items-center justify-between border transition-colors ${
                activeLayers.bathymetry
                  ? 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-1)]'
                  : 'bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                  activeLayers.bathymetry
                    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                    : 'bg-[var(--surface-4)]'
                }`} />
                <span className="font-medium">Seabed Topography (Waves)</span>
              </div>
              {activeLayers.bathymetry ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Vessel Shortlist Selector */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--text-3)] uppercase mb-3">
            <Ship className="w-3.5 h-3.5" />
            <span>Candidate Vessels</span>
          </div>

          <div className="space-y-2">
            {caseData.vessels.map((vessel: CandidateVessel) => {
              const isSelected = selectedVesselId === vessel.id;
              return (
                <button
                  key={vessel.id}
                  onClick={() => setSelectedVesselId(vessel.id)}
                  className={`w-full p-2.5 rounded-[6px] text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--ocean-1)] text-white border-[var(--ocean-1)] shadow-md ring-2 ring-[var(--ocean-3)]'
                      : 'bg-[var(--surface-2)] border-[var(--border-subtle)] hover:border-[var(--ocean-2)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[var(--text-1)]'}`}>
                      {vessel.name}
                    </span>
                    <span className={`text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-[var(--ocean-1)]'}`}>
                      {vessel.borda}/20
                    </span>
                  </div>
                  <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-[var(--ocean-4)]' : 'text-[var(--text-3)]'}`}>
                    MMSI: {vessel.mmsi} • {vessel.type}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Release coordinates stamp at bottom */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-2)] text-[11px] font-mono text-[var(--text-3)]">
        <div>RELEASE: {caseData.inferredReleasePoint.lat.toFixed(4)}°N, {Math.abs(caseData.inferredReleasePoint.lon).toFixed(4)}°W</div>
      </div>
    </div>
  );
};
