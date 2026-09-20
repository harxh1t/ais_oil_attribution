"""Synthetic benchmark case generator with mandatory model mismatch and ground-truth isolation."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from geopy.distance import geodesic


@dataclass
class SyntheticCase:
    """Benchmark case containing strictly separated pipeline inputs and isolated ground truth."""
    case_id: str
    scenario_type: str  # point, streak, intermittent, dark_vessel, negative_control
    difficulty: str  # easy, medium, hard
    pipeline_input: Dict[str, Any]  # lat, lon, time_utc, spread_km, regime, candidate_tracks_df, slick_coords
    ground_truth: Dict[str, Any]  # true_source_mmsi, true_release_lat, true_release_lon, true_release_time_utc, is_dark, control_type


def generate_synthetic_benchmark_case(
    case_id: str,
    scenario_type: str = "streak",
    difficulty: str = "medium",
    n_background_vessels: int = 15,
    slick_age_hours: float = 8.0,
    mismatch_level: float = 1.0,
    seed: int = 42,
) -> SyntheticCase:
    """Generates a seeded synthetic maritime incident case with strict truth isolation and physics mismatch.

    MANDATORY MODEL MISMATCH:
    The synthetic truth is advected using complex non-linear physics (higher leeway, wind deflection,
    turbulent ocean eddies), while the pipeline uses baseline analytic/OpenDrift parameters.
    """
    rng = np.random.default_rng(seed)

    base_time = datetime(2024, 8, 6, 12, 0, 0, tzinfo=timezone.utc)
    sar_obs_time = base_time + timedelta(hours=slick_age_hours)
    sar_time_str = sar_obs_time.strftime("%Y-%m-%d %H:%M:%S")

    # Center of incident area (e.g. offshore California)
    center_lat = 34.00
    center_lon = -118.80

    # True release time
    true_release_time = base_time + timedelta(minutes=float(rng.uniform(-30, 30)))
    true_release_lat = center_lat + float(rng.uniform(-0.05, 0.05))
    true_release_lon = center_lon + float(rng.uniform(-0.05, 0.05))

    # Truth physics with controlled mismatch
    truth_current_u = 0.18 + 0.05 * mismatch_level  # Pipeline assumes 0.15
    truth_current_v = 0.12 - 0.04 * mismatch_level  # Pipeline assumes 0.10
    truth_wind_speed = 6.5 + 1.2 * mismatch_level   # Pipeline assumes 5.0
    truth_wind_dir = 55.0 + 10.0 * mismatch_level   # Pipeline assumes 45.0
    truth_leeway = 0.038 + 0.005 * mismatch_level   # Pipeline assumes 0.030

    dt_sec = (sar_obs_time - true_release_time).total_seconds()

    # Truth advection displacement (meters)
    wdir_rad = np.radians(truth_wind_dir)
    u_tot = truth_current_u + truth_leeway * truth_wind_speed * np.sin(wdir_rad)
    v_tot = truth_current_v + truth_leeway * truth_wind_speed * np.cos(wdir_rad)

    disp_x_m = u_tot * dt_sec + rng.normal(0, 150.0)
    disp_y_m = v_tot * dt_sec + rng.normal(0, 150.0)

    # Observed slick center at SAR observation time
    obs_slick_lat = true_release_lat + (disp_y_m / 111139.0)
    obs_slick_lon = true_release_lon + (disp_x_m / (111139.0 * np.cos(np.radians(center_lat))))
    spread_km = float(np.clip(6.0 + 0.8 * slick_age_hours + rng.uniform(-1, 2), 4.0, 25.0))

    # Generate synthetic slick geometry (streak vs point)
    slick_coords = []
    if scenario_type in ("streak", "intermittent"):
        streak_len = int(12 + 6 * mismatch_level)
        for i in range(streak_len):
            frac = (i / streak_len) - 0.5
            s_lat = obs_slick_lat + frac * 0.04 + float(rng.normal(0, 0.002))
            s_lon = obs_slick_lon + frac * 0.06 + float(rng.normal(0, 0.002))
            slick_coords.append([s_lat, s_lon])
    else:
        # Circular / amorphous blob
        for ang in np.linspace(0, 2 * np.pi, 16):
            r = (spread_km / 111.139) * (0.3 + float(rng.uniform(-0.05, 0.05)))
            slick_coords.append([obs_slick_lat + r * np.sin(ang), obs_slick_lon + r * np.cos(ang)])

    slick_coords_arr = np.array(slick_coords)

    # Generate vessel trajectories
    tracks_records = []
    source_mmsi = 999000001
    is_dark = (scenario_type == "dark_vessel")

    # Time sampling window: 12 hours before to 2 hours after SAR
    t_start = base_time - timedelta(hours=6)
    t_end = sar_obs_time + timedelta(hours=2)
    sample_timestamps = pd.date_range(t_start, t_end, freq="5min")

    # 1. True Source Vessel (unless negative control or pure dark)
    if not is_dark and scenario_type != "negative_control":
        # Source vessel sails through true release point at true release time
        v_sog = float(rng.uniform(12.0, 16.0))
        v_cog = float(rng.uniform(30.0, 60.0))
        cog_rad = np.radians(v_cog)

        for ts in sample_timestamps:
            delta_t_hours = (ts.to_pydatetime() - true_release_time).total_seconds() / 3600.0
            dist_km = delta_t_hours * (v_sog * 1.852)
            p_lat = true_release_lat + (dist_km * np.cos(cog_rad)) / 111.139
            p_lon = true_release_lon + (dist_km * np.sin(cog_rad)) / (111.139 * np.cos(np.radians(center_lat)))

            # AIS dropout / noise simulation
            dropout_rate = 0.05 if difficulty == "easy" else (0.15 if difficulty == "medium" else 0.35)
            if rng.uniform(0, 1) > dropout_rate:
                noise_m = 10.0 if difficulty == "easy" else (40.0 if difficulty == "medium" else 120.0)
                tracks_records.append({
                    "mmsi": source_mmsi,
                    "vessel_name": "ALPHA_CARRIER",
                    "timestamp": ts.isoformat(),
                    "lat": p_lat + rng.normal(0, noise_m / 111139.0),
                    "lon": p_lon + rng.normal(0, noise_m / (111139.0 * np.cos(np.radians(center_lat)))),
                    "sog_knots": v_sog + float(rng.normal(0, 0.2)),
                    "cog_degrees": v_cog + float(rng.normal(0, 1.0)),
                    "is_interpolated": False,
                })

    # 2. Decoy Vessel A: Correct location, WRONG time (e.g. 5 hours earlier)
    decoy_a_mmsi = 999000002
    decoy_a_time = true_release_time - timedelta(hours=5.0)
    for ts in sample_timestamps:
        dt_h = (ts.to_pydatetime() - decoy_a_time).total_seconds() / 3600.0
        dist_km = dt_h * (14.0 * 1.852)
        tracks_records.append({
            "mmsi": decoy_a_mmsi,
            "vessel_name": "DECOY_TIME_MISMATCH",
            "timestamp": ts.isoformat(),
            "lat": true_release_lat + (dist_km * 0.7) / 111.139,
            "lon": true_release_lon + (dist_km * 0.7) / (111.139 * np.cos(np.radians(center_lat))),
            "sog_knots": 14.0,
            "cog_degrees": 45.0,
            "is_interpolated": False,
        })

    # 3. Decoy Vessel B: Correct time, WRONG location (25 km away)
    decoy_b_mmsi = 999000003
    decoy_b_lat = true_release_lat + 0.22  # ~25 km North
    for ts in sample_timestamps:
        dt_h = (ts.to_pydatetime() - true_release_time).total_seconds() / 3600.0
        dist_km = dt_h * (13.5 * 1.852)
        tracks_records.append({
            "mmsi": decoy_b_mmsi,
            "vessel_name": "DECOY_LOCATION_MISMATCH",
            "timestamp": ts.isoformat(),
            "lat": decoy_b_lat + (dist_km * 0.8) / 111.139,
            "lon": true_release_lon + (dist_km * 0.6) / (111.139 * np.cos(np.radians(center_lat))),
            "sog_knots": 13.5,
            "cog_degrees": 50.0,
            "is_interpolated": False,
        })

    # 4. Background Marine Traffic
    for b_idx in range(n_background_vessels):
        b_mmsi = 999100000 + b_idx
        b_name = f"VESSEL_TRANSIT_{b_idx+1:02d}"
        b_origin_lat = center_lat + float(rng.uniform(-0.4, 0.4))
        b_origin_lon = center_lon + float(rng.uniform(-0.4, 0.4))
        b_cog = float(rng.uniform(0, 360))
        b_sog = float(rng.uniform(8.0, 20.0))
        cog_rad = np.radians(b_cog)

        for ts in sample_timestamps:
            dt_h = (ts.to_pydatetime() - base_time).total_seconds() / 3600.0
            dist_km = dt_h * (b_sog * 1.852)
            tracks_records.append({
                "mmsi": b_mmsi,
                "vessel_name": b_name,
                "timestamp": ts.isoformat(),
                "lat": b_origin_lat + (dist_km * np.cos(cog_rad)) / 111.139,
                "lon": b_origin_lon + (dist_km * np.sin(cog_rad)) / (111.139 * np.cos(np.radians(center_lat))),
                "sog_knots": b_sog,
                "cog_degrees": b_cog,
                "is_interpolated": False,
            })

    tracks_df = pd.DataFrame(tracks_records)

    # Handle negative control perturbation
    control_type = "none"
    if scenario_type == "negative_control":
        control_type = "time_shifted_24h"
        # Shift SAR observation input by 24 hours so true release is outside observation window
        sar_obs_time += timedelta(hours=24)
        sar_time_str = sar_obs_time.strftime("%Y-%m-%d %H:%M:%S")

    pipeline_input = {
        "lat": obs_slick_lat,
        "lon": obs_slick_lon,
        "time_utc": sar_time_str,
        "spread_km": spread_km,
        "regime": "delayed" if slick_age_hours > 1.0 else "contemporaneous",
        "candidate_tracks_df": tracks_df,
        "slick_coords": slick_coords_arr,
    }

    ground_truth = {
        "true_source_mmsi": source_mmsi if (not is_dark and scenario_type != "negative_control") else None,
        "true_release_lat": true_release_lat,
        "true_release_lon": true_release_lon,
        "true_release_time_utc": true_release_time.isoformat(),
        "is_dark": is_dark,
        "is_negative_control": (scenario_type == "negative_control"),
        "control_type": control_type,
        "true_drift_params": {
            "current_u": truth_current_u,
            "current_v": truth_current_v,
            "wind_speed": truth_wind_speed,
            "wind_dir": truth_wind_dir,
            "leeway": truth_leeway,
            "mismatch_level": mismatch_level,
        },
    }

    return SyntheticCase(
        case_id=case_id,
        scenario_type=scenario_type,
        difficulty=difficulty,
        pipeline_input=pipeline_input,
        ground_truth=ground_truth,
    )
