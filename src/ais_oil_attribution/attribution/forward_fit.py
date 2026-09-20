"""Forward-fit attribution evidence channel (Longépé-style Lagrangian trajectory reconstruction)."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from geopy.distance import geodesic
from shapely.geometry import Point, Polygon

from ais_oil_attribution.drift.base import DriftModel
from ais_oil_attribution.drift.analytic import AnalyticDriftModel


@dataclass
class ForwardFitResult:
    """Result of forward-fit simulation for a candidate vessel."""
    mmsi: int
    forward_fit_score: float  # [0, 1] normalized fit score (higher is better)
    chamfer_distance_km: float  # Mean bidirectional distance (lower is better)
    particle_inside_fraction: float  # Fraction of forward-advected particles inside slick
    implied_release_time_utc: Optional[str]
    best_release_lat: float
    best_release_lon: float
    provenance: Dict[str, Any]  # observed vs interpolated contribution


def compute_chamfer_distance_km(cloud_a: np.ndarray, cloud_b: np.ndarray) -> float:
    """Computes bidirectional Chamfer distance between two point clouds in km."""
    if len(cloud_a) == 0 or len(cloud_b) == 0:
        return 50.0

    # Fast Euclidean approximation in local tangent plane (km)
    mean_lat = float(np.mean(cloud_b[:, 0]))
    m_to_lat_km = 111.139
    m_to_lon_km = 111.139 * max(0.1, np.cos(np.radians(mean_lat)))

    a_lat, a_lon = cloud_a[:, 0], cloud_a[:, 1]
    b_lat, b_lon = cloud_b[:, 0], cloud_b[:, 1]

    # a -> b min distance
    diff_lat_a = (a_lat[:, None] - b_lat[None, :]) * m_to_lat_km
    diff_lon_a = (a_lon[:, None] - b_lon[None, :]) * m_to_lon_km
    dists_sq_a = diff_lat_a ** 2 + diff_lon_a ** 2
    min_a = np.sqrt(np.min(dists_sq_a, axis=1))

    # b -> a min distance
    min_b = np.sqrt(np.min(dists_sq_a, axis=0))

    return float(0.5 * (np.mean(min_a) + np.mean(min_b)))


def evaluate_forward_fit(
    candidate_mmsi: int,
    candidate_track_df: pd.DataFrame,
    slick_coords: Optional[np.ndarray],
    slick_center_lat: float,
    slick_center_lon: float,
    spread_km: float,
    sar_observation_time: datetime,
    drift_model: Optional[DriftModel] = None,
    max_slick_age_hours: float = 24.0,
    ensemble_size: int = 15,
) -> ForwardFitResult:
    """Simulates forward advection from plausible release points along vessel track.

    Examines how well oil discharged from candidate positions reproduces observed slick.
    """
    if sar_observation_time.tzinfo is None:
        sar_observation_time = sar_observation_time.replace(tzinfo=timezone.utc)

    if drift_model is None:
        drift_model = AnalyticDriftModel()

    if candidate_track_df.empty:
        return ForwardFitResult(
            mmsi=candidate_mmsi,
            forward_fit_score=0.0,
            chamfer_distance_km=50.0,
            particle_inside_fraction=0.0,
            implied_release_time_utc=None,
            best_release_lat=slick_center_lat,
            best_release_lon=slick_center_lon,
            provenance={"n_observed_used": 0, "n_interp_used": 0, "n_gap_used": 0, "observed_ratio": 0.0},
        )

    df = candidate_track_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Build slick polygon / target cloud
    if slick_coords is not None and len(slick_coords) >= 3:
        target_cloud = slick_coords
        slick_poly = Polygon([(p[1], p[0]) for p in slick_coords]).convex_hull
    else:
        # Generate representative circular cloud around center
        rng = np.random.default_rng(42)
        angles = np.linspace(0, 2 * np.pi, 20)
        r_deg = (spread_km / 111.139) * 0.5
        target_cloud = np.column_stack([
            slick_center_lat + r_deg * np.sin(angles),
            slick_center_lon + r_deg * np.cos(angles) / max(0.1, np.cos(np.radians(slick_center_lat))),
        ])
        slick_poly = Point(slick_center_lon, slick_center_lat).buffer(r_deg)

    # Filter track points within plausible window
    min_release_time = sar_observation_time - pd.Timedelta(hours=max_slick_age_hours)
    window_pts = df[(df["timestamp"] >= min_release_time) & (df["timestamp"] <= sar_observation_time)]

    if window_pts.empty:
        window_pts = df.tail(10)

    # Sample candidate release points (up to 15 points evenly spaced)
    step = max(1, len(window_pts) // 12)
    sample_pts = window_pts.iloc[::step]

    best_score = -1.0
    best_chamfer = 50.0
    best_inside_frac = 0.0
    best_release_ts = None
    best_lat = slick_center_lat
    best_lon = slick_center_lon

    n_obs_used = 0
    n_interp_used = 0
    n_gap_used = 0

    for _, row in sample_pts.iterrows():
        p_lat = float(row["lat"])
        p_lon = float(row["lon"])
        p_ts = pd.to_datetime(row["timestamp"]).to_pydatetime()
        if p_ts.tzinfo is None:
            p_ts = p_ts.replace(tzinfo=timezone.utc)

        is_interp = bool(row.get("is_interpolated", False))
        is_gap = bool(row.get("gap_before_seconds", 0.0) > 3600.0)

        if is_gap:
            n_gap_used += 1
        elif is_interp:
            n_interp_used += 1
        else:
            n_obs_used += 1

        # Simulate forward drift to observation time
        pred_particles = drift_model.forward_track(
            release_points=np.array([[p_lat, p_lon]]),
            start_time=p_ts,
            end_time=sar_observation_time,
            ensemble_size=ensemble_size,
        )

        chamfer_km = compute_chamfer_distance_km(pred_particles, target_cloud)

        # Count particles inside slick
        inside_count = 0
        for pt in pred_particles:
            if slick_poly.contains(Point(pt[1], pt[0])):
                inside_count += 1
        inside_frac = float(inside_count / max(1, len(pred_particles)))

        # Composite forward fit score [0, 1]
        score = np.exp(-chamfer_km / max(2.0, spread_km)) * (0.4 + 0.6 * inside_frac)

        if score > best_score:
            best_score = score
            best_chamfer = chamfer_km
            best_inside_frac = inside_frac
            best_release_ts = p_ts.isoformat()
            best_lat = p_lat
            best_lon = p_lon

    total_used = max(1, n_obs_used + n_interp_used + n_gap_used)
    observed_ratio = float(n_obs_used / total_used)

    return ForwardFitResult(
        mmsi=candidate_mmsi,
        forward_fit_score=float(np.clip(best_score, 0.0, 1.0)),
        chamfer_distance_km=float(best_chamfer),
        particle_inside_fraction=float(best_inside_frac),
        implied_release_time_utc=best_release_ts,
        best_release_lat=best_lat,
        best_release_lon=best_lon,
        provenance={
            "n_observed_used": n_obs_used,
            "n_interp_used": n_interp_used,
            "n_gap_used": n_gap_used,
            "observed_ratio": observed_ratio,
        },
    )
