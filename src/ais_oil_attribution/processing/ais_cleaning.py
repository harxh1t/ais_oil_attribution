"""AIS data cleaning and sanitization."""

import math
import numpy as np
import pandas as pd

# ENGINEERING ASSUMPTION: Max plausible speed for commercial non-planing marine traffic
MAX_PLAUSIBLE_SPEED_KNOTS = 50.0


def clean_ais_data(df: pd.DataFrame, max_speed_knots: float = MAX_PLAUSIBLE_SPEED_KNOTS) -> pd.DataFrame:
    """
    Cleans raw AIS points:
    1. Removes duplicate records (same MMSI and timestamp).
    2. Drops invalid coordinates (lat outside [-90, 90], lon outside [-180, 180]).
    3. Filters physically impossible inter-point speeds (> max_speed_knots).
    """
    if df.empty:
        return df

    # Drop null timestamps or coordinates
    cleaned = df.dropna(subset=["mmsi", "timestamp", "lat", "lon"]).copy()

    # Deduplicate by MMSI and timestamp
    cleaned = cleaned.drop_duplicates(subset=["mmsi", "timestamp"]).sort_values(["mmsi", "timestamp"]).reset_index(drop=True)

    # Filter coordinate bounds
    valid_coords = (
        (cleaned["lat"] >= -90.0) & (cleaned["lat"] <= 90.0) &
        (cleaned["lon"] >= -180.0) & (cleaned["lon"] <= 180.0)
    )
    cleaned = cleaned[valid_coords].reset_index(drop=True)

    if cleaned.empty:
        return cleaned

    # Filter impossible speeds between consecutive points per vessel
    filtered_rows = []
    for mmsi, group in cleaned.groupby("mmsi"):
        group = group.sort_values("timestamp").reset_index(drop=True)
        if len(group) <= 1:
            filtered_rows.append(group)
            continue

        lats = group["lat"].values
        lons = group["lon"].values
        ts = group["timestamp"].values

        keep_indices = [0]
        prev_idx = 0

        for i in range(1, len(group)):
            dt_sec = (ts[i] - ts[prev_idx]).astype("timedelta64[ns]").astype("float64") / 1e9
            dt_hours = dt_sec / 3600.0

            if dt_hours <= 0:
                continue

            lat1, lon1 = lats[prev_idx], lons[prev_idx]
            lat2, lon2 = lats[i], lons[i]

            # Fast local geodesic approximation
            d_lat = (lat2 - lat1) * 111.0
            d_lon = (lon2 - lon1) * 111.0 * math.cos(math.radians((lat1 + lat2) / 2.0))
            dist_km = math.hypot(d_lat, d_lon)
            speed_knots = (dist_km / 1.852) / dt_hours

            if speed_knots <= max_speed_knots:
                keep_indices.append(i)
                prev_idx = i

        filtered_rows.append(group.iloc[keep_indices])

    if filtered_rows:
        return pd.concat(filtered_rows, ignore_index=True).sort_values(["mmsi", "timestamp"]).reset_index(drop=True)
    return pd.DataFrame(columns=df.columns)