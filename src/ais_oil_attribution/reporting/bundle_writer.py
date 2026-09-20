"""Investigation reproducibility bundle writer."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
import yaml

from ais_oil_attribution.reporting.html_report import generate_html_report
from ais_oil_attribution.reporting.maps import generate_attribution_map
from ais_oil_attribution.reporting.reconstruction_3d_dashboard import generate_reconstruction_3d_dashboard
from ais_oil_attribution.reporting.reconstruction_3d_v2_dashboard import generate_reconstruction_3d_v2_dashboard
from ais_oil_attribution.reporting.reconstruction_3d_v3_dashboard import generate_reconstruction_3d_v3_dashboard
from ais_oil_attribution.reporting.workstation_dashboard import generate_workstation_dashboard

SOURCES_MD_CONTENT = """# References & Methodological Sources

Every method used in this investigation is either traced to a specific published peer-reviewed paper / practitioner system or explicitly flagged as an engineering judgment.

## 1. SAR Oil Spill Detection & Practitioner Benchmark
- **Cerulean / SkyTruth (2023–2025)**: *Cerulean Methods & Operational Vessel Association*, https://skytruth.org/cerulean/methods
- **Krestenitis et al. (2018)**: *Dark Spot Detection in SAR Images of Oil Spill Using SegNet.* Applied Sciences 8(12):2670. https://doi.org/10.3390/app8122670
- **Sentinel-1 SAR Oil Spill Detector (2022)**: International Journal of Remote Sensing. https://doi.org/10.1080/01431161.2022.2109445

## 2. Geometric & Trajectory Similarity
- **Toohey & Duckham (2021)**: *A comparative analysis of trajectory similarity measures.* Int'l J. Geographical Information Science. https://doi.org/10.1080/15481603.2021.1908927
- **Eiter & Mannila (1994)**: *Computing Discrete Fréchet Distance.* Technical Report CD-TR 94/64, Christian Doppler Laboratory, TU Vienna.

## 3. Kinematic Proximity & Collision Risk (DCPA / TCPA)
- **AIS Maritime Survey (2016)**: *Exploiting AIS Data for Intelligent Maritime Navigation: A Comprehensive Survey.* arXiv:1606.00981.
- **Track Association (2010)**: *A Spatio-temporal Track Association Algorithm Based on Marine Vessel Automatic Identification System Data.* arXiv:2010.15921.

## 4. Drift Backtracking & Oil Weathering
- **Dagestad, K.-F. et al. (2018)**: *OpenDrift v1.0: a generic framework for trajectory modelling.* Geoscientific Model Development, 11, 1405–1420. https://doi.org/10.5194/gmd-11-1405-2018
- **Beegle-Krause, C.J. (2001)**: *General NOAA Oil Modeling Environment (GNOME): A New Spill Trajectory Model.* IOSC 2001 Proceedings.
- **Galt, J.A. (1998)**: *Uncertainty Analysis Related to Oil Spill Modeling.* Spill Science & Technology, 4(4):231–238.

