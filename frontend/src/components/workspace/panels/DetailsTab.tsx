import React, { useState } from 'react';
import { useCase } from '../../../context/CaseContext';
import {
  Camera,
  CheckCircle2,
  Anchor,
  FileJson,
} from 'lucide-react';

interface DetailsTabProps {
  onCaptureScreenshot?: () => void;
}

export const DetailsTab: React.FC<DetailsTabProps> = ({ onCaptureScreenshot }) => {
  const { caseData, selectedVesselId } = useCase();
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(false);

  const vessel =
    caseData.vessels.find((v) => v.id === selectedVesselId) || caseData.vessels[0];

  // Compute provenance breakdown directly from single source of truth in malibuCase.ts
  const track = vessel.track || [];
  const totalPoints = track.length || 76;
  const observedPct = vessel.provenance.observed;
  const derivedPct = vessel.provenance.derived;
  const observedCount = Math.round((observedPct / 100) * totalPoints);
  const derivedCount = totalPoints - observedCount;

  const latestPoint = track[track.length - 1];
  const currentSog = latestPoint?.sog ?? 14.2;
  const currentCog = latestPoint?.cog ?? 285;

  // Handle Export Case JSON
  const handleExportJson = () => {
    try {
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
        selectedCandidate: vessel,
        candidateRegistry: caseData.vessels,
        disclaimer:
          'Investigative decision support only. Attribution leads are not legal findings. All values simulated.',
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wake_case_${caseData.id}_${vessel.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export JSON:', err);
    }
  };

  // Handle Screenshot View
  const handleScreenshot = () => {
    if (onCaptureScreenshot) {
      onCaptureScreenshot();
      setScreenshotSuccess(true);
      setTimeout(() => setScreenshotSuccess(false), 2500);
      return;
    }

    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.warn('Canvas not found for screenshot');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `wake_3d_spatial_${caseData.id}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setScreenshotSuccess(true);
      setTimeout(() => setScreenshotSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to capture canvas screenshot:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b101b] text-neutral-200 overflow-y-auto font-sans text-xs">
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-800 bg-[#0d1322]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            Kinematic Telemetry & Provenance
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
            Rank #{vessel.rank} · {vessel.id.toUpperCase()}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5 font-mono">
          <Anchor className="w-4 h-4 text-violet-400" />
          {vessel.name}
        </h3>
      </div>

      <div className="p-3.5 space-y-4">
        {/* Core Forensic Attribution Metrics */}
        <div>
          <div className="text-xs font-mono text-neutral-400 mb-2 uppercase tracking-wider">
            Attribution Distance & Consensus
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* DCPA */}
            <div className="p-2.5 rounded bg-[#121829] border border-neutral-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-neutral-400">DCPA</span>
                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  DERIVED
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-neutral-100">
                {vessel.dcpa.toFixed(1)} km
              </div>
              <div className="text-[12px] text-neutral-400 mt-0.5">Closest point to spill core</div>
            </div>

            {/* TCPA */}
            <div className="p-2.5 rounded bg-[#121829] border border-neutral-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-neutral-400">|TCPA|</span>
                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  DERIVED
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-neutral-100">
                {vessel.tcpa} min
              </div>
              <div className="text-[12px] text-neutral-400 mt-0.5">Offset to 16:40Z epoch</div>
            </div>

            {/* Fréchet Distance */}
            <div className="p-2.5 rounded bg-[#121829] border border-neutral-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-neutral-400">Fréchet</span>
                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  DERIVED
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-neutral-100">
                {vessel.frechet.toFixed(1)} km
              </div>
              <div className="text-[12px] text-neutral-400 mt-0.5">Curve trajectory match</div>
            </div>

            {/* AIS Continuity */}
            <div className="p-2.5 rounded bg-[#121829] border border-neutral-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-neutral-400">Continuity</span>
                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  DERIVED
                </span>
              </div>
              <div
                className={`text-sm font-bold font-mono ${
                  vessel.continuity < 75 ? 'text-red-400' : 'text-neutral-100'
                }`}
              >
                {vessel.continuity}%
              </div>
              <div className="text-[12px] text-neutral-400 mt-0.5">Broadcast coverage window</div>
            </div>
          </div>

          {/* Borda Score Card */}
          <div className="mt-2 p-2.5 rounded bg-violet-950/20 border border-violet-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-300 flex items-center gap-1.5">
                <span className="font-semibold text-violet-300">Composite Borda Score</span>
                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-300 border border-pink-500/30">
                  INFERRED
                </span>
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                Sum of ranks across all 4 independent criteria
              </div>
            </div>
            <div className="text-lg font-mono font-bold text-violet-200">
              {vessel.borda} <span className="text-xs font-normal text-neutral-400">/ 20</span>
            </div>
          </div>
        </div>

        {/* Provenance Stacked Bar */}
        <div>
          <div className="text-xs font-mono text-neutral-400 mb-1.5 uppercase tracking-wider flex justify-between items-center">
            <span>Evidence Point Provenance</span>
            <span className="text-xs text-neutral-400">{totalPoints} total points</span>
          </div>

          {/* Stacked bar */}
          <div
            className="w-full h-4 rounded-full overflow-hidden flex bg-neutral-900 border border-neutral-800"
            title={`${observedCount} observed points (${observedPct}%) · ${derivedCount} derived points (${derivedPct}%)`}
          >
            <div
              style={{ width: `${observedPct}%` }}
              className="bg-teal-500 h-full transition-all duration-300 hover:opacity-90"
            />
            <div
              style={{ width: `${derivedPct}%` }}
              className="bg-amber-500 h-full transition-all duration-300 hover:opacity-90"
            />
          </div>

          <div className="flex justify-between items-center text-xs mt-1.5 font-mono">
            <span className="text-teal-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
              Observed: {observedCount} ({observedPct}%)
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Derived: {derivedCount} ({derivedPct}%)
            </span>
          </div>

          <p className="text-[12px] text-neutral-500 mt-2 leading-relaxed italic">
            Inferred elements (hindcast, error ellipse, Borda ranking) are model outputs and are
            not counted in point provenance.
          </p>
        </div>

        {/* Track & Hull Physical Telemetry */}
        <div>
          <div className="text-xs font-mono text-neutral-400 mb-2 uppercase tracking-wider">
            Vessel Kinematics & Hull
          </div>
          <div className="bg-[#121829] rounded-lg border border-neutral-800 divide-y divide-neutral-800/60 text-xs">
            <div className="p-2.5 flex justify-between items-center">
              <span className="text-neutral-400">Vessel Type</span>
              <span className="font-mono text-neutral-200">{vessel.type}</span>
            </div>
            <div className="p-2.5 flex justify-between items-center">
              <span className="text-neutral-400">Dimensions (L × B)</span>
              <span className="font-mono text-neutral-200">
                {vessel.lengthM}m × {vessel.beamM}m
              </span>
            </div>
            <div className="p-2.5 flex justify-between items-center">
              <span className="text-neutral-400">Speed Over Ground (SOG)</span>
              <span className="font-mono text-neutral-200">{currentSog.toFixed(1)} kn</span>
            </div>
            <div className="p-2.5 flex justify-between items-center">
              <span className="text-neutral-400">Course Over Ground (COG)</span>
              <span className="font-mono text-neutral-200">{currentCog}°</span>
            </div>
            <div className="p-2.5 flex justify-between items-center">
              <span className="text-neutral-400">AIS Gaps Count</span>
              <span
                className={`font-mono ${
                  (vessel.gaps?.length || 0) > 0 ? 'text-red-400 font-semibold' : 'text-neutral-300'
                }`}
              >
                {vessel.gaps?.length || 0} gap{(vessel.gaps?.length || 0) === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        {/* Export & Capture Actions */}
        <div className="pt-2 border-t border-neutral-800 space-y-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors border border-neutral-700 cursor-pointer"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Case JSON Exported</span>
              </>
            ) : (
              <>
                <FileJson className="w-4 h-4 text-violet-400" />
                <span>EXPORT CASE JSON</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleScreenshot}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors border border-neutral-700 cursor-pointer"
          >
            {screenshotSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Screenshot Captured</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-neutral-300" />
                <span>SCREENSHOT VIEW (PNG)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
