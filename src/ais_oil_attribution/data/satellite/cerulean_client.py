"""Cerulean OGC API client for satellite oil slick detections."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import dateutil.parser
import numpy as np
import requests
from shapely.geometry import LineString, Polygon, shape

DEFAULT_BASE_URL = "https://api.cerulean.skytruth.org"
DEFAULT_COVERAGE_START = "2023-01-01"


@dataclass
class SlickDetection:
    """Represents a satellite-detected oil slick."""
    detection_id: str
    geometry: Polygon | LineString | Any
    centerline: np.ndarray  # (N, 2) array of (lat, lon) coordinates
    timestamp: datetime
    slick_length_km: float
    source_type: str  # "vessel", "infrastructure", "unknown"
    raw_properties: Dict[str, Any]


class CeruleanClient:
    """Client for SkyTruth Cerulean OGC API."""

    def __init__(self, base_url: str = DEFAULT_BASE_URL, coverage_start_date: str = DEFAULT_COVERAGE_START):
        self.base_url = base_url.rstrip("/")
        self.coverage_start = dateutil.parser.parse(coverage_start_date).replace(tzinfo=timezone.utc)

    def get_landing_page(self) -> dict:
        """GET / -> Landing page metadata."""
        resp = requests.get(f"{self.base_url}/", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def list_collections(self) -> dict:
        """GET /collections -> List available feature collections."""
        resp = requests.get(f"{self.base_url}/collections", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_collection_features(
        self,
        collection_id: str = "slick",
        bbox: Optional[Tuple[float, float, float, float]] = None,
        datetime_range: Optional[str] = None,
        limit: int = 10,
    ) -> dict:
        """
        Queries features from an OGC Features collection.
        bbox format: (min_lon, min_lat, max_lon, max_lat)
        """
        params: Dict[str, Any] = {"limit": limit}
        if bbox is not None:
            params["bbox"] = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        if datetime_range is not None:
            params["datetime"] = datetime_range

        url = f"{self.base_url}/collections/{collection_id}/items"
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def fetch_slick_near(
        self,
        lat: float,
        lon: float,
        time: datetime,
        radius_km: float = 25.0,
        collection_id: str = "slick",
    ) -> Optional[SlickDetection]:
        """
        Searches for a slick detection near the target location and time.
        Returns None (not an error) if:
        - Time is before coverage start date (Jan 2023), OR
        - No matching detection is found.
        """
        if time.tzinfo is None:
            time = time.replace(tzinfo=timezone.utc)

        # Documented fact: Cerulean API data coverage begins in 2023
        if time < self.coverage_start:
            return None

        # Bounding box in lon, lat
        delta_deg = radius_km / 111.0
        bbox = (lon - delta_deg, lat - delta_deg, lon + delta_deg, lat + delta_deg)
        time_str = f"{time.strftime('%Y-%m-%dT%H:%M:%SZ')}"

        try:
            features_data = self.get_collection_features(
                collection_id=collection_id,
                bbox=bbox,
                datetime_range=f"{time_str}/..",
                limit=5,
            )
            features = features_data.get("features", [])
            if not features:
                return None

            # Pick top/closest feature
            feat = features[0]
            geom = shape(feat.get("geometry", {}))
            props = feat.get("properties", {})
            det_id = str(feat.get("id", "unknown"))

            # Extract centerline or convert geometry to line coordinates
            centerline = self._extract_centerline(geom)
            slick_len = float(props.get("length_km", 0.0))

            return SlickDetection(
                detection_id=det_id,
                geometry=geom,
                centerline=centerline,
                timestamp=time,
                slick_length_km=slick_len,
                source_type=props.get("source_type", "vessel"),
                raw_properties=props,
            )
        except Exception:
            return None

    def _extract_centerline(self, geom: Any) -> np.ndarray:
        """Extracts (N, 2) array of (lat, lon) coordinates from geometry."""
        if isinstance(geom, LineString):
            coords = np.array(geom.coords)
            # coords are (lon, lat) -> convert to (lat, lon)
            return np.column_stack([coords[:, 1], coords[:, 0]])
        elif isinstance(geom, Polygon):
            coords = np.array(geom.exterior.coords)
            return np.column_stack([coords[:, 1], coords[:, 0]])
        else:
            return np.empty((0, 2))