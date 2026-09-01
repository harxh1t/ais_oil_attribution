"""Unit tests for Borda rank aggregation and confidence scoring."""

import pandas as pd
from ais_oil_attribution.attribution.ranking import borda_rank
from ais_oil_attribution.attribution.parity import parity_score
from ais_oil_attribution.attribution.confidence import calculate_coverage_completeness, calculate_confidence_score


def test_parity_score_bounds():
    assert parity_score(0.0) == 1.0
    assert parity_score(1.0) == 0.5
    assert parity_score(9.0) == 0.1
    assert parity_score(float("inf")) == 0.0


def test_borda_best_candidate_wins_all_metrics():
    # Candidate A is strictly best on frechet, dcpa, and tcpa
    df = pd.DataFrame([
        {"mmsi": 111, "vessel_name": "A", "frechet_km": 0.5, "dcpa_km": 0.2, "tcpa_minutes": 1.0, "coverage_completeness": 0.95},
        {"mmsi": 222, "vessel_name": "B", "frechet_km": 3.0, "dcpa_km": 2.5, "tcpa_minutes": 15.0, "coverage_completeness": 0.90},
        {"mmsi": 333, "vessel_name": "C", "frechet_km": 8.0, "dcpa_km": 7.0, "tcpa_minutes": 45.0, "coverage_completeness": 0.80},
    ])

    ranked = borda_rank(df)
    assert ranked.loc[0, "mmsi"] == 111
    assert ranked.loc[0, "final_rank"] == 1
    assert ranked.loc[0, "borda_score"] == 9  # 3 + 3 + 3 = 9


def test_borda_tie_break_by_coverage():
    # Candidates A and B tie on metric ranks, but A has higher coverage completeness
    df = pd.DataFrame([
        {"mmsi": 111, "vessel_name": "A", "frechet_km": 1.0, "dcpa_km": 1.0, "tcpa_minutes": 5.0, "coverage_completeness": 0.95},
        {"mmsi": 222, "vessel_name": "B", "frechet_km": 1.0, "dcpa_km": 1.0, "tcpa_minutes": 5.0, "coverage_completeness": 0.50},
    ])

    ranked = borda_rank(df)
    assert ranked.loc[0, "mmsi"] == 111
    assert ranked.loc[0, "final_rank"] == 1
    assert ranked.loc[1, "mmsi"] == 222
    assert ranked.loc[1, "final_rank"] == 2