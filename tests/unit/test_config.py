"""Test configuration loader."""

from ais_oil_attribution.core.config_loader import load_config


def test_load_default_config():
    cfg = load_config()
    assert "ais_backend" in cfg
    assert "search" in cfg
    assert "regime_classification" in cfg
    assert "attribution" in cfg
    assert cfg["ais_backend"]["provider"] == "marinecadastre"