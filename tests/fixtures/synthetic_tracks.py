"""Synthetic AIS and Slick track fixtures for testing."""

import datetime
import numpy as np
import pandas as pd


def create_synthetic_slick():
    """
    Creates a synthetic straight-line slick centerline (e.g. ~10 km long).
    Coordinates in (lat, lon).
    """
    lats = np.linspace(28.0, 28.08, 10)
    lons = np.linspace(-88.0, -88.08, 10)
    return np.column_stack([lats, lons])


def create_synthetic_ais_tracks():
    """
    Creates a set of synthetic candidate vessel tracks around the slick:
    - Candidate 1 (MMSI 111111111): Near identical path & timing (Best match).
    - Candidate 2 (MMSI 222222222): Parallel path shifted ~2 km away.
    - Candidate 3 (MMSI 333333333): Crossing perpendicular path.
    - Candidate 4 (MMSI 444444444): Anchored / low SOG vessel.
    """
    base_time = datetime.datetime(2024, 8, 6, 12, 0, 0, tzinfo=datetime.timezone.utc)
    records = []

    # Candidate 1: Close match
    for i in range(15):
        t = base_time + datetime.timedelta(minutes=i * 5)
        lat = 27.98 + i * 0.008
        lon = -87.98 - i * 0.008
        records.append({
            "mmsi": 111111111,
            "timestamp": t,
            "lat": lat,
            "lon": lon,
            "sog_knots": 12.0,
            "cog_degrees": 225.0,
            "heading_degrees": 225.0,
            "vessel_name": "MATCH_VESSEL",
            "imo": 9111111,
            "vessel_type_code": 70,
            "nav_status": "under way using engine",
            "length_m": 180.0,
            "width_m": 30.0,
            "draft_m": 8.5
        })

    # Candidate 2: Parallel shifted
    for i in range(15):
        t = base_time + datetime.timedelta(minutes=i * 5)
        lat = 28.00 + i * 0.008
        lon = -87.95 - i * 0.008
        records.append({
            "mmsi": 222222222,
            "timestamp": t,
            "lat": lat,
            "lon": lon,
            "sog_knots": 10.0,
            "cog_degrees": 225.0,
            "heading_degrees": 225.0,
            "vessel_name": "PARALLEL_VESSEL",
            "imo": 9222222,
            "vessel_type_code": 70,
            "nav_status": "under way using engine",
            "length_m": 150.0,
            "width_m": 25.0,
            "draft_m": 7.0
        })

    # Candidate 3: Crossing
    for i in range(15):
        t = base_time + datetime.timedelta(minutes=i * 5)
        lat = 28.04
        lon = -88.15 + i * 0.02
        records.append({
            "mmsi": 333333333,
            "timestamp": t,
            "lat": lat,
            "lon": lon,
            "sog_knots": 15.0,
            "cog_degrees": 90.0,
            "heading_degrees": 90.0,
            "vessel_name": "CROSSING_VESSEL",
            "imo": 9333333,
            "vessel_type_code": 80,
            "nav_status": "under way using engine",
            "length_m": 220.0,
            "width_m": 32.0,
            "draft_m": 11.0
        })

    # Candidate 4: Anchored
    for i in range(15):
        t = base_time + datetime.timedelta(minutes=i * 5)
        records.append({
            "mmsi": 444444444,
            "timestamp": t,
            "lat": 28.02,
            "lon": -88.02,
            "sog_knots": 0.1,
            "cog_degrees": 0.0,
            "heading_degrees": 180.0,
            "vessel_name": "ANCHORED_VESSEL",
            "imo": 9444444,
            "vessel_type_code": 70,
            "nav_status": "at anchor",
            "length_m": 100.0,
            "width_m": 18.0,
            "draft_m": 5.0
        })

    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df