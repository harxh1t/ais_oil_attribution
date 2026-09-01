"""Input validation for oil spill investigation requests."""

from dataclasses import dataclass
from datetime import datetime, timezone
import dateutil.parser


class InputValidationError(Exception):
    """Raised when user input parameters fail validation."""
    pass


@dataclass
class ValidatedInput:
    """Validated investigation input parameters."""
    lat: float
    lon: float
    time_utc: datetime
    spread_km: float
    regime: str


def validate_input(
    lat: float,
    lon: float,
    time_str: str,
    spread_km: float,
    regime: str = "auto",
) -> ValidatedInput:
    """
    Validates CLI / API input parameters.

    Raises:
        InputValidationError: for invalid coordinates, unparseable dates, or out-of-bound spreads.
    """
    # Latitude validation
    if not isinstance(lat, (int, float)) or lat < -90.0 or lat > 90.0:
        raise InputValidationError(f"Invalid latitude {lat}. Latitude must be between -90.0 and 90.0 degrees.")

    # Longitude validation
    if not isinstance(lon, (int, float)) or lon < -180.0 or lon > 180.0:
        raise InputValidationError(f"Invalid longitude {lon}. Longitude must be between -180.0 and 180.0 degrees.")

    # Timestamp validation
    try:
        dt = dateutil.parser.parse(time_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
    except Exception as e:
        raise InputValidationError(
            f"Failed to parse timestamp '{time_str}'. Expected format: YYYY-MM-DD HH:MM:SS (UTC). Error: {e}"
        ) from e

    # Spread validation
    if not isinstance(spread_km, (int, float)) or spread_km <= 0:
        raise InputValidationError(f"Invalid spread radius {spread_km} km. Spread radius must be > 0.")

    # ENGINEERING ASSUMPTION: 500 km sanity bound for single-observation uncertainty
    if spread_km > 500.0:
        raise InputValidationError(
            f"Spread radius {spread_km} km exceeds maximum sanity threshold (500 km). "
            "Please verify if the localization uncertainty was entered correctly."
        )

    valid_regimes = ["auto", "contemporaneous", "delayed"]
    if regime.lower() not in valid_regimes:
        raise InputValidationError(f"Invalid regime '{regime}'. Must be one of: {valid_regimes}")

    return ValidatedInput(
        lat=float(lat),
        lon=float(lon),
        time_utc=dt,
        spread_km=float(spread_km),
        regime=regime.lower(),
    )