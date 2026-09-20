"""Multi-method candidate ranking engine (Borda Count, TOPSIS, and Calibrated LLR)."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from ais_oil_attribution.attribution.confidence import calculate_confidence_score, determine_confidence_label
from ais_oil_attribution.attribution.topsis import topsis_rank
from ais_oil_attribution.attribution.llr import LLRCalibratedRanker, CalibratedLLRResult


def borda_rank(
    candidates_df: pd.DataFrame,
    metrics_lower_is_better: Optional[List[str]] = None,
    metrics_abs_lower_is_better: Optional[List[str]] = None,
    metrics_higher_is_better: Optional[List[str]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> pd.DataFrame:
    """
    Combines parity, DCPA, TCPA, and optional forward-fit evidence using Borda count rank aggregation (§9.4).

    Avoids ad-hoc weighted sums that artificially equate km to minutes.
    """
    if candidates_df.empty:
        return candidates_df

    df = candidates_df.copy()
    n = len(df)

    if metrics_lower_is_better is None:
        metrics_lower_is_better = ["dcpa_km"]
        # Only include Fréchet if it is applicable / valid across candidates
        if "frechet_km" in df.columns and df["frechet_km"].notna().any() and not np.isinf(df["frechet_km"]).all():
            metrics_lower_is_better.append("frechet_km")

    if metrics_abs_lower_is_better is None:
        metrics_abs_lower_is_better = ["tcpa_minutes"]

    if metrics_higher_is_better is None:
        metrics_higher_is_better = []
        if "forward_fit_score" in df.columns and df["forward_fit_score"].notna().any():
            metrics_higher_is_better.append("forward_fit_score")

    if n == 1:
        df["rank_dcpa"] = 1
        df["rank_tcpa"] = 1
        if "frechet_km" in df.columns:
            df["rank_frechet"] = 1
        df["borda_score"] = len(metrics_lower_is_better) + len(metrics_abs_lower_is_better) + len(metrics_higher_is_better)
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
        if m in df.columns and df[m].notna().any():
            r_col = f"rank_{m.split('_')[0]}"
            df[r_col] = df[m].rank(method="dense", ascending=True, na_option="bottom").astype(int)
            rank_cols.append(r_col)

    for m in metrics_abs_lower_is_better:
        if m in df.columns and df[m].notna().any():
            r_col = f"rank_{m.split('_')[0]}"
            df[f"abs_{m}"] = df[m].abs()
            df[r_col] = df[f"abs_{m}"].rank(method="dense", ascending=True, na_option="bottom").astype(int)
            rank_cols.append(r_col)

    for m in metrics_higher_is_better:
        if m in df.columns and df[m].notna().any():
            r_col = f"rank_{m.split('_')[0]}"
            df[r_col] = df[m].rank(method="dense", ascending=False, na_option="bottom").astype(int)
            rank_cols.append(r_col)

    # Compute Borda score: sum of (N - rank + 1) across all metrics
    df["borda_score"] = 0
    for r_col in rank_cols:
        df["borda_score"] += (n - df[r_col] + 1)

    max_possible_borda = max(1, len(rank_cols) * n)

    # Sort descending by borda_score, breaking ties by coverage_completeness (ENGINEERING ASSUMPTION)
    sort_cols = ["borda_score", "coverage_completeness", "dcpa_km"]
    sort_asc = [False, False, True]
    if "forward_fit_score" in df.columns:
        sort_cols.insert(1, "forward_fit_score")
        sort_asc.insert(1, False)

    df = df.sort_values(by=sort_cols, ascending=sort_asc).reset_index(drop=True)
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


def rank_candidates(
    candidates_df: pd.DataFrame,
    method: str = "borda",
    config: Optional[Dict[str, Any]] = None,
) -> pd.DataFrame:
    """Master ranking interface supporting Borda Count (default), TOPSIS, and Calibrated LLR."""
    m = (method or "borda").lower().strip()

    if m == "topsis":
        return topsis_rank(candidates_df, config=config)
    elif m == "llr":
        llr_res = LLRCalibratedRanker().rank(candidates_df, config=config)
        return llr_res.ranked_df
    else:
        return borda_rank(candidates_df, config=config)