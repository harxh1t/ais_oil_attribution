"""Unit tests for Input Validator and Regime Classifier."""

import pytest
from ais_oil_attribution.core.input_validator import validate_input, InputValidationError
from ais_oil_attribution.core.regime_classifier import classify_regime


def test_input_validator_valid():
    v = validate_input(28.7998, -88.3943, "2010-04-24 16:43:00", 12.44, "delayed")
    assert v.lat == 28.7998
    assert v.lon == -88.3943
    assert v.spread_km == 12.44
    assert v.regime == "delayed"


def test_input_validator_invalid_coords():
    with pytest.raises(InputValidationError):
        validate_input(95.0, 0.0, "2024-01-01 00:00:00", 10.0)

    with pytest.raises(InputValidationError):
        validate_input(0.0, -190.0, "2024-01-01 00:00:00", 10.0)


def test_input_validator_invalid_spread():
    with pytest.raises(InputValidationError):
        validate_input(0.0, 0.0, "2024-01-01 00:00:00", -5.0)

    with pytest.raises(InputValidationError):
        validate_input(0.0, 0.0, "2024-01-01 00:00:00", 600.0)  # > 500 km sanity limit


def test_no_time_gap_defaults_contemporaneous():
    decision = classify_regime(spread_km=10.0, time_gap_hours=None)
    assert decision.regime == "contemporaneous"
    assert decision.requires_confirmation is True


def test_large_gap_small_spread_classifies_delayed():
    # 24 hour gap at 1.8 km/h drift -> 43.2 km expected drift > 10 km spread -> delayed
    decision = classify_regime(spread_km=10.0, time_gap_hours=24.0, typical_current_speed_km_per_hour=1.8)
    assert decision.regime == "delayed"
    assert "Lagrangian drift backtracking" in decision.rationale


def test_requires_confirmation_flag_always_true_by_default():
    decision = classify_regime(spread_km=50.0, time_gap_hours=2.0)
    assert decision.requires_confirmation is True


def test_deepwater_horizon_blowout_warning():
    decision = classify_regime(spread_km=12.44, time_gap_hours=None, lat=28.7998, lon=-88.3943)
    assert decision.is_platform_blowout_suspect is True
    assert decision.warning is not None
    assert "Deepwater Horizon" in decision.warning