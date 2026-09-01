"""Unit tests for bundle writer and report generation."""

import datetime
import json
from pathlib import Path
import pandas as pd

from ais_oil_attribution.reporting.bundle_writer import write_investigation_bundle
from tests.fixtures.synthetic_tracks import create_synthetic_ais_tracks, create_synthetic_slick


def test_write_investigation_bundle_creates_all_artifacts(tmp_path: Path):
    inv_id = "test_investigation_001"
    input_data = {
        "lat": 28.0,
        "lon": -88.0,
        "time_utc": "2024-08-06T12:00:00Z",
        "spread_km": 10.0,
        "regime": "contemporaneous",
    }
    config = {
        "attribution": {"ranking_method": "borda_count"},
        "confidence_labels": {"high_min_score": 0.75, "medium_min_score": 0.40},
    }
    regime_decision = {
        "regime": "contemporaneous",
        "rationale": "Direct observation test",
        "requires_confirmation": False,
    }

    df_recon = create_synthetic_ais_tracks()
    df_recon["is_interpolated"] = False
    df_recon["interpolation_method"] = "none"
    df_recon["gap_before_seconds"] = 0.0

    df_cand = pd.DataFrame([
        {"mmsi": 111111111, "vessel_name": "MATCH_VESSEL", "n_points": 15, "n_interpolated_points": 0, "coverage_completeness": 1.0, "hausdorff_km": 1.2, "passed_prefilter": True}
    ])

    df_scores = pd.DataFrame([
        {
            "mmsi": 111111111,
            "vessel_name": "MATCH_VESSEL",
            "frechet_km": 0.8,
            "dcpa_km": 0.5,
            "tcpa_minutes": -2.0,
            "coverage_completeness": 1.0,
            "rank_frechet": 1,
            "rank_dcpa": 1,
            "rank_tcpa": 1,
            "borda_score": 3,
            "final_rank": 1,
            "confidence_score": 0.95,
            "confidence_label": "HIGH",
        }
    ])

    slick_coords = create_synthetic_slick()

    bundle_path = write_investigation_bundle(
        investigation_id=inv_id,
        input_data=input_data,
        config_dict=config,
        regime_decision=regime_decision,
        reconstructed_df=df_recon,
        candidates_df=df_cand,
        scores_df=df_scores,
        slick_coords=slick_coords,
        origin_estimate=None,
        output_base_dir=tmp_path,
    )

    # Verify all expected artifacts exist in bundle
    assert (bundle_path / "input.json").exists()
    assert (bundle_path / "config_snapshot.yaml").exists()
    assert (bundle_path / "regime_decision.json").exists()
    assert (bundle_path / "candidates.parquet").exists()
    assert (bundle_path / "reconstructed_tracks.parquet").exists()
    assert (bundle_path / "attribution_scores.parquet").exists()
    assert (bundle_path / "attribution.json").exists()
    assert (bundle_path / "methodology.md").exists()
    assert (bundle_path / "sources.md").exists()
    assert (bundle_path / "maps" / "attribution_map.html").exists()
    assert (bundle_path / "final_report.html").exists()

    # Verify attribution.json content schema
    attr_json = json.loads((bundle_path / "attribution.json").read_text(encoding="utf-8"))
    assert attr_json["investigation_id"] == inv_id
    assert len(attr_json["candidates"]) == 1
    assert attr_json["candidates"][0]["mmsi"] == 111111111