## 5. AIS Data Source
- **NOAA Office for Coastal Management**: *Marine Cadastre AIS Vessel Traffic Data.* https://hub.marinecadastre.gov/pages/vesseltraffic
"""


def write_investigation_bundle(
    investigation_id: str,
    input_data: Dict[str, Any],
    config_dict: Dict[str, Any],
    regime_decision: Dict[str, Any],
    reconstructed_df: pd.DataFrame,
    candidates_df: pd.DataFrame,
    scores_df: pd.DataFrame,
    slick_coords: Optional[np.ndarray],
    origin_estimate: Optional[Any],
    output_base_dir: Path,
) -> Path:
    """
    Writes the complete reproducible investigation bundle to disk (§4, §20).
    """
    bundle_dir = output_base_dir / investigation_id
    maps_dir = bundle_dir / "maps"
    figures_dir = bundle_dir / "figures"

    bundle_dir.mkdir(parents=True, exist_ok=True)
    maps_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)

    # 1. input.json
    (bundle_dir / "input.json").write_text(json.dumps(input_data, indent=2, default=str), encoding="utf-8")

    # 2. config_snapshot.yaml
    (bundle_dir / "config_snapshot.yaml").write_text(yaml.dump(config_dict, sort_keys=False), encoding="utf-8")

    # 3. regime_decision.json
    (bundle_dir / "regime_decision.json").write_text(json.dumps(regime_decision, indent=2, default=str), encoding="utf-8")

    # 4. Parquet artifacts (§4.1 - §4.4)
    if not candidates_df.empty:
        candidates_df.to_parquet(bundle_dir / "candidates.parquet")
    else:
        pd.DataFrame().to_parquet(bundle_dir / "candidates.parquet")

    if not reconstructed_df.empty:
        reconstructed_df.to_parquet(bundle_dir / "reconstructed_tracks.parquet")
    else:
        pd.DataFrame().to_parquet(bundle_dir / "reconstructed_tracks.parquet")

    if not scores_df.empty:
        scores_df.to_parquet(bundle_dir / "attribution_scores.parquet")
    else:
        pd.DataFrame().to_parquet(bundle_dir / "attribution_scores.parquet")

    # 5. attribution.json (§4.5 schema)
    cand_list = []
    ranking_method_used = config_dict.get("attribution", {}).get("ranking_method", "borda_count")
    if not scores_df.empty:
        for _, row in scores_df.iterrows():
            frechet_val = float(row["frechet_km"]) if pd.notna(row.get("frechet_km")) else None
            ff_val = float(row["forward_fit_score"]) if pd.notna(row.get("forward_fit_score")) else None
            post_val = float(row["evidence_posterior"]) if pd.notna(row.get("evidence_posterior")) else None
            top_val = float(row["topsis_score"]) if pd.notna(row.get("topsis_score")) else None

            not_app = []
            if frechet_val is None:
                not_app.append("frechet_parity (amorphous or non-streak slick geometry)")

            expl = []
            if frechet_val is not None:
                expl.append(f"Fréchet parity distance of {frechet_val:.2f} km against slick geometry")
            else:
                expl.append("Fréchet parity not applicable for this slick geometry")

            expl.append(f"Closest kinematic approach (DCPA) of {row['dcpa_km']:.2f} km at {row['tcpa_minutes']:+.1f} min")
            expl.append(f"{row['coverage_completeness']*100:.1f}% real AIS points (un-interpolated) in observation window")
            if ff_val is not None:
                expl.append(f"Forward-fit trajectory recreation score: {ff_val:.2f}")

            cand_item: Dict[str, Any] = {
                "rank": int(row["final_rank"]),
                "mmsi": int(row["mmsi"]),
                "vessel_name": str(row["vessel_name"]),
                "evidence": {
                    "frechet_km": frechet_val,
                    "dcpa_km": float(row["dcpa_km"]),
                    "tcpa_minutes": float(row["tcpa_minutes"]),
                    "coverage_completeness": float(row["coverage_completeness"]),
                    "forward_fit_score": ff_val,
                    "evidence_posterior": post_val,
                    "topsis_score": top_val,
                },
                "not_applicable_channels": not_app,
                "borda_score": int(row.get("borda_score", 0)),
                "confidence_score": float(row.get("confidence_score", 0.0)),
                "confidence_label": str(row.get("confidence_label", "UNKNOWN")),
                "explanation": expl,
            }
            if "provenance" in row and isinstance(row["provenance"], dict):
                cand_item["provenance"] = row["provenance"]
            cand_list.append(cand_item)

    attribution_json_data: Dict[str, Any] = {
        "investigation_id": investigation_id,
        "input": input_data,
        "ranking_method": ranking_method_used,
        "is_abstained": bool(regime_decision.get("is_abstained", False)),
        "abstention_reason": regime_decision.get("abstention_reason"),
        "candidates": cand_list,
        "caveats": [
            "This is a candidate association based on available AIS data, not proof of responsibility.",
            "AIS coverage is incomplete; a non-broadcasting ('dark') vessel cannot be ruled out.",
            "Evidence posteriors (when LLR enabled) are calibrated on synthetic simulation cases for decision support.",
        ],
    }

    if regime_decision.get("regime") == "delayed" and origin_estimate is not None:
        attribution_json_data["origin_estimate"] = {
            "method": "opendrift_openoil_backtrack",
            "best_guess_lat": getattr(origin_estimate, "best_guess_lat", None),
            "best_guess_lon": getattr(origin_estimate, "best_guess_lon", None),
            "best_guess_region_geojson": getattr(origin_estimate, "best_guess_geojson", {}),
            "minimum_regret_region_geojson": getattr(origin_estimate, "minimum_regret_geojson", {}),
            "note": getattr(origin_estimate, "note", ""),
        }

    (bundle_dir / "attribution.json").write_text(json.dumps(attribution_json_data, indent=2, default=str), encoding="utf-8")

    # 6. sources.md
    (bundle_dir / "sources.md").write_text(SOURCES_MD_CONTENT, encoding="utf-8")

    # 7. methodology.md (dynamic run report)
    methodology_text = f"""# Methodology for this investigation

