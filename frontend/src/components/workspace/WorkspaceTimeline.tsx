import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Clock,
  Compass,
  Radio,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { cn } from '../../utils/cn';
import {
  SAR_PASS_ISO,
  INFERRED_RELEASE_ISO,
  closestApproach,
} from '../../data/malibuCase';

interface WorkspaceTimelineProps {
  currentSimMs: number;
  setCurrentSimMs: (ms: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

// Fixed Timeline Bounds: 14:40Z (Aug 5) -> 01:50Z (Aug 6)
export const T_TIMELINE_START_MS = new Date('2024-08-05T14:40:00Z').getTime();
export const T_RELEASE_MS = new Date(INFERRED_RELEASE_ISO).getTime(); // 16:40Z
export const T_SAR_MS = new Date(SAR_PASS_ISO).getTime(); // 01:50Z
export const T_TOTAL_DURATION_MS = T_SAR_MS - T_TIMELINE_START_MS; // 670 minutes

// Vessel transit window: 15:25Z -> 17:55Z
export const T_TRANSIT_START_MS = new Date('2024-08-05T15:25:00Z').getTime();
export const T_TRANSIT_END_MS = new Date('2024-08-05T17:55:00Z').getTime();

export const WorkspaceTimeline: React.FC<WorkspaceTimelineProps> = ({
  currentSimMs,
  setCurrentSimMs,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
}) => {
  const { selectedVessel, caseData } = useCase();
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const speeds = [0.5, 1, 2, 4, 8];

  // Helper to get percentage across the 14:40Z -> 01:50Z timeline
  const getPercent = useCallback((ms: number) => {
    const clamped = Math.max(T_TIMELINE_START_MS, Math.min(T_SAR_MS, ms));
    return ((clamped - T_TIMELINE_START_MS) / T_TOTAL_DURATION_MS) * 100;
  }, []);

  // Helper to convert click/drag clientX into timestamp ms
  const handleSeekFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = clickX / rect.width;
      const newMs = T_TIMELINE_START_MS + ratio * T_TOTAL_DURATION_MS;
      setCurrentSimMs(Math.round(newMs));
    },
    [setCurrentSimMs]
  );

