"""Log-Likelihood Ratio (LLR) calibrated evidence ranker and abstention engine."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


@dataclass
class CalibratedLLRResult:
    """Outcome of LLR calibrated ranking including case-level abstention status."""
    ranked_df: pd.DataFrame
    is_abstained: bool
    top_candidate_posterior: float
    abstention_threshold: float
    abstention_reason: Optional[str]
    model_description: str


class LLRCalibratedRanker:
    """Calibrated evidence ranker combining multi-channel signals against an unknown/dark-vessel hypothesis.

    Trained on synthetic cases to output calibrated evidence posteriors P(Source | Evidence).
    """

    DEFAULT_WEIGHTS = {
        "dcpa_proximity": 2.60,
        "tcpa_proximity": 1.80,
        "frechet_proximity": 1.40,
        "forward_fit": 2.40,
        "coverage": 1.10,
    }
    DEFAULT_BIAS = -2.20

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        bias: Optional[float] = None,
        abstention_threshold: float = 0.50,
    ):
        self.weights = weights or self.DEFAULT_WEIGHTS.copy()
        self.bias = bias if bias is not None else self.DEFAULT_BIAS
        self.abstention_threshold = abstention_threshold

    def compute_log_odds(self, row: pd.Series) -> float:
        """Computes linear evidence log-odds for a candidate vessel."""
        z = self.bias

        # 1. DCPA proximity factor: exp(-dcpa / 3.0) in [0, 1]
        dcpa = float(row.get("dcpa_km", 10.0))
        dcpa_factor = float(np.exp(-dcpa / 3.0))
        z += self.weights.get("dcpa_proximity", 2.60) * (dcpa_factor - 0.25)

        # 2. TCPA temporal proximity factor: exp(-abs(tcpa) / 45.0) in [0, 1]
        tcpa = abs(float(row.get("tcpa_minutes", 60.0)))
        tcpa_factor = float(np.exp(-tcpa / 45.0))
        z += self.weights.get("tcpa_proximity", 1.80) * (tcpa_factor - 0.25)

        # 3. Fréchet geometric proximity factor: exp(-frechet / 4.0) in [0, 1]
        frechet = row.get("frechet_km")
        if frechet is not None and not np.isnan(frechet) and not np.isinf(frechet):
            frechet_factor = float(np.exp(-float(frechet) / 4.0))
            z += self.weights.get("frechet_proximity", 1.40) * (frechet_factor - 0.25)

        # 4. Forward-fit score [0, 1]
        ff = row.get("forward_fit_score")
        if ff is not None and not np.isnan(ff):
            z += self.weights.get("forward_fit", 2.40) * (float(ff) - 0.30)

        # 5. AIS Coverage completeness [0, 1]
        cov = float(row.get("coverage_completeness", 0.5))
        z += self.weights.get("coverage", 1.10) * (cov - 0.50)

        return float(z)

    def rank(
        self,
        candidates_df: pd.DataFrame,
        config: Optional[Dict[str, Any]] = None,
    ) -> CalibratedLLRResult:
        """Ranks candidates by calibrated evidence posterior and evaluates case-level abstention."""
        if candidates_df.empty:
            return CalibratedLLRResult(
                ranked_df=candidates_df,
                is_abstained=True,
                top_candidate_posterior=0.0,
                abstention_threshold=self.abstention_threshold,
                abstention_reason="No candidate vessels identified within the observation window.",
                model_description="Calibrated LLR Evidence Posterior (Synthetic)",
            )

        df = candidates_df.copy()
        n = len(df)

        # Compute unnormalized log-odds for each candidate
        log_odds_list = [self.compute_log_odds(row) for _, row in df.iterrows()]
        df["llr_log_odds"] = log_odds_list

        # Softmax with explicit dark-vessel hypothesis (baseline z_dark = 0.0)
        exps = np.exp(np.clip(log_odds_list, -20.0, 20.0))
        z_dark_exp = np.exp(0.0)  # Unknown / dark vessel baseline
        total_exp = np.sum(exps) + z_dark_exp

        posteriors = exps / total_exp
        dark_vessel_posterior = float(z_dark_exp / total_exp)

        df["evidence_posterior"] = posteriors
        df["llr_score"] = posteriors

        # Sort descending by posterior probability
        df = df.sort_values(by=["evidence_posterior", "coverage_completeness"], ascending=[False, False]).reset_index(drop=True)
        df["final_rank"] = np.arange(1, n + 1)

        # Retain borda_score compatibility
        if "borda_score" not in df.columns:
            df["borda_score"] = (df["evidence_posterior"] * 100).astype(int)

        top_posterior = float(df.loc[0, "evidence_posterior"])
        is_abstained = (top_posterior < self.abstention_threshold)

        abstention_reason = None
        if is_abstained:
            abstention_reason = (
                f"Top candidate evidence posterior ({top_posterior:.3f}) is below the decision threshold "
                f"({self.abstention_threshold:.2f}). Dark vessel / non-broadcasting source cannot be ruled out "
                f"(dark vessel posterior: {dark_vessel_posterior:.3f})."
            )

        # Confidence scores
        cfg_labels = (config or {}).get("confidence_labels", {})
        h_min = cfg_labels.get("high_min_score", 0.75)
        m_min = cfg_labels.get("medium_min_score", 0.40)

        conf_scores = []
        conf_labels = []
        for _, row in df.iterrows():
            c_score = float(row["evidence_posterior"])
            conf_scores.append(c_score)
            label = "HIGH" if c_score >= h_min else ("MEDIUM" if c_score >= m_min else "LOW")
            if is_abstained:
                label = "INCONCLUSIVE / ABSTAIN"
            conf_labels.append(label)

        df["confidence_score"] = conf_scores
        df["confidence_label"] = conf_labels

        return CalibratedLLRResult(
            ranked_df=df,
            is_abstained=is_abstained,
            top_candidate_posterior=top_posterior,
            abstention_threshold=self.abstention_threshold,
            abstention_reason=abstention_reason,
            model_description="Calibrated LLR Evidence Posterior (Trained on synthetic cases; decision-support only).",
        )
