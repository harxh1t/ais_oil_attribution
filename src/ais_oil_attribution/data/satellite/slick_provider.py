"""Slick provider abstractions for satellite SAR and optical detection data."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
import numpy as np
from shapely.geometry import Polygon, shape


@dataclass
class SlickDetection:
    """Standardized representation of an observed oil slick."""
    detection_id: str
    observation_time: datetime
    center_lat: float
    center_lon: float
    spread_km: float
    slick_coords: Optional[np.ndarray] = None  # (N, 2) array of (lat, lon)
    polygon_geojson: Optional[Dict[str, Any]] = None
    is_streak: bool = True
    sensor: str = "Sentinel-1 C-SAR"
    confidence: float = 0.90


class SlickProvider(ABC):
    """Abstract provider for fetching/loading satellite slick detections."""

    @abstractmethod
    def get_slick(self, **kwargs) -> Optional[SlickDetection]:
        """Retrieves or loads a slick detection."""
        pass


class GeoJSONSlickProvider(SlickProvider):
    """Loads slick detection from GeoJSON feature or geometry dictionary."""

    def __init__(self, geojson_data: Optional[Dict[str, Any]] = None):
        self.geojson_data = geojson_data

    def get_slick(
        self,
        geojson_data: Optional[Dict[str, Any]] = None,
        detection_id: str = "SLICK_001",
        observation_time: Optional[datetime] = None,
        spread_km: float = 10.0,
    ) -> Optional[SlickDetection]:
        data = geojson_data or self.geojson_data
        if not data:
            return None

        # Extract coordinates from GeoJSON Geometry or Feature
        geom_dict = data.get("geometry", data)
        geom_type = geom_dict.get("type", "")
        coords_raw = geom_dict.get("coordinates", [])

        slick_coords = None
        center_lat = 0.0
        center_lon = 0.0

        if geom_type in ("Polygon", "MultiPolygon") and coords_raw:
            poly = shape(geom_dict)
            centroid = poly.centroid
            center_lat, center_lon = centroid.y, centroid.x
            # Exterior coordinates in (lat, lon)
            if geom_type == "Polygon":
                ext = coords_raw[0]
                slick_coords = np.array([[pt[1], pt[0]] for pt in ext])
            else:
                ext = coords_raw[0][0]
                slick_coords = np.array([[pt[1], pt[0]] for pt in ext])
        elif geom_type == "LineString" and coords_raw:
            slick_coords = np.array([[pt[1], pt[0]] for pt in coords_raw])
            center_lat = float(np.mean(slick_coords[:, 0]))
            center_lon = float(np.mean(slick_coords[:, 1]))
        elif geom_type == "Point" and coords_raw:
            center_lat = float(coords_raw[1])
            center_lon = float(coords_raw[0])
            slick_coords = np.array([[center_lat, center_lon]])

        is_streak = len(slick_coords) > 2 if slick_coords is not None else False

        return SlickDetection(
            detection_id=detection_id,
            observation_time=observation_time or datetime.utcnow(),
            center_lat=center_lat,
            center_lon=center_lon,
            spread_km=spread_km,
            slick_coords=slick_coords,
            polygon_geojson=geom_dict,
            is_streak=is_streak,
        )
