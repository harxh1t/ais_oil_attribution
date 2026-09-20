"""Unit tests for LLR calibrated evidence ranker and abstention mechanism."""

import pandas as pd
import pytest

from ais_oil_attribution.attribution.llr import LLRCalibratedRanker


def test_llr_strong_evidence_yields_high_posterior():
    """Vessel with close kinematic approach and high forward fit achieves high evidence posterior."""
    df = pd.DataFrame([
        {"mmsi": 101, "vessel_name": "CORRELATED_VESSEL", "dcpa_km": 0.4, "tcpa_minutes": 3.0, "frechet_km": 1.2, "forward_fit_score": 0.90, "coverage_completeness": 0.95},
        {"mmsi": 202, "vessel_name": "DISTANT_VESSEL", "dcpa_km": 25.0, "tcpa_minutes": -300.0, "frechet_km": 28.0, "forward_fit_score": 0.05, "coverage_completeness": 0.30},
    ])

    ranker = LLRCalibratedRanker(abstention_threshold=0.50)
    res = ranker.rank(df)

    assert not res.is_abstained
    assert res.ranked_df.iloc[0]["mmsi"] == 101
    assert res.ranked_df.iloc[0]["evidence_posterior"] > 0.60


def test_llr_abstains_on_weak_evidence():
    """When all candidate vessels have weak correlation, case status triggers abstention."""
    df = pd.DataFrame([
        {"mmsi": 301, "vessel_name": "WEAK_A", "dcpa_km": 35.0, "tcpa_minutes": -400.0, "frechet_km": 40.0, "forward_fit_score": 0.02, "coverage_completeness": 0.20},
        {"mmsi": 302, "vessel_name": "WEAK_B", "dcpa_km": 42.0, "tcpa_minutes": 500.0, "frechet_km": 45.0, "forward_fit_score": 0.01, "coverage_completeness": 0.15},
    ])

    ranker = LLRCalibratedRanker(abstention_threshold=0.50)
    res = ranker.rank(df)

    assert res.is_abstained
    assert res.top_candidate_posterior < 0.50
    assert "Dark vessel" in res.abstention_reason
