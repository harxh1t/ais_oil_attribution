"""Critical security test guarding against ground-truth leakage into attribution pipeline input."""

import pytest
from ais_oil_attribution.benchmark.synthetic_generator import generate_synthetic_benchmark_case


def test_ground_truth_isolation_strictness():
    """Verifies that synthetic case inputs never contain ground truth IDs, coordinates, or drift parameters."""
    case = generate_synthetic_benchmark_case(case_id="TEST_ISOLATION_01", seed=42)

    # 1. Pipeline input dictionary must not have ground truth fields
    pipeline_input = case.pipeline_input
    assert "true_source_mmsi" not in pipeline_input
    assert "true_release_lat" not in pipeline_input
    assert "true_release_lon" not in pipeline_input
    assert "true_release_time_utc" not in pipeline_input
    assert "true_drift_params" not in pipeline_input

    # 2. Candidate tracks dataframe must not have ground truth indicators
    tracks_df = pipeline_input["candidate_tracks_df"]
    assert "is_true_source" not in tracks_df.columns
    assert "is_source" not in tracks_df.columns
    assert "true_mmsi" not in tracks_df.columns

    # 3. Ground truth is isolated inside case.ground_truth
    assert "true_source_mmsi" in case.ground_truth
    assert "true_drift_params" in case.ground_truth
