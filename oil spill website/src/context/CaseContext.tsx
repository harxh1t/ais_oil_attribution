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
import { GULF_CASE } from '../data/gulfOfMexicoCase';
import {
  SimulationArtifacts,
  executeBackendForensicRun,
  checkBackendHealth,
  fetchLatestRun,
} from '../services/api';
import { ATTRIBUTION_IMAGES, AttributionImage } from '../data/attributionImages';

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
  currentCase?: MalibuCaseData;
  selectedVesselId: string;
  selectedVessel: CandidateVessel;
  setSelectedVesselId: (id: string) => void;
  selectedImage: AttributionImage;
  setSelectedImage: (img: AttributionImage) => void;
  parameters: ForensicParameters;
  updateParameter: <K extends keyof ForensicParameters>(key: K, value: ForensicParameters[K]) => void;
  resetParameters: () => void;
  runStatus: RunStatus;
  setRunStatus: (status: RunStatus) => void;
  runProgress: number;
  activeWorkflowStep: number;
  pipelineLogs: PipelineLog[];
  runLog?: string[];
  runPipeline?: () => void;
  hindcastHours?: number;
  setHindcastHours?: (h: number) => void;
  ensembleSize?: number;
  setEnsembleSize?: (n: number) => void;
  startForensicRun: (overrideParams?: Record<string, any> | string) => Promise<void>;
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
  artifacts: SimulationArtifacts;
  setArtifacts: React.Dispatch<React.SetStateAction<SimulationArtifacts>>;
  serverOnline: boolean;
  serverCliCommand: string;
  serverTerminalOutput: string;
  lastRunId: string | null;
}


