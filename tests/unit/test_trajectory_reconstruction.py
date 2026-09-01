"""Unit tests for trajectory reconstruction and interpolation."""

import datetime
import pandas as pd
import pytest

from ais_oil_attribution.processing.trajectory_reconstruction import reconstruct_track, reconstruct_all_tracks


def _make_track(timestamps: list[datetime.datetime], lats: list[float], lons: list[float]) -> pd.DataFrame:
    df = pd.DataFrame({
        "mmsi": [123456789] * len(timestamps),
        "timestamp": timestamps,
        "lat": lats,
        "lon": lons,
        "sog_knots": [10.0] * len(timestamps),
        "cog_degrees": [90.0] * len(timestamps),
        "heading_degrees": [90.0] * len(timestamps),
        "vessel_name": ["TEST_VESSEL"] * len(timestamps),
        "imo": [9999999] * len(timestamps),
        "vessel_type_code": [70] * len(timestamps),
        "nav_status": ["under way"] * len(timestamps),
        "length_m": [150.0] * len(timestamps),
        "width_m": [20.0] * len(timestamps),
        "draft_m": [8.0] * len(timestamps),
    })
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def test_short_gap_uses_linear():
    t0 = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)
    t1 = t0 + datetime.timedelta(minutes=3)  # 3 minute gap <= 5 min linear threshold

    df = _make_track([t0, t1], [28.0, 28.03], [-88.0, -88.03])
    recon = reconstruct_track(df, linear_max_gap_min=5.0, spline_max_gap_min=120.0, step_minutes=1.0)

    # 2 original points + 2 interpolated points at min 1 and min 2
    assert len(recon) == 4
    interp_pts = recon[recon["is_interpolated"]]
    assert len(interp_pts) == 2
    assert all(interp_pts["interpolation_method"] == "linear")


def test_long_gap_uses_spline():
    t0 = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)
    # 4 points before and after gap to allow cubic spline fitting
    t_list = [
        t0,
        t0 + datetime.timedelta(minutes=10),
        t0 + datetime.timedelta(minutes=20),
        t0 + datetime.timedelta(minutes=65),  # 45 min gap between pt 2 and 3
        t0 + datetime.timedelta(minutes=75),
    ]
    lat_list = [28.0, 28.05, 28.10, 28.30, 28.35]
    lon_list = [-88.0, -88.05, -88.10, -88.30, -88.35]

    df = _make_track(t_list, lat_list, lon_list)
    recon = reconstruct_track(df, linear_max_gap_min=5.0, spline_max_gap_min=120.0, step_minutes=1.0)

    interp_pts = recon[recon["is_interpolated"]]
    assert not interp_pts.empty
    # The 45-minute gap should have points tagged as cubic_spline
    spline_pts = recon[recon["interpolation_method"] == "cubic_spline"]
    assert len(spline_pts) > 0


def test_very_long_gap_not_interpolated():
    t0 = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)
    t1 = t0 + datetime.timedelta(hours=3)  # 3 hour gap > 120 min spline threshold

    df = _make_track([t0, t1], [28.0, 28.5], [-88.0, -88.5])
    recon = reconstruct_track(df, linear_max_gap_min=5.0, spline_max_gap_min=120.0, step_minutes=1.0)

    # No points inserted across 3hr gap
    assert len(recon) == 2
    assert all(recon["is_interpolated"] == False)
    assert all(recon["interpolation_method"] == "none")
    assert recon.loc[1, "gap_before_seconds"] == 10800.0  # 3 hours in seconds