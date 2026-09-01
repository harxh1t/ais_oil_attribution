"""Confidence estimation and coverage completeness scoring."""

import numpy as np


def calculate_coverage_completeness(n_points: int, n_interpolated: int) -> float:
    """
    Computes AIS coverage completeness ratio (§7.6, §6.10).
    coverage_completeness = 1 - (n_interpolated / n_points)
    """
    if n_points <= 0:
        return 0.0
    val = 1.0 - (float(n_interpolated) / float(n_points))
    return float(np.clip(val, 0.0, 1.0))


def calculate_confidence_score(
    borda_score: float,
    max_possible_borda: float,
    coverage_comp: float,
) -> float:
    """
    ENGINEERING FORMULA (§6.10):
    Calculates candidate confidence discount without double penalization.

    raw = borda_score / max_possible_borda
    confidence = raw * (0.5 + 0.5 * coverage_completeness)
    """
    if max_possible_borda <= 0:
        return 0.0

    raw = float(borda_score) / float(max_possible_borda)
    raw = float(np.clip(raw, 0.0, 1.0))
    discounted = raw * (0.5 + 0.5 * float(coverage_comp))
    return float(np.clip(discounted, 0.0, 1.0))


def determine_confidence_label(
    score: float,
    high_min: float = 0.75,
    medium_min: float = 0.40,
) -> str:
    """
    Assigns categorical label from continuous score based on configurable thresholds.
    Never used in place of the raw numeric score (§0 rule 4).
    """
    if score >= high_min:
        return "HIGH"
    elif score >= medium_min:
        return "MEDIUM"
    else:
        return "LOW"