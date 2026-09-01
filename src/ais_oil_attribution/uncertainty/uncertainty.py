"""Uncertainty representation and propagation (NOAA GNOME Best Guess & Minimum Regret framing)."""

from typing import Any, Dict, Tuple
import numpy as np
from shapely.geometry import Point, Polygon, mapping


def compute_spatial_uncertainty_bounds(
    lat: float,
    lon: float,
    spread_km: float,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Computes spatial uncertainty bounds for observed slick or origin estimate.

    Returns:
        (best_guess_geojson, minimum_regret_geojson)
        - best_guess: Exact center point
        - minimum_regret: Circular / polygonal bounding envelope of uncertainty
    """
    pt = Point(lon, lat)
    # 1 deg lat ~ 111.0 km
    delta_deg = spread_km / 111.0
    buffer_poly = pt.buffer(delta_deg)

    return mapping(pt), mapping(buffer_poly)