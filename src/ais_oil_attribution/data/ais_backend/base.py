"""Abstract Base Class for AIS data backends."""

from abc import ABC, abstractmethod
from datetime import datetime
import pandas as pd


class AISBackendError(Exception):
    """Base exception for AIS backend operations."""
    pass


class UnsupportedRegionError(AISBackendError):
    """Raised when coordinates fall outside the supported region of the backend."""
    pass


class AISBackend(ABC):
    """Abstract interface for AIS data retrieval."""

    @abstractmethod
    def query(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        start_time: datetime,
        end_time: datetime,
    ) -> pd.DataFrame:
        """
        Query AIS records within a spatial-temporal window.

        Args:
            lat: Center latitude (-90 to 90)
            lon: Center longitude (-180 to 180)
            radius_km: Search radius in kilometers
            start_time: Start of time window (UTC)
            end_time: End of time window (UTC)

        Returns:
            DataFrame matching the raw_ais_points.parquet schema (§4.1):
            - mmsi (int64)
            - timestamp (datetime64[ns, UTC])
            - lat (float64)
            - lon (float64)
            - sog_knots (float64)
            - cog_degrees (float64)
            - heading_degrees (float64, nullable)
            - vessel_name (string, nullable)
            - imo (Int64, nullable)
            - vessel_type_code (Int32, nullable)
            - nav_status (string)
            - length_m (float64, nullable)
            - width_m (float64, nullable)
            - draft_m (float64, nullable)
        """
        pass