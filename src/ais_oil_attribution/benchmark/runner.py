"""Benchmark runner for WAKE attribution validation and ranking comparison."""

from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import numpy as np
import pandas as pd

from ais_oil_attribution.attribution.confidence import calculate_confidence_score, determine_confidence_label
from ais_oil_attribution.attribution.forward_fit import evaluate_forward_fit
from ais_oil_attribution.attribution.geometry import frechet_km, hausdorff_km
from ais_oil_attribution.attribution.llr import LLRCalibratedRanker
from ais_oil_attribution.attribution.proximity import calculate_dcpa_tcpa
from ais_oil_attribution.attribution.ranking import borda_rank, topsis_rank
from ais_oil_attribution.benchmark.ais_validation import run_ais_reconstruction_validation
from ais_oil_attribution.benchmark.metrics import (
    bootstrap_ci,
    compute_brier_score,
    compute_expected_calibration_error,
    compute_mrr,
    compute_ndcg_at_k,
    compute_ranker_agreement,
)
from ais_oil_attribution.benchmark.redundancy import compute_channel_correlation_matrix, compute_vif
from ais_oil_attribution.benchmark.sensitivity import evaluate_perturbation_stability
from ais_oil_attribution.benchmark.synthetic_generator import generate_synthetic_benchmark_case
from ais_oil_attribution.drift.analytic import AnalyticDriftModel
from ais_oil_attribution.processing.trajectory_reconstruction import reconstruct_candidate_trajectories


def run_attribution_pipeline_on_synthetic_case(
    case_input: Dict[str, Any],
    ranking_method: str = "borda",
    include_forward_fit: bool = True,
    drift_model: Optional[AnalyticDriftModel] = None,
) -> Dict[str, Any]:
    """Executes the complete attribution pipeline on a synthetic case input (NO ground truth leakage)."""
    spill_lat = float(case_input["lat"])
    spill_lon = float(case_input["lon"])
    spill_time = pd.to_datetime(case_input["time_utc"]).to_pydatetime()
    spread_km = float(case_input["spread_km"])
    raw_tracks_df = case_input["candidate_tracks_df"]
    slick_coords = case_input.get("slick_coords")

    if drift_model is None:
        drift_model = AnalyticDriftModel(seed=42)

    # 1. Trajectory Reconstruction
    recon_df = reconstruct_candidate_trajectories(raw_tracks_df)

    # 2. Extract Candidates and Evidence
    candidates_list = []
    for mmsi, group in recon_df.groupby("mmsi"):
        g_sorted = group.sort_values("timestamp")
        v_name = str(g_sorted.iloc[0].get("vessel_name", f"VESSEL_{mmsi}"))
        n_pts = len(g_sorted)
        n_interp = int(g_sorted["is_interpolated"].sum()) if "is_interpolated" in g_sorted.columns else 0
        coverage = float(1.0 - (n_interp / max(1, n_pts)))

        # DCPA / TCPA
        dcpa_km, tcpa_min = calculate_dcpa_tcpa(
            vessel_track_df=g_sorted,
            slick_lat=spill_lat,
            slick_lon=spill_lon,
            obs_time=spill_time,
        )

        # Fréchet (only if streak geometry is available)
        frechet_dist = np.nan
        if slick_coords is not None and len(slick_coords) >= 3:
            track_pts = g_sorted[["lat", "lon"]].to_numpy()
            frechet_dist = frechet_km(track_pts, slick_coords)

        # Forward-Fit
        ff_score = 0.0
        ff_chamfer = 50.0
        ff_provenance = {}
        if include_forward_fit:
            ff_res = evaluate_forward_fit(
                candidate_mmsi=int(mmsi),
                candidate_track_df=g_sorted,
                slick_coords=slick_coords,
                slick_center_lat=spill_lat,
                slick_center_lon=spill_lon,
                spread_km=spread_km,
                sar_observation_time=spill_time,
                drift_model=drift_model,
            )
            ff_score = ff_res.forward_fit_score
            ff_chamfer = ff_res.chamfer_distance_km
            ff_provenance = ff_res.provenance

        candidates_list.append({
            "mmsi": int(mmsi),
            "vessel_name": v_name,
            "dcpa_km": float(dcpa_km),
            "tcpa_minutes": float(tcpa_min),
            "frechet_km": float(frechet_dist) if not np.isnan(frechet_dist) else None,
            "forward_fit_score": float(ff_score),
            "chamfer_km": float(ff_chamfer),
            "coverage_completeness": float(coverage),
            "provenance": ff_provenance,
        })

    cand_df = pd.DataFrame(candidates_list)
    if cand_df.empty:
        return {"ranked_df": pd.DataFrame(), "is_abstained": True, "top_mmsi": None}

    # 3. Ranking
    method = ranking_method.lower().strip()
    is_abstained = False
    top_posterior = 1.0

    if method == "topsis":
        ranked_df = topsis_rank(cand_df)
    elif method == "llr":
        llr_ranker = LLRCalibratedRanker()
        llr_res = llr_ranker.rank(cand_df)
        ranked_df = llr_res.ranked_df
        is_abstained = llr_res.is_abstained
        top_posterior = llr_res.top_candidate_posterior
    else:
        ranked_df = borda_rank(cand_df)

    top_mmsi = int(ranked_df.iloc[0]["mmsi"]) if not ranked_df.empty else None

    return {
        "ranked_df": ranked_df,
        "is_abstained": is_abstained,
        "top_posterior": top_posterior,
        "top_mmsi": top_mmsi,
        "raw_candidates": candidates_list,
    }


