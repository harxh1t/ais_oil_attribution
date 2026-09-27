"""Visualizations for OpenDrift forward and backward oil spill tracking.

Directly adapted from oil_spill_drift_tracker.ipynb in LIGHT MODE:
1. plot_detailed_drift: Exact 2-panel figure from Cell 28 & 33 (particle cloud colored by elapsed hours + spread-over-time chart).
2. plot_origin_diagnostics: Exact Method 1 & Method 2 diagnostic curves from Cell 35.
3. generate_opendrift_animation: Authentic Matplotlib FuncAnimation renderer (exporting both .gif and .html via to_jshtml()).
"""

from datetime import datetime
import io
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import urllib.request
import numpy as np
import pandas as pd
from PIL import Image
import matplotlib
matplotlib.use("Agg")  # Headless rendering
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.animation as animation


def _deg2num(lat_deg: float, lon_deg: float, zoom: int) -> Tuple[int, int]:
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)


def _num2deg(xtile: int, ytile: int, zoom: int) -> Tuple[float, float]:
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)


def fetch_basemap_image(
    min_lon: float,
    max_lon: float,
    min_lat: float,
    max_lat: float,
    zoom: Optional[int] = None,
) -> Tuple[Optional[Image.Image], Optional[List[float]]]:
    """Fetches and stitches authentic Esri World Ocean basemap tiles showing coastlines,
    bathymetry, and land topography in clean light tones without watermarks.
    """
    try:
        span_deg = max(max_lon - min_lon, max_lat - min_lat)
        if zoom is None:
            if span_deg > 2.5:
                zoom = 8
            elif span_deg > 1.0:
                zoom = 9
            elif span_deg > 0.35:
                zoom = 10
            else:
                zoom = 11

        x_min, y_min = _deg2num(max_lat, min_lon, zoom)
        x_max, y_max = _deg2num(min_lat, max_lon, zoom)

        # Cap max tile count for rapid local rendering
        if (x_max - x_min + 1) * (y_max - y_min + 1) > 20:
            zoom = max(6, zoom - 1)
            x_min, y_min = _deg2num(max_lat, min_lon, zoom)
            x_max, y_max = _deg2num(min_lat, max_lon, zoom)

        n_tiles_x = x_max - x_min + 1
        n_tiles_y = y_max - y_min + 1
        stitched = Image.new("RGB", (n_tiles_x * 256, n_tiles_y * 256), color="#dceaf5")

        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        for i, x in enumerate(range(x_min, x_max + 1)):
            for j, y in enumerate(range(y_min, y_max + 1)):
                url = f"https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{zoom}/{y}/{x}"
                req = urllib.request.Request(url, headers=headers)
                try:
                    with urllib.request.urlopen(req, timeout=3.0) as resp:
                        t_img = Image.open(io.BytesIO(resp.read()))
                        stitched.paste(t_img, (i * 256, j * 256))
                except Exception:
                    pass

        nw_lat, nw_lon = _num2deg(x_min, y_min, zoom)
        se_lat, se_lon = _num2deg(x_max + 1, y_max + 1, zoom)
        return stitched, [nw_lon, se_lon, se_lat, nw_lat]
    except Exception:
        return None, None


