"""Distance Closest Point of Approach (DCPA) and Time to CPA (TCPA)."""

import math
from typing import Tuple
import numpy as np


def compute_dcpa_tcpa(
    vessel_pos_km: np.ndarray,
    vessel_vel_kmh: np.ndarray,
    target_pos_km: np.ndarray,
    target_vel_kmh: np.ndarray = np.array([0.0, 0.0]),
) -> Tuple[float, float]:
    """
    Standard CPA construction generalized to a stationary or moving slick centroid (§7B, §9.2).
    Cites arXiv:1606.00981.

    Args:
        vessel_pos_km: (2,) array [x_km, y_km] relative position of vessel at reference time
        vessel_vel_kmh: (2,) array [vx_kmh, vy_kmh] velocity vector of vessel in km/h
        target_pos_km: (2,) array [x_km, y_km] position of slick centroid / origin estimate
        target_vel_kmh: (2,) array [vx_kmh, vy_kmh] drift velocity of slick (default: [0, 0])

    Returns:
        (DCPA_km, TCPA_minutes)
        - DCPA_km: Minimum spatial separation at closest approach.
        - TCPA_minutes: Time offset from reference time to closest approach (negative = in the past).
    """
    r = vessel_pos_km - target_pos_km
    v_rel = vessel_vel_kmh - target_vel_kmh

    v_rel_sq = float(np.dot(v_rel, v_rel))

    if v_rel_sq < 1e-9:
        # Zero relative velocity: already at minimum separation
        dcpa = float(np.linalg.norm(r))
        return (dcpa, 0.0)

    tcpa_hours = -float(np.dot(r, v_rel)) / v_rel_sq
    closest_pos = r + v_rel * tcpa_hours
    dcpa = float(np.linalg.norm(closest_pos))
    tcpa_minutes = tcpa_hours * 60.0

    return (dcpa, tcpa_minutes)


def calculate_vessel_cpa_to_slick(
    vessel_track_df,
    slick_lat: float,
    slick_lon: float,
    obs_time,
) -> Tuple[float, float]:
    """
    Calculates empirical or kinematic closest point of approach for a vessel track against slick centroid.
    """
    if vessel_track_df.empty:
        return (float("inf"), float("inf"))

    from ais_oil_attribution.attribution.geometry import project_latlon_to_km

    # Find the track point closest in space or time
    coords = np.column_stack([vessel_track_df["lat"].values, vessel_track_df["lon"].values])
    proj = project_latlon_to_km(coords, slick_lat, slick_lon)

    # Point-wise distances to slick origin (0, 0 in projected space)
    dists = np.linalg.norm(proj, axis=1)
    min_idx = int(np.argmin(dists))

    closest_dist_km = float(dists[min_idx])
    closest_time = vessel_track_df.iloc[min_idx]["timestamp"]
    tcpa_min = (closest_time - obs_time).total_seconds() / 60.0

    return (closest_dist_km, float(tcpa_min))