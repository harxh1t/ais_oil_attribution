/**
 * API Service for connecting to the simulation backend (e.g. FastAPI / Flask / Express)
 * Requests to /api and /static_outputs are proxied through Vite to your backend server.
 */

export interface SimulationArtifacts {
  forwardAnimation?: string;   // e.g. "/pipeline_runs/forward_drift_animation.gif"
  backwardAnimation?: string;  // e.g. "/pipeline_runs/backward_drift_animation.gif"
  forwardMap?: string;        // e.g. "/pipeline_runs/forward_drift_map.png"
  backwardMap?: string;       // e.g. "/pipeline_runs/backward_drift_map.png"
  sarPreprocessed?: string;   // e.g. "/pipeline_runs/sar_preprocessed.png"
  segmentationOverlay?: string; // e.g. "/pipeline_runs/segmentation_overlay.png"
  forwardSimulation?: string;  // e.g. "/pipeline_runs/forward_spread_chart.svg" or png
  backwardSimulation?: string; // e.g. "/pipeline_runs/backtrack_spread_chart.svg" or png
  detectionSummary?: string;   // e.g. "/pipeline_runs/detection_summary.png"
  [key: string]: string | undefined;
}

export interface SimulationRunResponse {
  runId: string;
  status: 'completed' | 'running' | 'error';
  artifacts?: SimulationArtifacts;
  logs?: Array<{
    id?: string;
    stage: string;
    message: string;
    timestamp?: string;
    level?: 'info' | 'warn' | 'success';
  }>;
  candidateVessels?: any[];
  summary?: string;
  cliCommand?: string;
  terminalOutput?: string;
}

/**
 * Fetch the latest forensic run from backend.
 */
export async function fetchLatestRun(): Promise<SimulationRunResponse | null> {
  try {
    const res = await fetch('/api/latest-run', { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline or not available
  }
  return null;
}

/**
 * Trigger a forensic drift simulation on the backend.
 * Tries POST /api/run first, then falls back to POST /api/simulation/run
 */
export async function executeBackendForensicRun(
  parameters: Record<string, any>
): Promise<SimulationRunResponse | null> {
  const endpoints = ['/api/run', '/api/simulation/run'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(parameters),
      });

      if (response.ok) {
        const data = await response.json();
        const ts = Date.now();
        // If the backend produces outputs in the pipeline_runs directory with same names:
        const resolvedArtifacts: SimulationArtifacts = {
          forwardAnimation: data.artifacts?.forwardAnimation || `/pipeline_runs/forward_drift_animation.gif?t=${ts}`,
          backwardAnimation: data.artifacts?.backwardAnimation || `/pipeline_runs/backward_drift_animation.gif?t=${ts}`,
          forwardMap: data.artifacts?.forwardMap || `/pipeline_runs/forward_drift_map.png?t=${ts}`,
          backwardMap: data.artifacts?.backwardMap || `/pipeline_runs/backward_drift_map.png?t=${ts}`,
          sarPreprocessed: data.artifacts?.sarPreprocessed || `/pipeline_runs/sar_preprocessed.png?t=${ts}`,
          segmentationOverlay: data.artifacts?.segmentationOverlay || `/pipeline_runs/segmentation_overlay.png?t=${ts}`,
          forwardSimulation: data.artifacts?.forwardSimulation || `/pipeline_runs/forward_spread_chart.svg?t=${ts}`,
          backwardSimulation: data.artifacts?.backwardSimulation || `/pipeline_runs/backtrack_spread_chart.svg?t=${ts}`,
          detectionSummary: data.artifacts?.detectionSummary || `/pipeline_runs/detection_summary.png?t=${ts}`,
          ...data.artifacts,
        };
        return {
          ...data,
          artifacts: resolvedArtifacts,
        } as SimulationRunResponse;
      }
    } catch {
      // Backend not running or endpoint not found on this route, continue to next
    }
  }

  return null;
}

/**
 * Check if the backend is reachable
 */
export async function checkBackendHealth(): Promise<{ online: boolean; message?: string }> {
  try {
    const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { online: true, message: data?.status || 'Online' };
    }
  } catch {
    // Offline or unreachable
  }
  return { online: false };
}
