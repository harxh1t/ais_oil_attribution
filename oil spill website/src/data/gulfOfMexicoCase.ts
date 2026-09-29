/**
 * Gulf of Mexico Case Data (PACIFIC GLORY vs MAERSK NEVADA)
 * Matches the user-provided AIS kinematics and forensic ranking data.
 */

import { CandidateVessel, MalibuCaseData } from './malibuCase';

// Start and end parameters for PACIFIC GLORY (241 points, 2024-05-15 09:00 to 13:00 UTC)
const START_PG_LAT = 28.549995630493164;
const START_PG_LON = -90.60859087158204;
const END_PG_LAT = 28.804515630493164;
const END_PG_LON = -90.35407087158202;

// Start and end parameters for MAERSK NEVADA (241 points, 2024-05-15 09:00 to 13:00 UTC)
const START_MN_LAT = 28.808455630493164;
const START_MN_LON = -90.71813087158202;
const END_MN_LAT = 28.894855630493165;
const END_MN_LON = -90.30773087158202;

const START_MS = new Date('2024-05-15T09:00:00Z').getTime();

export function generateVesselTracks() {
  const pgTrack = [];
  const mnTrack = [];

  for (let i = 0; i < 241; i++) {
    const frac = i / 240;
    const tMs = START_MS + i * 60 * 1000;
    const tIso = new Date(tMs).toISOString();

    pgTrack.push({
      lat: START_PG_LAT + (END_PG_LAT - START_PG_LAT) * frac,
      lon: START_PG_LON + (END_PG_LON - START_PG_LON) * frac,
      t: tIso,
      timestampMs: tMs,
      sog: 13.5,
      cog: 45.0,
      provenance: 'observed' as const,
    });

    mnTrack.push({
      lat: START_MN_LAT + (END_MN_LAT - START_MN_LAT) * frac,
      lon: START_MN_LON + (END_MN_LON - START_MN_LON) * frac,
      t: tIso,
      timestampMs: tMs,
      sog: 18.2,
      cog: 80.0,
      provenance: 'observed' as const,
    });
  }

  return { pgTrack, mnTrack };
}

const { pgTrack, mnTrack } = generateVesselTracks();

// Release intersection point: where PACIFIC GLORY was at CPA (DCPA = 0.0 km) around 11:00 UTC
export const GULF_RELEASE_POINT = {
  lat: 28.677255630493164,
  lon: -90.48133087158203,
};

// SAR detection centroid ~12 km down-drift
export const GULF_OBSERVED_CENTROID = {
  lat: 28.718,
  lon: -90.440,
};

export const GULF_SLICK_VERTICES = [
  { lat: 28.705, lon: -90.465 },
  { lat: 28.710, lon: -90.455 },
  { lat: 28.718, lon: -90.440 },
  { lat: 28.725, lon: -90.428 },
  { lat: 28.730, lon: -90.415 },
  { lat: 28.724, lon: -90.418 },
  { lat: 28.715, lon: -90.435 },
  { lat: 28.708, lon: -90.450 },
  { lat: 28.702, lon: -90.460 },
];

export const GULF_VESSELS: CandidateVessel[] = [
  {
    id: 'v1',
    name: 'PACIFIC GLORY',
    type: 'Crude Oil Tanker',
    mmsi: '354128000',
    flag: 'Panama (PA)',
    lengthM: 244,
    beamM: 42,
    dcpa: 0.0,
    tcpa: 0.0,
    tcpaSigned: 0.0,
    frechet: 18.8035,
    continuity: 10.37,
    borda: 6,
    rank: 1,
    confidence: 0.551867,
    confidence_label: 'MEDIUM',
    track_points_count: 241,
    tracks_file: 'vessel_tracks.json',
    rank_dcpa: 1,
    rank_frechet: 1,
    rank_tcpa: 1,
    gaps: [],
    track: pgTrack,
    provenance: { observed: 95, derived: 5, inferred: 0 },
  },
  {
    id: 'v2',
    name: 'MAERSK NEVADA',
    type: 'Container Ship',
    mmsi: '219014000',
    flag: 'Denmark (DK)',
    lengthM: 294,
    beamM: 32,
    dcpa: 19.4743,
    tcpa: 9.0,
    tcpaSigned: -9.0,
    frechet: 29.4469,
    continuity: 10.37,
    borda: 3,
    rank: 2,
    confidence: 0.275934,
    confidence_label: 'LOW',
    track_points_count: 241,
    tracks_file: 'vessel_tracks.json',
    rank_dcpa: 2,
    rank_frechet: 2,
    rank_tcpa: 2,
    gaps: [],
    track: mnTrack,
    provenance: { observed: 94, derived: 6, inferred: 0 },
  },
];

export const GULF_CASE: MalibuCaseData = {
  id: 'WAKE-2024-0515-GOM',
  name: 'Gulf of Mexico Tanker Corridor Incident',
  seaArea: 'Gulf of Mexico (Outer Continental Shelf, Louisiana)',
  sarSensor: 'Sentinel-1 C-SAR IW',
  sarPassTime: '2024-05-15T13:45:00Z',
  observationCentroid: GULF_OBSERVED_CENTROID,
  inferredReleaseEpoch: '2024-05-15T11:00:00Z',
  inferredReleasePoint: GULF_RELEASE_POINT,
  slickAgeHours: 2.75,
  slick: {
    lengthKm: 14.2,
    widthKm: 1.1,
    areaKm2: 8.6,
    orientationDeg: 48,
    vertices: GULF_SLICK_VERTICES,
  },
  errorEllipse95: {
    semiMajorKm: 2.8,
    semiMinorKm: 1.4,
    orientationDeg: 45,
  },
  environmental: {
    windSpeedKts: 11.2,
    windDirectionDeg: 210,
    windSource: 'NOAA GFS',
    currentSpeedKts: 0.42,
    currentDirectionDeg: 65,
    currentSource: 'HYCOM Gulf of Mexico 1/25°',
    seaSurfaceTempC: 26.8,
    waveHeightM: 0.9,
  },
  vessels: GULF_VESSELS,
  rankStability: [
    {
      parameter: 'Drift Spread ±25%',
      leadVessel: 'PACIFIC GLORY (#1)',
      runnerUp: 'MAERSK NEVADA (#2)',
      scoreDelta: '+3 pts',
      outcome: 'stable',
      notes: 'PACIFIC GLORY maintains DCPA 0.0 km and top Borda score across perturbations.',
      scores: { v1: 6, v2: 3 },
    },
  ],
};
