"""Unit tests for proximity and CPA calculations."""

import numpy as np
from ais_oil_attribution.attribution.proximity import compute_dcpa_tcpa


def test_dcpa_zero_relative_velocity():
    # Vessel at (10, 0) moving East at 20 km/h, Target at (0, 0) moving East at 20 km/h
    v_pos = np.array([10.0, 0.0])
    v_vel = np.array([20.0, 0.0])
    t_pos = np.array([0.0, 0.0])
    t_vel = np.array([20.0, 0.0])

    dcpa, tcpa = compute_dcpa_tcpa(v_pos, v_vel, t_pos, t_vel)
    assert np.isclose(dcpa, 10.0, atol=1e-5)
    assert np.isclose(tcpa, 0.0, atol=1e-5)


def test_tcpa_known_textbook_case():
    # Vessel at (0, 10) km moving South at 60 km/h (vy = -60) toward stationary origin (0, 0)
    # Distance to origin is 10 km, will reach origin in 10/60 hours = 10 minutes -> DCPA = 0, TCPA = 10 min
    v_pos = np.array([0.0, 10.0])
    v_vel = np.array([0.0, -60.0])
    t_pos = np.array([0.0, 0.0])
    t_vel = np.array([0.0, 0.0])

    dcpa, tcpa = compute_dcpa_tcpa(v_pos, v_vel, t_pos, t_vel)
    assert np.isclose(dcpa, 0.0, atol=1e-5)
    assert np.isclose(tcpa, 10.0, atol=1e-5)