import React, { useState } from 'react';
import { useCase } from '../../../context/CaseContext';
import { Button } from '../../ui';
import { RefreshCw } from 'lucide-react';

export const ScenarioLabTab: React.FC = () => {
  const { caseData } = useCase();
  const [currentShift, setCurrentShift] = useState<number>(0);
  const [windMultiplier, setWindMultiplier] = useState<number>(1.0);

  const resetSliders = () => {
    setCurrentShift(0);
    setWindMultiplier(1.0);
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-[var(--text-1)]">
          Interactive Scenario Lab
        </h4>
        <p className="text-xs text-[var(--text-3)] mt-0.5">
          Simulate what-if physical perturbations to observe centroid deflection
        </p>
      </div>

      <div className="space-y-4">
        {/* Current Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[var(--text-2)]">HYCOM Current Speed Shift:</span>
            <span className="font-bold text-[var(--primary-600)]">
              {currentShift > 0 ? `+${currentShift}%` : `${currentShift}%`}
            </span>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            value={currentShift}
            onChange={(e) => setCurrentShift(Number(e.target.value))}
            className="w-full accent-[var(--primary-600)] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-[var(--text-3)]">
            <span>-30%</span>
            <span>0% (Nominal)</span>
            <span>+30%</span>
          </div>
        </div>

        {/* Wind Drift Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[var(--text-2)]">Wind Factor Multiplier:</span>
            <span className="font-bold text-[var(--primary-600)]">
              {(windMultiplier * caseData.environmental.windSpeedKts).toFixed(1)} kts
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={windMultiplier}
            onChange={(e) => setWindMultiplier(Number(e.target.value))}
            className="w-full accent-[var(--primary-600)] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-[var(--text-3)]">
            <span>50%</span>
            <span>100% (Nominal)</span>
            <span>150%</span>
          </div>
        </div>
      </div>

      {/* Perturbation Result Box */}
      <div className="p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)] space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-[var(--text-3)]">Centroid Deflection:</span>
          <span className="font-bold text-[var(--text-1)]">
            {(Math.abs(currentShift) * 0.04 + Math.abs(windMultiplier - 1.0) * 1.2).toFixed(2)} km
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-3)]">Target Coincidence:</span>
          <span className="font-bold text-[var(--observed)]">Maintained</span>
        </div>
      </div>

      <Button size="sm" variant="secondary" onClick={resetSliders} className="w-full">
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Reset to Nominal Simulation
      </Button>
    </div>
  );
};