def plot_detailed_drift(
    coords_hist: Tuple[np.ndarray, np.ndarray],
    times: Union[pd.DatetimeIndex, List[datetime]],
    title: str,
    start_lat: float,
    start_lon: float,
    known_lat: Optional[float] = None,
    known_lon: Optional[float] = None,
    known_label: str = "Discovered Origin",
    output_path: Optional[Union[str, Path]] = None,
) -> plt.Figure:
    """Exact two-panel figure from Cell 28/33 of oil_spill_drift_tracker.ipynb (Light Mode):
    - Left panel: Particle cloud colored by elapsed hours since simulation start.
    - Right panel: Cloud spread (km) over time line chart with fill.
    """
    lons, lats = coords_hist
    if not isinstance(times, pd.DatetimeIndex):
        times = pd.DatetimeIndex(times)

    n_particles, n_times = lons.shape
    fig = plt.figure(figsize=(13, 7), dpi=150)
    fig.patch.set_facecolor("#FFFFFF")

    # --- Left Panel: Particle Cloud Map ---
    ax_map = fig.add_subplot(1, 2, 1)
    ax_map.set_facecolor("#dceaf5")  # Soft ocean blue from notebook Cell 28

    # Elapsed hours since simulation start
    elapsed_hours = np.array([(t - times[0]).total_seconds() / 3600.0 for t in times])
    color_grid = np.tile(elapsed_hours, (n_particles, 1))

    sc = ax_map.scatter(
        lons.flatten(),
        lats.flatten(),
        c=color_grid.flatten(),
        cmap="plasma",
        s=7,
        alpha=0.45,
        edgecolors="none",
        zorder=3,
    )

    cbar = plt.colorbar(sc, ax=ax_map, orientation="horizontal", pad=0.07, shrink=0.85)
    cbar.set_label("Hours since simulation start", color="#1E293B", fontsize=9, fontweight="normal")
    cbar.ax.xaxis.set_tick_params(color="#475569")
    plt.setp(plt.getp(cbar.ax.axes, "xticklabels"), color="#334155", fontsize=8)

    # Mark the starting / detection point (Cyan star with black border from notebook)
    ax_map.plot(
        start_lon,
        start_lat,
        marker="*",
        color="cyan",
        markersize=16,
        markeredgecolor="black",
        markeredgewidth=1.2,
        zorder=5,
        label="Detection point",
    )

    # Mark the known / discovered origin site (Red 'X' with black border from notebook)
    if known_lat is not None and known_lon is not None:
        ax_map.plot(
            known_lon,
            known_lat,
            marker="X",
            color="red",
            markersize=14,
            markeredgecolor="black",
            markeredgewidth=1.2,
            zorder=5,
            label=known_label,
        )

    # Centroid advection trajectory line
    mean_lons = np.nanmean(lons, axis=0)
    mean_lats = np.nanmean(lats, axis=0)
    ax_map.plot(
        mean_lons,
        mean_lats,
        color="#1E293B",
        linestyle="--",
        linewidth=1.6,
        alpha=0.85,
        zorder=4,
        label="Plume centroid path",
    )

    pad_lon = max(0.12, (np.nanmax(lons) - np.nanmin(lons)) * 0.25)
    pad_lat = max(0.12, (np.nanmax(lats) - np.nanmin(lats)) * 0.25)
    xlims = (np.nanmin(lons) - pad_lon, np.nanmax(lons) + pad_lon)
    ylims = (np.nanmin(lats) - pad_lat, np.nanmax(lats) + pad_lat)

    # Render authentic coastal basemap tiles underneath
    base_img, base_extent = fetch_basemap_image(xlims[0], xlims[1], ylims[0], ylims[1])
    if base_img is not None and base_extent is not None:
        ax_map.imshow(base_img, extent=base_extent, zorder=1, aspect="auto")

    ax_map.set_xlim(xlims)
    ax_map.set_ylim(ylims)

    ax_map.set_xlabel("Longitude (°E)", color="#1E293B", fontsize=9)
    ax_map.set_ylabel("Latitude (°N)", color="#1E293B", fontsize=9)
    ax_map.set_title(title, color="#0F172A", fontsize=11, fontweight="bold", pad=10)
    ax_map.tick_params(colors="#334155")
    ax_map.grid(color="#94A3B8", linestyle=":", linewidth=0.6, alpha=0.55)
    for spine in ax_map.spines.values():
        spine.set_color("#64748B")

    leg = ax_map.legend(loc="upper left", fontsize=8, facecolor="#FFFFFF", edgecolor="#CBD5E1", framealpha=0.95)
    for text in leg.get_texts():
        text.set_color("#0F172A")

    # --- Right Panel: Spread Over Time Chart ---
    ax_chart = fig.add_subplot(1, 2, 2)
    ax_chart.set_facecolor("#FFFFFF")

    centroid_lons = np.nanmean(lons, axis=0)
    centroid_lats = np.nanmean(lats, axis=0)
    spread_km = np.sqrt(
        np.nanmean((lats - centroid_lats) ** 2 + (lons - centroid_lons) ** 2, axis=0)
    ) * 111.0

    ax_chart.plot(times, spread_km, color="#d62728", linewidth=2.2, zorder=3, label="Spread $\\sigma(t)$")
    ax_chart.fill_between(times, spread_km, alpha=0.15, color="#d62728", zorder=2)

    min_idx = int(np.nanargmin(spread_km))
    ax_chart.scatter(
        [times[min_idx]],
        [spread_km[min_idx]],
        color="#d62728",
        s=70,
        zorder=5,
        edgecolors="black",
        label=f"Min spread ({spread_km[min_idx]:.2f} km)",
    )
    ax_chart.axvline(
        times[min_idx],
        color="#d62728",
        linestyle="--",
        linewidth=1.2,
        alpha=0.75,
    )

    ax_chart.set_xlabel("Time (UTC)", color="#1E293B", fontsize=9)
    ax_chart.set_ylabel("Particle cloud spread (km)", color="#1E293B", fontsize=9)
    ax_chart.set_title("How spread out the oil is, over time", color="#0F172A", fontsize=11, fontweight="bold", pad=10)
    ax_chart.xaxis.set_major_formatter(mdates.DateFormatter("%b %d\n%H:%M"))
    ax_chart.tick_params(colors="#334155")
    ax_chart.grid(color="#E2E8F0", linestyle="-", linewidth=0.8, alpha=0.8)
    for spine in ax_chart.spines.values():
        spine.set_color("#64748B")

    leg2 = ax_chart.legend(loc="upper right", fontsize=8, facecolor="#FFFFFF", edgecolor="#CBD5E1", framealpha=0.95)
    for text in leg2.get_texts():
        text.set_color("#0F172A")

    plt.tight_layout()

    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(str(out_p), dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")
        plt.close(fig)

    return fig


def plot_origin_diagnostics(
    convergence_res: Dict[str, Any],
    closest_approach_res: Optional[Dict[str, Any]] = None,
    output_path: Optional[Union[str, Path]] = None,
) -> plt.Figure:
    """Exact diagnostic graphs from Cell 35 of oil_spill_drift_tracker.ipynb (Light Mode):
    - Panel 1: Method 1 (Distance to candidate site over time with encounter dip).
    - Panel 2: Method 2 (Spatial Convergence spread over time with warmup exclusion window shaded).
    """
    has_ca = closest_approach_res and "all_distances_km" in closest_approach_res and len(closest_approach_res.get("all_distances_km", [])) > 0
    n_panels = 2 if has_ca else 1

    fig, axes = plt.subplots(1, n_panels, figsize=(6.5 * n_panels, 4.5), dpi=150)
    fig.patch.set_facecolor("#FFFFFF")

    if n_panels == 1:
        axes = [axes]

    panel_idx = 0

    # --- Method 1: Closest Approach Distance vs Time ---
    if has_ca:
        ax1 = axes[panel_idx]
        panel_idx += 1
        ax1.set_facecolor("#FFFFFF")

        ca_times = pd.DatetimeIndex(closest_approach_res.get("all_times", []))
        ca_dists = closest_approach_res.get("all_distances_km", [])
        pick_time = closest_approach_res.get("time")

        cand_name = closest_approach_res.get("candidate_name") or closest_approach_res.get("target_name") or "candidate site"
        if len(ca_times) == len(ca_dists) and len(ca_times) > 0:
            ax1.plot(ca_times, ca_dists, color="#1f77b4", linewidth=2.0, label=f"Distance to {cand_name}")
            if pick_time:
                dist_val = closest_approach_res.get("distance_to_target_km", 0)
                ax1.axvline(
                    pick_time,
                    color="#2ca02c",
                    linestyle="--",
                    linewidth=1.5,
                    label=f"Closest pick ({dist_val:.2f} km)",
                )

        ax1.set_xlabel("Time (backward run)", color="#1E293B", fontsize=9)
        ax1.set_ylabel(f"Distance from {cand_name} (km)", color="#1E293B", fontsize=9)
        ax1.set_title(f"Method 1: Distance to {cand_name}", color="#0F172A", fontsize=11, fontweight="bold")
        ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b %d\n%H:%M"))
        ax1.tick_params(colors="#334155")
        ax1.grid(color="#E2E8F0", linestyle="-", linewidth=0.8, alpha=0.8)
        for spine in ax1.spines.values():
            spine.set_color("#64748B")
        leg1 = ax1.legend(loc="upper right", fontsize=8, facecolor="#FFFFFF", edgecolor="#CBD5E1", framealpha=0.95)
        for text in leg1.get_texts():
            text.set_color("#0F172A")

    # --- Method 2: Spatial Convergence Spread vs Time with Warmup Shading ---
    ax2 = axes[panel_idx]
    ax2.set_facecolor("#FFFFFF")

    hist_spread = convergence_res.get("std_history")
    warmup_n = convergence_res.get("warmup_excluded", 0)
    best_idx = convergence_res.get("best_idx", 0)

    if hist_spread is not None and len(hist_spread) > 0:
        steps = np.arange(len(hist_spread))
        ax2.plot(steps, hist_spread, color="#d62728", linewidth=2.0, label="Particle spread $\\sigma(t)$")

        # Shading warm-up exclusion window
        if warmup_n > 0:
            ax2.axvspan(0, warmup_n, color="#94A3B8", alpha=0.25, label=f"Warm-up excluded ({warmup_n} steps)")

        ax2.axvline(best_idx, color="#d62728", linestyle="--", linewidth=1.5, label=f"Method 2 pick (Step {best_idx})")
        ax2.scatter([best_idx], [hist_spread[best_idx]], color="#d62728", s=60, edgecolors="black", zorder=5)

    ax2.set_xlabel("Simulation Timestep (reverse advection)", color="#1E293B", fontsize=9)
    ax2.set_ylabel("Cloud spread $\\sigma(t)$ (km)", color="#1E293B", fontsize=9)
    ax2.set_title("Method 2: Spatial convergence spread", color="#0F172A", fontsize=11, fontweight="bold")
    ax2.tick_params(colors="#334155")
    ax2.grid(color="#E2E8F0", linestyle="-", linewidth=0.8, alpha=0.8)
    for spine in ax2.spines.values():
        spine.set_color("#64748B")
    leg2 = ax2.legend(loc="upper right", fontsize=8, facecolor="#FFFFFF", edgecolor="#CBD5E1", framealpha=0.95)
    for text in leg2.get_texts():
        text.set_color("#0F172A")

    plt.tight_layout()

    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(str(out_p), dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")
        plt.close(fig)

    return fig


def generate_opendrift_animation(
    coords_hist: Tuple[np.ndarray, np.ndarray],
    times: Union[pd.DatetimeIndex, List[datetime]],
    start_lat: float,
    start_lon: float,
    origin_lat: float,
    origin_lon: float,
    output_base_path: Union[str, Path],
    fps: int = 5,
) -> Tuple[Path, Path]:
    """Renders the authentic Matplotlib simulation animation exactly as OpenDrift's
    o.animation() produces in Light Mode:
    - Generates animated GIF (viewable natively on all platforms).
    - Generates interactive HTML player widget via Matplotlib's native animation.to_jshtml().
    """
    lons, lats = coords_hist
    if not isinstance(times, pd.DatetimeIndex):
        times = pd.DatetimeIndex(times)

    n_particles, n_times = lons.shape

    matplotlib.rcParams["animation.embed_limit"] = 60.0

    # Set up matplotlib figure in Light Mode
    fig, ax = plt.subplots(figsize=(8.5, 6.5), dpi=120)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#dceaf5")  # Clean maritime ocean blue

    pad_lon = max(0.12, (np.nanmax(lons) - np.nanmin(lons)) * 0.25)
    pad_lat = max(0.12, (np.nanmax(lats) - np.nanmin(lats)) * 0.25)
    min_lon, max_lon = np.nanmin(lons) - pad_lon, np.nanmax(lons) + pad_lon
    min_lat, max_lat = np.nanmin(lats) - pad_lat, np.nanmax(lats) + pad_lat

    base_img, base_extent = fetch_basemap_image(min_lon, max_lon, min_lat, max_lat)
    if base_img is not None and base_extent is not None:
        ax.imshow(base_img, extent=base_extent, zorder=1, aspect="auto")

    ax.set_xlim(min_lon, max_lon)
    ax.set_ylim(min_lat, max_lat)

    # Reference static markers
    ax.plot(start_lon, start_lat, marker="*", color="cyan", markersize=16,
            markeredgecolor="black", markeredgewidth=1.2, zorder=6, label="Detection point")
    ax.plot(origin_lon, origin_lat, marker="X", color="red", markersize=14,
            markeredgecolor="black", markeredgewidth=1.2, zorder=6, label="Discovered Origin")

    # Advection vector
    ax.plot([start_lon, origin_lon], [start_lat, origin_lat], color="#64748B",
            linestyle="--", linewidth=1.5, alpha=0.7, zorder=4)

    # Dynamic elements for each frame
    scatter_pts = ax.scatter([], [], s=8, color="#1E293B", alpha=0.6, zorder=5, label="Oil Particles")
    centroid_pt, = ax.plot([], [], marker="o", color="#EF4444", markersize=8, markeredgecolor="white", zorder=7)

    time_text = ax.text(0.03, 0.94, "", transform=ax.transAxes, fontsize=10,
                        fontweight="bold", color="#0F172A",
                        bbox=dict(boxstyle="round,pad=0.4", facecolor="#FFFFFF", edgecolor="#CBD5E1", alpha=0.9))

    ax.set_xlabel("Longitude (°E)", color="#1E293B", fontsize=9)
    ax.set_ylabel("Latitude (°N)", color="#1E293B", fontsize=9)
    ax.tick_params(colors="#334155")
    ax.grid(color="#94A3B8", linestyle=":", linewidth=0.6, alpha=0.55)
    for spine in ax.spines.values():
        spine.set_color("#64748B")

    ax.legend(loc="lower right", fontsize=8, facecolor="#FFFFFF", edgecolor="#CBD5E1", framealpha=0.95)

    def init():
        scatter_pts.set_offsets(np.empty((0, 2)))
        centroid_pt.set_data([], [])
        time_text.set_text("")
        return scatter_pts, centroid_pt, time_text

    def update(frame_idx):
        cur_lons = lons[:, frame_idx]
        cur_lats = lats[:, frame_idx]
        valid_mask = ~np.isnan(cur_lons) & ~np.isnan(cur_lats)

        pts = np.column_stack([cur_lons[valid_mask], cur_lats[valid_mask]])
        scatter_pts.set_offsets(pts)

        c_lon = np.nanmean(cur_lons)
        c_lat = np.nanmean(cur_lats)
        centroid_pt.set_data([c_lon], [c_lat])

        cur_time = times[frame_idx].strftime("%Y-%m-%d %H:%M UTC")
        time_text.set_text(f"Simulation Time: {cur_time}\nStep {frame_idx + 1} of {n_times}")
        return scatter_pts, centroid_pt, time_text

    anim = animation.FuncAnimation(
        fig,
        update,
        init_func=init,
        frames=n_times,
        interval=int(1000 / fps),
        blit=True,
    )

    out_base = Path(output_base_path)
    gif_path = out_base.with_suffix(".gif")
    html_path = out_base.with_suffix(".html")

    # 1. Export Animated GIF (Pillow writer)
    anim.save(str(gif_path), writer="pillow", fps=fps)

    # 2. Export Matplotlib's native interactive HTML animation player
    js_html = anim.to_jshtml()
    html_wrapped = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OpenDrift Simulation Animation (Light Mode)</title>
    <style>
        body {{
            background: #F8FAFC;
            color: #0F172A;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 24px;
            margin: 0;
        }}
        .header {{
            text-align: center;
            margin-bottom: 16px;
        }}
        .header h1 {{
            font-size: 20px;
            margin-bottom: 6px;
            color: #0F172A;
        }}
        .header p {{
            font-size: 13px;
            color: #64748B;
        }}
        .anim-container {{
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🌊 OpenDrift Oil Spill Simulation Animation</h1>
        <p>Authentic Frame-by-Frame Matplotlib Advection Player (Light Mode)</p>
    </div>
    <div class="anim-container">
        {js_html}
    </div>
</body>
</html>
"""
    html_path.write_text(html_wrapped, encoding="utf-8")
    plt.close(fig)

    return gif_path, html_path
