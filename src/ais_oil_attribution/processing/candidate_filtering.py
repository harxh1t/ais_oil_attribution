"""Candidate vessel identification and coarse spatial-kinematic filtering."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from ais_oil_attribution.attribution.confidence import calculate_coverage_completeness
from ais_oil_attribution.attribution.geometry import hausdorff_km


def filter_candidate_vessels(
    reconstructed_df: pd.DataFrame,
    slick_coords: np.ndarray,
    config: Dict[str, Any],
) -> pd.DataFrame:
    """
    Applies candidate filtering pipeline (§7.3, §18):
    1. Removes vessels anchored or non-propelled throughout the entire time window (SOG < min_sog).
    2. Computes symmetric Hausdorff distance to slick.
    3. Evaluates coarse pre-filter threshold (hausdorff_km <= hausdorff_prefilter_km).

    Returns DataFrame matching candidates.parquet schema (§4.3).
    """
    if reconstructed_df.empty or len(slick_coords) == 0:
        return pd.DataFrame(columns=[
            "mmsi", "vessel_name", "n_points", "n_interpolated_points",
            "coverage_completeness", "hausdorff_km", "passed_prefilter"
        ])

    filt_cfg = config.get("candidate_filtering", {})
    min_sog = filt_cfg.get("min_sog_knots_to_exclude_anchored", 0.5)
    hausdorff_thresh_km = filt_cfg.get("hausdorff_prefilter_km", 25.0)

    candidate_records = []

    for mmsi, group in reconstructed_df.groupby("mmsi"):
        vessel_name = str(group["vessel_name"].iloc[0])
        n_points = len(group)
        n_interp = int(group["is_interpolated"].sum()) if "is_interpolated" in group.columns else 0
        cov_comp = calculate_coverage_completeness(n_points, n_interp)

        # Speed filter: exclude vessels that remained stationary/anchored the whole time
        max_sog = float(group["sog_knots"].max()) if "sog_knots" in group.columns else 0.0
        if max_sog < min_sog:
            # Anchored throughout window
            h_dist = float("inf")
            passed = False
        else:
            # Compute Hausdorff distance to slick
            track_coords = np.column_stack([group["lat"].values, group["lon"].values])
            h_dist = hausdorff_km(track_coords, slick_coords)
            passed = bool(h_dist <= hausdorff_thresh_km)

        candidate_records.append({
            "mmsi": int(mmsi),
            "vessel_name": vessel_name,
            "n_points": int(n_points),
            "n_interpolated_points": int(n_interp),
            "coverage_completeness": float(cov_comp),
            "hausdorff_km": float(h_dist),
            "passed_prefilter": passed,
        })

    cand_df = pd.DataFrame(candidate_records)
    if not cand_df.empty:
        cand_df = cand_df.sort_values(by=["passed_prefilter", "hausdorff_km"], ascending=[False, True]).reset_index(drop=True)
    return cand_df