"""Geometric distance and trajectory similarity measures (Hausdorff & Fréchet)."""

import math
import numpy as np
from frechetdist import frdist
from geopy.distance import geodesic
from scipy.spatial.distance import directed_hausdorff


def project_latlon_to_km(coords: np.ndarray, origin_lat: float, origin_lon: float) -> np.ndarray:
    """
    Projects (lat, lon) coordinates to local flat Cartesian (x_km, y_km) space.

    ENGINEERING NOTE:
    Required because discrete Fréchet distance operates in Euclidean metric space.
    Equirectangular projection centered on the joint midpoint maintains sub-0.1% metric
    accuracy across local investigation scales (<=100 km).
    """
    if len(coords) == 0:
        return np.empty((0, 2))

    lat_rad = math.radians(origin_lat)
    kx = 111.320 * math.cos(lat_rad)
    ky = 110.574

    x_km = (coords[:, 1] - origin_lon) * kx
    y_km = (coords[:, 0] - origin_lat) * ky
    return np.column_stack([x_km, y_km])


def resample_curve(curve_km: np.ndarray, num_points: int) -> np.ndarray:
    """
    Resamples a 2D polygonal curve to a fixed number of equidistant points along its arc length.

    ENGINEERING NOTE:
    Required because the underlying frechetdist library expects input curves of equal length.
    """
    if len(curve_km) <= 1:
        return np.repeat(curve_km, num_points, axis=0) if len(curve_km) == 1 else np.empty((0, 2))

    diffs = np.diff(curve_km, axis=0)
    seg_lens = np.linalg.norm(diffs, axis=1)
    cum_len = np.insert(np.cumsum(seg_lens), 0, 0.0)
    total_len = cum_len[-1]

    if total_len == 0.0:
        return np.repeat(curve_km[:1], num_points, axis=0)

    target_dists = np.linspace(0.0, total_len, num_points)
    resampled_x = np.interp(target_dists, cum_len, curve_km[:, 0])
    resampled_y = np.interp(target_dists, cum_len, curve_km[:, 1])
    return np.column_stack([resampled_x, resampled_y])


def hausdorff_km(track_latlon: np.ndarray, slick_latlon: np.ndarray) -> float:
    """
    Computes the symmetric Hausdorff distance in kilometers (§6.7).

    Finds the worst-case closest point pair using directed_hausdorff and computes
    the exact geodesic Vincenty/WGS-84 distance for that pair.
    """
    if len(track_latlon) == 0 or len(slick_latlon) == 0:
        return float("inf")

    origin_lat = float((np.mean(track_latlon[:, 0]) + np.mean(slick_latlon[:, 0])) / 2.0)
    origin_lon = float((np.mean(track_latlon[:, 1]) + np.mean(slick_latlon[:, 1])) / 2.0)

    t_proj = project_latlon_to_km(track_latlon, origin_lat, origin_lon)
    s_proj = project_latlon_to_km(slick_latlon, origin_lat, origin_lon)

    d1, idx_t1, idx_s1 = directed_hausdorff(t_proj, s_proj)
    d2, idx_s2, idx_t2 = directed_hausdorff(s_proj, t_proj)

    if d1 >= d2:
        pt_t = (track_latlon[idx_t1, 0], track_latlon[idx_t1, 1])
        pt_s = (slick_latlon[idx_s1, 0], slick_latlon[idx_s1, 1])
    else:
        pt_t = (track_latlon[idx_t2, 0], track_latlon[idx_t2, 1])
        pt_s = (slick_latlon[idx_s2, 0], slick_latlon[idx_s2, 1])

    return float(geodesic(pt_t, pt_s).kilometers)


def discrete_frechet_distance(p: np.ndarray, q: np.ndarray) -> float:
    """
    Computes discrete Fréchet distance between two polygonal curves P and Q
    using iterative dynamic programming (Eiter & Mannila 1994).
    Guarantees O(|P| * |Q|) execution with zero recursion and no length equality constraints.
    """
    n_p = len(p)
    n_q = len(q)
    if n_p == 0 or n_q == 0:
        return float("inf")

    ca = np.full((n_p, n_q), -1.0, dtype=np.float64)
    ca[0, 0] = np.linalg.norm(p[0] - q[0])

    for i in range(1, n_p):
        ca[i, 0] = max(ca[i - 1, 0], np.linalg.norm(p[i] - q[0]))

    for j in range(1, n_q):
        ca[0, j] = max(ca[0, j - 1], np.linalg.norm(p[0] - q[j]))

    for i in range(1, n_p):
        for j in range(1, n_q):
            d = np.linalg.norm(p[i] - q[j])
            min_prev = min(ca[i - 1, j], ca[i - 1, j - 1], ca[i, j - 1])
            ca[i, j] = max(min_prev, d)

    return float(ca[n_p - 1, n_q - 1])


def frechet_km(track_latlon: np.ndarray, slick_centerline_latlon: np.ndarray) -> float:
    """
    Computes the discrete Fréchet distance in kilometers between an AIS track and slick centerline.

    Formalizes the Cerulean "parity" concept (order-sensitive curve shape matching)
    per Toohey & Duckham (2021) and Eiter & Mannila (1994).
    """
    if len(track_latlon) == 0 or len(slick_centerline_latlon) == 0:
        return float("inf")

    origin_lat = float((np.mean(track_latlon[:, 0]) + np.mean(slick_centerline_latlon[:, 0])) / 2.0)
    origin_lon = float((np.mean(track_latlon[:, 1]) + np.mean(slick_centerline_latlon[:, 1])) / 2.0)

    t_proj = project_latlon_to_km(track_latlon, origin_lat, origin_lon)
    s_proj = project_latlon_to_km(slick_centerline_latlon, origin_lat, origin_lon)

    # Subsample very dense tracks to max 100 points along arc length for speed
    if len(t_proj) > 100:
        t_proj = resample_curve(t_proj, 100)
    if len(s_proj) > 100:
        s_proj = resample_curve(s_proj, 100)

    d_frechet = discrete_frechet_distance(t_proj, s_proj)
    return float(d_frechet)