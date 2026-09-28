"""
End-to-End Runner: Feed OpenDrift Backtracking Results into AIS Ship Association Engine.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import numpy as np
import pandas as pd

from ais_oil_attribution.drift.opendrift_backtrack import backtrack_origin
from ais_oil_attribution.processing.ais_cleaning import clean_ais_data
from ais_oil_attribution.processing.trajectory_reconstruction import reconstruct_all_tracks
from ais_oil_attribution.processing.candidate_filtering import filter_candidate_vessels
from ais_oil_attribution.attribution.proximity import calculate_vessel_cpa_to_slick
from ais_oil_attribution.attribution.geometry import frechet_km
from ais_oil_attribution.attribution.ranking import rank_candidates


def main():
    # 1. Load detection geojson from Deeplab inference
    geojson_path = Path("results/test_00149_detection.geojson")
    with open(geojson_path, "r") as f:
        gj = json.load(f)

    primary = gj["features"][0]["properties"]
    lat = primary["centroid_lat"]
    lon = primary["centroid_lon"]
    spread_km = primary["spread_km"]

    raw_ring = gj["features"][0]["geometry"]["coordinates"][0]
    spill_poly = [[p[1], p[0]] for p in raw_ring]
    slick_coords = np.array(spill_poly)
    obs_time = datetime(2024, 5, 15, 12, 0, 0, tzinfo=timezone.utc)

    cfg = {
        "drift_backtracking": {"seed_number": 300, "horizontal_diffusivity": 10.0},
        "candidate_filtering": {"min_sog_knots_to_exclude_anchored": 0.5, "hausdorff_prefilter_km": 40.0},
        "confidence_labels": {"high_min_score": 0.70, "medium_min_score": 0.40},
    }

    print("=" * 65)
    print("STEP 1: OPENDRIFT HYDRODYNAMIC BACKTRACKING")
    print("=" * 65)
    origin_est = backtrack_origin(
        lat=lat,
        lon=lon,
        observation_time=obs_time,
        spread_km=spread_km,
        config=cfg,
        forcing_source="SYNTHETIC_OFFLINE",
        duration_hours=12.0,
        spill_polygon=spill_poly,
    )

    origin_lat = origin_est.best_guess_lat
    origin_lon = origin_est.best_guess_lon
    origin_time = origin_est.origin_time or (obs_time - timedelta(hours=12.0))
    search_radius = 5.0
    if origin_est.convergence_details:
        search_radius = origin_est.convergence_details.get("radius_km", 5.0)

    print(f"Observed Slick Location (Satellite): lat={lat:.4f}, lon={lon:.4f} at {obs_time}")
    print(f"OpenDrift Backtrack Origin:          lat={origin_lat:.4f}, lon={origin_lon:.4f}")
    print(f"Estimated Discharge Timestamp:       {origin_time}")
    print(f"OpenDrift Uncertainty Dispersion:    {search_radius:.2f} km radius")

    # 2. Ingest AIS Vessel Traffic around OpenDrift Origin
    base_time = origin_time - timedelta(hours=2)
    records = []

    # Candidate 1: PACIFIC GLORY (Crude Oil Tanker) - passed directly through origin at discharge time
    for i in range(25):
        t = base_time + timedelta(minutes=i * 10)
        step = (i - 12) * 0.015
        v_lat = origin_lat + step * 0.707
        v_lon = origin_lon + step * 0.707
        records.append({
            "mmsi": 354128000,
            "vessel_name": "PACIFIC GLORY",
            "timestamp": t,
            "lat": v_lat,
            "lon": v_lon,
            "sog_knots": 13.5,
            "cog_degrees": 45.0,
            "heading_degrees": 45.0,
            "vessel_type_code": 80,
            "nav_status": "under way using engine",
        })

    # Candidate 2: MAERSK NEVADA (Container ship) - passed ~18 km north 40 mins prior
    for i in range(25):
        t = base_time + timedelta(minutes=i * 10)
        step = (i - 8) * 0.018
        v_lat = (origin_lat + 0.16) + step * 0.2
        v_lon = (origin_lon - 0.10) + step * 0.95
        records.append({
            "mmsi": 219014000,
            "vessel_name": "MAERSK NEVADA",
            "timestamp": t,
            "lat": v_lat,
            "lon": v_lon,
            "sog_knots": 18.2,
            "cog_degrees": 80.0,
            "heading_degrees": 80.0,
            "vessel_type_code": 70,
            "nav_status": "under way using engine",
        })

    # Candidate 3: OCEAN VOYAGER (Bulker) - passed ~28 km west
    for i in range(25):
        t = base_time + timedelta(minutes=i * 10)
        step = (i - 16) * 0.012
        v_lat = origin_lat - 0.22 + step * 0.9
        v_lon = origin_lon - 0.25 - step * 0.1
        records.append({
            "mmsi": 636019000,
            "vessel_name": "OCEAN VOYAGER",
            "timestamp": t,
            "lat": v_lat,
            "lon": v_lon,
            "sog_knots": 11.0,
            "cog_degrees": 350.0,
            "heading_degrees": 350.0,
            "vessel_type_code": 70,
            "nav_status": "under way using engine",
        })

    # Candidate 4: DELTA WORKER (Anchored OSV) - stationary near oil platform
    for i in range(25):
        t = base_time + timedelta(minutes=i * 10)
        records.append({
            "mmsi": 367451000,
            "vessel_name": "DELTA WORKER",
            "timestamp": t,
            "lat": origin_lat + 0.04,
            "lon": origin_lon + 0.07,
            "sog_knots": 0.1,
            "cog_degrees": 0.0,
            "heading_degrees": 180.0,
            "vessel_type_code": 52,
            "nav_status": "at anchor",
        })

    raw_ais_df = pd.DataFrame(records)
    raw_ais_df["timestamp"] = pd.to_datetime(raw_ais_df["timestamp"], utc=True)

    print("\n" + "=" * 65)
    print("STEP 2: AIS DATA CLEANING & TRAJECTORY RECONSTRUCTION")
    print("=" * 65)
    print(f"Total AIS records: {len(raw_ais_df)} across {raw_ais_df['mmsi'].nunique()} candidate vessels")
    cleaned_df = clean_ais_data(raw_ais_df)
    reconstructed_df = reconstruct_all_tracks(cleaned_df)

    print("\n" + "=" * 65)
    print("STEP 3: CANDIDATE FILTERING (Hausdorff Distance & Speed Gate)")
    print("=" * 65)
    candidates_df = filter_candidate_vessels(
        reconstructed_df=reconstructed_df,
        slick_coords=np.array([[origin_lat, origin_lon]]),
        config=cfg,
    )
    print(candidates_df[["mmsi", "vessel_name", "n_points", "hausdorff_km", "passed_prefilter"]].to_string(index=False))

    print("\n" + "=" * 65)
    print("STEP 4: SPATIO-TEMPORAL PROXIMITY & ASSOCIATION METRICS")
    print("=" * 65)
    survivors = candidates_df[candidates_df["passed_prefilter"]]["mmsi"].tolist()
    scored_records = []

    for mmsi in survivors:
        v_track = reconstructed_df[reconstructed_df["mmsi"] == mmsi]
        cand_row = candidates_df[candidates_df["mmsi"] == mmsi].iloc[0]
        track_coords = np.column_stack([v_track["lat"].values, v_track["lon"].values])

        f_dist = float(frechet_km(track_coords, slick_coords))

        # DCPA and TCPA computed strictly against OpenDrift's estimated origin point and release time
        dcpa_km, tcpa_min = calculate_vessel_cpa_to_slick(
            v_track,
            slick_lat=origin_lat,
            slick_lon=origin_lon,
            obs_time=origin_time,
        )

        scored_records.append({
            "mmsi": int(mmsi),
            "vessel_name": str(cand_row["vessel_name"]),
            "frechet_km": f_dist,
            "dcpa_km": float(dcpa_km),
            "tcpa_minutes": float(tcpa_min),
            "coverage_completeness": float(cand_row["coverage_completeness"]),
        })

    scores_df = pd.DataFrame(scored_records)

    print("\n" + "=" * 65)
    print("STEP 5: MULTI-CRITERIA DECISION ENGINE & FINAL ATTRIBUTION RANKING")
    print("=" * 65)
    ranked_df = rank_candidates(scores_df, method="borda", config=cfg)
    summary_cols = ["final_rank", "vessel_name", "mmsi", "dcpa_km", "tcpa_minutes", "borda_score", "confidence_score", "confidence_label"]
    print(ranked_df[summary_cols].to_string(index=False))

    # Save to disk
    out_file = Path("results/opendrift_outputs/ship_association_results.json")
    ranked_df.to_json(out_file, orient="records", indent=2)
    print(f"\n[Artifact Saved] Detailed forensic dossier: {out_file}")


if __name__ == "__main__":
    main()
