"""AIS Trajectory Reconstruction and Gap Interpolation."""

from datetime import timedelta
import numpy as np
import pandas as pd
from scipy.interpolate import CubicSpline


def reconstruct_track(
    points: pd.DataFrame,
    linear_max_gap_min: float = 5.0,
    spline_max_gap_min: float = 120.0,
    step_minutes: float = 1.0,
) -> pd.DataFrame:
    """
    Reconstructs an AIS vessel track with classified gap interpolation.

    Args:
        points: DataFrame of AIS points for a single MMSI, sorted chronologically.
        linear_max_gap_min: Max gap in minutes for linear interpolation (default: 5.0).
        spline_max_gap_min: Max gap in minutes for cubic spline interpolation (default: 120.0).
        step_minutes: Interpolation time resolution in minutes (default: 1.0).

    Returns:
        DataFrame conforming to reconstructed_tracks.parquet schema (§4.2).
    """
    if points.empty:
        empty_df = points.copy()
        empty_df["is_interpolated"] = pd.Series(dtype="bool")
        empty_df["interpolation_method"] = pd.Series(dtype="string")
        empty_df["gap_before_seconds"] = pd.Series(dtype="float64")
        return empty_df

    pts = points.copy()
    if not pd.api.types.is_datetime64_any_dtype(pts["timestamp"]):
        pts["timestamp"] = pd.to_datetime(pts["timestamp"], utc=True)
    pts = pts.sort_values("timestamp").reset_index(drop=True)
    pts["is_interpolated"] = False
    pts["interpolation_method"] = "none"
    pts["gap_before_seconds"] = 0.0

    if len(pts) <= 1:
        return pts

    # Compute time in seconds from start for numerical interpolation
    t_base = pts.loc[0, "timestamp"]
    t_seconds = np.array([(t - t_base).total_seconds() for t in pts["timestamp"]])

    # Prepare cubic spline if multiple points available
    cs_lat = None
    cs_lon = None
    if len(pts) >= 4:
        try:
            cs_lat = CubicSpline(t_seconds, pts["lat"].values, bc_type="natural")
            cs_lon = CubicSpline(t_seconds, pts["lon"].values, bc_type="natural")
        except Exception:
            cs_lat, cs_lon = None, None

    result_rows = []
    first_row = pts.iloc[0]
    mmsi = first_row.get("mmsi")
    vessel_name = first_row.get("vessel_name", f"VESSEL_{mmsi}")
    imo = first_row.get("imo", None)
    vtype = first_row.get("vessel_type_code", None)
    nav_status = first_row.get("nav_status", None)
    length_m = first_row.get("length_m", None)
    width_m = first_row.get("width_m", None)
    draft_m = first_row.get("draft_m", None)

    # First point
    first_pt = pts.iloc[0].to_dict()
    first_pt["gap_before_seconds"] = 0.0
    first_pt["is_interpolated"] = False
    first_pt["interpolation_method"] = "none"
    result_rows.append(first_pt)

    for i in range(len(pts) - 1):
        p1 = pts.iloc[i]
        p2 = pts.iloc[i + 1]

        t1 = p1["timestamp"]
        t2 = p2["timestamp"]
        gap_sec = (t2 - t1).total_seconds()
        gap_min = gap_sec / 60.0

        p2_dict = p2.to_dict()
        p2_dict["gap_before_seconds"] = gap_sec

        if gap_min <= (step_minutes * 1.05):
            # Points are already at or near desired cadence; no interpolation needed
            p2_dict["is_interpolated"] = False
            p2_dict["interpolation_method"] = "none"
            result_rows.append(p2_dict)

        elif gap_min <= linear_max_gap_min:
            # Linear interpolation
            num_steps = int(gap_min // step_minutes)
            for s in range(1, num_steps):
                frac = (s * step_minutes * 60.0) / gap_sec
                if frac >= 1.0:
                    break
                t_interp = t1 + timedelta(seconds=s * step_minutes * 60.0)
                lat_interp = p1["lat"] + frac * (p2["lat"] - p1["lat"])
                lon_interp = p1["lon"] + frac * (p2["lon"] - p1["lon"])
                sog_interp = p1["sog_knots"] + frac * (p2["sog_knots"] - p1["sog_knots"])
                cog_interp = p1["cog_degrees"] + frac * (p2["cog_degrees"] - p1["cog_degrees"])

                result_rows.append({
                    "mmsi": mmsi,
                    "timestamp": t_interp,
                    "lat": float(lat_interp),
                    "lon": float(lon_interp),
                    "sog_knots": float(sog_interp),
                    "cog_degrees": float(cog_interp),
                    "heading_degrees": float(cog_interp),
                    "vessel_name": vessel_name,
                    "imo": imo,
                    "vessel_type_code": vtype,
                    "nav_status": nav_status,
                    "length_m": length_m,
                    "width_m": width_m,
                    "draft_m": draft_m,
                    "is_interpolated": True,
                    "interpolation_method": "linear",
                    "gap_before_seconds": float(s * step_minutes * 60.0),
                })

            p2_dict["is_interpolated"] = False
            p2_dict["interpolation_method"] = "none"
            result_rows.append(p2_dict)

        elif gap_min <= spline_max_gap_min:
            # Cubic spline interpolation
            num_steps = int(gap_min // step_minutes)
            for s in range(1, num_steps):
                t_sec_offset = (t1 - t_base).total_seconds() + (s * step_minutes * 60.0)
                frac = (s * step_minutes * 60.0) / gap_sec
                if frac >= 1.0:
                    break
                t_interp = t1 + timedelta(seconds=s * step_minutes * 60.0)

                if cs_lat is not None and cs_lon is not None:
                    # ENGINEERING ASSUMPTION: Treats lat/lon independently with natural cubic spline
                    lat_interp = float(cs_lat(t_sec_offset))
                    lon_interp = float(cs_lon(t_sec_offset))
                else:
                    # Fallback to linear if spline could not be fit (< 4 points)
                    lat_interp = p1["lat"] + frac * (p2["lat"] - p1["lat"])
                    lon_interp = p1["lon"] + frac * (p2["lon"] - p1["lon"])

                sog_interp = p1["sog_knots"] + frac * (p2["sog_knots"] - p1["sog_knots"])
                cog_interp = p1["cog_degrees"] + frac * (p2["cog_degrees"] - p1["cog_degrees"])

                result_rows.append({
                    "mmsi": mmsi,
                    "timestamp": t_interp,
                    "lat": float(lat_interp),
                    "lon": float(lon_interp),
                    "sog_knots": float(sog_interp),
                    "cog_degrees": float(cog_interp),
                    "heading_degrees": float(cog_interp),
                    "vessel_name": vessel_name,
                    "imo": imo,
                    "vessel_type_code": vtype,
                    "nav_status": nav_status,
                    "length_m": length_m,
                    "width_m": width_m,
                    "draft_m": draft_m,
                    "is_interpolated": True,
                    "interpolation_method": "cubic_spline",
                    "gap_before_seconds": float(s * step_minutes * 60.0),
                })

            p2_dict["is_interpolated"] = False
            p2_dict["interpolation_method"] = "none"
            result_rows.append(p2_dict)

        else:
            # Gaps > spline_max_gap_min: do not interpolate across large unknowns
            p2_dict["is_interpolated"] = False
            p2_dict["interpolation_method"] = "none"
            result_rows.append(p2_dict)

    res_df = pd.DataFrame(result_rows)
    res_df["timestamp"] = pd.to_datetime(res_df["timestamp"], utc=True)
    res_df["mmsi"] = res_df["mmsi"].astype("int64")
    res_df["is_interpolated"] = res_df["is_interpolated"].astype("bool")
    res_df["interpolation_method"] = res_df["interpolation_method"].astype("string")
    res_df["gap_before_seconds"] = res_df["gap_before_seconds"].astype("float64")
    return res_df.sort_values("timestamp").reset_index(drop=True)


def reconstruct_all_tracks(
    df: pd.DataFrame,
    linear_max_gap_min: float = 5.0,
    spline_max_gap_min: float = 120.0,
    step_minutes: float = 1.0,
) -> pd.DataFrame:
    """
    Reconstructs trajectories for all vessels in the input DataFrame.
    """
    if df.empty:
        return df

    reconstructed_list = []
    for mmsi, group in df.groupby("mmsi"):
        recon_group = reconstruct_track(
            group,
            linear_max_gap_min=linear_max_gap_min,
            spline_max_gap_min=spline_max_gap_min,
            step_minutes=step_minutes,
        )
        reconstructed_list.append(recon_group)

    if reconstructed_list:
        return pd.concat(reconstructed_list, ignore_index=True).sort_values(["mmsi", "timestamp"]).reset_index(drop=True)
    return pd.DataFrame()


# Backward/Forward compatible alias
reconstruct_candidate_trajectories = reconstruct_all_tracks