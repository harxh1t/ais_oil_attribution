"""Borda count rank aggregation and candidate scoring."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from ais_oil_attribution.attribution.confidence import calculate_confidence_score, determine_confidence_label


def borda_rank(
    candidates_df: pd.DataFrame,
    metrics_lower_is_better: List[str] = ["frechet_km", "dcpa_km"],
    metrics_abs_lower_is_better: List[str] = ["tcpa_minutes"],
    config: Optional[Dict[str, Any]] = None,
) -> pd.DataFrame:
    """
    Combines parity, DCPA, and TCPA evidence using Borda count rank aggregation (§9.4).

    Avoids ad-hoc weighted sums that artificially equate km to minutes.
    """
    if candidates_df.empty:
        return candidates_df

    df = candidates_df.copy()
    n = len(df)

    if n == 1:
        df["rank_frechet"] = 1
        df["rank_dcpa"] = 1
        df["rank_tcpa"] = 1
        df["borda_score"] = 3
        df["final_rank"] = 1
        df["confidence_score"] = float(0.5 + 0.5 * df.loc[0, "coverage_completeness"])
        cfg_labels = (config or {}).get("confidence_labels", {})
        h_min = cfg_labels.get("high_min_score", 0.75)
        m_min = cfg_labels.get("medium_min_score", 0.40)
        df["confidence_label"] = determine_confidence_label(df.loc[0, "confidence_score"], h_min, m_min)
        return df

    # Compute ranks for each metric
    rank_cols = []
    for m in metrics_lower_is_better:
        r_col = f"rank_{m.split('_')[0]}"
        df[r_col] = df[m].rank(method="dense", ascending=True).astype(int)
        rank_cols.append(r_col)

    for m in metrics_abs_lower_is_better:
        r_col = f"rank_{m.split('_')[0]}"
        df[f"abs_{m}"] = df[m].abs()
        df[r_col] = df[f"abs_{m}"].rank(method="dense", ascending=True).astype(int)
        rank_cols.append(r_col)

    # Compute Borda score: sum of (N - rank + 1) across all metrics
    df["borda_score"] = 0
    for r_col in rank_cols:
        df["borda_score"] += (n - df[r_col] + 1)

    max_possible_borda = len(rank_cols) * n

    # Sort descending by borda_score, breaking ties by coverage_completeness (ENGINEERING ASSUMPTION)
    df = df.sort_values(
        by=["borda_score", "coverage_completeness", "dcpa_km"],
        ascending=[False, False, True],
    ).reset_index(drop=True)

    df["final_rank"] = np.arange(1, n + 1)

    # Compute confidence scores
    cfg_labels = (config or {}).get("confidence_labels", {})
    h_min = cfg_labels.get("high_min_score", 0.75)
    m_min = cfg_labels.get("medium_min_score", 0.40)

    conf_scores = []
    conf_labels = []
    for idx, row in df.iterrows():
        c_score = calculate_confidence_score(row["borda_score"], max_possible_borda, row["coverage_completeness"])
        conf_scores.append(c_score)
        conf_labels.append(determine_confidence_label(c_score, h_min, m_min))

    df["confidence_score"] = conf_scores
    df["confidence_label"] = conf_labels

    # Clean up temporary abs columns
    for m in metrics_abs_lower_is_better:
        if f"abs_{m}" in df.columns:
            df = df.drop(columns=[f"abs_{m}"])

    return df