def run_benchmark_suite(
    n_cases: int = 20,
    quick_mode: bool = False,
    output_dir: Optional[Path] = None,
    seed: int = 42,
) -> Dict[str, Any]:
    """Executes the complete offline WAKE validation benchmark across Borda, TOPSIS, and Calibrated LLR."""
    if quick_mode:
        n_cases = min(n_cases, 10)

    rng = np.random.default_rng(seed)
    scenarios = ["streak", "point", "intermittent", "dark_vessel", "negative_control"]

    cases = []
    for i in range(n_cases):
        scen = scenarios[i % len(scenarios)]
        diff = "easy" if i % 3 == 0 else ("medium" if i % 3 == 1 else "hard")
        c = generate_synthetic_benchmark_case(
            case_id=f"BENCH_CASE_{i+1:03d}",
            scenario_type=scen,
            difficulty=diff,
            slick_age_hours=float(rng.uniform(4.0, 16.0)),
            mismatch_level=float(rng.uniform(0.5, 1.5)),
            seed=seed + i * 7,
        )
        cases.append(c)

    methods = ["borda", "topsis", "llr"]
    method_metrics = {m: {"ranks": [], "top1": [], "top3": [], "abstained": [], "false_attrib": []} for m in methods}
    agreement_records = []
    all_candidate_scores = []
    calib_probs = []
    calib_labels = []

    for c in cases:
        true_mmsi = c.ground_truth["true_source_mmsi"]
        is_neg = c.ground_truth["is_negative_control"]
        is_dark = c.ground_truth["is_dark"]

        method_dfs = {}
        for m in methods:
            res = run_attribution_pipeline_on_synthetic_case(c.pipeline_input, ranking_method=m)
            ranked_df = res["ranked_df"]
            method_dfs[m] = ranked_df
            is_abstained = res["is_abstained"]
            top_mmsi = res["top_mmsi"]

            if not ranked_df.empty:
                for _, r in ranked_df.iterrows():
                    all_candidate_scores.append(r.to_dict())

            if is_neg or is_dark:
                # Negative control / Dark vessel: ground truth source is None
                method_metrics[m]["abstained"].append(1.0 if is_abstained else 0.0)
                # If pipeline did not abstain and picked a decoy with high confidence -> false attribution
                false_att = 1.0 if (not is_abstained and top_mmsi is not None) else 0.0
                method_metrics[m]["false_attrib"].append(false_att)
            else:
                # Positive control
                rank_true = None
                if true_mmsi is not None and not ranked_df.empty:
                    match_row = ranked_df[ranked_df["mmsi"] == true_mmsi]
                    if not match_row.empty:
                        rank_true = int(match_row.iloc[0]["final_rank"])

                method_metrics[m]["ranks"].append(rank_true)
                method_metrics[m]["top1"].append(1.0 if rank_true == 1 else 0.0)
                method_metrics[m]["top3"].append(1.0 if (rank_true is not None and rank_true <= 3) else 0.0)

                # Calibration records for LLR
                if m == "llr" and not ranked_df.empty:
                    for _, r in ranked_df.iterrows():
                        p = float(r.get("evidence_posterior", 0.0))
                        y = 1 if int(r["mmsi"]) == true_mmsi else 0
                        calib_probs.append(p)
                        calib_labels.append(y)

        # Ranker agreement on this case
        if not method_dfs["borda"].empty and not method_dfs["topsis"].empty:
            agr_bt = compute_ranker_agreement(method_dfs["borda"], method_dfs["topsis"])
            agreement_records.append(agr_bt)

    # Compute aggregate metrics per method
    summary_by_method = {}
    for m in methods:
        ranks = method_metrics[m]["ranks"]
        top1_vals = method_metrics[m]["top1"]
        top3_vals = method_metrics[m]["top3"]
        abst_vals = method_metrics[m]["abstained"]
        false_vals = method_metrics[m]["false_attrib"]

        top1_rate = float(np.mean(top1_vals)) if top1_vals else 0.0
        top3_rate = float(np.mean(top3_vals)) if top3_vals else 0.0
        mrr = compute_mrr(ranks)
        ndcg3 = compute_ndcg_at_k(ranks, k=3)
        ndcg5 = compute_ndcg_at_k(ranks, k=5)

        ci_top1 = bootstrap_ci(top1_vals, seed=seed)
        ci_top3 = bootstrap_ci(top3_vals, seed=seed)

        summary_by_method[m] = {
            "top1_accuracy": np.round(top1_rate, 3),
            "top1_ci_95": [np.round(ci_top1[0], 3), np.round(ci_top1[1], 3)],
            "top3_accuracy": np.round(top3_rate, 3),
            "top3_ci_95": [np.round(ci_top3[0], 3), np.round(ci_top3[1], 3)],
            "mrr": np.round(mrr, 3),
            "ndcg_at_3": np.round(ndcg3, 3),
            "ndcg_at_5": np.round(ndcg5, 3),
            "abstention_rate_negative_controls": np.round(float(np.mean(abst_vals)), 3) if abst_vals else 0.0,
            "false_attribution_rate": np.round(float(np.mean(false_vals)), 3) if false_vals else 0.0,
            "n_positive_cases": len(top1_vals),
            "n_negative_controls": len(abst_vals),
        }

    # Calibration evaluation
    brier = compute_brier_score(calib_probs, calib_labels)
    ece, ece_details = compute_expected_calibration_error(calib_probs, calib_labels)

    # Channel redundancy analysis
    corr_results = compute_channel_correlation_matrix(all_candidate_scores)
    vif_results = compute_vif(all_candidate_scores)

    # AIS Reconstruction validation
    ais_validation = run_ais_reconstruction_validation(n_trajectories=5 if quick_mode else 15, seed=seed)

    # Ranker agreement averages
    avg_kendall = float(np.mean([a["kendall_tau"] for a in agreement_records])) if agreement_records else 1.0
    avg_spearman = float(np.mean([a["spearman_rho"] for a in agreement_records])) if agreement_records else 1.0
    avg_top3_overlap = float(np.mean([a["top_k_overlap"] for a in agreement_records])) if agreement_records else 1.0

    final_report = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "total_cases_evaluated": len(cases),
        "quick_mode": quick_mode,
        "ranking_methods_comparison": summary_by_method,
        "ranker_agreement_borda_vs_topsis": {
            "mean_kendall_tau": np.round(avg_kendall, 3),
            "mean_spearman_rho": np.round(avg_spearman, 3),
            "mean_top3_overlap": np.round(avg_top3_overlap, 3),
        },
        "calibration_evaluation_llr": {
            "brier_score": np.round(brier, 4),
            "expected_calibration_error": np.round(ece, 4),
            "reliability_bins": ece_details.get("bins", []),
        },
        "channel_redundancy": {
            "correlation_matrix": corr_results,
            "vif_diagnosis": vif_results,
        },
        "ais_reconstruction_validation": ais_validation,
    }

    if output_dir:
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        (out_path / "benchmark_summary.json").write_text(json.dumps(final_report, indent=2), encoding="utf-8")

    return final_report
