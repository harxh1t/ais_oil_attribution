/**
 * CaseContext: Global state management for WAKE maritime forensic pipeline
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  MALIBU_CASE,
  MalibuCaseData,
  CandidateVessel,
  RANK_STABILITY_CASES,
} from '../data/malibuCase';

export type RunStatus = 'idle' | 'running' | 'done' | 'completed' | 'error';

export interface ForensicParameters {
  lat: number;
  lon: number;
  observationTime: string;
  sarTime: string;
  spreadKm: number;
  regime: 'auto' | 'contemporaneous' | 'delayed';
  rankingMethod: 'borda' | 'weighted';
  enableForwardFit: boolean;
  outputDir: string;
  // environmental & solver
  slickLengthKm: number;
  slickAreaKm2: number;
  windSpeedKts: number;
  windDirectionDeg: number;
  currentSpeedKts: number;
  currentDirectionDeg: number;
  diffusionRate: number;
  backtrackingHours: number;
  timeStepMin: number;
  particleCount: number;
}

export interface PipelineLog {
  id: string;
  timestamp: string;
  stage: string;
  message: string;
  level: 'info' | 'warn' | 'success';
}

export interface MapLayers {
  sarFootprint: boolean;
  slickPolygon: boolean;
  releaseEllipse: boolean;
  hindcastParticles: boolean;
  vesselTracks: boolean;
  aisGaps: boolean;
  depthContours: boolean;
}

export const WORKFLOW_STEPS = [
  { step: 1, title: 'Input Validation', log: '[1/8 INPUT] Validated inputs · regime delayed (Δt 9.2 h)' },
  { step: 2, title: 'SAR Radiometric Preprocessing', log: '[2/8 SAR] VV+VH normalised, denoised, georeferenced' },
  { step: 3, title: 'Neural Slick Segmentation', log: '[3/8 DETECTION] DeepLabV3+ segmentation → probability map + binary mask' },
  { step: 4, title: 'Geometric Characterization', log: '[4/8 CHARACTERIZATION] Polygon 11.6 km long, 4.7 km²' },
  { step: 5, title: 'Lagrangian Reverse Hindcast', log: '[5/8 DRIFT] OpenDrift backward hindcast, GFS winds + HYCOM/CMEMS currents' },
  { step: 6, title: 'AIS Spatiotemporal Intersection', log: '[6/8 AIS] 6 candidate vessels retained after spatial + temporal filtering' },
  { step: 7, title: 'Multi-Criteria Kinematic Fusion', log: '[7/8 FUSION] DCPA, TCPA, Fréchet, AIS Continuity → Borda consensus' },
  { step: 8, title: 'Forensic Case Bundle Export', log: '[8/8 OUTPUT] Case bundle written to results/malibu_case' },
];

export interface ScenarioScoreInfo {
  leadName: string;
  leadRank: number;
  scoreText: string;
  isSwap: boolean;
  leadDcpa: number;
  leadTcpa: number;
  continuity: number;
}

interface CaseContextType {
  caseData: MalibuCaseData;
  selectedVesselId: string;
  selectedVessel: CandidateVessel;
  setSelectedVesselId: (id: string) => void;
  parameters: ForensicParameters;
  updateParameter: <K extends keyof ForensicParameters>(key: K, value: ForensicParameters[K]) => void;
  resetParameters: () => void;
  runStatus: RunStatus;
  setRunStatus: (status: RunStatus) => void;
  runProgress: number;
  activeWorkflowStep: number;
  pipelineLogs: PipelineLog[];
  startForensicRun: () => void;
  cancelForensicRun: () => void;
  triggerErrorState: () => void;
  retryRun: () => void;
  timeCursor: number; // 0.0 to 1.0 (0 = release epoch, 1.0 = SAR observation)
  setTimeCursor: React.Dispatch<React.SetStateAction<number>>;
  mapLayers: MapLayers;
  toggleLayer: (layer: keyof MapLayers) => void;
  activeScenario: string;
  setActiveScenario: (scenario: string) => void;
  loadExample: () => void;
  pickOnMap: boolean;
  setPickOnMap: (pick: boolean) => void;
  isFormValid: boolean;
  formValidationError: string | null;
  scenarioScoreDelta: ScenarioScoreInfo;
}

const DEFAULT_PARAMS: ForensicParameters = {
  lat: 34.016944,
  lon: -118.663056,
  observationTime: '2024-08-06T01:50:00Z',
  sarTime: '2024-08-06T01:50:00Z',
  spreadKm: 12.0,
  regime: 'delayed',
  rankingMethod: 'borda',
  enableForwardFit: false,
  outputDir: 'results/malibu_case',
  slickLengthKm: 11.6,
  slickAreaKm2: 4.7,
  windSpeedKts: 9.8,
  windDirectionDeg: 290,
  currentSpeedKts: 0.35,
  currentDirectionDeg: 135,
  diffusionRate: 0.18,
  backtrackingHours: 9.2,
  timeStepMin: 5,
  particleCount: 1500,
};

const DEFAULT_LAYERS: MapLayers = {
  sarFootprint: true,
  slickPolygon: true,
  releaseEllipse: true,
  hindcastParticles: true,
  vesselTracks: true,
  aisGaps: true,
  depthContours: false,
};

const INITIAL_LOGS: PipelineLog[] = WORKFLOW_STEPS.map((s) => ({
  id: `step-${s.step}`,
  timestamp: '01:50:00 UTC',
  stage: s.title.toUpperCase(),
  message: s.log,
  level: s.step === 8 ? 'success' : 'info',
}));

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [caseData] = useState<MalibuCaseData>(MALIBU_CASE);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('v1');
  const [parameters, setParameters] = useState<ForensicParameters>(() => {
    try {
      const saved = localStorage.getItem('wake_forensic_params');
      return saved ? { ...DEFAULT_PARAMS, ...JSON.parse(saved) } : DEFAULT_PARAMS;
    } catch {
      return DEFAULT_PARAMS;
    }
  });

  const [pickOnMap, setPickOnMap] = useState<boolean>(false);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runProgress, setRunProgress] = useState<number>(0);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);

  const [timeCursor, setTimeCursor] = useState<number>(1.0);
  const [mapLayers, setMapLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [activeScenario, setActiveScenario] = useState<string>('baseline');

  const runIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('wake_forensic_params', JSON.stringify(parameters));
    } catch {
      // ignore
    }
  }, [parameters]);

  // Validation
  const isFormValid =
    parameters.lat >= -90 &&
    parameters.lat <= 90 &&
    parameters.lon >= -180 &&
    parameters.lon <= 180 &&
    parameters.spreadKm >= 1 &&
    parameters.spreadKm <= 50 &&
    Boolean(parameters.observationTime) &&
    !isNaN(new Date(parameters.observationTime).getTime()) &&
    new Date(parameters.observationTime).getTime() <= Date.now() + 60000;

  let formValidationError: string | null = null;
  if (parameters.lat < -90 || parameters.lat > 90) {
    formValidationError = 'Latitude must be between -90° and +90°';
  } else if (parameters.lon < -180 || parameters.lon > 180) {
    formValidationError = 'Longitude must be between -180° and +180°';
  } else if (parameters.spreadKm < 1 || parameters.spreadKm > 50) {
    formValidationError = 'Spread must be between 1.0 km and 50.0 km';
  } else if (!parameters.observationTime || isNaN(new Date(parameters.observationTime).getTime())) {
    formValidationError = 'Observation time must be a valid UTC timestamp';
  } else if (new Date(parameters.observationTime).getTime() > Date.now() + 60000) {
    formValidationError = 'Observation time cannot be in the future';
  }

  const updateParameter = <K extends keyof ForensicParameters>(
    key: K,
    value: ForensicParameters[K]
  ) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  const resetParameters = () => {
    setParameters(DEFAULT_PARAMS);
    setActiveScenario('baseline');
    setSelectedVesselId('v1');
    setRunStatus('idle');
    setRunProgress(0);
    setActiveWorkflowStep(0);
    setPipelineLogs([]);
  };

  const toggleLayer = (layer: keyof MapLayers) => {
    setMapLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const cancelForensicRun = () => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    setRunStatus('idle');
    setRunProgress(0);
    setActiveWorkflowStep(0);
  };

  const triggerErrorState = () => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    setRunStatus('error');
  };

  const startForensicRun = () => {
    if (runIntervalRef.current) clearInterval(runIntervalRef.current);

    setRunStatus('running');
    setRunProgress(0);
    setActiveWorkflowStep(0);
    setPipelineLogs([]);

    let stepIndex = 0;
    const stepDurationMs = 1120; // 8 steps * 1.12s ≈ 9s total

    runIntervalRef.current = setInterval(() => {
      if (stepIndex < WORKFLOW_STEPS.length) {
        const current = WORKFLOW_STEPS[stepIndex];
        const nextStepNum = stepIndex + 1;
        setActiveWorkflowStep(nextStepNum);
        setRunProgress(Math.round((nextStepNum / WORKFLOW_STEPS.length) * 100));

        setPipelineLogs((prev) => [
          ...prev,
          {
            id: `run-log-${Date.now()}-${stepIndex}`,
            timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
            stage: current.title.toUpperCase(),
            message: current.log,
            level: nextStepNum === 8 ? 'success' : 'info',
          },
        ]);

        stepIndex++;
      } else {
        if (runIntervalRef.current) {
          clearInterval(runIntervalRef.current);
          runIntervalRef.current = null;
        }
        setRunStatus('done');
        setRunProgress(100);
        setTimeCursor(1.0);
      }
    }, stepDurationMs);
  };

  const retryRun = () => {
    startForensicRun();
  };

  const loadExample = () => {
    setParameters(DEFAULT_PARAMS);
    setSelectedVesselId('v1');
    setRunStatus('done');
    setRunProgress(100);
    setActiveWorkflowStep(8);
    setPipelineLogs(INITIAL_LOGS);
    setTimeCursor(1.0);
    setActiveScenario('baseline');
  };

  // Scenario score info for focused candidate strip
  const scenarioScoreDelta: ScenarioScoreInfo = React.useMemo(() => {
    if (activeScenario === 'epoch_plus25') {
      return {
        leadName: 'MV Pacific Lantern',
        leadRank: 1,
        scoreText: 'Borda #1 (17/20 pts)',
        isSwap: true,
        leadDcpa: 1.4,
        leadTcpa: 8,
        continuity: 94,
      };
    }
    return {
      leadName: 'MV Meridian Crest',
      leadRank: 1,
      scoreText: 'Borda #1 (18/20 pts)',
      isSwap: false,
      leadDcpa: 1.8,
      leadTcpa: 12,
      continuity: 97,
    };
  }, [activeScenario]);

  const selectedVessel =
    caseData.vessels.find((v) => v.id === selectedVesselId) || caseData.vessels[0];

  return (
    <CaseContext.Provider
      value={{
        caseData,
        selectedVesselId,
        selectedVessel,
        setSelectedVesselId,
        parameters,
        updateParameter,
        resetParameters,
        runStatus,
        setRunStatus,
        runProgress,
        activeWorkflowStep,
        pipelineLogs,
        startForensicRun,
        cancelForensicRun,
        triggerErrorState,
        retryRun,
        timeCursor,
        setTimeCursor,
        mapLayers,
        toggleLayer,
        activeScenario,
        setActiveScenario,
        loadExample,
        pickOnMap,
        setPickOnMap,
        isFormValid,
        formValidationError,
        scenarioScoreDelta,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export const useCase = () => {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCase must be used within a CaseProvider');
  }
  return context;
};
