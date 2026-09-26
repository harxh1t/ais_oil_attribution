import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  FastForward,
  Ship,
  Clock,
} from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { Button, Slider } from '../ui';
import { cn } from '../../utils/cn';

interface WorkspaceHUDProps {
  cameraMode: string;
  setCameraMode: (mode: string) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

export const WorkspaceHUD: React.FC<WorkspaceHUDProps> = ({
  cameraMode,
  setCameraMode,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
}) => {
  const {
    caseData,
    selectedVesselId,
    setSelectedVesselId,
    selectedVessel,
    timeCursor,
    setTimeCursor,
  } = useCase();

  const cameraModes = [
    { id: 'tactical', label: 'Tactical Iso' },
    { id: 'topdown', label: 'Nadir Ortho' },
    { id: 'origin', label: 'Release Point' },
    { id: 'vessel', label: 'Track Follow' },
  ];

  const speeds = [1, 2, 4, 8];

  // Precise UTC clock time & T-x format
  const hoursRemaining = (9.2 * (1 - timeCursor)).toFixed(1);
  const minutesElapsed = Math.round(timeCursor * 9.2 * 60);
  const releaseMs = new Date('2024-08-05T16:40:00Z').getTime();
  const currentSimTime = new Date(releaseMs + minutesElapsed * 60 * 1000);
  const currentSimTimeString = currentSimTime.toISOString().substring(11, 16) + 'Z';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 font-mono text-xs">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Camera Selector */}
        <div className="bg-[var(--surface-1)]/90 border border-[var(--border-default)] rounded-[6px] p-1.5 flex items-center gap-1 backdrop-blur-md shadow-xl">
          <Camera className="w-3.5 h-3.5 text-[var(--violet-400)] mx-1.5" />
          {cameraModes.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setCameraMode(cam.id)}
              className={cn(
                'px-2 py-1 rounded-[4px] text-xs font-mono transition-colors cursor-pointer',
                cameraMode === cam.id
                  ? 'bg-[var(--violet-600)] text-white font-semibold shadow-[0_0_8px_var(--glow-violet)]'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]'
              )}
            >
              {cam.label}
            </button>
          ))}
        </div>

        {/* Selected Vessel Quick Selector */}
        <div className="bg-[var(--surface-1)]/90 border border-[var(--border-default)] rounded-[6px] px-3 py-1.5 flex items-center gap-2 backdrop-blur-md shadow-xl">
          <Ship className="w-3.5 h-3.5 text-[var(--violet-400)]" />
          <span className="text-[var(--text-3)]">CANDIDATE:</span>
          <select
            value={selectedVesselId}
            onChange={(e) => setSelectedVesselId(e.target.value)}
            className="bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] rounded-[4px] px-2 py-0.5 text-xs font-mono focus:outline-none"
          >
            {caseData.vessels.map((v) => (
              <option key={v.id} value={v.id}>
                #{v.rank} {v.name} ({v.dcpa}km)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Timeline Controls */}
      <div className="bg-[var(--surface-1)]/95 border border-[var(--border-default)] rounded-[8px] p-3 backdrop-blur-md shadow-2xl pointer-events-auto max-w-2xl mx-auto w-full space-y-2">
        <div className="flex items-center justify-between text-[var(--text-3)]">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[var(--violet-400)]" />
            <span className="text-[var(--text-1)] font-semibold tracking-wider uppercase text-xs">
              LAGRANGIAN ADVECTION PLAYHEAD
            </span>
          </div>
          <div className="text-right text-[var(--text-1)] font-mono tabular-nums text-xs">
            <span>
              T−{hoursRemaining} h · {currentSimTimeString}
            </span>
          </div>
        </div>

        {/* Formatted time control: T-9.2h <-> T-0 · 16:40Z -> 01:50Z */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-[var(--text-3)]">
            <span>T−9.2 h ↔ T−0 · 16:40Z → 01:50Z</span>
            <span className="text-[var(--text-2)]">{Math.round(timeCursor * 100)}%</span>
          </div>

          <Slider
            label=""
            min={0}
            max={1}
            step={0.005}
            value={timeCursor}
            onChange={(val) => setTimeCursor(val)}
          />

          <div className="flex justify-between text-xs font-mono text-[var(--text-3)] pt-0.5">
            <span>Inferred Release (16:40Z)</span>
            <span>SAR Pass (01:50Z)</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isPlaying ? 'secondary' : 'primary'}
              onClick={() => setIsPlaying(!isPlaying)}
              icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTimeCursor(0)}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              title="Reset to Release Epoch"
            >
              Start
            </Button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-[4px] p-1 border border-[var(--border-default)]">
            <FastForward className="w-3 h-3 text-[var(--violet-400)] mx-1" />
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={cn(
                  'px-1.5 py-0.5 rounded-[4px] text-xs font-mono transition-colors cursor-pointer',
                  playbackSpeed === s
                    ? 'bg-[var(--violet-600)] text-white font-bold'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                )}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Live Candidate CPA indicator */}
          <div className="text-right text-xs font-mono">
            <span className="text-[var(--text-3)] mr-1.5">DCPA:</span>
            <span className="text-[var(--text-1)] font-bold tabular-nums">
              {selectedVessel.dcpa.toFixed(1)} km
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
