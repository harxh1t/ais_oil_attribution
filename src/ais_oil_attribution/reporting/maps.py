"""Interactive geospatial visualizations using Folium with multi-layer basemaps."""

from pathlib import Path
from typing import Any, Dict, List, Optional
import folium
from folium import plugins
import numpy as np
import pandas as pd


def generate_attribution_map(
    spill_lat: float,
    spill_lon: float,
    spread_km: float,
    slick_coords: Optional[np.ndarray],
    reconstructed_df: pd.DataFrame,
    scores_df: pd.DataFrame,
    output_html_path: Path,
    origin_estimate: Optional[Any] = None,
) -> str:
    """
    Generates a rich, interactive Folium map showing the spill, uncertainty bounds,
    candidate vessel tracks, closest approach markers, and clean multi-layer basemaps.
    """
    output_html_path.parent.mkdir(parents=True, exist_ok=True)

    # Initialize Map centered on spill
    m = folium.Map(
        location=[spill_lat, spill_lon],
        zoom_start=11,
        tiles=None,
    )

    # 1. Clean, High-Quality Multi-Layer Basemaps (No API key watermarks)
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{z}/{y}/{x}",
        attr="Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri",
        name="Esri Ocean (Maritime)",
        control=True,
    ).add_to(m)

    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community",
        name="Satellite Imagery",
        control=True,
    ).add_to(m)

    folium.TileLayer(
        tiles="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attr="&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>",
        name="Carto Voyager (Detailed)",
        subdomains="abcd",
        control=True,
    ).add_to(m)

    folium.TileLayer(
        tiles="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attr="&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>",
        name="Light Clean",
        subdomains="abcd",
        control=True,
    ).add_to(m)

    folium.TileLayer(
        tiles="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attr="&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>",
        name="Dark Mode",
        subdomains="abcd",
        control=True,
    ).add_to(m)

    # Feature Groups for Layer Control
    fg_spill = folium.FeatureGroup(name="Observed Slick & Spread Envelope", show=True).add_to(m)
    fg_top_vessels = folium.FeatureGroup(name="Top Candidate Tracks (Rank 1-3)", show=True).add_to(m)
    fg_cpa = folium.FeatureGroup(name="Closest Approach (CPA) Points", show=True).add_to(m)
    fg_other_vessels = folium.FeatureGroup(name="Other Maritime Traffic", show=True).add_to(m)
    fg_drift = folium.FeatureGroup(name="Drift Origin Estimate (Backtrack)", show=True).add_to(m)

    # 2. Observed Spill Location and Uncertainty Circle
    folium.Circle(
        location=[spill_lat, spill_lon],
        radius=spread_km * 1000.0,
        color="#EF4444",
        weight=2.5,
        fill=True,
        fill_color="#EF4444",
        fill_opacity=0.18,
        tooltip=f"Observation Spread (~{spread_km:.2f} km uncertainty envelope)",
    ).add_to(fg_spill)

    spill_popup_html = f"""
    <div style="font-family: sans-serif; min-width: 180px;">
        <h4 style="margin: 0 0 5px 0; color: #DC2626;">Observed Spill Location</h4>
        <p style="margin: 2px 0; font-size: 13px;"><strong>Latitude:</strong> {spill_lat:.5f}&deg;</p>
        <p style="margin: 2px 0; font-size: 13px;"><strong>Longitude:</strong> {spill_lon:.5f}&deg;</p>
        <p style="margin: 2px 0; font-size: 13px;"><strong>Spread Radius:</strong> ~{spread_km:.2f} km</p>
    </div>
    """
    folium.Marker(
        location=[spill_lat, spill_lon],
        popup=folium.Popup(spill_popup_html, max_width=300),
        icon=folium.Icon(color="red", icon="tint", prefix="fa"),
        tooltip="Observed Spill Center",
    ).add_to(fg_spill)

    # 3. Plot Slick Centerline
    if slick_coords is not None and len(slick_coords) > 1:
        line_pts = [[pt[0], pt[1]] for pt in slick_coords]
        folium.PolyLine(
            locations=line_pts,
            color="#111827",
            weight=5,
            opacity=0.9,
            dash_array="6, 6",
            tooltip="Slick Centerline (Observed Geometry)",
        ).add_to(fg_spill)
        # Highlight border for slick
        folium.PolyLine(
            locations=line_pts,
            color="#FBBF24",
            weight=2,
            opacity=0.8,
            dash_array="6, 6",
        ).add_to(fg_spill)

    # 4. Plot Origin Estimate (if delayed regime)
    if origin_estimate is not None:
        best_lat = getattr(origin_estimate, "best_guess_lat", None)
        best_lon = getattr(origin_estimate, "best_guess_lon", None)
        if best_lat is not None and best_lon is not None:
            origin_popup_html = f"""
            <div style="font-family: sans-serif; min-width: 180px;">
                <h4 style="margin: 0 0 5px 0; color: #D97706;">Estimated Release Origin</h4>
                <p style="margin: 2px 0; font-size: 13px;"><strong>Best Guess:</strong> ({best_lat:.5f}&deg;, {best_lon:.5f}&deg;)</p>
                <p style="margin: 2px 0; font-size: 12px; color: #6B7280;">Backtracked via Lagrangian reverse-time advection</p>
            </div>
            """
            folium.Marker(
                location=[best_lat, best_lon],
                popup=folium.Popup(origin_popup_html, max_width=300),
                icon=folium.Icon(color="orange", icon="crosshairs", prefix="fa"),
                tooltip="Estimated Release Origin (Best Guess)",
            ).add_to(fg_drift)

        # Minimum Regret GeoJSON Polygon
        min_regret = getattr(origin_estimate, "minimum_regret_geojson", None)
        if min_regret:
            folium.GeoJson(
                min_regret,
                name="Origin Uncertainty (Minimum Regret)",
                style_function=lambda x: {
                    "color": "#F59E0B",
                    "weight": 2.5,
                    "fillColor": "#F59E0B",
                    "fillOpacity": 0.22,
                    "dashArray": "4, 4",
                },
                tooltip="Origin Region: Minimum Regret 95% Confidence Bound",
            ).add_to(fg_drift)

    # 5. Plot Candidate Vessel Tracks with telemetry popups & CPA markers
    rank_colors = {
        1: "#DC2626",  # Rank 1: Vivid Coral Red / Amber (#DC2626)
        2: "#2563EB",  # Rank 2: Electric Blue (#2563EB)
        3: "#7C3AED",  # Rank 3: Vivid Purple (#7C3AED)
    }
    default_color = "#64748B"

    # Map MMSI to score metadata
    scores_dict = {}
    if not scores_df.empty and "mmsi" in scores_df.columns:
        for _, row in scores_df.iterrows():
            scores_dict[int(row["mmsi"])] = row.to_dict()

    if not reconstructed_df.empty:
        for mmsi, group in reconstructed_df.groupby("mmsi"):
            mmsi_int = int(mmsi)
            score_data = scores_dict.get(mmsi_int, {})
            rank = int(score_data.get("final_rank", 999))
            vessel_name = str(group["vessel_name"].iloc[0])
            sog_max = float(group["sog_knots"].max()) if "sog_knots" in group.columns else 0.0
            sog_mean = float(group["sog_knots"].mean()) if "sog_knots" in group.columns else 0.0
            length_val = group["length_m"].dropna().iloc[0] if "length_m" in group.columns and not group["length_m"].dropna().empty else None
            draft_val = group["draft_m"].dropna().iloc[0] if "draft_m" in group.columns and not group["draft_m"].dropna().empty else None

            is_top3 = rank <= 3
            color = rank_colors.get(rank, default_color)
            weight = 5 if rank == 1 else (4 if is_top3 else 2)
            opacity = 0.95 if is_top3 else 0.45

            target_fg = fg_top_vessels if is_top3 else fg_other_vessels

            pts = group.sort_values("timestamp")[["lat", "lon"]].values.tolist()
            if len(pts) > 1:
                # Build rich popup
                conf_label = score_data.get("confidence_label", "N/A")
                conf_score = score_data.get("confidence_score", 0.0)
                frechet_val = score_data.get("frechet_km", 0.0)
                dcpa_val = score_data.get("dcpa_km", 0.0)
                tcpa_val = score_data.get("tcpa_minutes", 0.0)
                cov_val = score_data.get("coverage_completeness", 1.0) * 100.0

                badge_color = "#10B981" if conf_label == "HIGH" else ("#F59E0B" if conf_label == "MEDIUM" else "#64748B")

                popup_html = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 240px; padding: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h4 style="margin: 0; color: #0F172A; font-size: 15px;">{vessel_name}</h4>
                        <span style="background: {badge_color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">
                            Rank #{rank} ({conf_label})
                        </span>
                    </div>
                    <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="color: #64748B; padding: 3px 0;">MMSI:</td><td style="font-weight: 600; text-align: right;">{mmsi_int}</td></tr>
                        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="color: #64748B; padding: 3px 0;">Fr&eacute;chet Parity:</td><td style="font-weight: 600; text-align: right;">{frechet_val:.2f} km</td></tr>
                        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="color: #64748B; padding: 3px 0;">DCPA to Spill:</td><td style="font-weight: 600; text-align: right;">{dcpa_val:.2f} km</td></tr>
                        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="color: #64748B; padding: 3px 0;">TCPA Offset:</td><td style="font-weight: 600; text-align: right;">{tcpa_val:+.1f} min</td></tr>
                        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="color: #64748B; padding: 3px 0;">Speed (Max / Avg):</td><td style="font-weight: 600; text-align: right;">{sog_max:.1f} / {sog_mean:.1f} kts</td></tr>
                        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="color: #64748B; padding: 3px 0;">AIS Integrity:</td><td style="font-weight: 600; text-align: right;">{cov_val:.1f}% un-interpolated</td></tr>
                        {f'<tr><td style="color: #64748B; padding: 3px 0;">Length / Draft:</td><td style="font-weight: 600; text-align: right;">{length_val:.0f}m / {draft_val:.1f}m</td></tr>' if length_val and draft_val else ''}
                    </table>
                </div>
                """

                # Polyline for track
                folium.PolyLine(
                    locations=pts,
                    color=color,
                    weight=weight,
                    opacity=opacity,
                    popup=folium.Popup(popup_html, max_width=320),
                    tooltip=f"Rank #{rank}: {vessel_name} (MMSI: {mmsi_int}) | CPA: {dcpa_val:.2f} km",
                ).add_to(target_fg)

                # Add Start / End icons for Top 3 vessels
                if is_top3:
                    start_pt = pts[0]
                    end_pt = pts[-1]

                    folium.CircleMarker(
                        location=start_pt,
                        radius=4,
                        color=color,
                        fill=True,
                        fill_color=color,
                        fill_opacity=1.0,
                        tooltip=f"{vessel_name} - Track Start",
                    ).add_to(target_fg)

                    folium.CircleMarker(
                        location=end_pt,
                        radius=6,
                        color="#000000",
                        weight=2,
                        fill=True,
                        fill_color=color,
                        fill_opacity=1.0,
                        tooltip=f"{vessel_name} - Track End",
                    ).add_to(target_fg)

                    # Compute and place Closest Point of Approach (CPA) marker on track
                    cpa_center_lat = getattr(origin_estimate, "best_guess_lat", spill_lat) if origin_estimate else spill_lat
                    cpa_center_lon = getattr(origin_estimate, "best_guess_lon", spill_lon) if origin_estimate else spill_lon

                    lats_arr = np.array([p[0] for p in pts])
                    lons_arr = np.array([p[1] for p in pts])
                    dists_sq = (lats_arr - cpa_center_lat)**2 + ((lons_arr - cpa_center_lon) * np.cos(np.radians(cpa_center_lat)))**2
                    min_idx = int(np.argmin(dists_sq))
                    cpa_pt = pts[min_idx]

                    cpa_popup = f"""
                    <div style="font-family: sans-serif; font-size: 12px;">
                        <strong>Closest Approach Point:</strong> {vessel_name}<br>
                        <strong>DCPA:</strong> {dcpa_val:.2f} km<br>
                        <strong>TCPA:</strong> {tcpa_val:+.1f} min relative to spill
                    </div>
                    """
                    folium.CircleMarker(
                        location=cpa_pt,
                        radius=7,
                        color="#FFFFFF",
                        weight=2,
                        fill=True,
                        fill_color=color,
                        fill_opacity=0.95,
                        popup=folium.Popup(cpa_popup, max_width=250),
                        tooltip=f"CPA of {vessel_name}: {dcpa_val:.2f} km",
                    ).add_to(fg_cpa)

    # 6. Interactive Controls: Fullscreen, Measure, and Layer Control
    plugins.Fullscreen(position="topleft", title="Fullscreen View").add_to(m)
    plugins.MeasureControl(
        position="topleft",
        primary_length_unit="kilometers",
        secondary_length_unit="miles",
        primary_area_unit="sqkilometers",
    ).add_to(m)
    folium.LayerControl(position="topright", collapsed=False).add_to(m)

    # 7. Floating Responsive Interactive Legend
    legend_html = """
    <div style="
        position: fixed;
        bottom: 25px;
        left: 25px;
        z-index: 9999;
        background: rgba(15, 23, 42, 0.92);
        color: #F8FAFC;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        line-height: 1.6;
        border: 1px solid #334155;
        backdrop-filter: blur(4px);
        max-width: 260px;
    ">
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #38BDF8; border-bottom: 1px solid #334155; padding-bottom: 4px;">
            Geospatial Evidence Layers
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 14px; height: 14px; background: #EF4444; border-radius: 50%; margin-right: 8px; opacity: 0.8;"></span>
            <span>Observed Spill Envelope</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 16px; height: 4px; background: #FBBF24; margin-right: 8px; border: 1px dashed #000;"></span>
            <span>Slick Centerline</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 16px; height: 4px; background: #DC2626; margin-right: 8px; border-radius: 2px;"></span>
            <span><strong>Rank #1 Primary Suspect</strong></span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 16px; height: 4px; background: #2563EB; margin-right: 8px; border-radius: 2px;"></span>
            <span>Rank #2 Candidate Track</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 16px; height: 4px; background: #7C3AED; margin-right: 8px; border-radius: 2px;"></span>
            <span>Rank #3 Candidate Track</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="display: inline-block; width: 14px; height: 14px; background: #64748B; border-radius: 2px; margin-right: 8px; opacity: 0.5;"></span>
            <span>Other Filtered Traffic</span>
        </div>
        <div style="display: flex; align-items: center;">
            <span style="display: inline-block; width: 14px; height: 14px; background: #F59E0B; border-radius: 50%; margin-right: 8px; opacity: 0.8;"></span>
            <span>Drift Backtrack Origin</span>
        </div>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    m.save(str(output_html_path))
    return str(output_html_path)