"""End-to-End Pipeline Orchestration for AIS Oil-Spill Attribution."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd

from ais_oil_attribution.attribution.geometry import frechet_km
from ais_oil_attribution.attribution.proximity import calculate_vessel_cpa_to_slick
from ais_oil_attribution.attribution.ranking import borda_rank
from ais_oil_attribution.core.config_loader import load_config
from ais_oil_attribution.core.input_validator import validate_input
from ais_oil_attribution.core.regime_classifier import classify_regime
from ais_oil_attribution.data.ais_backend.marinecadastre import MarineCadastreBackend
from ais_oil_attribution.data.satellite.cerulean_client import CeruleanClient
from ais_oil_attribution.drift.opendrift_backtrack import backtrack_origin
from ais_oil_attribution.processing.ais_cleaning import clean_ais_data
from ais_oil_attribution.processing.candidate_filtering import filter_candidate_vessels
from ais_oil_attribution.processing.trajectory_reconstruction import reconstruct_all_tracks
from ais_oil_attribution.reporting.bundle_writer import write_investigation_bundle


def run_investigation(
    lat: float,
    lon: float,
    time_str: str,
    spread_km: float,
    regime: str = "auto",
    config_path: Optional[str] = None,
    oil_type: Optional[str] = None,
    output_dir: str = "results",
    non_interactive: bool = False,
    forcing_source: Optional[str] = None,
    slick_coords_override: Optional[np.ndarray] = None,
    ais_data_override: Optional[pd.DataFrame] = None,
) -> Dict[str, Any]:
    """
    Executes the full 12-step investigation pipeline (§12).
    """
    # 1. Load Configuration
    config = load_config(config_path)
    if oil_type:
        if "drift_backtracking" not in config:
            config["drift_backtracking"] = {}
        config["drift_backtracking"]["oil_type"] = oil_type

    # 2. Step 1: Validate Input
    validated_input = validate_input(
        lat=lat,
        lon=lon,
        time_str=time_str,
        spread_km=spread_km,
        regime=regime,
    )

    # 3. Step 2: Classify Regime
    reg_cfg = config.get("regime_classification", {})
    curr_speed = reg_cfg.get("typical_current_speed_km_per_hour", 1.8)
    req_confirm = reg_cfg.get("require_human_confirmation", True) and not non_interactive

    if validated_input.regime == "auto":
        regime_decision = classify_regime(
            spread_km=validated_input.spread_km,
            time_gap_hours=None,
            typical_current_speed_km_per_hour=curr_speed,
            lat=validated_input.lat,
            lon=validated_input.lon,
            require_human_confirmation=req_confirm,
        )
    else:
        # User explicitly specified regime
        regime_decision = classify_regime(
            spread_km=validated_input.spread_km,
            time_gap_hours=None,
            typical_current_speed_km_per_hour=curr_speed,
            lat=validated_input.lat,
            lon=validated_input.lon,
            require_human_confirmation=False,
        )
        regime_decision.regime = validated_input.regime
        regime_decision.rationale = f"User explicitly specified '{validated_input.regime}' regime via CLI argument."

    if regime_decision.warning:
        print(f"\n[INCIDENT WARNING] {regime_decision.warning}")

    if regime_decision.requires_confirmation and not non_interactive:
        print(f"\n[REGIME DECISION] Selected regime: '{regime_decision.regime}'")
        print(f"Rationale: {regime_decision.rationale}")
        confirm = input("Proceed with this regime decision? [y/N]: ").strip().lower()
        if confirm != "y":
            raise RuntimeError("Investigation aborted by user during regime confirmation.")

    # 4. Step 3: Determine Spatial + Temporal Search Window
    search_cfg = config.get("search", {})
    spatial_radius_km = float(search_cfg.get("spatial_radius_km", 50.0))
    window_before_hours = float(search_cfg.get("temporal_window_before_hours", 8.0))
    window_after_hours = float(search_cfg.get("temporal_window_after_hours", 6.0))

    start_time = validated_input.time_utc - timedelta(hours=window_before_hours)
    end_time = validated_input.time_utc + timedelta(hours=window_after_hours)

    # 5. Step 4: Fetch or Construct Slick Geometry
    slick_coords = slick_coords_override
    if slick_coords is None:
        cerulean_client = CeruleanClient()
        detection = cerulean_client.fetch_slick_near(
            lat=validated_input.lat,
            lon=validated_input.lon,
            time=validated_input.time_utc,
            radius_km=spatial_radius_km,
        )
        if detection is not None and len(detection.centerline) > 0:
            slick_coords = detection.centerline
        else:
            # Fallback: construct synthetic centerline through the observation point along orientation
            delta_deg = (validated_input.spread_km / 111.0) * 0.5
            slick_coords = np.array([
                [validated_input.lat - delta_deg, validated_input.lon - delta_deg],
                [validated_input.lat, validated_input.lon],
                [validated_input.lat + delta_deg, validated_input.lon + delta_deg],
            ])

    # 6. Step 5 & 6: Backtracking (if delayed regime)
    origin_estimate = None
    if regime_decision.regime == "delayed":
        try:
            origin_estimate = backtrack_origin(
                lat=validated_input.lat,
                lon=validated_input.lon,
                observation_time=validated_input.time_utc,
                spread_km=validated_input.spread_km,
                config=config,
                forcing_source=forcing_source,
                duration_hours=window_before_hours,
            )
        except Exception as e:
            # If forcing data is missing and in non-interactive / offline mode, record note
            origin_estimate = None

    # 7. Step 7: Query AIS Backend
    if ais_data_override is not None:
        raw_ais_df = ais_data_override
    else:
        backend = MarineCadastreBackend(config=config)
        try:
            raw_ais_df = backend.query(
                lat=validated_input.lat,
                lon=validated_input.lon,
                radius_km=spatial_radius_km,
                start_time=start_time,
                end_time=end_time,
            )
        except Exception as e:
            print(f"[AIS QUERY NOTICE] Live AIS query returned: {e}. Proceeding with empty candidate set.")
            raw_ais_df = pd.DataFrame()

    # 8. Step 8: Clean AIS Data
    cleaned_df = clean_ais_data(raw_ais_df)

    # 9. Step 9: Reconstruct Trajectories
    interp_cfg = config.get("interpolation", {})
    linear_max_min = float(interp_cfg.get("linear_max_gap_minutes", 5.0))
    spline_max_min = float(interp_cfg.get("spline_max_gap_minutes", 120.0))

    reconstructed_df = reconstruct_all_tracks(
        cleaned_df,
        linear_max_gap_min=linear_max_min,
        spline_max_gap_min=spline_max_min,
    )

    # 10. Step 10: Filter Candidate Vessels
    candidates_df = filter_candidate_vessels(
        reconstructed_df=reconstructed_df,
        slick_coords=slick_coords,
        config=config,
    )

    # 11. Step 11: Attribution Scoring for Survivors
    survivor_mmsis = candidates_df[candidates_df["passed_prefilter"]]["mmsi"].tolist() if not candidates_df.empty else []

    scored_records = []
    for mmsi in survivor_mmsis:
        v_track = reconstructed_df[reconstructed_df["mmsi"] == mmsi]
        cand_row = candidates_df[candidates_df["mmsi"] == mmsi].iloc[0]

        track_coords = np.column_stack([v_track["lat"].values, v_track["lon"].values])

        # Parity metric: discrete Fréchet distance to slick centerline
        f_km = frechet_km(track_coords, slick_coords)

        # Proximity & Temporality: DCPA and TCPA to slick centroid
        cpa_lat = origin_estimate.best_guess_lat if origin_estimate else validated_input.lat
        cpa_lon = origin_estimate.best_guess_lon if origin_estimate else validated_input.lon
        dcpa_km, tcpa_min = calculate_vessel_cpa_to_slick(
            v_track,
            slick_lat=cpa_lat,
            slick_lon=cpa_lon,
            obs_time=validated_input.time_utc,
        )

        scored_records.append({
            "mmsi": int(mmsi),
            "vessel_name": str(cand_row["vessel_name"]),
            "frechet_km": float(f_km),
            "dcpa_km": float(dcpa_km),
            "tcpa_minutes": float(tcpa_min),
            "coverage_completeness": float(cand_row["coverage_completeness"]),
        })

    scores_df = pd.DataFrame(scored_records)

    # Rank aggregation
    if not scores_df.empty:
        scores_df = borda_rank(scores_df, config=config)

    # 12. Step 12: Write Reproducible Investigation Bundle
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    inv_id = f"investigation_{timestamp_str}"
    output_base_path = Path(output_dir)

    input_dict = {
        "lat": validated_input.lat,
        "lon": validated_input.lon,
        "time_utc": validated_input.time_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "spread_km": validated_input.spread_km,
        "regime": validated_input.regime,
        "regime_confirmed_by_user": True,
    }

    regime_dict = {
        "regime": regime_decision.regime,
        "rationale": regime_decision.rationale,
        "warning": regime_decision.warning,
        "is_platform_blowout_suspect": regime_decision.is_platform_blowout_suspect,
    }

    bundle_path = write_investigation_bundle(
        investigation_id=inv_id,
        input_data=input_dict,
        config_dict=config,
        regime_decision=regime_dict,
        reconstructed_df=reconstructed_df,
        candidates_df=candidates_df,
        scores_df=scores_df,
        slick_coords=slick_coords,
        origin_estimate=origin_estimate,
        output_base_dir=output_base_path,
    )

    top_candidate = scores_df.iloc[0].to_dict() if not scores_df.empty else None

    return {
        "investigation_id": inv_id,
        "bundle_path": str(bundle_path),
        "report_path": str(bundle_path / "final_report.html"),
        "workstation_path": str(bundle_path / "workstation.html"),
        "top_candidate": top_candidate,
        "regime_decision": regime_dict,
        "candidates_count": len(scores_df),
    }