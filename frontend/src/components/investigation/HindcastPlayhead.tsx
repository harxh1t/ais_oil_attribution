import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, FastForward } from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { Button, Slider } from '../ui';
import { cn } from '../../utils/cn';

export const HindcastPlayhead: React.FC = () => {
  const { timeCursor, setTimeCursor, runStatus } = useCase();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2);

  const isDone = runStatus === 'done' || runStatus === 'completed';

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || !isDone) return;

    const interval = setInterval(() => {
      setTimeCursor((prev) => {
        const next = prev + 0.005 * speed;
        return next >= 1 ? 0 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, speed, isDone, setTimeCursor]);

  // Derived UTC time formatting
  const hoursAgo = (9.2 * (1 - timeCursor)).toFixed(1);
  const minutesElapsed = Math.round(timeCursor * 9.2 * 60);
  const releaseMs = new Date('2024-08-05T16:40:00Z').getTime();
  const currentSimTime = new Date(releaseMs + minutesElapsed * 60 * 1000);
  const currentSimTimeString = currentSimTime.toISOString().substring(11, 16) + 'Z';

  if (!isDone) {
    return (
      <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-3 shadow-md font-mono text-xs flex items-center justify-between opacity-60">
        <div className="flex items-center gap-2 text-[var(--text-3)]">
          <Clock className="w-3.5 h-3.5" />
          <span>HINDCAST ADVECTION PLAYHEAD</span>
        </div>
        <span className="text-[var(--text-3)] italic">
          Inactive until forensic attribution is initialized
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-3 shadow-xl font-mono text-xs space-y-2">
      {/* Top Header */}
      <div className="flex items-center justify-between text-[var(--text-3)]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--violet-400)]" />
          <span className="font-semibold uppercase tracking-wider text-[var(--text-1)]">
            HINDCAST ADVECTION PLAYHEAD
          </span>
        </div>
        <div className="flex items-center gap-3 text-[var(--text-1)] font-mono tabular-nums">
          <span className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)]">
            T−{hoursAgo} h · {currentSimTimeString}
          </span>
          <span className="text-[var(--text-3)]">{Math.round(timeCursor * 100)}%</span>
        </div>
      </div>

      {/* Slider: T-9.2h (16:40Z) to T-0 (01:50Z) */}
      <div className="space-y-1">
        <Slider
          label=""
          min={0}
          max={1}
          step={0.005}
          value={timeCursor}
          onChange={(val) => setTimeCursor(val)}
        />
        <div className="flex justify-between text-xs text-[var(--text-3)] pt-0.5">
          <span>Inferred Release (16:40Z)</span>
          <span>SAR Pass (01:50Z)</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
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
            title="Reset to inferred release epoch (16:40Z)"
          >
            Reset
          </Button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[4px] p-0.5">
          <FastForward className="w-3 h-3 text-[var(--violet-400)] ml-1" />
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                'px-1.5 py-0.5 rounded-[3px] text-xs font-mono transition-colors cursor-pointer',
                speed === s
                  ? 'bg-[var(--violet-600)] text-white font-bold'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
