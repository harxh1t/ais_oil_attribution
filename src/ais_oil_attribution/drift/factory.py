"""Factory for instantiating drift model backends."""

from typing import Any, Dict, Optional
from ais_oil_attribution.drift.base import DriftModel
from ais_oil_attribution.drift.analytic import AnalyticDriftModel
from ais_oil_attribution.drift.opendrift_backtrack import OpenDriftModel


def get_drift_model(model_name: str = "analytic", **kwargs) -> DriftModel:
    """Returns a configured DriftModel instance.

    Supported model_name values:
        - "analytic": Deterministic, lightweight offline advection/dispersion model.
        - "opendrift": OpenDrift/OpenOil Lagrangian simulation (requires NetCDF forcing).
    """
    name = (model_name or "analytic").lower().strip()
    if name == "opendrift":
        return OpenDriftModel()
    return AnalyticDriftModel(**kwargs)
