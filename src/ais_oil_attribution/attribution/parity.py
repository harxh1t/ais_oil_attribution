"""Parity score calculation based on discrete Fréchet distance."""

import numpy as np


def parity_score(frechet_dist_km: float) -> float:
    """
    ENGINEERING FORMULA (§9.3):
    Transforms discrete Fréchet distance into a bounded [0, 1] parity metric.

    parity = 1 / (1 + frechet_km)
    - frechet_km = 0.0 -> parity = 1.0 (identical track and slick shapes)
    - frechet_km = 1.0 -> parity = 0.5
    - frechet_km -> inf -> parity -> 0.0
    """
    if np.isinf(frechet_dist_km) or np.isnan(frechet_dist_km) or frechet_dist_km < 0:
        return 0.0
    return float(1.0 / (1.0 + frechet_dist_km))