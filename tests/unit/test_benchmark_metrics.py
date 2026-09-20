"""Unit tests for benchmark metrics, calibration stats, and ranker agreement."""

import numpy as np
import pandas as pd
import pytest

from ais_oil_attribution.benchmark.metrics import (
    bootstrap_ci,
    compute_brier_score,
    compute_expected_calibration_error,
    compute_mrr,
    compute_ndcg_at_k,
    compute_ranker_agreement,
)


def test_mrr_and_ndcg_calculations():
    """Validates MRR and NDCG on textbook ranking distributions."""
    ranks = [1, 2, 3, None]
    mrr = compute_mrr(ranks)
    # (1/1 + 1/2 + 1/3 + 0) / 4 = 1.8333 / 4 = 0.4583
    assert mrr == pytest.approx(0.4583, abs=1e-3)

    ndcg3 = compute_ndcg_at_k([1, 1, 1], k=3)
    assert ndcg3 == pytest.approx(1.0)


def test_bootstrap_ci_determinism():
    """Bootstrap confidence intervals are deterministic when seed is provided."""
    data = [1.0, 1.0, 0.0, 1.0, 1.0, 0.0]
    ci1 = bootstrap_ci(data, seed=42)
    ci2 = bootstrap_ci(data, seed=42)
    assert ci1 == ci2
    assert ci1[0] <= ci1[1]


def test_calibration_and_brier():
    """Brier score is 0.0 for perfect probability predictions."""
    brier = compute_brier_score([1.0, 0.0, 1.0], [1, 0, 1])
    assert brier == pytest.approx(0.0)

    ece, stats = compute_expected_calibration_error([0.9, 0.1], [1, 0])
    assert ece == pytest.approx(0.1, abs=1e-2)
