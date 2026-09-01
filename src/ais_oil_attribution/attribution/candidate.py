"""Candidate data structures for attribution analysis."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import pandas as pd


@dataclass
class Candidate:
    """Represents an identified candidate vessel with its evidence trail."""
    mmsi: int
    vessel_name: str
    n_points: int
    n_interpolated_points: int
    coverage_completeness: float
    hausdorff_km: float
    passed_prefilter: bool
    frechet_km: float = float("inf")
    dcpa_km: float = float("inf")
    tcpa_minutes: float = 0.0
    rank_frechet: int = 0
    rank_dcpa: int = 0
    rank_tcpa: int = 0
    borda_score: int = 0
    final_rank: int = 0
    confidence_score: float = 0.0
    confidence_label: str = "LOW"
    explanation: List[str] = field(default_factory=list)