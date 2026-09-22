"""Unit tests for the modular 4-stage case_experience reporting module."""

from pathlib import Path
from unittest.mock import patch

import pandas as pd

from ais_oil_attribution.reporting.bundle_writer import write_investigation_bundle
from ais_oil_attribution.reporting.case_experience import generate_case_experience
from tests.fixtures.synthetic_tracks import (
    create_synthetic_ais_tracks,
    create_synthetic_slick,
)


def _create_sample_payload():
    input_data = {
        "lat": 28.0,
        "lon": -88.0,
        "time_utc": "2024-08-06 12:00:00 UTC",
        "spread_km": 10.0,
        "regime": "contemporaneous",
        "regime_confirmed_by_user": True,
    }
    regime_decision = {
        "regime": "contemporaneous",
        "rationale": "Direct satellite observation",
        "is_abstained": False,
        "abstention_reason": None,
    }
    df_recon = create_synthetic_ais_tracks()
    df_scores = pd.DataFrame([
        {
            "mmsi": 111111111,
            "vessel_name": "MATCH_VESSEL",
            "frechet_km": 0.8,
            "dcpa_km": 0.5,
            "tcpa_minutes": -2.0,
            "coverage_completeness": 0.95,
            "forward_fit_score": 0.88,
            "evidence_posterior": 0.92,
            "topsis_score": 0.89,
            "borda_score": 18,
            "final_rank": 1,
            "confidence_score": 0.895,
            "confidence_label": "HIGH",
        },
        {
            "mmsi": 222222222,
            "vessel_name": "DISTANT_VESSEL",
            "frechet_km": 8.5,
            "dcpa_km": 12.0,
            "tcpa_minutes": 45.0,
            "coverage_completeness": 0.70,
            "forward_fit_score": 0.12,
            "evidence_posterior": 0.08,
            "topsis_score": 0.15,
            "borda_score": 5,
            "final_rank": 2,
            "confidence_score": 0.320,
            "confidence_label": "LOW",
        },
    ])
    slick_coords = create_synthetic_slick()
    return input_data, regime_decision, df_recon, df_scores, slick_coords


def test_generate_case_experience_emits_modular_folder(tmp_path: Path):
    """Verifies that generate_case_experience outputs modular files and redirect entrypoint."""
    input_data, regime_decision, df_recon, df_scores, slick_coords = _create_sample_payload()
    out_file = tmp_path / "case_experience.html"

    # Pre-create sample reconstruction_3d_v3.html and workstation.html in tmp_path
    (tmp_path / "reconstruction_3d_v3.html").write_text("<!DOCTYPE html><html><head><title>3D</title></head><body>3D Content</body></html>", encoding="utf-8")
    (tmp_path / "workstation.html").write_text("<!DOCTYPE html><html><head><title>2D</title></head><body>2D Content</body></html>", encoding="utf-8")

    res_path = generate_case_experience(
        investigation_id="inv_test_direct",
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=df_scores,
        reconstructed_df=df_recon,
        slick_coords=slick_coords,
        origin_estimate=None,
        output_html_path=out_file,
    )
    assert res_path.exists()

    case_exp_dir = tmp_path / "case_experience"
    assert case_exp_dir.exists()
    assert (case_exp_dir / "index.html").exists()
    assert (case_exp_dir / "styles.css").exists()
    assert (case_exp_dir / "app.js").exists()
    assert (case_exp_dir / "case-data.js").exists()
    assert (case_exp_dir / "case-data.json").exists()
    assert (case_exp_dir / "reconstruction-styled.html").exists()
    assert (case_exp_dir / "workstation-styled.html").exists()
    assert out_file.exists()

    # Check that reconstruction-styled.html has the theme token patch
    recon_styled = (case_exp_dir / "reconstruction-styled.html").read_text(encoding="utf-8")
    assert "wake-design-token-patch" in recon_styled

    # Verify 4 stages in index.html
    html = (case_exp_dir / "index.html").read_text(encoding="utf-8")
    assert 'id="stage-intro"' in html
    assert 'id="stage-input"' in html
    assert 'id="stage-report"' in html
    assert 'id="stage-reconstruction"' in html

    # Verify Stage 04 iframes for 3D and 2D
    assert 'id="recon-iframe-3d"' in html
    assert 'src="reconstruction-styled.html"' in html
    assert 'id="recon-iframe-2d"' in html
    assert 'src="workstation-styled.html"' in html
    assert "switchReconView" in html

    # Verify case-data.js contains valid global data
    js_content = (case_exp_dir / "case-data.js").read_text(encoding="utf-8")
    assert "window.WAKE_CASE_DATA =" in js_content


