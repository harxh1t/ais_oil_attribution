"""Investigation Regime Classifier (Contemporaneous vs. Delayed)."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RegimeDecision:
    """Outcome of regime classification."""
    regime: str  # "contemporaneous" | "delayed"
    rationale: str
    requires_confirmation: bool = True
    warning: Optional[str] = None
    is_platform_blowout_suspect: bool = False


# Known fixed infrastructure / platform blowout reference coordinates for sanity warning
KNOWN_BLOWOUT_ZONES = [
    {
        "name": "Deepwater Horizon / Macondo Well MC252",
        "lat_range": (28.70, 28.85),
        "lon_range": (-88.45, -88.35),
        "note": "Subsea point-source blowout (2010), fixed infrastructure rather than moving vessel discharge.",
    }
]


def classify_regime(
    spread_km: float,
    time_gap_hours: Optional[float] = None,
    typical_current_speed_km_per_hour: float = 1.8,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    require_human_confirmation: bool = True,
) -> RegimeDecision:
    """
    ENGINEERING RULE (not research-backed — see §12 of architecture specification).

    Determines whether direct AIS track correlation or reverse drift backtracking is required:
    - Contemporaneous: SAR image captures slick while vessel is transiting / single observation.
    - Delayed: Spill discovered hours/days after release, requiring OpenDrift backtracking.

    Also checks for known fixed platform/blowout scenarios.
    """
    warning = None
    is_blowout = False

    # Check for known fixed platform / blowout scenarios
    if lat is not None and lon is not None:
        for zone in KNOWN_BLOWOUT_ZONES:
            if zone["lat_range"][0] <= lat <= zone["lat_range"][1] and zone["lon_range"][0] <= lon <= zone["lon_range"][1]:
                is_blowout = True
                warning = (
                    f"WARNING: Location ({lat}, {lon}) matches {zone['name']}. {zone['note']} "
                    "Applying vessel-attribution logic to a fixed platform blowout will produce misleading results."
                )

    if time_gap_hours is None or time_gap_hours <= 0:
        # Default contemporaneous if no prior release timestamp is provided
        rationale = (
            "No time gap between release and observation provided. Direct contemporaneous AIS "
            "correlation path selected (no drift backtracking needed)."
        )
        return RegimeDecision(
            regime="contemporaneous",
            rationale=rationale,
            requires_confirmation=require_human_confirmation,
            warning=warning,
            is_platform_blowout_suspect=is_blowout,
        )

    # Implied drift distance over the elapsed time
    implied_max_drift_km = typical_current_speed_km_per_hour * time_gap_hours

    if spread_km >= implied_max_drift_km:
        regime = "contemporaneous"
        rationale = (
            f"Reported spread uncertainty ({spread_km:.2f} km) exceeds expected drift "
            f"({implied_max_drift_km:.2f} km over {time_gap_hours:.1f} hours at {typical_current_speed_km_per_hour} km/h). "
            "Direct AIS correlation path selected."
        )
    else:
        regime = "delayed"
        rationale = (
            f"Reported spread uncertainty ({spread_km:.2f} km) is narrower than expected drift "
            f"({implied_max_drift_km:.2f} km over {time_gap_hours:.1f} hours at {typical_current_speed_km_per_hour} km/h). "
            "Delayed observation regime selected — Lagrangian drift backtracking required to estimate release origin."
        )

    return RegimeDecision(
        regime=regime,
        rationale=rationale,
        requires_confirmation=require_human_confirmation,
        warning=warning,
        is_platform_blowout_suspect=is_blowout,
    )