const DEFAULT_PARAMS: ForensicParameters = {
  lat: 28.718,
  lon: -90.440,
  observationTime: '2024-05-15T13:45:00Z',
  sarTime: '2024-05-15T13:45:00Z',
  spreadKm: 14.0,
  regime: 'delayed',
  rankingMethod: 'borda',
  enableForwardFit: false,
  outputDir: 'results/gom_case',
  slickLengthKm: 14.2,
  slickAreaKm2: 8.6,
  windSpeedKts: 11.2,
  windDirectionDeg: 210,
  currentSpeedKts: 0.42,
  currentDirectionDeg: 65,
  diffusionRate: 0.18,
  backtrackingHours: 2.75,
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
  timestamp: '13:45:00 UTC',
  stage: s.title.toUpperCase(),
  message: s.log,
  level: s.step === 8 ? 'success' : 'info',
}));

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [caseData, setCaseData] = useState<MalibuCaseData>(GULF_CASE);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('v1');
  const [selectedImage, setSelectedImage] = useState<AttributionImage>(ATTRIBUTION_IMAGES[0]);
  const [parameters, setParameters] = useState<ForensicParameters>(() => {
    try {
      const saved = localStorage.getItem('wake_forensic_params');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lat > 30) {
          localStorage.removeItem('wake_forensic_params');
          return DEFAULT_PARAMS;
        }
        return { ...DEFAULT_PARAMS, ...parsed };
      }
      return DEFAULT_PARAMS;
    } catch {
      return DEFAULT_PARAMS;
    }
  });

  const [pickOnMap, setPickOnMap] = useState<boolean>(false);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runProgress, setRunProgress] = useState<number>(0);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [artifacts, setArtifacts] = useState<SimulationArtifacts>({});
  const [timeCursor, setTimeCursor] = useState<number>(1.0);
  const [mapLayers, setMapLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [activeScenario, setActiveScenario] = useState<string>('baseline');

  const [serverOnline, setServerOnline] = useState<boolean>(true);
  const [serverCliCommand, setServerCliCommand] = useState<string>(
    'python src/ais_oil_attribution/continuous_pipeline.py --image "22 Zenodo tif images/00131.tif"'
  );
  const [serverTerminalOutput, setServerTerminalOutput] = useState<string>(
    `$ python src/ais_oil_attribution/continuous_pipeline.py --image "22 Zenodo tif images/00131.tif"\n[INFO] --- [START] Processing Image: 00131.tif ---\n[INFO] Environmental Forcing Source configured: [data\\environmental\\forcing_netcdf\\00131_forcing.nc]\n[INFO] [PHASE 1] Checking perception input... Running DeepLabV3+ segmentation...\n[INFO] >>> GATE CHECK: Oil spill DETECTED! Found 25 slick(s). Primary centroid: lat=28.6720, lon=-90.4846, Spread: 0.50 km.\n[INFO] [PHASE 2] Initializing OpenDrift Lagrangian particle drift model...\n[INFO] Simulating reverse-time advection for 12.0h to find spill origin using forcing [data\\environmental\\forcing_netcdf\\00131_forcing.nc]...\n[INFO] Detected dimensions: {'time': 'time', 'x': 'lon', 'y': 'lat'}\n[INFO] Discovered Origin Site: Lat 28.67726, Lon -90.48133 | Estimated Spill Time: 2024-05-15 11:00:00 UTC\n[INFO] [PHASE 3] AIS Kinematic Intersection & Borda Rank Aggregation...\n[INFO] Multi-temporal vessel trajectory interpolation aligned for 2 candidate(s).\n=================================================================\n[INVESTIGATION COMPLETE] Case output: pipeline_runs\\00131_20260929_151914\n  Top Culprit: PACIFIC GLORY (MMSI: 354128000)\n  Distance to Origin (DCPA): 0.00 km | Time Offset (TCPA): 0.0 min\n  Confidence Rating: MEDIUM (0.552)\n  Artifacts generated: backtrack_trajectory_map.png, backtrack_spread_chart.png, backward_drift_animation.mp4, forward_drift_map.png, forward_spread_chart.png, forward_drift_animation.mp4, attribution_dossier.json, vessel_tracks.json, backtrack_summary.txt\n=================================================================`
  );
  const [lastRunId, setLastRunId] = useState<string | null>('00131_20260929_151914');

  const runIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll server state on initial load
  useEffect(() => {
    let active = true;
    async function initServerState() {
      try {
        const health = await checkBackendHealth();
        if (active) setServerOnline(health.online);
        if (health.online) {
          const latest = await fetchLatestRun();
          if (latest && active) {
            if (latest.cliCommand) setServerCliCommand(latest.cliCommand);
            if (latest.terminalOutput) setServerTerminalOutput(latest.terminalOutput);
            if (latest.runId) setLastRunId(latest.runId);
            if (latest.artifacts) setArtifacts(latest.artifacts);
            if (latest.candidateVessels && latest.candidateVessels.length > 0) {
              const mappedVessels: CandidateVessel[] = latest.candidateVessels.map((cv: any, idx: number) => ({
                id: `v${cv.final_rank || idx + 1}`,
                name: cv.vessel_name || `Vessel ${cv.mmsi}`,
                type: cv.vessel_type || 'Cargo/Tanker',
                mmsi: String(cv.mmsi),
                flag: 'US',
                lengthM: cv.length || 180,
                beamM: cv.width || 32,
                dcpa: Number((cv.dcpa_km || 0).toFixed(2)),
                tcpa: Math.abs(Number((cv.tcpa_minutes || 0).toFixed(1))),
                tcpaSigned: Number((cv.tcpa_minutes || 0).toFixed(1)),
                frechet: Number((cv.frechet_km || 0).toFixed(2)),
                continuity: Math.round((cv.coverage_completeness || 0.95) * 100),
                borda: cv.borda_score || (20 - idx * 2),
                rank: cv.final_rank || idx + 1,
                confidence: Number((cv.confidence_score || 0.8).toFixed(2)),
                confidence_label: cv.confidence_label || 'MEDIUM',
                track_points_count: cv.track_points_count || 120,
                tracks_file: cv.tracks_file || 'vessel_tracks.json',
                rank_dcpa: cv.rank_dcpa,
                rank_frechet: cv.rank_frechet,
                rank_tcpa: cv.rank_tcpa,
                gaps: [],
                track: [],
                provenance: { observed: 98, derived: 2, inferred: 0 },
              }));
              setCaseData((prev) => ({
                ...prev,
                vessels: mappedVessels,
              }));
            }
            if (latest.logs && latest.logs.length > 0) {
              setPipelineLogs(
                latest.logs.map((l, idx) => ({
                  id: l.id || `server-log-${idx}`,
                  timestamp: l.timestamp || new Date().toISOString().substring(11, 19) + ' UTC',
                  stage: l.stage,
                  message: l.message,
                  level: l.level || 'info',
                }))
              );
            }
          }
        }
      } catch {
        if (active) setServerOnline(false);
      }
    }
    initServerState();
    return () => {
      active = false;
    };
  }, []);

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

  const startForensicRun = async (overrideParams?: Record<string, any> | string) => {
    if (runIntervalRef.current) clearInterval(runIntervalRef.current);

    let targetImgName = selectedImage?.name || '00060.tif';
    let extraParams: Record<string, any> = {};

    if (typeof overrideParams === 'string') {
      targetImgName = overrideParams;
      extraParams = { image: overrideParams, image_path: overrideParams };
    } else if (overrideParams && typeof overrideParams === 'object') {
      if (overrideParams.image) targetImgName = overrideParams.image;
      else if (overrideParams.image_path) targetImgName = overrideParams.image_path;
      extraParams = overrideParams;
    }

    const matchedImg = ATTRIBUTION_IMAGES.find(
      (img) =>
        img.name.toLowerCase() === targetImgName.toLowerCase() ||
        img.code === targetImgName.replace(/\.tif$/i, '')
    );
    if (matchedImg) {
      setSelectedImage(matchedImg);
    }

    setRunStatus('running');
    setRunProgress(10);
    setActiveWorkflowStep(1);
    setPipelineLogs([
      {
        id: `run-log-${Date.now()}-0`,
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        stage: 'INITIALIZATION',
        message: `Connecting to forensic drift solver pipeline for ${targetImgName}...`,
        level: 'info',
      },
    ]);

    // Check if backend API is responding
    try {
      const runPayload = {
        ...parameters,
        image: targetImgName,
        image_path: targetImgName,
        is_read_only: false,
        ...extraParams,
      };
      const backendResult = await executeBackendForensicRun(runPayload);
      if (backendResult && backendResult.status !== 'error') {
        setServerOnline(true);
        if (backendResult.artifacts) setArtifacts(backendResult.artifacts);
        if (backendResult.cliCommand) setServerCliCommand(backendResult.cliCommand);
        if (backendResult.terminalOutput) setServerTerminalOutput(backendResult.terminalOutput);
        if (backendResult.runId) setLastRunId(backendResult.runId);

        if (backendResult.candidateVessels && backendResult.candidateVessels.length > 0) {
          const mappedVessels: CandidateVessel[] = backendResult.candidateVessels.map((cv: any, idx: number) => ({
            id: `v${cv.final_rank || idx + 1}`,
            name: cv.vessel_name || `Vessel ${cv.mmsi}`,
            type: cv.vessel_type || 'Cargo/Tanker',
            mmsi: String(cv.mmsi),
            flag: 'US',
            lengthM: cv.length || 180,
            beamM: cv.width || 32,
            dcpa: Number((cv.dcpa_km || 0).toFixed(2)),
            tcpa: Math.abs(Number((cv.tcpa_minutes || 0).toFixed(1))),
            tcpaSigned: Number((cv.tcpa_minutes || 0).toFixed(1)),
            frechet: Number((cv.frechet_km || 0).toFixed(2)),
            continuity: Math.round((cv.coverage_completeness || 0.95) * 100),
            borda: cv.borda_score || (20 - idx * 2),
            rank: cv.final_rank || idx + 1,
            confidence: Number((cv.confidence_score || 0.8).toFixed(2)),
            confidence_label: cv.confidence_label || 'MEDIUM',
            track_points_count: cv.track_points_count || 120,
            tracks_file: cv.tracks_file || 'vessel_tracks.json',
            rank_dcpa: cv.rank_dcpa,
            rank_frechet: cv.rank_frechet,
            rank_tcpa: cv.rank_tcpa,
            gaps: [],
            track: [],
            provenance: { observed: 98, derived: 2, inferred: 0 },
          }));
          setCaseData((prev) => ({
            ...prev,
            vessels: mappedVessels,
          }));
          setSelectedVesselId('v1');
        }

        const serverLogs = backendResult.logs || [];
        if (serverLogs.length > 0) {
          let logStep = 0;
          const totalLogs = serverLogs.length;
          runIntervalRef.current = setInterval(() => {
            if (logStep < totalLogs) {
              const currentLog = serverLogs[logStep];
              const nextStepNum = logStep + 1;
              setActiveWorkflowStep(nextStepNum);
              setRunProgress(Math.round(15 + (nextStepNum / totalLogs) * 85));

              setPipelineLogs((prev) => [
                ...prev,
                {
                  id: currentLog.id || `server-log-${Date.now()}-${logStep}`,
                  timestamp: currentLog.timestamp || new Date().toISOString().substring(11, 19) + ' UTC',
                  stage: currentLog.stage,
                  message: currentLog.message,
                  level: currentLog.level || 'info',
                },
              ]);

              logStep++;
            } else {
              if (runIntervalRef.current) {
                clearInterval(runIntervalRef.current);
                runIntervalRef.current = null;
              }
              setRunProgress(100);
              setActiveWorkflowStep(8);
              setRunStatus('done');
              setTimeCursor(1.0);
            }
          }, 320);
          return;
        }

        setActiveWorkflowStep(8);
        setRunProgress(100);
        setRunStatus('done');
        setTimeCursor(1.0);
        return;
      }
    } catch {
      setServerOnline(false);
      // Backend not running, proceed to client fallback simulation
    }

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
    setCaseData(GULF_CASE);
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
    return {
      leadName: 'PACIFIC GLORY',
      leadRank: 1,
      scoreText: 'Borda #1 (6/6 pts)',
      isSwap: false,
      leadDcpa: 0.0,
      leadTcpa: 0,
      continuity: 10.37,
    };
  }, [activeScenario]);

  const selectedVessel =
    caseData.vessels.find((v) => v.id === selectedVesselId) || caseData.vessels[0];

  const [hindcastHours, setHindcastHours] = useState<number>(9.2);
  const [ensembleSize, setEnsembleSize] = useState<number>(1500);

  const runLog = pipelineLogs.map((l) => `${l.stage}: ${l.message}`);

  return (
    <CaseContext.Provider
      value={{
        caseData,
        currentCase: caseData,
        selectedVesselId,
        selectedVessel,
        setSelectedVesselId,
        selectedImage,
        setSelectedImage,
        parameters,
        updateParameter,
        resetParameters,
        runStatus,
        setRunStatus,
        runProgress,
        activeWorkflowStep,
        pipelineLogs,
        runLog,
        runPipeline: startForensicRun,
        hindcastHours,
        setHindcastHours,
        ensembleSize,
        setEnsembleSize,
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
        artifacts,
        setArtifacts,
        serverOnline,
        serverCliCommand,
        serverTerminalOutput,
        lastRunId,
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