def test_design_md_token_system_and_buttons(tmp_path: Path):
    """Verifies that styles.css adheres to the exact DESIGN.md tokens and button specs."""
    input_data, regime_decision, df_recon, df_scores, slick_coords = _create_sample_payload()
    out_file = tmp_path / "case_experience.html"

    generate_case_experience(
        investigation_id="inv_test_tokens",
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=df_scores,
        reconstructed_df=df_recon,
        slick_coords=slick_coords,
        origin_estimate=None,
        output_html_path=out_file,
    )

    css = (tmp_path / "case_experience" / "styles.css").read_text(encoding="utf-8")

    # Verify exact colors and role allocations from DESIGN.md
    assert "--surface: #14121b;" in css
    assert "--primary-container: #7c3aed;" in css
    assert "--base-deep-space: #09080E;" in css
    assert "--primary-violet-core: #7C3AED;" in css
    assert "--geospatial-cyan: #38BDF8;" in css
    assert "--anomaly-rose: #F43F5E;" in css
    assert "--verified-emerald: #10B981;" in css

    # Verify button component specs
    assert ".btn-primary" in css
    assert ".btn-secondary" in css
    assert ".btn-destructive" in css
    assert "height: 40px;" in css
    assert "height: 32px;" in css
    assert "border-radius: var(--rounded-default);" in css

    # Verify smooth scroll and prefers-reduced-motion
    assert "scroll-behavior: smooth;" in css
    assert "prefers-reduced-motion: reduce" in css


def test_provenance_tiers_and_disclaimers(tmp_path: Path):
    """Verifies that the three provenance tiers and legal disclaimers are present in app.js and HTML."""
    input_data, regime_decision, df_recon, df_scores, slick_coords = _create_sample_payload()
    out_file = tmp_path / "case_experience.html"

    generate_case_experience(
        investigation_id="inv_test_provenance",
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=df_scores,
        reconstructed_df=df_recon,
        slick_coords=slick_coords,
        origin_estimate=None,
        output_html_path=out_file,
    )

    html = (tmp_path / "case_experience" / "index.html").read_text(encoding="utf-8")
    app_js = (tmp_path / "case_experience" / "app.js").read_text(encoding="utf-8")

    # Three provenance tiers in app.js / html
    assert "Tier 1 // Observed" in app_js
    assert "Tier 2 // Derived" in app_js
    assert "Tier 3 // Inference" in app_js

    # Semantic graphics in Stage 01
    assert "node-observed" in html
    assert "node-derived" in html
    assert "node-inference" in html

    # Disclaimers carried forward
    assert "Dark-Vessel Caveat" in html
    assert "Attribution Is Decision-Support" in html
    assert "Borda Score Notice" in html


def test_bundle_writer_emits_case_experience(tmp_path: Path):
    """Verifies write_investigation_bundle emits case_experience folder and artifacts."""
    input_data, regime_decision, df_recon, df_scores, slick_coords = _create_sample_payload()
    cfg = {
        "reporting": {"emit_case_experience": True},
        "attribution": {"ranking_method": "borda_count"},
    }

    bundle = write_investigation_bundle(
        investigation_id="inv_bundle_test",
        input_data=input_data,
        config_dict=cfg,
        regime_decision=regime_decision,
        reconstructed_df=df_recon,
        candidates_df=pd.DataFrame([{"mmsi": 111111111}]),
        scores_df=df_scores,
        slick_coords=slick_coords,
        origin_estimate=None,
        output_base_dir=tmp_path,
    )

    # All existing and new outputs exist
    assert (bundle / "final_report.html").exists()
    assert (bundle / "workstation.html").exists()
    assert (bundle / "reconstruction_3d_v3.html").exists()
    assert (bundle / "case_experience" / "index.html").exists()
    assert (bundle / "case_experience" / "reconstruction-styled.html").exists()
    assert (bundle / "case_experience" / "workstation-styled.html").exists()


