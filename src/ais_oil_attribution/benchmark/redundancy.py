"""Diagnostic channel redundancy and correlation analysis (Correlation matrix & VIF)."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def compute_channel_correlation_matrix(
    scores_records: List[Dict[str, Any]],
    channels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Computes Pearson and Spearman correlation matrices across attribution evidence channels."""
    if not scores_records:
        return {"pearson": {}, "spearman": {}, "channels": []}

    df = pd.DataFrame(scores_records)
    if channels is None:
        channels = ["dcpa_km", "tcpa_minutes", "frechet_km", "coverage_completeness", "forward_fit_score"]

    # Filter available channels
    avail = [c for c in channels if c in df.columns and df[c].notna().sum() > 3]

    if len(avail) < 2:
        return {"pearson": {}, "spearman": {}, "channels": avail}

    sub_df = df[avail].dropna()
    if "tcpa_minutes" in sub_df.columns:
        sub_df["abs_tcpa_minutes"] = sub_df["tcpa_minutes"].abs()
        avail = [c if c != "tcpa_minutes" else "abs_tcpa_minutes" for c in avail]

    pearson_corr = sub_df[avail].corr(method="pearson").round(3).to_dict()
    spearman_corr = sub_df[avail].corr(method="spearman").round(3).to_dict()

    return {
        "channels": avail,
        "n_observations": len(sub_df),
        "pearson": pearson_corr,
        "spearman": spearman_corr,
    }


def compute_vif(
    scores_records: List[Dict[str, Any]],
    channels: Optional[List[str]] = None,
) -> Dict[str, float]:
    """Computes Variance Inflation Factor (VIF) for multi-collinearity diagnosis."""
    if not scores_records:
        return {}

    df = pd.DataFrame(scores_records)
    if channels is None:
        channels = ["dcpa_km", "tcpa_minutes", "coverage_completeness", "forward_fit_score"]

    avail = [c for c in channels if c in df.columns and df[c].notna().sum() > 5]
    if len(avail) < 2:
        return {c: 1.0 for c in avail}

    sub_df = df[avail].dropna()
    if "tcpa_minutes" in sub_df.columns:
        sub_df["abs_tcpa_minutes"] = sub_df["tcpa_minutes"].abs()
        avail = [c if c != "tcpa_minutes" else "abs_tcpa_minutes" for c in avail]

    X = sub_df[avail].to_numpy(dtype=np.float64)
    # Standardize
    X_std = (X - np.mean(X, axis=0)) / np.clip(np.std(X, axis=0), 1e-6, None)

    vifs = {}
    try:
        corr = np.corrcoef(X_std, rowvar=False)
        inv_corr = np.linalg.pinv(corr)
        for i, col in enumerate(avail):
            vifs[col] = float(np.round(np.clip(inv_corr[i, i], 1.0, 99.9), 2))
    except Exception:
        for col in avail:
            vifs[col] = 1.0

    return vifs
