import React, { useState, useMemo, useEffect } from 'react';
import { useCase } from '../../../context/CaseContext';
import { RANK_STABILITY_CASES } from '../../../data/malibuCase';
import { RotateCcw, Zap, AlertTriangle, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { ScenarioDiff } from '../../../utils/copilotEngine';

interface ScenarioLabTabProps {
  onScenarioChange?: (diff: ScenarioDiff | null) => void;
}

const BASELINE_SCORES: Record<string, number> = {
  v1: 18,
  v2: 14,
  v3: 13,
  v4: 10,
  v5: 5,
  v6: 0,
};

// Preset reference delta vectors from malibuCase
const PRESET_DELTAS = {
  epoch_plus_25: { v1: -3, v2: +3, v3: 0, v4: -1, v5: +1, v6: 0 },
  wind_plus_20: { v1: -1, v2: 0, v3: 0, v4: 0, v5: +1, v6: 0 },
  wind_minus_20: { v1: -2, v2: 0, v3: +1, v4: 0, v5: -1, v6: 0 },
  current_plus_20: { v1: 0, v2: 0, v3: 0, v4: 0, v5: 0, v6: 0 },
  current_minus_20: { v1: -1, v2: 0, v3: 0, v4: 0, v5: +1, v6: 0 },
  spread_plus_25: { v1: -1, v2: 0, v3: 0, v4: 0, v5: +1, v6: 0 },
  spread_minus_25: { v1: 0, v2: 0, v3: 0, v4: 0, v5: 0, v6: 0 },
};

export const ScenarioLabTab: React.FC<ScenarioLabTabProps> = ({ onScenarioChange }) => {
  const { caseData, setSelectedVesselId } = useCase();

  // Slider state
  const [windPct, setWindPct] = useState<number>(0); // -30 to +30 %
  const [currentPct, setCurrentPct] = useState<number>(0); // -30 to +30 %
  const [spreadKm, setSpreadKm] = useState<number>(12); // 6 to 24 km (baseline 12km)
  const [epochOffsetMin, setEpochOffsetMin] = useState<number>(0); // -60 to +60 min

  // Reset to default baseline
  const handleReset = () => {
    setWindPct(0);
    setCurrentPct(0);
    setSpreadKm(12);
    setEpochOffsetMin(0);
  };

  // Quick preset applicator
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'epoch_plus_25':
        setWindPct(0);
        setCurrentPct(0);
        setSpreadKm(12);
        setEpochOffsetMin(25);
        break;
      case 'wind_plus_20':
        setWindPct(20);
        setCurrentPct(0);
        setSpreadKm(12);
        setEpochOffsetMin(0);
        break;
      case 'wind_minus_20':
        setWindPct(-20);
        setCurrentPct(0);
        setSpreadKm(12);
        setEpochOffsetMin(0);
        break;
      case 'current_plus_20':
        setWindPct(0);
        setCurrentPct(20);
        setSpreadKm(12);
        setEpochOffsetMin(0);
        break;
      case 'current_minus_20':
        setWindPct(0);
        setCurrentPct(-20);
        setSpreadKm(12);
        setEpochOffsetMin(0);
        break;
      case 'spread_plus_25':
        setWindPct(0);
        setCurrentPct(0);
        setSpreadKm(15); // +25%
        setEpochOffsetMin(0);
        break;
      case 'spread_minus_25':
        setWindPct(0);
        setCurrentPct(0);
        setSpreadKm(9); // -25%
        setEpochOffsetMin(0);
        break;
      default:
        handleReset();
    }
  };

  // Recompute scores using linear blending of perturbation vectors
  const computedScores = useMemo(() => {
    const scores: Record<string, number> = {};

    // Calculate scaling factors
    const wFactor = windPct / 20; // 1.0 at +20%
    const cFactor = currentPct / 20; // 1.0 at +20%
    const sDelta = spreadKm - 12; // 3km = +25%
    const sFactor = sDelta / 3;
    const eFactor = epochOffsetMin / 25; // 1.0 at +25min

    caseData.vessels.forEach((v) => {
      let delta = 0;

      // Wind delta
      if (wFactor > 0) {
        delta += wFactor * PRESET_DELTAS.wind_plus_20[v.id as keyof typeof PRESET_DELTAS.wind_plus_20];
      } else if (wFactor < 0) {
        delta += Math.abs(wFactor) * PRESET_DELTAS.wind_minus_20[v.id as keyof typeof PRESET_DELTAS.wind_minus_20];
      }

      // Current delta
      if (cFactor > 0) {
        delta += cFactor * PRESET_DELTAS.current_plus_20[v.id as keyof typeof PRESET_DELTAS.current_plus_20];
      } else if (cFactor < 0) {
        delta += Math.abs(cFactor) * PRESET_DELTAS.current_minus_20[v.id as keyof typeof PRESET_DELTAS.current_minus_20];
      }

      // Spread delta
      if (sFactor > 0) {
        delta += sFactor * PRESET_DELTAS.spread_plus_25[v.id as keyof typeof PRESET_DELTAS.spread_plus_25];
      } else if (sFactor < 0) {
        delta += Math.abs(sFactor) * PRESET_DELTAS.spread_minus_25[v.id as keyof typeof PRESET_DELTAS.spread_minus_25];
      }

      // Epoch delta
      if (eFactor !== 0) {
        delta += eFactor * PRESET_DELTAS.epoch_plus_25[v.id as keyof typeof PRESET_DELTAS.epoch_plus_25];
      }

      const baseline = BASELINE_SCORES[v.id] ?? 0;
      const rawScore = Math.round(baseline + delta);
      scores[v.id] = Math.max(0, Math.min(20, rawScore));
    });

    return scores;
  }, [windPct, currentPct, spreadKm, epochOffsetMin, caseData.vessels]);

  // Ranked leaderboard
  const rankedVessels = useMemo(() => {
    return [...caseData.vessels].sort((a, b) => {
      const sA = computedScores[a.id] ?? 0;
      const sB = computedScores[b.id] ?? 0;
      if (sB !== sA) return sB - sA;
      // Tie breaker: baseline rank
      return a.rank - b.rank;
    });
  }, [caseData.vessels, computedScores]);

  const leadVessel = rankedVessels[0];
  const runnerUp = rankedVessels[1];
  const isRankSwap = leadVessel.id !== 'v1';

  // Check if any slider is modified
  const isModified =
    windPct !== 0 || currentPct !== 0 || spreadKm !== 12 || epochOffsetMin !== 0;

  // Propagate scenario difference to Copilot and parent
  useEffect(() => {
    if (!onScenarioChange) return;

    if (!isModified) {
      onScenarioChange(null);
      return;
    }

    const leadScore = computedScores[leadVessel.id] ?? 0;
    const runnerScore = computedScores[runnerUp.id] ?? 0;
    const leadDelta = leadScore - (BASELINE_SCORES[leadVessel.id] ?? 0);

    const paramParts: string[] = [];
    if (epochOffsetMin !== 0) paramParts.push(`Release ${epochOffsetMin > 0 ? '+' : ''}${epochOffsetMin}m`);
    if (windPct !== 0) paramParts.push(`Wind ${windPct > 0 ? '+' : ''}${windPct}%`);
    if (currentPct !== 0) paramParts.push(`Current ${currentPct > 0 ? '+' : ''}${currentPct}%`);
    if (spreadKm !== 12) paramParts.push(`Spread ${spreadKm}km`);

    const diff: ScenarioDiff = {
      parameter: paramParts.join(' · '),
      leadVessel: leadVessel.name,
      leadScore,
      runnerUp: runnerUp.name,
      runnerUpScore: runnerScore,
      deltaText: `${leadScore - runnerScore} pts margin (${leadDelta >= 0 ? '+' : ''}${leadDelta} vs base)`,
      isRankSwap,
      scoreMap: computedScores,
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
    };

    onScenarioChange(diff);
  }, [
    isModified,
    windPct,
    currentPct,
    spreadKm,
    epochOffsetMin,
    leadVessel,
    runnerUp,
    isRankSwap,
    computedScores,
    onScenarioChange,
  ]);

  return (
    <div className="flex flex-col h-full bg-[#0b101b] text-neutral-200 overflow-y-auto">
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-800 bg-[#0d1322] flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            Hydrodynamic Perturbation Matrix
          </div>
          <div className="text-xs text-neutral-400 mt-0.5">
            Test attribution sensitivity against metocean deviations.
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={!isModified}
          className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-40 transition-colors"
          title="Reset sliders to baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Rank Flip Warning Banner */}
      {isRankSwap && (
        <div className="mx-3.5 mt-3.5 p-3 rounded-lg bg-red-950/40 border border-red-500/50 flex items-start gap-2.5 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-red-300 font-mono tracking-wide uppercase">
              Attribution Rank Flip Detected
            </div>
            <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
              <span className="font-semibold text-white">{leadVessel.name}</span> has overtaken{' '}
              <span className="font-semibold text-white">MV Meridian Crest</span> by{' '}
              {(computedScores[leadVessel.id] ?? 0) - (computedScores['v1'] ?? 0)} Borda points under
              current perturbation parameters.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Sliders */}
      <div className="p-3.5 space-y-4">
        {/* Wind Forcing Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium">Wind Forcing (HRRR 10m)</span>
            <span className="font-mono text-violet-400 font-semibold">
              {windPct > 0 ? `+${windPct}%` : `${windPct}%`}
            </span>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            step="5"
            value={windPct}
            onChange={(e) => setWindPct(Number(e.target.value))}
            className="w-full accent-violet-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[12px] font-mono text-neutral-500">
            <span>-30%</span>
            <span>0% (Baseline)</span>
            <span>+30%</span>
          </div>
        </div>

        {/* Current Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium">Ocean Current (ROMS Baroclinic)</span>
            <span className="font-mono text-violet-400 font-semibold">
              {currentPct > 0 ? `+${currentPct}%` : `${currentPct}%`}
            </span>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            step="5"
            value={currentPct}
            onChange={(e) => setCurrentPct(Number(e.target.value))}
            className="w-full accent-violet-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[12px] font-mono text-neutral-500">
            <span>-30%</span>
            <span>0% (Baseline)</span>
            <span>+30%</span>
          </div>
        </div>

        {/* Drift Spread Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium">Drift Dispersion Spread</span>
            <span className="font-mono text-neutral-200 font-semibold">{spreadKm} km</span>
          </div>
          <input
            type="range"
            min="6"
            max="24"
            step="1"
            value={spreadKm}
            onChange={(e) => setSpreadKm(Number(e.target.value))}
            className="w-full accent-violet-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[12px] font-mono text-neutral-500">
            <span>6 km (-50%)</span>
            <span>12 km (Baseline)</span>
            <span>24 km (+100%)</span>
          </div>
        </div>

        {/* Release-Epoch Offset Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium">Release Epoch Offset</span>
            <span
              className={`font-mono font-semibold ${
                epochOffsetMin !== 0 ? 'text-violet-300' : 'text-neutral-300'
              }`}
            >
              {epochOffsetMin > 0 ? `+${epochOffsetMin} min` : `${epochOffsetMin} min`}
            </span>
          </div>
          <input
            type="range"
            min="-60"
            max="60"
            step="5"
            value={epochOffsetMin}
            onChange={(e) => setEpochOffsetMin(Number(e.target.value))}
            className="w-full accent-violet-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[12px] font-mono text-neutral-500">
            <span>-60 min</span>
            <span>16:40Z (Base)</span>
            <span>+60 min</span>
          </div>
        </div>
      </div>

      {/* Quick Perturbation Presets */}
      <div className="px-3.5 pb-3">
        <div className="text-[12px] font-mono text-neutral-400 mb-1.5 flex items-center gap-1">
          <Zap className="w-3 h-3 text-violet-400" />
          <span>7 STORED PERTURBATION CASES:</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('epoch_plus_25')}
            className={`text-left text-xs p-1.5 rounded border transition-colors ${
              epochOffsetMin === 25
                ? 'bg-red-950/40 border-red-500/60 text-red-200'
                : 'bg-[#141c2e] hover:bg-[#1a253e] border-neutral-800 text-neutral-300'
            }`}
          >
            <div className="font-mono font-semibold flex items-center justify-between">
              <span>Epoch +25m</span>
              <span className="text-[12px] text-red-400">SWAP</span>
            </div>
            <div className="text-[12px] text-neutral-400">Pacific Lantern #1</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('wind_plus_20')}
            className={`text-left text-xs p-1.5 rounded border transition-colors ${
              windPct === 20
                ? 'bg-violet-950/40 border-violet-500/60 text-violet-200'
                : 'bg-[#141c2e] hover:bg-[#1a253e] border-neutral-800 text-neutral-300'
            }`}
          >
            <div className="font-mono font-semibold flex items-center justify-between">
              <span>Wind +20%</span>
              <span className="text-[12px] text-neutral-300">STABLE</span>
            </div>
            <div className="text-[12px] text-neutral-400">Meridian Crest 17 pts</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('wind_minus_20')}
            className={`text-left text-xs p-1.5 rounded border transition-colors ${
              windPct === -20
                ? 'bg-violet-950/40 border-violet-500/60 text-violet-200'
                : 'bg-[#141c2e] hover:bg-[#1a253e] border-neutral-800 text-neutral-300'
            }`}
          >
            <div className="font-mono font-semibold flex items-center justify-between">
              <span>Wind -20%</span>
              <span className="text-[12px] text-neutral-300">STABLE</span>
            </div>
            <div className="text-[12px] text-neutral-400">Meridian Crest 16 pts</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('current_plus_20')}
            className={`text-left text-xs p-1.5 rounded border transition-colors ${
              currentPct === 20
                ? 'bg-violet-950/40 border-violet-500/60 text-violet-200'
                : 'bg-[#141c2e] hover:bg-[#1a253e] border-neutral-800 text-neutral-300'
            }`}
          >
            <div className="font-mono font-semibold flex items-center justify-between">
              <span>Current +20%</span>
              <span className="text-[12px] text-neutral-300">STABLE</span>
            </div>
            <div className="text-[12px] text-neutral-400">Meridian Crest 18 pts</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('current_minus_20')}
            className={`text-left text-xs p-1.5 rounded border transition-colors ${
              currentPct === -20
                ? 'bg-violet-950/40 border-violet-500/60 text-violet-200'
                : 'bg-[#141c2e] hover:bg-[#1a253e] border-neutral-800 text-neutral-300'
            }`}
          >
            <div className="font-mono font-semibold flex items-center justify-between">
              <span>Current -20%</span>
              <span className="text-[12px] text-neutral-300">STABLE</span>
            </div>
            <div className="text-[12px] text-neutral-400">Meridian Crest 17 pts</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('spread_plus_25')}
            className={`text-left text-xs p-1.5 rounded border transition-colors ${
              spreadKm === 15
                ? 'bg-violet-950/40 border-violet-500/60 text-violet-200'
                : 'bg-[#141c2e] hover:bg-[#1a253e] border-neutral-800 text-neutral-300'
            }`}
          >
            <div className="font-mono font-semibold flex items-center justify-between">
              <span>Spread +25%</span>
              <span className="text-[12px] text-neutral-300">STABLE</span>
            </div>
            <div className="text-[12px] text-neutral-400">15 km spread</div>
          </button>
        </div>
      </div>

      {/* Live Recomputed Leaderboard */}
      <div className="p-3.5 border-t border-neutral-800 bg-[#090e18]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            Live Recomputed Standings
          </span>
          <span className="text-xs font-mono text-neutral-400">
            {isModified ? 'PERTURBED' : 'BASELINE'}
          </span>
        </div>

        <div className="space-y-1.5">
          {rankedVessels.map((v, idx) => {
            const newRank = idx + 1;
            const score = computedScores[v.id] ?? 0;
            const baseScore = BASELINE_SCORES[v.id] ?? 0;
            const deltaScore = score - baseScore;
            const isWinner = newRank === 1;

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVesselId(v.id)}
                className={`p-2 rounded flex items-center justify-between cursor-pointer border transition-colors ${
                  isWinner
                    ? 'bg-violet-950/30 border-violet-500/40 text-neutral-100'
                    : 'bg-[#121829] border-neutral-800 text-neutral-300 hover:bg-[#162035]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs w-5 h-5 rounded flex items-center justify-center font-bold ${
                      newRank === 1
                        ? 'bg-violet-500 text-white'
                        : newRank === 2
                        ? 'bg-neutral-700 text-neutral-200'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {newRank}
                  </span>
                  <span className="text-xs font-medium">{v.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Delta indicator */}
                  {deltaScore !== 0 && (
                    <span
                      className={`text-xs font-mono flex items-center ${
                        deltaScore > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {deltaScore > 0 ? (
                        <ArrowUp className="w-3 h-3 inline" />
                      ) : (
                        <ArrowDown className="w-3 h-3 inline" />
                      )}
                      {Math.abs(deltaScore)}
                    </span>
                  )}
                  {/* Score pill */}
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-200">
                    {score}/20
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
