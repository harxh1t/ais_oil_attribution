"""Unit tests for geometric distance and trajectory similarity measures."""

import numpy as np
from frechetdist import frdist
from ais_oil_attribution.attribution.geometry import hausdorff_km, frechet_km, project_latlon_to_km


def test_frechet_identical_curves_is_zero():
    # Identical curves in (lat, lon)
    curve_a = np.array([[28.0, -88.0], [28.02, -88.02], [28.04, -88.04]])
    curve_b = np.array([[28.0, -88.0], [28.02, -88.02], [28.04, -88.04]])

    f_dist = frechet_km(curve_a, curve_b)
    assert np.isclose(f_dist, 0.0, atol=1e-6)


def test_frechet_known_case():
    # Reproduces documented frechetdist library test case
    P = [[1, 1], [2, 1], [2, 2]]
    Q = [[2, 2], [0, 1], [2, 4]]
    res = frdist(P, Q)
    assert np.isclose(res, 2.0, atol=1e-5)


def test_hausdorff_symmetry():
    curve_a = np.array([[28.0, -88.0], [28.05, -88.05]])
    curve_b = np.array([[28.02, -88.01], [28.08, -88.06], [28.10, -88.08]])

    d_ab = hausdorff_km(curve_a, curve_b)
    d_ba = hausdorff_km(curve_b, curve_a)

    assert d_ab > 0.0
    assert np.isclose(d_ab, d_ba, atol=1e-6)