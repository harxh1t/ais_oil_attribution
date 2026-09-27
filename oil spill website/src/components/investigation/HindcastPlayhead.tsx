import React, { useState } from 'react';
import { useCase } from '../../context/CaseContext';
import { Button, Badge } from '../ui';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const HindcastPlayhead: React.FC = () => {
  const { hindcastHours = 9.2 } = useCase();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeStep, setTimeStep] = useState<number>(0); // 0 = 16:40Z (release), 100 = 01:50Z (detection)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Play Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause Hindcast' : 'Play Hindcast'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setTimeStep(0)}
          aria-label="Rewind to release"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Progress timeline slider */}
      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs font-mono font-medium text-[var(--text-3)] whitespace-nowrap">
          16:40:00Z (Release)
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={timeStep}
          onChange={(e) => setTimeStep(Number(e.target.value))}
          className="w-full accent-[var(--primary-600)] cursor-pointer"
        />
        <span className="text-xs font-mono font-medium text-[var(--text-1)] whitespace-nowrap">
          01:50:00Z (Detection)
        </span>
      </div>

      {/* Status chip */}
      <div className="flex items-center gap-2">
        <Badge variant="neutral">
          T + {((timeStep / 100) * hindcastHours).toFixed(1)}h
        </Badge>
      </div>
    </div>
  );
};
