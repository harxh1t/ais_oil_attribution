"""Unit tests for EnvironmentalReader."""

from pathlib import Path
import pytest
from ais_oil_attribution.data.environmental.readers import EnvironmentalReader, MissingForcingDataError


def test_missing_forcing_data_raises_error():
    reader = EnvironmentalReader()
    with pytest.raises(MissingForcingDataError) as exc_info:
        reader.resolve_source(None)
    assert "No environmental forcing data source configured" in str(exc_info.value)


def test_missing_local_file_raises_error():
    reader = EnvironmentalReader()
    with pytest.raises(MissingForcingDataError) as exc_info:
        reader.resolve_source("non_existent_forcing_file.nc")
    assert "not found" in str(exc_info.value)


def test_valid_remote_url_resolves():
    reader = EnvironmentalReader()
    url = "https://thredds.met.no/thredds/dodsC/mepslatest/meps_lagged_6_h_latest_2_5km_latest.nc"
    resolved = reader.resolve_source(url)
    assert resolved == url


def test_valid_local_file_resolves(tmp_path: Path):
    dummy_file = tmp_path / "ocean_forcing.nc"
    dummy_file.write_text("DUMMY_NETCDF_HEADER")
    reader = EnvironmentalReader()
    resolved = reader.resolve_source(str(dummy_file))
    assert resolved == str(dummy_file)