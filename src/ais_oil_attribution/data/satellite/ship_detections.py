"""Optional SAR ship detection cross-check and dark vessel identification."""

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import numpy as np
import pandas as pd
from geopy.distance import geodesic


@dataclass
class ShipDetection:
    """Satellite SAR vessel detection record."""
    detection_id: str
    lat: float
    lon: float
    timestamp: datetime
    length_m: Optional[float] = None
    matched_mmsi: Optional[int] = None
    match_distance_km: Optional[float] = None
    is_possible_dark_vessel: bool = False


def load_ship_detections(geojson_path_or_dict: Optional[Any]) -> List[ShipDetection]:
    """Loads ship detections from GeoJSON file or dictionary if available."""
    if not geojson_path_or_dict:
        return []

    data = None
    if isinstance(geojson_path_or_dict, (str, Path)):
        p = Path(geojson_path_or_dict)
        if not p.exists():
            return []
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return []
    elif isinstance(geojson_path_or_dict, dict):
        data = geojson_path_or_dict

    if not data:
        return []

    features = data.get("features", [])
    detections = []
    for i, feat in enumerate(features):
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [0, 0])
        props = feat.get("properties", {})

        ts_raw = props.get("timestamp") or props.get("time_utc") or datetime.now(timezone.utc).isoformat()
        try:
            ts = pd.to_datetime(ts_raw).to_pydatetime()
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        except Exception:
            ts = datetime.now(timezone.utc)

        det = ShipDetection(
            detection_id=props.get("detection_id", f"SAR_DET_{i+1:03d}"),
            lat=float(coords[1]),
            lon=float(coords[0]),
            timestamp=ts,
            length_m=props.get("length_m"),
        )
        detections.append(det)

    return detections


def cross_check_sar_detections_with_ais(
    detections: List[ShipDetection],
    reconstructed_df: pd.DataFrame,
    spill_lat: float,
    spill_lon: float,
    match_radius_km: float = 1.5,
    slick_proximity_km: float = 25.0,
) -> List[ShipDetection]:
    """Matches SAR ship detections against reconstructed AIS vessel tracks."""
    if not detections or reconstructed_df.empty:
        return detections

    df = reconstructed_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["timestamp"] = pd.to_datetime(df["timestamp"])

    for det in detections:
        det_time = det.timestamp
        closest_mmsi = None
        min_dist_km = float("inf")

        for mmsi, group in df.groupby("mmsi"):
            g_sorted = group.sort_values("timestamp")
            # Find closest AIS point in time (within 15 min)
            time_diffs = np.abs((g_sorted["timestamp"] - det_time).dt.total_seconds())
            best_idx = time_diffs.idxmin()
            if time_diffs.loc[best_idx] <= 900.0:  # within 15 min
                pt = g_sorted.loc[best_idx]
                d_km = geodesic((det.lat, det.lon), (pt["lat"], pt["lon"])).kilometers
                if d_km < min_dist_km:
                    min_dist_km = d_km
                    closest_mmsi = int(mmsi)

        if min_dist_km <= match_radius_km:
            det.matched_mmsi = closest_mmsi
            det.match_distance_km = min_dist_km
            det.is_possible_dark_vessel = False
        else:
            det.matched_mmsi = None
            det.match_distance_km = min_dist_km
            # If unmatched and near spill, flag as possible dark vessel
            dist_to_slick = geodesic((det.lat, det.lon), (spill_lat, spill_lon)).kilometers
            det.is_possible_dark_vessel = (dist_to_slick <= slick_proximity_km)

    return detections
