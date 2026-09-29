import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Button, Badge } from '../ui';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const WorkspaceTimeline: React.FC = () => {
  const { timeCursor, setTimeCursor } = useCase();
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);

  // Playback timer loop: advances timeCursor smoothly when playing
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeCursor((prev) => {
        if (prev >= 1) {
          return 0; // loops smoothly back to the beginning of the trajectory
        }
        return Math.min(1, prev + 0.0035);
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isPlaying, setTimeCursor]);

  const handleTogglePlay = () => {
    if (!isPlaying && timeCursor >= 0.99) {
      setTimeCursor(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRewind = () => {
    setIsPlaying(false);
    setTimeCursor(0);
  };

  return (
    <div className="w-full flex items-center justify-between gap-6">
      {/* Playhead Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause simulation' : 'Play trajectory simulation'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRewind}
          title="Rewind to trajectory origin (T-4.6h)"
          aria-label="Rewind to trajectory origin"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Timeline Slider with Marks */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex justify-between text-[11px] font-mono text-[var(--text-3)] mb-1">
          <span className="font-semibold text-[var(--text-1)]">
            T + {(timeCursor * 9.2).toFixed(1)}h
          </span>
          <span className="text-[var(--text-1)] hover:text-[var(--ocean-1)] font-semibold cursor-pointer hover:underline" onClick={() => setTimeCursor(0.5)}>
            16:30:00Z (Discharge Intercept)
          </span>
          <span className="font-semibold text-[var(--observed)]">
            01:50:00Z (SAR Detection)
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={timeCursor}
          onChange={(e) => setTimeCursor(Number(e.target.value))}
          className="w-full accent-[var(--ocean-1)] cursor-pointer"
        />
      </div>

      {/* Readout chip */}
      <div className="flex items-center gap-2">
        <Badge variant="neutral">
          Progress: {Math.round(timeCursor * 100)}%
        </Badge>
      </div>
    </div>
  );
};
