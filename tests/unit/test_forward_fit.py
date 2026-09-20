"""Unit tests for Longépé-style forward-fit attribution evidence and provenance integrity."""

from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd
import pytest

from ais_oil_attribution.attribution.forward_fit import (
    compute_chamfer_distance_km,
    evaluate_forward_fit,
)
from ais_oil_attribution.drift.analytic import AnalyticDriftModel


def test_chamfer_distance_identical_clouds():
    """Chamfer distance between identical point clouds is zero."""
    cloud = np.array([[34.0, -118.5], [34.02, -118.52], [34.04, -118.54]])
    dist = compute_chamfer_distance_km(cloud, cloud)
    assert dist == pytest.approx(0.0, abs=1e-5)


def test_forward_fit_provenance_distinction():
    """Forward-fit respects observed vs interpolated provenance and computes fit score."""
    t_obs = datetime(2024, 8, 6, 12, 0, 0, tzinfo=timezone.utc)
    timestamps = [t_obs - timedelta(hours=i) for i in range(5, 0, -1)]

    # Synthetic track: 3 observed points, 2 interpolated points
    track_df = pd.DataFrame([
        {"timestamp": timestamps[0], "lat": 33.95, "lon": -118.85, "is_interpolated": False, "gap_before_seconds": 0.0},
        {"timestamp": timestamps[1], "lat": 33.97, "lon": -118.83, "is_interpolated": True, "gap_before_seconds": 60.0},
        {"timestamp": timestamps[2], "lat": 33.99, "lon": -118.81, "is_interpolated": True, "gap_before_seconds": 60.0},
        {"timestamp": timestamps[3], "lat": 34.01, "lon": -118.79, "is_interpolated": False, "gap_before_seconds": 0.0},
        {"timestamp": timestamps[4], "lat": 34.03, "lon": -118.77, "is_interpolated": False, "gap_before_seconds": 0.0},
    ])

    slick_center_lat, slick_center_lon = 34.02, -118.78
    res = evaluate_forward_fit(
        candidate_mmsi=123456789,
        candidate_track_df=track_df,
        slick_coords=None,
        slick_center_lat=slick_center_lat,
        slick_center_lon=slick_center_lon,
        spread_km=8.0,
        sar_observation_time=t_obs,
        drift_model=AnalyticDriftModel(seed=42),
    )

    assert 0.0 <= res.forward_fit_score <= 1.0
    assert res.chamfer_distance_km < 30.0
    assert "observed_ratio" in res.provenance
    assert res.provenance["n_observed_used"] > 0
    assert res.provenance["n_interp_used"] > 0
