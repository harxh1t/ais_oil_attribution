"""TOPSIS (Technique for Order Preference by Similarity to Ideal Solution) ranker."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def topsis_rank(
    candidates_df: pd.DataFrame,
    lower_is_better: Optional[List[str]] = None,
    higher_is_better: Optional[List[str]] = None,
    weights: Optional[Dict[str, float]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> pd.DataFrame:
    """Ranks candidate vessels using transparent TOPSIS multi-criteria evaluation.

    Args:
        candidates_df: Candidate DataFrame with metric columns
        lower_is_better: Metrics where lower values indicate closer attribution (e.g. dcpa_km, tcpa_minutes, frechet_km)
        higher_is_better: Metrics where higher values indicate closer attribution (e.g. coverage_completeness, forward_fit_score)
        weights: Dictionary of channel weights (defaults to equal weighting)
        config: Optional pipeline config dict

    Returns:
        Ranked DataFrame with `topsis_score`, `final_rank`, `confidence_score`, `confidence_label`.
    """
    if candidates_df.empty:
        return candidates_df

    df = candidates_df.copy()
    n = len(df)

    if n == 1:
        df["topsis_score"] = 1.0
        df["borda_score"] = int(df.get("borda_score", 3))
        df["final_rank"] = 1
        df["confidence_score"] = float(0.5 + 0.5 * df.loc[0, "coverage_completeness"])
        df["confidence_label"] = "HIGH" if df.loc[0, "confidence_score"] >= 0.75 else "MEDIUM"
        return df

    if lower_is_better is None:
        lower_is_better = ["dcpa_km"]
        if "frechet_km" in df.columns and df["frechet_km"].notna().any():
            lower_is_better.append("frechet_km")
        if "tcpa_minutes" in df.columns:
            df["abs_tcpa_minutes"] = df["tcpa_minutes"].abs()
            lower_is_better.append("abs_tcpa_minutes")

    if higher_is_better is None:
        higher_is_better = ["coverage_completeness"]
        if "forward_fit_score" in df.columns and df["forward_fit_score"].notna().any():
            higher_is_better.append("forward_fit_score")

    # Filter available columns
    avail_lower = [c for c in lower_is_better if c in df.columns and df[c].notna().any()]
    avail_higher = [c for c in higher_is_better if c in df.columns and df[c].notna().any()]
    all_metrics = avail_lower + avail_higher

    if not all_metrics:
        # Fallback to borda
        from ais_oil_attribution.attribution.ranking import borda_rank
        return borda_rank(df, config=config)

    # Impute missing values with column median
    matrix = np.zeros((n, len(all_metrics)), dtype=np.float64)
    for j, col in enumerate(all_metrics):
        col_vals = df[col].to_numpy(dtype=np.float64)
        median_val = np.nanmedian(col_vals) if np.isnan(col_vals).any() else 0.0
        col_vals = np.where(np.isnan(col_vals), median_val, col_vals)
        matrix[:, j] = col_vals

    # Vector normalization: r_ij = x_ij / sqrt(sum x_kj^2)
    norms = np.sqrt(np.sum(matrix ** 2, axis=0))
    norms = np.where(norms == 0.0, 1.0, norms)
    norm_matrix = matrix / norms

    # Assign weights
    w_vec = np.ones(len(all_metrics), dtype=np.float64)
    if weights:
        for j, col in enumerate(all_metrics):
            w_vec[j] = weights.get(col, 1.0)
    w_vec = w_vec / np.sum(w_vec)
    weighted_matrix = norm_matrix * w_vec

    # Determine Ideal Positive (A+) and Ideal Negative (A-) solutions
    ideal_pos = np.zeros(len(all_metrics))
    ideal_neg = np.zeros(len(all_metrics))

    for j, col in enumerate(all_metrics):
        if col in avail_higher:
            ideal_pos[j] = np.max(weighted_matrix[:, j])
            ideal_neg[j] = np.min(weighted_matrix[:, j])
        else:
            ideal_pos[j] = np.min(weighted_matrix[:, j])
            ideal_neg[j] = np.max(weighted_matrix[:, j])

    # Euclidean distances to ideal solutions
    dist_pos = np.sqrt(np.sum((weighted_matrix - ideal_pos) ** 2, axis=1))
    dist_neg = np.sqrt(np.sum((weighted_matrix - ideal_neg) ** 2, axis=1))

    # Relative closeness to ideal solution: C_i = S_i- / (S_i+ + S_i-)
    denom = dist_pos + dist_neg
    closeness = np.where(denom == 0.0, 0.5, dist_neg / denom)

    df["topsis_score"] = closeness

    # Compute borda_score if not present for output compatibility
    if "borda_score" not in df.columns:
        df["borda_score"] = (closeness * 100).astype(int)

    # Sort descending by TOPSIS closeness
    df = df.sort_values(by=["topsis_score", "coverage_completeness"], ascending=[False, False]).reset_index(drop=True)
    df["final_rank"] = np.arange(1, n + 1)

    # Confidence calculation
    conf_scores = []
    conf_labels = []
    cfg_labels = (config or {}).get("confidence_labels", {})
    h_min = cfg_labels.get("high_min_score", 0.75)
    m_min = cfg_labels.get("medium_min_score", 0.40)

    for idx, row in df.iterrows():
        c_score = float(np.clip(row["topsis_score"] * (0.5 + 0.5 * row.get("coverage_completeness", 1.0)), 0.0, 1.0))
        conf_scores.append(c_score)
        label = "HIGH" if c_score >= h_min else ("MEDIUM" if c_score >= m_min else "LOW")
        conf_labels.append(label)

    df["confidence_score"] = conf_scores
    df["confidence_label"] = conf_labels

    if "abs_tcpa_minutes" in df.columns:
        df = df.drop(columns=["abs_tcpa_minutes"])

    return df
