"""Unit tests for SAR ship detection cross-checking and dark vessel flagging."""

from datetime import datetime, timezone
import pandas as pd
import pytest

from ais_oil_attribution.data.satellite.ship_detections import (
    ShipDetection,
    cross_check_sar_detections_with_ais,
)


def test_ship_detection_matching_and_dark_vessel_flag():
    """Unmatched SAR detections near the slick are flagged as possible dark vessels."""
    t_sar = datetime(2024, 8, 6, 12, 0, 0, tzinfo=timezone.utc)

    # Candidate 1 AIS point at t_sar
    ais_df = pd.DataFrame([
        {"mmsi": 999111, "timestamp": t_sar, "lat": 34.00, "lon": -118.80, "sog_knots": 12.0, "cog_degrees": 45.0, "is_interpolated": False},
    ])

    detections = [
        # Detection A matches Candidate 1 (within 0.2 km)
        ShipDetection(detection_id="DET_A", lat=34.001, lon=-118.801, timestamp=t_sar),
        # Detection B is 10 km away from any AIS point, but 8 km from spill center -> dark vessel suspect
        ShipDetection(detection_id="DET_B", lat=34.08, lon=-118.85, timestamp=t_sar),
    ]

    checked = cross_check_sar_detections_with_ais(
        detections=detections,
        reconstructed_df=ais_df,
        spill_lat=34.00,
        spill_lon=-118.80,
        match_radius_km=1.5,
        slick_proximity_km=25.0,
    )

    assert checked[0].matched_mmsi == 999111
    assert not checked[0].is_possible_dark_vessel

    assert checked[1].matched_mmsi is None
    assert checked[1].is_possible_dark_vessel
