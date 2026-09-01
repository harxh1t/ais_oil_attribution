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
    assert origin.best_guess_geojson["type"] == "Point"
    assert origin.minimum_regret_geojson["type"] == "Polygon"