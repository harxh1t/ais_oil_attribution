"""Unit tests for TOPSIS multi-criteria candidate ranker."""

import numpy as np
import pandas as pd
import pytest

from ais_oil_attribution.attribution.topsis import topsis_rank


def test_topsis_rank_identifies_best_candidate():
    """Candidate with lower DCPA, closer TCPA, and higher coverage ranks #1."""
    df = pd.DataFrame([
        {"mmsi": 111, "vessel_name": "CLOSER_VESSEL", "dcpa_km": 0.5, "tcpa_minutes": 2.0, "frechet_km": 1.0, "coverage_completeness": 0.95, "forward_fit_score": 0.85},
        {"mmsi": 222, "vessel_name": "FAR_VESSEL", "dcpa_km": 18.0, "tcpa_minutes": 120.0, "frechet_km": 25.0, "coverage_completeness": 0.30, "forward_fit_score": 0.05},
        {"mmsi": 333, "vessel_name": "MED_VESSEL", "dcpa_km": 6.0, "tcpa_minutes": 45.0, "frechet_km": 10.0, "coverage_completeness": 0.70, "forward_fit_score": 0.40},
    ])

    ranked = topsis_rank(df)
    assert ranked.iloc[0]["mmsi"] == 111
    assert ranked.iloc[0]["final_rank"] == 1
    assert ranked.iloc[0]["topsis_score"] > ranked.iloc[1]["topsis_score"]
    assert ranked.iloc[1]["topsis_score"] > ranked.iloc[2]["topsis_score"]


def test_topsis_handles_missing_frechet():
    """TOPSIS operates cleanly when Fréchet is missing or NaN."""
    df = pd.DataFrame([
        {"mmsi": 111, "vessel_name": "A", "dcpa_km": 1.0, "tcpa_minutes": 5.0, "frechet_km": None, "coverage_completeness": 0.90},
        {"mmsi": 222, "vessel_name": "B", "dcpa_km": 12.0, "tcpa_minutes": 80.0, "frechet_km": None, "coverage_completeness": 0.40},
    ])
    ranked = topsis_rank(df)
    assert ranked.iloc[0]["mmsi"] == 111
    assert "topsis_score" in ranked.columns