def test_bundle_writer_flag_disables_case_experience(tmp_path: Path):
    """Verifies that reporting.emit_case_experience: False disables case_experience cleanly."""
    input_data, regime_decision, df_recon, df_scores, slick_coords = _create_sample_payload()
    cfg = {
        "reporting": {"emit_case_experience": False},
        "attribution": {"ranking_method": "borda_count"},
    }

    bundle = write_investigation_bundle(
        investigation_id="inv_bundle_disabled",
        input_data=input_data,
        config_dict=cfg,
        regime_decision=regime_decision,
        reconstructed_df=df_recon,
        candidates_df=pd.DataFrame([{"mmsi": 111111111}]),
        scores_df=df_scores,
        slick_coords=slick_coords,
        origin_estimate=None,
        output_base_dir=tmp_path,
    )

    assert (bundle / "final_report.html").exists()
    assert (bundle / "reconstruction_3d_v3.html").exists()
    assert not (bundle / "case_experience").exists()


def test_case_experience_exception_does_not_fail_bundle(tmp_path: Path):
    """Verifies that if generate_case_experience raises, bundle generation still succeeds."""
    input_data, regime_decision, df_recon, df_scores, slick_coords = _create_sample_payload()
    cfg = {
        "reporting": {"emit_case_experience": True},
        "attribution": {"ranking_method": "borda_count"},
    }

    with patch(
        "ais_oil_attribution.reporting.case_experience.generate_case_experience",
        side_effect=RuntimeError("Simulated internal rendering failure"),
    ):
        bundle = write_investigation_bundle(
            investigation_id="inv_bundle_exception",
            input_data=input_data,
            config_dict=cfg,
            regime_decision=regime_decision,
            reconstructed_df=df_recon,
            candidates_df=pd.DataFrame([{"mmsi": 111111111}]),
            scores_df=df_scores,
            slick_coords=slick_coords,
            origin_estimate=None,
            output_base_dir=tmp_path,
        )

        assert (bundle / "final_report.html").exists()
        assert (bundle / "workstation.html").exists()
        assert (bundle / "reconstruction_3d_v3.html").exists()
        assert (bundle / "attribution.json").exists()


def test_empty_candidates_handled_gracefully(tmp_path: Path):
    """Verifies that an investigation with 0 candidates renders an honest empty state."""
    input_data, regime_decision, _df_recon, _, slick_coords = _create_sample_payload()
    empty_scores = pd.DataFrame()
    out_file = tmp_path / "case_experience.html"

    generate_case_experience(
        investigation_id="inv_test_empty",
        input_data=input_data,
        regime_decision=regime_decision,
        scores_df=empty_scores,
        reconstructed_df=pd.DataFrame(),
        slick_coords=slick_coords,
        origin_estimate=None,
        output_html_path=out_file,
    )

    html = (tmp_path / "case_experience" / "index.html").read_text(encoding="utf-8")
    assert "NO CANDIDATES SCREENED" in html


def test_abstained_state_handled_gracefully(tmp_path: Path):
    """Verifies that an abstained run displays the abstention reason clearly."""
    input_data, _, df_recon, df_scores, slick_coords = _create_sample_payload()
    abstained_decision = {
        "regime": "delayed",
        "rationale": "High drift dispersion",
        "is_abstained": True,
        "abstention_reason": "Candidate posteriors below decision threshold",
    }
    out_file = tmp_path / "case_experience.html"

    generate_case_experience(
        investigation_id="inv_test_abstained",
        input_data=input_data,
        regime_decision=abstained_decision,
        scores_df=df_scores,
        reconstructed_df=df_recon,
        slick_coords=slick_coords,
        origin_estimate=None,
        output_html_path=out_file,
    )

    html = (tmp_path / "case_experience" / "index.html").read_text(encoding="utf-8")
    assert "ABSTAINED" in html
    assert "Candidate posteriors below decision threshold" in html
