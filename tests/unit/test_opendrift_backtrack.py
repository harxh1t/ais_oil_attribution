"""Unit tests for OpenDrift backtracking module."""

import datetime
from pathlib import Path
import pytest
from ais_oil_attribution.data.environmental.readers import MissingForcingDataError
from ais_oil_attribution.drift.opendrift_backtrack import backtrack_origin


def test_backtrack_missing_forcing_raises_error():
    t = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)
    with pytest.raises(MissingForcingDataError):
        backtrack_origin(lat=28.0, lon=-88.0, observation_time=t, spread_km=10.0, config={}, forcing_source=None)


def test_backtrack_origin_with_forcing_source(tmp_path: Path):
    dummy_forcing = tmp_path / "dummy_forcing.nc"
    dummy_forcing.write_text("DUMMY_FORCING")

    t = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)
    config = {
        "drift_backtracking": {
            "seed_number": 100,
            "seed_radius_m": 500,
            "oil_type": "GENERIC DIESEL"
        }
    }

    origin = backtrack_origin(
        lat=28.0,
        lon=-88.0,
        observation_time=t,
        spread_km=10.0,
        config=config,
        forcing_source=str(dummy_forcing),
        duration_hours=6.0,
    )

    assert origin.best_guess_lat != 0.0
    assert origin.best_guess_lon != 0.0
    assert len(origin.particles_final) == 100
    assert origin.best_guess_geojson["type"] in ("Polygon", "Point")
    assert origin.minimum_regret_geojson["type"] == "Polygon"
    assert origin.origin_time is not None
    assert origin.convergence_details is not None
    assert origin.convergence_details["method"] == "spatial_convergence_answer_independent"


def test_estimate_origin_by_convergence_and_closest_approach():
    import numpy as np
    import pandas as pd
    from ais_oil_attribution.drift.opendrift_backtrack import (
        estimate_origin_by_convergence,
        estimate_origin_by_closest_approach,
    )

    n_particles = 50
    n_timesteps = 12
    times = pd.date_range("2024-08-06 00:00:00", periods=n_timesteps, freq="15min", tz="UTC")

    # Construct synthetic trajectory where timestep 7 has tightest spread
    lons = np.zeros((n_particles, n_timesteps))
    lats = np.zeros((n_particles, n_timesteps))

    for step in range(n_timesteps):
        spread = 0.01 + 0.005 * abs(step - 7)
        lons[:, step] = -88.0 + (step * 0.02) + np.random.normal(0, spread, n_particles)
        lats[:, step] = 28.0 + (step * 0.01) + np.random.normal(0, spread, n_particles)

    coords = (lons, lats)
    conv = estimate_origin_by_convergence(coords, times, warmup_frac=0.1)
    assert conv["best_idx"] == 7
    assert conv["spread_km"] > 0
    assert conv["time"] == times[7]

    # Target closest to timestep 4
    target_lon = float(np.mean(lons[:, 4]))
    target_lat = float(np.mean(lats[:, 4]))
    cpa = estimate_origin_by_closest_approach(coords, known_lat=target_lat, known_lon=target_lon, times=times)
    assert cpa["best_idx"] == 4
    assert cpa["distance_to_target_km"] < 1.0


def test_backtrack_with_spill_polygon(tmp_path: Path):
    dummy_forcing = tmp_path / "dummy_forcing.nc"
    dummy_forcing.write_text("DUMMY_FORCING")

    t = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)
    polygon = [
        (28.0, -88.0),
        (28.05, -88.0),
        (28.05, -87.95),
        (28.0, -87.95),
        (28.0, -88.0),
    ]

    origin = backtrack_origin(
        lat=28.025,
        lon=-87.975,
        observation_time=t,
        spread_km=10.0,
        config={"drift_backtracking": {"seed_number": 60}},
        forcing_source=str(dummy_forcing),
        duration_hours=4.0,
        spill_polygon=polygon,
        target_coords=(28.0, -88.0),
    )

    assert origin.closest_approach_details is not None
    assert origin.closest_approach_details["method"] == "closest_approach_to_target"