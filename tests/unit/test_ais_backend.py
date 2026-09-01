"""Unit tests for AISBackend and MarineCadastreBackend."""

import datetime
from pathlib import Path
import duckdb
import pandas as pd
import pytest

from ais_oil_attribution.data.ais_backend.marinecadastre import MarineCadastreBackend
from ais_oil_attribution.data.ais_backend.base import UnsupportedRegionError
from tests.fixtures.synthetic_tracks import create_synthetic_ais_tracks


def test_marinecadastre_unsupported_region():
    backend = MarineCadastreBackend({"ais_backend": {"us_waters_only": True}})
    start = datetime.datetime(2024, 8, 6, 0, 0, 0, tzinfo=datetime.timezone.utc)
    end = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)

    # South China Sea (outside US waters)
    with pytest.raises(UnsupportedRegionError) as exc_info:
        backend.query(lat=10.0, lon=110.0, radius_km=20.0, start_time=start, end_time=end)

    assert "outside US waters" in str(exc_info.value)


def test_marinecadastre_query_with_mock_duckdb(tmp_path: Path):
    # Create test parquet dataset
    df_synthetic = create_synthetic_ais_tracks()
    parquet_path = tmp_path / "test_ais.parquet"
    df_synthetic.to_parquet(parquet_path)

    con = duckdb.connect()
    backend = MarineCadastreBackend(
        config={"ais_backend": {"us_waters_only": True, "geoparquet_base_url": str(parquet_path).replace("\\", "/")}},
        db_connection=con,
    )

    start = datetime.datetime(2024, 8, 6, 11, 0, 0, tzinfo=datetime.timezone.utc)
    end = datetime.datetime(2024, 8, 6, 14, 0, 0, tzinfo=datetime.timezone.utc)

    result_df = backend.query(
        lat=28.0,
        lon=-88.0,
        radius_km=50.0,
        start_time=start,
        end_time=end,
    )

    assert not result_df.empty
    expected_columns = [
        "mmsi", "timestamp", "lat", "lon", "sog_knots", "cog_degrees",
        "heading_degrees", "vessel_name", "imo", "vessel_type_code",
        "nav_status", "length_m", "width_m", "draft_m"
    ]
    assert list(result_df.columns) == expected_columns
    assert str(result_df["timestamp"].dtype) == "datetime64[ns, UTC]"
    assert result_df["lat"].dtype == "float64"
    assert result_df["mmsi"].dtype == "int64"