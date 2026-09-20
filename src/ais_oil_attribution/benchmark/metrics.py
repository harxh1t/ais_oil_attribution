"""Attribution benchmark metrics, rank agreement, and calibration evaluation."""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from scipy.stats import kendalltau, spearmanr


def compute_mrr(ranks: List[Optional[int]]) -> float:
    """Computes Mean Reciprocal Rank (MRR)."""
    reciprocals = []
    for r in ranks:
        if r is not None and r > 0:
            reciprocals.append(1.0 / float(r))
        else:
            reciprocals.append(0.0)
    return float(np.mean(reciprocals)) if reciprocals else 0.0


def compute_ndcg_at_k(ranks: List[Optional[int]], k: int = 3) -> float:
    """Computes Normalized Discounted Cumulative Gain at rank k (NDCG@k)."""
    ndcgs = []
    for r in ranks:
        if r is not None and 1 <= r <= k:
            dcg = 1.0 / np.log2(r + 1)
            idcg = 1.0 / np.log2(2)  # Ideal DCG for single relevant item at rank 1
            ndcgs.append(dcg / idcg)
        else:
            ndcgs.append(0.0)
    return float(np.mean(ndcgs)) if ndcgs else 0.0


def bootstrap_ci(
    data: List[float],
    n_bootstraps: int = 1000,
    alpha: float = 0.05,
    seed: int = 42,
) -> Tuple[float, float]:
    """Computes deterministic non-parametric bootstrap confidence interval (default 95%)."""
    if not data:
        return (0.0, 0.0)
    arr = np.array(data)
    if len(arr) == 1:
        return (float(arr[0]), float(arr[0]))

    rng = np.random.default_rng(seed)
    boot_means = np.empty(n_bootstraps)
    for i in range(n_bootstraps):
        sample = rng.choice(arr, size=len(arr), replace=True)
        boot_means[i] = np.mean(sample)

    low_pct = 100.0 * (alpha / 2.0)
    high_pct = 100.0 * (1.0 - alpha / 2.0)
    return (float(np.percentile(boot_means, low_pct)), float(np.percentile(boot_means, high_pct)))


def compute_brier_score(probabilities: List[float], labels: List[int]) -> float:
    """Computes Brier Score: Mean squared error of calibrated probability predictions."""
    if not probabilities or not labels or len(probabilities) != len(labels):
        return 0.0
    p = np.array(probabilities)
    y = np.array(labels)
    return float(np.mean((p - y) ** 2))


def compute_expected_calibration_error(
    probabilities: List[float],
    labels: List[int],
    n_bins: int = 5,
) -> Tuple[float, Dict[str, Any]]:
    """Computes Expected Calibration Error (ECE) and reliability diagram bin statistics."""
    if not probabilities or not labels or len(probabilities) != len(labels):
        return 0.0, {}

    p = np.array(probabilities)
    y = np.array(labels)

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    bin_stats = []

    for b in range(n_bins):
        low, high = bin_edges[b], bin_edges[b + 1]
        mask = (p >= low) & (p <= high if b == n_bins - 1 else p < high)
        n_in_bin = int(np.sum(mask))

        if n_in_bin > 0:
            avg_pred = float(np.mean(p[mask]))
            avg_actual = float(np.mean(y[mask]))
            weight = n_in_bin / len(p)
            ece += weight * abs(avg_pred - avg_actual)

            bin_stats.append({
                "bin_range": f"[{low:.1f}, {high:.1f}]",
                "count": n_in_bin,
                "avg_confidence": avg_pred,
                "empirical_accuracy": avg_actual,
                "calibration_gap": abs(avg_pred - avg_actual),
            })
        else:
            bin_stats.append({
                "bin_range": f"[{low:.1f}, {high:.1f}]",
                "count": 0,
                "avg_confidence": 0.0,
                "empirical_accuracy": 0.0,
                "calibration_gap": 0.0,
            })

    return float(ece), {"bins": bin_stats, "n_samples": len(p)}


def compute_ranker_agreement(
    ranked_df_a: pd.DataFrame,
    ranked_df_b: pd.DataFrame,
    k: int = 3,
) -> Dict[str, float]:
    """Computes rank correlation and Top-K overlap between two ranking methods."""
    if ranked_df_a.empty or ranked_df_b.empty:
        return {"kendall_tau": 0.0, "spearman_rho": 0.0, "top_k_overlap": 0.0}

    common_mmsi = set(ranked_df_a["mmsi"]).intersection(set(ranked_df_b["mmsi"]))
    if len(common_mmsi) < 2:
        return {"kendall_tau": 1.0, "spearman_rho": 1.0, "top_k_overlap": 1.0}

    mmsi_list = list(common_mmsi)
    ranks_a = [int(ranked_df_a.loc[ranked_df_a["mmsi"] == m, "final_rank"].values[0]) for m in mmsi_list]
    ranks_b = [int(ranked_df_b.loc[ranked_df_b["mmsi"] == m, "final_rank"].values[0]) for m in mmsi_list]

    tau, _ = kendalltau(ranks_a, ranks_b)
    rho, _ = spearmanr(ranks_a, ranks_b)

    # Top-K overlap
    top_k_a = set(ranked_df_a.nsmallest(k, "final_rank")["mmsi"])
    top_k_b = set(ranked_df_b.nsmallest(k, "final_rank")["mmsi"])
    overlap = len(top_k_a.intersection(top_k_b)) / float(k)

    return {
        "kendall_tau": float(tau) if not np.isnan(tau) else 0.0,
        "spearman_rho": float(rho) if not np.isnan(rho) else 0.0,
        "top_k_overlap": float(overlap),
    }