Generated: {datetime.now(timezone.utc).isoformat()}
Config snapshot: see `config_snapshot.yaml` in this bundle.

## Regime Classification
Decision: **{regime_decision.get('regime')}**
Rationale: {regime_decision.get('rationale')}
*Note: This classification follows an explicit engineering rule (see sources.md).*

## Attribution Method
Ranking method used: `{config_dict.get('attribution', {}).get('ranking_method', 'borda_count')}`
Metrics:
- Discrete Fréchet distance (curve shape parity)
- DCPA / TCPA (kinematic closest point of approach and time offset)
- AIS coverage completeness discount (applied once to confidence score)

*No peer-reviewed formula exists for combining these into a single attribution probability; see sources.md for scientific foundations.*
"""
    (bundle_dir / "methodology.md").write_text(methodology_text, encoding="utf-8")

    # 8. Interactive Map
    map_path = maps_dir / "attribution_map.html"
    generate_attribution_map(
        spill_lat=float(input_data.get("lat", 0.0)),
        spill_lon=float(input_data.get("lon", 0.0)),
        spread_km=float(input_data.get("spread_km", 10.0)),
        slick_coords=slick_coords,
        reconstructed_df=reconstructed_df,
        scores_df=scores_df,
        output_html_path=map_path,
        origin_estimate=origin_estimate,
    )

    # 9. Final HTML Report (Classic Dashboard)
    report_path = bundle_dir / "final_report.html"
    generate_html_report(
        investigation_id=investigation_id,
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=scores_df,
        origin_estimate=attribution_json_data.get("origin_estimate"),
        map_rel_path="maps/attribution_map.html",
        output_html_path=report_path,
    )

    # 10. Additional Forensic Workstation Dashboard (Senior UX Audit Preview)
    workstation_path = bundle_dir / "workstation.html"
    generate_workstation_dashboard(
        investigation_id=investigation_id,
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=scores_df,
        reconstructed_df=reconstructed_df,
        slick_coords=slick_coords,
        origin_estimate=origin_estimate,
        output_html_path=workstation_path,
    )

    # 11. Standalone 3D Reconstruction Studio (Maritime Forensics // 3D Reconstruction)
    recon_3d_path = bundle_dir / "reconstruction_3d.html"
    generate_reconstruction_3d_dashboard(
        investigation_id=investigation_id,
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=scores_df,
        reconstructed_df=reconstructed_df,
        slick_coords=slick_coords,
        origin_estimate=origin_estimate,
        output_html_path=recon_3d_path,
    )

    # 12. Standalone 3D Reconstruction Studio v2 (Forensics Workspace v2)
    recon_3d_v2_path = bundle_dir / "reconstruction_3d_v2.html"
    generate_reconstruction_3d_v2_dashboard(
        investigation_id=investigation_id,
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=scores_df,
        reconstructed_df=reconstructed_df,
        slick_coords=slick_coords,
        origin_estimate=origin_estimate,
        output_html_path=recon_3d_v2_path,
    )

    # 13. AI-Assisted Maritime Forensics Workstation v3
    recon_3d_v3_path = bundle_dir / "reconstruction_3d_v3.html"
    generate_reconstruction_3d_v3_dashboard(
        investigation_id=investigation_id,
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=scores_df,
        reconstructed_df=reconstructed_df,
        slick_coords=slick_coords,
        origin_estimate=origin_estimate,
        output_html_path=recon_3d_v3_path,
    )

    return bundle_dir