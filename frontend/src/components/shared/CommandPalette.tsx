import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  FileText,
  Compass,
  Activity,
  Box,
  Ship,
  Play,
  RotateCcw,
  Camera,
  Layers,
  Download,
  HelpCircle,
  X,
} from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { Badge } from '../ui';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleLayer?: (layerKey: string) => void;
  onSetCameraPreset?: (preset: string) => void;
  onOpenShortcuts?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onToggleLayer,
  onSetCameraPreset,
  onOpenShortcuts,
}) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const {
    caseData,
    setSelectedVesselId,
    startForensicRun,
    resetParameters,
  } = useCase();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const selectShip = (id: string) => {
    setSelectedVesselId(id);
    if (location.pathname !== '/workspace' && location.pathname !== '/report') {
      navigate('/workspace');
    }
    onClose();
  };

  const handleRun = () => {
    startForensicRun();
    navigate('/investigate');
    onClose();
  };

  const handleResetExample = () => {
    resetParameters();
    onClose();
  };

  const handleExportJson = () => {
    const exportPayload = {
      schema: 'https://wake-forensics.internal/schemas/vessel-attribution-dossier-v1.json',
      exportedAt: new Date().toISOString(),
      caseMetadata: {
        id: caseData.id,
        name: caseData.name,
        seaArea: caseData.seaArea,
        sarSensor: caseData.sarSensor,
        sarPassTime: caseData.sarPassTime,
        inferredReleaseEpoch: caseData.inferredReleaseEpoch,
      },
      environmentalConditions: caseData.environmental,
      candidates: caseData.vessels,
      disclaimer:
        'Investigative decision support only. Attribution leads are not legal findings. All values simulated.',
    };
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wake_case_${caseData.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleCameraPreset = (preset: string) => {
    if (location.pathname !== '/workspace') {
      navigate('/workspace');
    }
    if (onSetCameraPreset) {
      onSetCameraPreset(preset);
    }
    window.dispatchEvent(new CustomEvent('wake:set-camera-preset', { detail: preset }));
    onClose();
  };

  const handleToggleLayerAction = (key: string) => {
    if (location.pathname !== '/workspace') {
      navigate('/workspace');
    }
    if (onToggleLayer) {
      onToggleLayer(key);
    }
    window.dispatchEvent(new CustomEvent('wake:toggle-layer', { detail: key }));
    onClose();
  };

  const filteredVessels = caseData.vessels.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.mmsi.includes(query) ||
      v.type.toLowerCase().includes(query.toLowerCase())
  );

  const q = query.toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0b101b] border border-neutral-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-800 bg-[#0d1322]">
          <Search className="w-4 h-4 text-violet-400 shrink-0 mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, candidate vessel, layer, camera preset, or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[13px] font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Body */}
        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          {/* Quick Navigation Pages */}
          {(q === '' ||
            'pages'.includes(q) ||
            'briefing'.includes(q) ||
            'investigate'.includes(q) ||
            'report'.includes(q) ||
            'workspace'.includes(q)) && (
            <div>
              <span className="text-xs font-mono text-neutral-400 px-2 block mb-1 uppercase tracking-wider">
                System Navigation (Pages)
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span>01. Case Briefing & Methodology</span>
                  </div>
                  <span className="text-neutral-500">Incident Overview</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/investigate')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-violet-400" />
                    <span>02. Hydrodynamic Drift Investigation</span>
                  </div>
                  <span className="text-neutral-500">Advection Solver</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/report')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-violet-400" />
                    <span>03. Forensic Case Report & Ranking</span>
                  </div>
                  <span className="text-neutral-500">Borda Matrix</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/workspace')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Box className="w-4 h-4 text-violet-400" />
                    <span>04. 3D Spatial Ocean Reconstruction</span>
                  </div>
                  <span className="text-neutral-500">WebGL & Particles</span>
                </button>
              </div>
            </div>
          )}

          {/* Camera Presets */}
          {(q === '' || 'camera'.includes(q) || 'preset'.includes(q) || 'view'.includes(q)) && (
            <div>
              <span className="text-xs font-mono text-neutral-400 px-2 block mb-1 uppercase tracking-wider">
                3D Camera Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCameraPreset('tactical')}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <Camera className="w-4 h-4 text-violet-400" />
                  <span>Tactical Iso (35° / 40°)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCameraPreset('nadir')}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <Camera className="w-4 h-4 text-violet-400" />
                  <span>Nadir Ortho (Top-Down)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCameraPreset('release')}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <Camera className="w-4 h-4 text-violet-400" />
                  <span>Release Point Orbit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCameraPreset('follow')}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left"
                >
                  <Camera className="w-4 h-4 text-violet-400" />
                  <span>Track Follow</span>
                </button>
              </div>
            </div>
          )}

          {/* Layer Toggles */}
          {(q === '' || 'layer'.includes(q) || 'toggle'.includes(q)) && (
            <div>
              <span className="text-xs font-mono text-neutral-400 px-2 block mb-1 uppercase tracking-wider">
                Layer Visibility Toggles
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'slick', label: 'SAR Slick Polygon' },
                  { key: 'particles', label: 'Hindcast Particles' },
                  { key: 'ellipse', label: '95% Error Ellipse' },
                  { key: 'observedTracks', label: 'Observed AIS Tracks' },
                  { key: 'derivedSegments', label: 'Derived Segments' },
                  { key: 'aisGaps', label: 'AIS Blackout Gaps' },
                  { key: 'coastline', label: 'Coastline Terrain' },
                  { key: 'grid', label: 'Metric Distance Grid' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleToggleLayerAction(item.key)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono text-neutral-300 hover:bg-[#151d30] transition-colors text-left"
                  >
                    <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Toggle {item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Case Actions */}
          {(q === '' ||
            'action'.includes(q) ||
            'export'.includes(q) ||
            'example'.includes(q) ||
            'reset'.includes(q)) && (
            <div>
              <span className="text-xs font-mono text-neutral-400 px-2 block mb-1 uppercase tracking-wider">
                Forensic Case Actions
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-violet-300 hover:bg-violet-950/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-violet-400" />
                    <span>Export Case Attribution JSON</span>
                  </div>
                  <Badge variant="neutral" size="sm">
                    Download
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={handleResetExample}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-neutral-300 hover:bg-neutral-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4 text-neutral-400" />
                    <span>Load / Reset Example Case (Malibu S-1)</span>
                  </div>
                  <Badge variant="neutral" size="sm">
                    Reset
                  </Badge>
                </button>

                {onOpenShortcuts && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenShortcuts();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-neutral-300 hover:bg-[#151d30] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-violet-400" />
                      <span>View Keyboard Shortcuts</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-xs">
                      ?
                    </kbd>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Candidate Vessels */}
          <div>
            <span className="text-xs font-mono text-neutral-400 px-2 block mb-1 uppercase tracking-wider">
              Candidate Vessels ({filteredVessels.length})
            </span>
            <div className="space-y-1">
              {filteredVessels.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectShip(v.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-neutral-200 hover:bg-[#151d30] transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Ship className="w-4 h-4 text-violet-400 group-hover:text-white" />
                    <div>
                      <span className="font-semibold text-white mr-2">{v.name}</span>
                      <span className="text-neutral-400">
                        MMSI {v.mmsi} · {v.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400 font-semibold">Rank #{v.rank}</span>
                    <Badge variant="neutral" size="sm">
                      {v.borda} pts
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#090e18] border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200 border border-neutral-700">
                ESC
              </kbd>{' '}
              to close
            </span>
            <span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-200 border border-neutral-700">
                ↵
              </kbd>{' '}
              to select
            </span>
          </div>
          <span>WAKE Decision Support</span>
        </div>
      </div>
    </div>
  );
};
