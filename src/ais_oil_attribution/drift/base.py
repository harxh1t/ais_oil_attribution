"""Drift model interface and abstraction."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
import numpy as np


@dataclass
class OriginEstimate:
    """Estimated release origin region and uncertainty bounds."""
    best_guess_lat: float
    best_guess_lon: float
    best_guess_geojson: Dict[str, Any]
    minimum_regret_geojson: Dict[str, Any]
    particles_final: np.ndarray  # (N, 2) array of (lat, lon)
    duration_hours: float
    note: str
    origin_time: Optional[datetime] = None
    convergence_details: Optional[Dict[str, Any]] = None
    closest_approach_details: Optional[Dict[str, Any]] = None
    ensemble_details: Optional[Dict[str, Any]] = None
    coords_history: Optional[Tuple[np.ndarray, np.ndarray]] = None
    times_history: Optional[Any] = None


class DriftModel(ABC):
    """Abstract base class for hydrodynamic/atmospheric oil drift modeling."""

    @abstractmethod
    def backtrack(
        self,
        lat: float,
        lon: float,
        observation_time: datetime,
        spread_km: float,
        duration_hours: float = 12.0,
        config: Optional[Dict[str, Any]] = None,
        forcing_source: Optional[str] = None,
    ) -> OriginEstimate:
        """Simulate reverse-time advection to estimate the spill origin."""
        pass

    @abstractmethod
    def forward_track(
        self,
        release_points: np.ndarray,
        start_time: datetime,
        end_time: datetime,
        config: Optional[Dict[str, Any]] = None,
        ensemble_size: int = 50,
        wind_perturbation: float = 0.0,
        current_perturbation: float = 0.0,
    ) -> np.ndarray:
        """Simulate forward-time advection from release candidate points to observation time.

        Args:
            release_points: (N, 2) array of (lat, lon) points
            start_time: Release timestamp
            end_time: SAR observation timestamp
            config: Optional configuration overrides
            ensemble_size: Number of forward particles to simulate per release point
            wind_perturbation: Additive wind speed perturbation (m/s)
            current_perturbation: Additive current speed perturbation (m/s)

        Returns:
            (M, 2) array of predicted particle locations at end_time
        """
        pass
