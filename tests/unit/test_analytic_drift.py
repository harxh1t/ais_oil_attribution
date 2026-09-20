"""Unit tests for deterministic analytic drift modeling."""

from datetime import datetime, timezone
import numpy as np
import pytest

from ais_oil_attribution.drift.analytic import AnalyticDriftModel


def test_analytic_drift_determinism():
    """Analytic drift model with fixed seed produces strictly identical particle clouds."""
    model_a = AnalyticDriftModel(seed=42)
    model_b = AnalyticDriftModel(seed=42)

    obs_time = datetime(2024, 8, 6, 12, 0, 0, tzinfo=timezone.utc)
    res_a = model_a.backtrack(lat=34.0, lon=-118.8, observation_time=obs_time, spread_km=10.0, duration_hours=6.0)
    res_b = model_b.backtrack(lat=34.0, lon=-118.8, observation_time=obs_time, spread_km=10.0, duration_hours=6.0)

    np.testing.assert_allclose(res_a.particles_final, res_b.particles_final)
    assert res_a.best_guess_lat == pytest.approx(res_b.best_guess_lat)
    assert res_a.best_guess_lon == pytest.approx(res_b.best_guess_lon)


def test_analytic_forward_track_advection():
    """Forward tracking moves particles downwind and downcurrent."""
    model = AnalyticDriftModel(
        current_u_ms=0.20,
        current_v_ms=0.00,
        wind_speed_ms=10.0,
        wind_dir_deg=90.0,  # Eastward
        windage_coeff=0.03,
        horizontal_diffusivity_m2s=0.0,
        seed=42,
    )
    t0 = datetime(2024, 8, 6, 10, 0, 0, tzinfo=timezone.utc)
    t1 = datetime(2024, 8, 6, 11, 0, 0, tzinfo=timezone.utc)  # 1 hour (3600 s)

    init_pts = np.array([[34.0, -118.8]])
    pred_pts = model.forward_track(init_pts, start_time=t0, end_time=t1, ensemble_size=5)

    # Eastward movement increases longitude
    assert np.all(pred_pts[:, 1] > init_pts[0, 1])
    assert len(pred_pts) == 5
