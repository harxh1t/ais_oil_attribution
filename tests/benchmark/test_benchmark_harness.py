"""Benchmark and validation harness for vessel attribution."""

import pytest
from ais_oil_attribution.benchmark.runner import run_benchmark_suite


def test_synthetic_offline_validation_benchmark_execution():
    """Validates that the offline synthetic validation suite runs and produces valid multi-method metrics."""
    res = run_benchmark_suite(n_cases=5, quick_mode=True, seed=42)

    assert "ranking_methods_comparison" in res
    comp = res["ranking_methods_comparison"]

    assert "borda" in comp
    assert "topsis" in comp
    assert "llr" in comp

    assert 0.0 <= comp["borda"]["top1_accuracy"] <= 1.0
    assert 0.0 <= comp["topsis"]["top1_accuracy"] <= 1.0
    assert 0.0 <= comp["llr"]["top1_accuracy"] <= 1.0

    assert "ranker_agreement_borda_vs_topsis" in res
    assert "calibration_evaluation_llr" in res
    assert "ais_reconstruction_validation" in res