  // Mouse & Touch scrub handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    handleSeekFromEvent(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        handleSeekFromEvent(moveEvent.clientX);
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Keyboard controls listener (Space = play/pause, Left/Right = step 2min, [ ] = speed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside an input or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSimMs(Math.max(T_TIMELINE_START_MS, currentSimMs - 2 * 60 * 1000));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentSimMs(Math.min(T_SAR_MS, currentSimMs + 2 * 60 * 1000));
      } else if (e.key === '[') {
        e.preventDefault();
        const curIdx = speeds.indexOf(playbackSpeed);
        if (curIdx > 0) setPlaybackSpeed(speeds[curIdx - 1]);
      } else if (e.key === ']') {
        e.preventDefault();
        const curIdx = speeds.indexOf(playbackSpeed);
        if (curIdx < speeds.length - 1) setPlaybackSpeed(speeds[curIdx + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentSimMs, playbackSpeed, speeds, setCurrentSimMs, setIsPlaying, setPlaybackSpeed]);

  // Current Playhead stats
  const playheadPercent = getPercent(currentSimMs);
  const currentTime = new Date(currentSimMs);
  const timeUtcStr = currentTime.toISOString().substring(11, 19) + ' UTC';

  // Hours relative to SAR (01:50Z)
  const hoursToSar = Math.max(0, (T_SAR_MS - currentSimMs) / (3600 * 1000));
  const tMinusStr = hoursToSar <= 0.05 ? 'T−0.0 h (SAR PASS)' : `T−${hoursToSar.toFixed(1)} h`;

  // Selected vessel closest approach
  const selectedCpa = closestApproach(selectedVessel.id);
  const cpaTimeMs = new Date(selectedCpa.t).getTime();
  const cpaPercent = getPercent(cpaTimeMs);
  const cpaTimeStr = new Date(cpaTimeMs).toISOString().substring(11, 16) + 'Z';

  return (
    <div className="w-full bg-[var(--surface-1)] border-t border-[var(--border-default)] px-4 py-2.5 flex flex-col justify-between select-none shadow-2xl">
      {/* Top Header Row of Dock */}
      <div className="flex items-center justify-between gap-3 text-xs font-mono pb-1 border-b border-[var(--border-subtle)]">
        {/* Left: Playback Controls & Speed */}
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              'px-3 py-1 rounded-[4px] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer font-semibold',
              isPlaying
                ? 'bg-[var(--violet-600)] text-white shadow-[0_0_8px_var(--glow-violet)]'
                : 'bg-[var(--surface-2)] text-[var(--text-1)] hover:bg-[var(--surface-3)] border border-[var(--border-default)]'
            )}
            title="Space bar to play/pause"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Step Back / Step Forward */}
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[4px] p-0.5">
            <button
              onClick={() => setCurrentSimMs(Math.max(T_TIMELINE_START_MS, currentSimMs - 2 * 60 * 1000))}
              className="p-1 text-[var(--text-2)] hover:text-white hover:bg-[var(--surface-3)] rounded-[3px] cursor-pointer"
              title="Step back 2 min (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentSimMs(Math.min(T_SAR_MS, currentSimMs + 2 * 60 * 1000))}
              className="p-1 text-[var(--text-2)] hover:text-white hover:bg-[var(--surface-3)] rounded-[3px] cursor-pointer"
              title="Step forward 2 min (Right Arrow)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump Buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[4px] p-0.5">
            <button
              onClick={() => setCurrentSimMs(T_RELEASE_MS)}
              className="px-2 py-0.5 text-xs text-[var(--text-2)] hover:text-[var(--pink-400)] hover:bg-[var(--surface-3)] rounded-[3px] cursor-pointer"
              title="Jump to Inferred Release Epoch"
            >
              Release 16:40
            </button>
            <span className="text-[var(--text-3)]">·</span>
            <button
              onClick={() => setCurrentSimMs(T_SAR_MS)}
              className="px-2 py-0.5 text-xs text-[var(--text-2)] hover:text-[var(--teal-400)] hover:bg-[var(--surface-3)] rounded-[3px] cursor-pointer"
              title="Jump to Sentinel-1 Observation"
            >
              SAR 01:50
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[4px] p-0.5">
            <span className="text-[var(--text-3)] text-xs px-1 hidden md:inline">SPEED:</span>
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={cn(
                  'px-1.5 py-0.5 rounded-[3px] text-xs font-mono transition-colors cursor-pointer',
                  playbackSpeed === s
                    ? 'bg-[var(--violet-600)] text-white font-bold'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                )}
                title={`Playback speed ${s}x (shortcuts: [ or ])`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Center/Right: Live Playhead Readout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border-default)] px-3 py-1 rounded-[4px]">
            <Clock className="w-3.5 h-3.5 text-[var(--violet-400)]" />
            <span className="text-[var(--text-1)] font-bold tabular-nums text-xs">
              {timeUtcStr}
            </span>
            <span className="text-[var(--text-3)]">·</span>
            <span className="text-[var(--text-2)] font-mono text-xs tabular-nums">
              {tMinusStr}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Row Forensic Timeline Track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className="relative w-full h-[78px] my-1.5 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-default)] overflow-hidden cursor-pointer select-none group"
      >
        {/* Row 1: Spill Event (16:40Z -> 01:50Z) */}
        <div className="relative h-[19px] border-b border-[var(--border-subtle)] flex items-center px-1">
          <span className="absolute left-1 text-xs font-mono text-[var(--text-3)] pointer-events-none z-10">
            SPILL DRIFT
          </span>

          {/* Drift duration span */}
          <div
            className="absolute top-0.5 bottom-0.5 bg-[var(--pink-400)]/15 border border-[var(--pink-400)]/40 rounded-[2px]"
            style={{
              left: `${getPercent(T_RELEASE_MS)}%`,
              right: '0%',
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-xs font-mono text-[var(--pink-400)]">
              Lagrangian Advection Window (9.2 h)
            </div>
          </div>

          {/* Release Epoch Pin */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--pink-400)] z-10"
            style={{ left: `${getPercent(T_RELEASE_MS)}%` }}
          >
            <div className="absolute top-0.5 -translate-x-1/2 bg-[var(--surface-1)] border border-[var(--pink-400)] text-[var(--pink-400)] px-1.5 py-0.2 rounded text-xs font-mono whitespace-nowrap shadow">
              Release 16:40Z
            </div>
          </div>

          {/* SAR Pass Pin */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--teal-400)] z-10"
            style={{ right: '0%' }}
          >
            <div className="absolute top-0.5 -translate-x-full pr-1 bg-[var(--surface-1)] border border-[var(--teal-400)] text-[var(--teal-400)] px-1.5 py-0.2 rounded text-xs font-mono whitespace-nowrap shadow">
              SAR 01:50Z
            </div>
          </div>
        </div>

        {/* Row 2: SAR Acquisition Pass Swath */}
        <div className="relative h-[19px] border-b border-[var(--border-subtle)] flex items-center px-1">
          <span className="absolute left-1 text-xs font-mono text-[var(--text-3)] pointer-events-none z-10">
            RADAR PASS
          </span>

          {/* Sentinel-1 IW pass */}
          <div
            className="absolute top-0.5 bottom-0.5 bg-[var(--teal-400)]/20 border-l border-r border-[var(--teal-400)] flex items-center justify-end px-2"
            style={{
              left: `${getPercent(T_SAR_MS - 2 * 60 * 1000)}%`,
              right: '0%',
            }}
          >
            <span className="text-xs font-mono text-[var(--teal-400)] font-semibold">
              Sentinel-1 IW (01:50:00Z)
            </span>
          </div>
        </div>

        {/* Row 3: Selected Vessel Kinematics & CPA Marker */}
        <div className="relative h-[19px] border-b border-[var(--border-subtle)] flex items-center px-1">
          <span className="absolute left-1 text-xs font-mono text-[var(--text-3)] pointer-events-none z-10">
            KINEMATICS
          </span>

          {/* Transit Window bar */}
          <div
            className="absolute top-1 bottom-1 bg-[var(--surface-3)] border border-[var(--border-default)] rounded-[2px]"
            style={{
              left: `${getPercent(T_TRANSIT_START_MS)}%`,
              width: `${getPercent(T_TRANSIT_END_MS) - getPercent(T_TRANSIT_START_MS)}%`,
            }}
          >
            <span className="text-xs font-mono text-[var(--text-2)] pl-1 flex items-center h-full truncate">
              {selectedVessel.name} Corridor (15:25–17:55Z)
            </span>
          </div>

          {/* Closest Point of Approach (CPA) Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--violet-400)] z-10"
            style={{ left: `${cpaPercent}%` }}
          >
            <div className="absolute -top-0.5 -translate-x-1/2 bg-[var(--surface-1)] border border-[var(--violet-400)] text-[var(--violet-300)] px-1 rounded text-xs font-mono whitespace-nowrap shadow flex items-center gap-1">
              <span>CPA {selectedVessel.dcpa.toFixed(1)} km</span>
              <span className="text-[var(--text-3)]">@{cpaTimeStr}</span>
            </div>
          </div>
        </div>

        {/* Row 4: AIS Continuity Gaps (Shaded danger hatch) */}
        <div className="relative h-[19px] flex items-center px-1 bg-[var(--surface-1)]/40">
          <span className="absolute left-1 text-xs font-mono text-[var(--text-3)] pointer-events-none z-10">
            AIS GAPS
          </span>

          {/* Render gaps for all candidate vessels, highlighting selected */}
          {caseData.vessels.map((v) => {
            const isSelected = v.id === selectedVessel.id;
            return v.gaps.map((gap, gIdx) => {
              const startMs = new Date(gap.start).getTime();
              const endMs = new Date(gap.end).getTime();
              const leftPct = getPercent(startMs);
              const rightPct = getPercent(endMs);
              const widthPct = Math.max(0.6, rightPct - leftPct);

              return (
                <div
                  key={`${v.id}-gap-${gIdx}`}
                  className={cn(
                    'absolute top-0.5 bottom-0.5 border rounded-[2px] transition-opacity',
                    isSelected
                      ? 'bg-red-500/25 border-red-500/70 z-10'
                      : 'bg-red-900/15 border-red-800/30 opacity-40'
                  )}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundImage:
                      'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(239, 68, 68, 0.25) 3px, rgba(239, 68, 68, 0.25) 6px)',
                  }}
                  title={`${v.name} AIS Gap: ${gap.durationMinutes} min (${new Date(startMs).toISOString().substring(11, 16)}Z–${new Date(endMs).toISOString().substring(11, 16)}Z)`}
                />
              );
            });
          })}
        </div>

        {/* Vertical Playhead Scrub Cursor */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_#FFFFFF] pointer-events-none z-30 transition-transform duration-75"
          style={{ left: `${playheadPercent}%` }}
        >
          {/* Top playhead triangular notch */}
          <div className="absolute -top-1 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-white" />
          {/* Bottom playhead notch */}
          <div className="absolute -bottom-1 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-white" />
        </div>
      </div>

      {/* Caption & Instructions */}
      <div className="flex items-center justify-between text-xs font-mono text-[var(--text-3)] pt-0.5">
        <span className="text-[var(--text-2)] italic">
          Hindcast is computed backward from the slick; playback shows it forward for review.
        </span>
        <span className="hidden md:inline text-[var(--text-3)]">
          Shortcuts: Space (play/pause) · ← / → (step 2m) · [ / ] (speed)
        </span>
      </div>
    </div>
  );
};
