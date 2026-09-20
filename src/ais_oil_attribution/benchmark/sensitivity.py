"""Sensitivity and robustness validation across spatial, temporal, and ensemble perturbations."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def evaluate_perturbation_stability(
    baseline_ranked_df: pd.DataFrame,
    perturbed_ranked_dfs: List[pd.DataFrame],
) -> Dict[str, float]:
    """Measures Top-1 preservation rate and rank stability under input perturbations."""
    if baseline_ranked_df.empty or not perturbed_ranked_dfs:
        return {"top1_stability": 1.0, "mean_rank_shift": 0.0, "top3_stability": 1.0}

    base_top1 = int(baseline_ranked_df.iloc[0]["mmsi"])
    base_top3 = set(baseline_ranked_df.nsmallest(min(3, len(baseline_ranked_df)), "final_rank")["mmsi"])

    top1_matches = 0
    top3_overlaps = []
    rank_shifts = []

    # Map baseline MMSI -> rank
    base_rank_map = dict(zip(baseline_ranked_df["mmsi"], baseline_ranked_df["final_rank"]))

    for p_df in perturbed_ranked_dfs:
        if p_df.empty:
            continue
        p_top1 = int(p_df.iloc[0]["mmsi"])
        if p_top1 == base_top1:
            top1_matches += 1

        p_top3 = set(p_df.nsmallest(min(3, len(p_df)), "final_rank")["mmsi"])
        top3_overlaps.append(len(base_top3.intersection(p_top3)) / float(max(1, len(base_top3))))

        # Calculate average rank displacement for top baseline candidates
        for mmsi, b_rank in base_rank_map.items():
            match_row = p_df[p_df["mmsi"] == mmsi]
            if not match_row.empty:
                p_rank = int(match_row.iloc[0]["final_rank"])
                rank_shifts.append(abs(p_rank - b_rank))

    n_runs = max(1, len(perturbed_ranked_dfs))
    return {
        "top1_stability": float(top1_matches / n_runs),
        "top3_stability": float(np.mean(top3_overlaps)) if top3_overlaps else 1.0,
        "mean_rank_shift": float(np.mean(rank_shifts)) if rank_shifts else 0.0,
    }
