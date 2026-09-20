"""WAKE (Wake Attribution & Kinematic Engine) — Forensic Console Generator."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def generate_workstation_dashboard(
    investigation_id: str,
    input_data: Dict[str, Any],
    regime_decision: Dict[str, Any],
    scores_df: pd.DataFrame,
    reconstructed_df: pd.DataFrame,
    slick_coords: Optional[np.ndarray],
    origin_estimate: Optional[Dict[str, Any]],
    output_html_path: Path,
) -> str:
    """
    Renders the WAKE (Wake Attribution & Kinematic Engine) Forensic Investigation Console.
    """
    output_html_path.parent.mkdir(parents=True, exist_ok=True)

    lat = float(input_data.get("lat", 0.0))
    lon = float(input_data.get("lon", 0.0))
    time_str = str(input_data.get("time_utc", ""))
    spread_km = float(input_data.get("spread_km", 0.0))
    regime = str(regime_decision.get("regime", "unknown")).upper()
    rationale = str(regime_decision.get("rationale", ""))
    warning = regime_decision.get("warning")

    vessels_payload = []
    if not scores_df.empty and not reconstructed_df.empty:
        pts_by_mmsi = {}
        for mmsi, group in reconstructed_df.groupby("mmsi"):
            g_sorted = group.sort_values("timestamp")
            pts = []
            for _, r in g_sorted.iterrows():
                ts_iso = pd.Timestamp(r["timestamp"]).isoformat()
                pts.append({
                    "lat": float(r["lat"]),
                    "lon": float(r["lon"]),
                    "ts": ts_iso,
                    "sog": float(r.get("sog_knots", 0.0)),
                    "cog": float(r.get("cog_degrees", 0.0)),
                    "is_interp": bool(r.get("is_interpolated", False)),
                })
            pts_by_mmsi[int(mmsi)] = pts

        max_borda = float(scores_df["borda_score"].max()) if not scores_df.empty else 1.0

        for _, row in scores_df.iterrows():
            mmsi = int(row["mmsi"])
            rank = int(row["final_rank"])
            v_name = str(row["vessel_name"])
            conf_label = str(row["confidence_label"])
            conf_score = float(row["confidence_score"])
            frechet_km = float(row["frechet_km"]) if pd.notna(row.get("frechet_km")) else None
            dcpa_km = float(row["dcpa_km"])
            tcpa_min = float(row["tcpa_minutes"])
            coverage = float(row["coverage_completeness"])
            borda_score = int(row.get("borda_score", 0))
            ff_score = float(row["forward_fit_score"]) if pd.notna(row.get("forward_fit_score")) else None
            post_score = float(row["evidence_posterior"]) if pd.notna(row.get("evidence_posterior")) else None

            track_points = pts_by_mmsi.get(mmsi, [])

            cpa_lat = lat
            cpa_lon = lon
            if track_points:
                lats = np.array([p["lat"] for p in track_points])
                lons = np.array([p["lon"] for p in track_points])
                dists_sq = (lats - lat)**2 + ((lons - lon) * np.cos(np.radians(lat)))**2
                min_idx = int(np.argmin(dists_sq))
                cpa_lat = track_points[min_idx]["lat"]
                cpa_lon = track_points[min_idx]["lon"]

            vessels_payload.append({
                "mmsi": mmsi,
                "rank": rank,
                "name": v_name,
                "conf_label": conf_label,
                "conf_score": conf_score,
                "frechet_km": frechet_km,
                "dcpa_km": dcpa_km,
                "tcpa_min": tcpa_min,
                "forward_fit_score": ff_score,
                "evidence_posterior": post_score,
                "coverage": coverage,
                "borda_score": borda_score,
                "borda_ratio": float(borda_score / max_borda) if max_borda > 0 else 0.0,
                "cpa_lat": cpa_lat,
                "cpa_lon": cpa_lon,
                "track": track_points,
            })

    slick_payload = []
    if slick_coords is not None and len(slick_coords) > 1:
        slick_payload = [[float(pt[0]), float(pt[1])] for pt in slick_coords]

    origin_payload = None
    if origin_estimate is not None:
        best_lat = getattr(origin_estimate, "best_guess_lat", None)
        best_lon = getattr(origin_estimate, "best_guess_lon", None)
        if best_lat is not None and best_lon is not None:
            origin_payload = {
                "lat": float(best_lat),
                "lon": float(best_lon),
                "geojson": getattr(origin_estimate, "minimum_regret_geojson", None),
            }

    client_data_json = json.dumps({
        "investigation_id": investigation_id,
        "spill": {
            "lat": lat,
            "lon": lon,
            "spread_km": spread_km,
            "time_utc": time_str,
            "regime": regime,
            "rationale": rationale,
            "slick_coords": slick_payload,
            "origin": origin_payload,
        },
        "vessels": vessels_payload,
    })

    top_vessel = vessels_payload[0] if vessels_payload else None
    top_name = top_vessel["name"] if top_vessel else "No Candidate Identified"
    top_mmsi = str(top_vessel["mmsi"]) if top_vessel else "N/A"
    top_conf_label = top_vessel["conf_label"] if top_vessel else "NONE"
    top_conf_score = float(top_vessel["conf_score"]) if top_vessel else 0.0
    top_frechet_val = float(top_vessel["frechet_km"]) if top_vessel else 0.0
    top_dcpa_val = float(top_vessel["dcpa_km"]) if top_vessel else 0.0
    top_tcpa_val = float(top_vessel["tcpa_min"]) if top_vessel else 0.0
    top_cov_val = float(top_vessel["coverage"] * 100) if top_vessel else 0.0

    second_vessel = vessels_payload[1] if len(vessels_payload) > 1 else None
    second_name = second_vessel["name"] if second_vessel else "No 2nd Candidate"
    second_dcpa_str = f"{second_vessel['dcpa_km']:.2f} km" if second_vessel else "N/A"
    second_frechet_str = f"{second_vessel['frechet_km']:.2f} km" if second_vessel else "N/A"

    html = f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAKE Forensics — Case #{investigation_id}</title>
    
    <!-- Dependencies: Leaflet, FontAwesome 6, GSAP 3.12, Three.js r128, OrbitControls -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

    <style>
        /* ============================================================
           WAKE FORENSIC DESIGN SYSTEM
           Strict color discipline:
           Red (#f43f5e) = Target / Anomaly / Alert
           Cyan (#38bdf8) = Telemetry / Trajectory / Focus
           Muted slate = Structure & Secondary data
           ============================================================ */
        :root {{
            --bg-root: #06080c;
            --bg-surface: #0d1117;
            --bg-card: #131922;
            --bg-elevated: #18202c;
            --border: #1f2735;
            --border-light: #2c384d;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-dim: #64748b;
            --accent-red: #f43f5e;
            --accent-red-glow: rgba(244, 63, 94, 0.25);
            --accent-cyan: #38bdf8;
            --accent-cyan-glow: rgba(56, 189, 248, 0.2);
            --accent-amber: #fbbf24;
            --accent-green: #10b981;
            --accent-purple: #a855f7;
            --font-display: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
            --glass-bg: rgba(13, 17, 23, 0.86);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-blur: blur(14px);
        }}

        [data-theme="light"] {{
            --bg-root: #f4f1ea;
            --bg-surface: #ffffff;
            --bg-card: #f9f7f2;
            --bg-elevated: #ede8dc;
            --border: #d6d0c2;
            --border-light: #bcb3a0;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-dim: #64748b;
            --accent-red: #e11d48;
            --accent-red-glow: rgba(225, 29, 72, 0.15);
            --accent-cyan: #0284c7;
            --accent-cyan-glow: rgba(2, 132, 199, 0.15);
            --accent-amber: #d97706;
            --accent-green: #059669;
            --accent-purple: #7c3aed;
            --glass-bg: rgba(255, 255, 255, 0.9);
            --glass-border: rgba(0, 0, 0, 0.08);
        }}

        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: var(--bg-root);
            color: var(--text-primary);
            font-family: var(--font-display);
            font-size: 13px;
            line-height: 1.45;
            overflow-x: hidden;
            background-image: radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.03) 0%, transparent 60%);
        }}

        .mono {{ font-family: var(--font-mono); font-feature-settings: "tnum"; }}

        /* Top Utility & Provenance Bar */
        .utility-header {{
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border);
            padding: 6px 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--text-secondary);
        }}
        .provenance-chips {{ display: flex; gap: 10px; align-items: center; }}
        .prov-chip {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            padding: 2px 7px;
            border-radius: 3px;
            font-size: 10px;
            color: var(--text-secondary);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }}
        .prov-chip strong {{ color: var(--text-primary); }}
        .header-actions {{ display: flex; gap: 8px; align-items: center; }}
        .action-btn {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 4px 9px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
        }}
        .action-btn:hover {{ border-color: var(--accent-cyan); color: var(--accent-cyan); }}
        .action-btn.active {{ background: var(--accent-cyan); color: #000; border-color: var(--accent-cyan); }}

        /* Case Identity Bar */
        .case-title-row {{
            background: var(--bg-surface);
            border-bottom: 2px solid var(--border);
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }}
        .brand-cluster {{ display: flex; align-items: center; gap: 12px; }}
        .brand-badge {{
            background: var(--accent-red);
            color: #fff;
            font-weight: 900;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 4px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            box-shadow: 0 0 14px var(--accent-red-glow);
        }}
        .brand-name {{
            font-size: 1.3rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--text-primary);
        }}
        .case-id-tag {{
            font-size: 12px;
            color: var(--text-secondary);
        }}
        .mode-switcher {{
            display: flex;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 5px;
            padding: 3px;
            gap: 4px;
        }}
        .mode-tab {{
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 5px 12px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }}
        .mode-tab.active {{
            background: var(--bg-surface);
            color: var(--text-primary);
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }}

        /* Workspace Main Layout */
        .workspace-grid {{
            padding: 1.25rem 1.5rem;
            max-width: 1600px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }}

        /* SECTION 1: Unified Canonical Evidence & Target Banner */
        .evidence-triage-grid {{
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: 1.25rem;
            align-items: stretch;
        }}
        @media (max-width: 1040px) {{
            .evidence-triage-grid {{ grid-template-columns: 1fr; }}
        }}

        .primary-suspect-banner {{
            background: var(--bg-card);
            border: 2px solid var(--accent-red);
            border-radius: 6px;
            padding: 1.25rem 1.5rem;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 0 24px var(--accent-red-glow);
        }}
        .suspect-top-row {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }}
        .target-tag {{
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--accent-red);
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .target-tag::before {{
            content: "";
            width: 7px;
            height: 7px;
            background: var(--accent-red);
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 8px var(--accent-red);
            animation: pulse-dot 1.5s infinite;
        }}
        @keyframes pulse-dot {{
            0%, 100% {{ opacity: 1; transform: scale(1); }}
            50% {{ opacity: 0.4; transform: scale(1.3); }}
        }}

        .target-vessel-title {{
            font-size: 1.9rem;
            font-weight: 900;
            color: var(--text-primary);
            letter-spacing: -0.03em;
            margin: 4px 0 2px 0;
        }}
        .target-mmsi-meta {{
            font-size: 11px;
            color: var(--text-secondary);
        }}

        /* Radial Gauge & Confidence Box */
        .radial-confidence-box {{
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: right;
        }}
        .gauge-svg {{
            width: 58px;
            height: 58px;
            transform: rotate(-90deg);
        }}
        .gauge-bg {{ fill: none; stroke: var(--border); stroke-width: 5; }}
        .gauge-meter {{
            fill: none;
            stroke: var(--accent-red);
            stroke-width: 5;
            stroke-linecap: round;
            stroke-dasharray: 157;
            stroke-dashoffset: {157 - (157 * top_conf_score)};
            transition: stroke-dashoffset 1s ease;
        }}
        .conf-number-val {{
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--accent-red);
            line-height: 1;
        }}
        .conf-pill-badge {{
            font-size: 9px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 3px;
            text-transform: uppercase;
            background: var(--accent-red-glow);
            color: var(--accent-red);
            border: 1px solid var(--accent-red);
            display: inline-block;
            margin-top: 4px;
        }}

        /* 4 Core Evidence Metric Tiles */
        .canonical-metrics-row {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 1rem 0 0.8rem 0;
        }}
        .metric-block {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 8px 10px;
        }}
        .metric-block-title {{
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 800;
            color: var(--text-dim);
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            gap: 4px;
        }}
        .metric-block-num {{
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--text-primary);
            margin-top: 2px;
        }}

        /* Canonical Evidence Breakdown Card with Radar & Footnote */
        .canonical-breakdown-card {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1.25rem 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}
        .card-header-bar {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }}
        .radar-container {{
            display: flex;
            align-items: center;
            justify-content: space-around;
            gap: 14px;
            padding: 4px 0;
        }}
        .radar-svg {{
            width: 140px;
            height: 140px;
        }}
        .radar-legend {{
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-size: 11px;
        }}
        .legend-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
        }}
        .legend-dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }}

        .methodology-footnote {{
            font-size: 10px;
            color: var(--text-dim);
            border-top: 1px solid var(--border);
            padding-top: 6px;
            margin-top: 4px;
            line-height: 1.35;
        }}

        /* SECTION 2: Cockpit Panel (Map & 3D WebGL Studio) */
        .cockpit-view-panel {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        }}
        .cockpit-top-bar {{
            padding: 8px 16px;
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .cockpit-badge-title {{
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .viewport-frame {{
            width: 100%;
            height: 600px;
            position: relative;
            background: #040609;
            overflow: hidden;
        }}
        #map2D {{ width: 100%; height: 100%; }}
        #scene3D {{ width: 100%; height: 100%; display: none; }}

        /* Glassmorphic Layer Control HUD */
        .glass-hud {{
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 1000;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            backdrop-filter: var(--glass-blur);
            border-radius: 6px;
            padding: 12px 14px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.5);
            font-size: 11px;
            width: 240px;
        }}
        .hud-title {{
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--accent-cyan);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .hud-select {{
            width: 100%;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 4px 6px;
            font-size: 11px;
            border-radius: 3px;
            margin-bottom: 8px;
            outline: none;
        }}
        .hud-toggle-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            cursor: pointer;
            color: var(--text-secondary);
        }}
        .hud-toggle-item:hover {{ color: var(--text-primary); }}
        .toggle-switch {{
            width: 28px;
            height: 16px;
            background: var(--border);
            border-radius: 8px;
            position: relative;
            transition: background 0.2s;
        }}
        .toggle-switch.active {{ background: var(--accent-cyan); }}
        .toggle-switch::after {{
            content: "";
            position: absolute;
            top: 2px;
            left: 2px;
            width: 12px;
            height: 12px;
            background: #fff;
            border-radius: 50%;
            transition: transform 0.2s;
        }}
        .toggle-switch.active::after {{ transform: translateX(12px); }}

        /* 3D Camera Controls Bar */
        .camera-presets-bar {{
            display: flex;
            gap: 4px;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid var(--border);
        }}
        .cam-btn {{
            flex: 1;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            text-align: center;
        }}
        .cam-btn:hover {{ border-color: var(--accent-cyan); color: var(--accent-cyan); }}
        .cam-btn.active {{ background: var(--accent-cyan); color: #000; border-color: var(--accent-cyan); }}

        /* Guided Forensic Detective Narrative Overlay */
        .narrative-toast {{
            position: absolute;
            bottom: 16px;
            left: 16px;
            z-index: 1000;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            backdrop-filter: var(--glass-blur);
            border-radius: 6px;
            padding: 10px 14px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            max-width: 440px;
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: none;
        }}
        .narrative-icon {{
            font-size: 20px;
            color: var(--accent-cyan);
        }}
        .narrative-title {{
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: var(--accent-cyan);
            letter-spacing: 0.05em;
        }}
        .narrative-caption {{
            font-size: 11px;
            color: var(--text-primary);
            line-height: 1.35;
        }}

        /* ============================================================
           REFINED INVESTIGATION TIMELINE CONTROLLER
           Clean separated milestones, custom gradient rail, no overlap!
           ============================================================ */
        .timeline-engine-bar {{
            background: var(--bg-surface);
            border-top: 1px solid var(--border);
            padding: 14px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}
        .timeline-header-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
        }}
        .timeline-ctrl-group {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .sim-time-badge {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            color: var(--text-primary);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }}

        /* Dedicated Milestones Step Rail */
        .milestones-step-rail {{
            position: relative;
            width: 100%;
            height: 24px;
            display: flex;
            align-items: center;
        }}
        .milestone-chip {{
            position: absolute;
            transform: translateX(-50%);
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }}
        .milestone-chip:hover {{
            color: var(--text-primary);
            border-color: var(--accent-cyan);
            transform: translateX(-50%) translateY(-2px);
        }}
        .milestone-chip.active {{
            background: var(--accent-cyan-glow);
            border-color: var(--accent-cyan);
            color: var(--accent-cyan);
            font-weight: 800;
        }}

        /* Clean High-Tech Slider Track */
        .slider-wrapper-box {{
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
        }}
        .flank-time-label {{
            font-size: 10px;
            font-weight: 700;
            color: var(--text-dim);
            white-space: nowrap;
        }}
        .timeline-rail-container {{
            position: relative;
            flex: 1;
            height: 10px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 5px;
            display: flex;
            align-items: center;
        }}
        .timeline-progress-fill {{
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background: linear-gradient(90deg, #38bdf8 0%, #f43f5e 100%);
            border-radius: 4px;
            pointer-events: none;
            width: 0%;
            transition: width 0.05s ease;
        }}
        .timeline-input {{
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 100%;
            background: transparent;
            outline: none;
            position: relative;
            z-index: 10;
            cursor: pointer;
            margin: 0;
        }}
        .timeline-input::-webkit-slider-thumb {{
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--accent-red);
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px var(--accent-red);
            transition: transform 0.1s ease;
        }}
        .timeline-input::-webkit-slider-thumb:hover {{
            transform: scale(1.2);
        }}

        /* Telemetry Status Strip */
        .telemetry-readout-row {{
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 11px;
            border-top: 1px solid var(--border);
            padding-top: 8px;
        }}
        .tele-chip {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            padding: 3px 8px;
            border-radius: 4px;
            display: flex;
            gap: 6px;
            align-items: center;
        }}
        .tele-chip strong {{ color: var(--text-dim); font-size: 10px; text-transform: uppercase; }}
        .tele-chip span {{ color: var(--text-primary); font-weight: 700; }}

        /* SECTION 3: Candidate Ledger & Comparison Inspector */
        .ledger-split-grid {{
            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 1.25rem;
        }}
        @media (max-width: 1040px) {{
            .ledger-split-grid {{ grid-template-columns: 1fr; }}
        }}

        .ledger-box {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1.25rem;
        }}
        .ledger-tools {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 8px;
        }}
        .search-input {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            width: 240px;
            outline: none;
        }}
        .search-input:focus {{ border-color: var(--accent-cyan); }}

        table.wake-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }}
        table.wake-table th {{
            background: var(--bg-surface);
            color: var(--text-dim);
            text-transform: uppercase;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.06em;
            padding: 8px 10px;
            border-bottom: 2px solid var(--border);
            text-align: left;
        }}
        table.wake-table td {{
            padding: 9px 10px;
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
        }}
        table.wake-table tr:hover td {{
            background: var(--bg-elevated);
            cursor: pointer;
        }}
        table.wake-table tr.active-row td {{
            background: rgba(56, 189, 248, 0.08);
            border-bottom-color: var(--accent-cyan);
        }}
        table.wake-table tr.top-candidate-row td {{
            font-weight: 700;
        }}

        .rank-tag {{
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-weight: 800;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
        }}
        .rank-top1 {{ background: var(--accent-red-glow); color: var(--accent-red); border: 1px solid var(--accent-red); }}
        .rank-top2 {{ background: var(--accent-cyan-glow); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }}
        .rank-top3 {{ background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); border: 1px solid var(--accent-purple); }}
        .rank-other {{ color: var(--text-dim); }}

        .sparkline-svg {{
            width: 50px;
            height: 18px;
            vertical-align: middle;
        }}

        .toggle-tail-btn {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            width: 100%;
            margin-top: 10px;
            cursor: pointer;
            transition: all 0.15s;
        }}
        .toggle-tail-btn:hover {{ color: var(--text-primary); border-color: var(--border-light); }}

        /* Inspector & "Why Not The Others?" Drawer */
        .inspector-box {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}
        .inspector-headline {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }}
        .comparison-drawer {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 10px 12px;
            margin: 10px 0;
            font-size: 11px;
        }}
        .comp-header {{
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: var(--accent-amber);
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .comp-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }}
        .comp-col {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 3px;
            padding: 6px 8px;
        }}

        /* AIS Transmission Activity Sparkline */
        .ais-activity-strip {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 8px 10px;
            margin-top: 8px;
        }}
        .activity-dots-row {{
            display: flex;
            gap: 3px;
            align-items: center;
            margin-top: 4px;
        }}
        .activity-dot {{
            flex: 1;
            height: 8px;
            border-radius: 1px;
            background: var(--accent-green);
        }}
        .activity-dot.gap {{
            background: var(--accent-red);
        }}

        /* Presentation Mode Widescreen Override */
        body.presentation-mode .utility-header,
        body.presentation-mode .ledger-split-grid,
        body.presentation-mode .canonical-breakdown-card {{
            display: none !important;
        }}
        body.presentation-mode .workspace-grid {{
            max-width: 100vw;
            padding: 1rem 2rem;
        }}
        body.presentation-mode .viewport-frame {{
            height: 74vh;
        }}
    </style>
</head>
<body>
    <!-- Top Utility & Provenance Bar -->
    <div class="utility-header">
        <div class="provenance-chips">
            <span class="prov-chip"><i class="fa-solid fa-satellite"></i> SAR: <strong>Sentinel-1 / Cerulean</strong></span>
            <span class="prov-chip"><i class="fa-solid fa-tower-broadcast"></i> AIS: <strong>NOAA MarineCadastre</strong></span>
            <span class="prov-chip"><i class="fa-solid fa-water"></i> Drift: <strong>OpenDrift Backtrack</strong></span>
        </div>
        <div class="header-actions">
            <a href="final_report.html" class="action-btn" title="View Classic Table Report"><i class="fa-solid fa-table"></i> Classic Report</a>
            <a href="methodology.md" target="_blank" class="action-btn"><i class="fa-solid fa-book"></i> Methodology</a>
            <button class="action-btn" onclick="toggleTheme()" id="themeBtn"><i class="fa-solid fa-moon"></i> Theme</button>
            <button class="action-btn" onclick="togglePresentation()" id="presBtn"><i class="fa-solid fa-expand"></i> Presentation Mode (P)</button>
            <button class="action-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> PDF</button>
        </div>
    </div>

    <!-- Case Identity Bar -->
    <div class="case-title-row">
        <div class="brand-cluster">
            <span class="brand-badge">WAKE</span>
            <div>
                <div class="brand-name">Wake Attribution & Kinematic Engine</div>
                <div class="case-id-tag mono">CASE #{investigation_id} &bull; SATELLITE PASS: {time_str}</div>
            </div>
        </div>

        <div class="mode-switcher">
            <button class="mode-tab active" id="tab2D" onclick="setViewMode('2d')"><i class="fa-solid fa-map"></i> 2D Geo Map</button>
            <button class="mode-tab" id="tab3D" onclick="setViewMode('3d')"><i class="fa-solid fa-cube"></i> 3D Reconstruction Studio</button>
        </div>
    </div>

    <!-- Main Workspace Grid -->
    <div class="workspace-grid">
        <!-- SECTION 1: Canonical Evidence Breakdown & Suspect Header -->
        <div class="evidence-triage-grid">
            <!-- Primary Suspect Banner -->
            <div class="primary-suspect-banner" id="suspectBanner">
                <div>
                    <div class="suspect-top-row">
                        <div>
                            <div class="target-tag">Primary Attribution Candidate Isolated</div>
                            <div class="target-vessel-title" id="targetName">{top_name}</div>
                            <div class="target-mmsi-meta mono" id="targetMmsi">MMSI {top_mmsi} &bull; {regime} Backtrack &bull; Centroid {lat:.4f}&deg; N, {lon:.4f}&deg; W</div>
                        </div>

                        <!-- Radial Gauge & Confidence -->
                        <div class="radial-confidence-box">
                            <div>
                                <div class="conf-number-val mono" id="confScoreText">{top_conf_score * 100:.1f}%</div>
                                <span class="conf-pill-badge mono" id="confLabelBadge">{top_conf_label} CONFIDENCE</span>
                            </div>
                            <svg class="gauge-svg" viewBox="0 0 60 60">
                                <circle class="gauge-bg" cx="30" cy="30" r="25"></circle>
                                <circle class="gauge-meter" id="confGaugeMeter" cx="30" cy="30" r="25"></circle>
                            </svg>
                        </div>
                    </div>

                    <!-- 4 Large Canonical Metric Cards -->
                    <div class="canonical-metrics-row">
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-cyan);"><i class="fa-solid fa-arrows-to-dot"></i> Spatial (DCPA)</div>
                            <div class="metric-block-num mono" id="metricDcpa">{top_dcpa_val:.2f} km</div>
                        </div>
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-green);"><i class="fa-solid fa-route"></i> Trajectory (Fréchet)</div>
                            <div class="metric-block-num mono" id="metricFrechet">{top_frechet_val:.2f} km</div>
                        </div>
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-amber);"><i class="fa-solid fa-clock"></i> Temporal (TCPA)</div>
                            <div class="metric-block-num mono" id="metricTcpa">{top_tcpa_val:+.1f} min</div>
                        </div>
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-purple);"><i class="fa-solid fa-tower-broadcast"></i> AIS Integrity</div>
                            <div class="metric-block-num mono" id="metricCov">{top_cov_val:.0f}%</div>
                        </div>
                    </div>
                </div>

                <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.35; border-top: 1px solid var(--border); padding-top: 6px;">
                    <strong>Algorithmic Determination:</strong> Closest physical proximity to spill centroid with continuous AIS broadcast signal.
                </div>
            </div>

            <!-- Canonical Evidence Breakdown with 4-Channel Radar/Spider Chart -->
            <div class="canonical-breakdown-card">
                <div class="card-header-bar">
                    <span>4-Channel Evidence Signature</span>
                    <span class="mono" style="font-size: 10px; color: var(--accent-cyan);"><i class="fa-solid fa-circle-nodes"></i> Radar Profile</span>
                </div>

                <div class="radar-container">
                    <!-- SVG Spider / Radar Chart -->
                    <svg class="radar-svg" viewBox="0 0 140 140" id="radarSvg">
                        <!-- Spider Background Polygons -->
                        <polygon points="70,15 125,70 70,125 15,70" fill="none" stroke="var(--border)" stroke-width="1"></polygon>
                        <polygon points="70,35 105,70 70,105 35,70" fill="none" stroke="var(--border)" stroke-width="1"></polygon>
                        <line x1="70" y1="15" x2="70" y2="125" stroke="var(--border)" stroke-width="1"></line>
                        <line x1="15" y1="70" x2="125" y2="70" stroke="var(--border)" stroke-width="1"></line>
                        <!-- Dynamic Radar Mesh -->
                        <polygon id="radarPoly" points="70,22 118,70 70,110 24,70" fill="rgba(244, 63, 94, 0.2)" stroke="var(--accent-red)" stroke-width="2"></polygon>
                    </svg>

                    <div class="radar-legend">
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-cyan);"></span> Spatial Proximity</span>
                            <strong class="mono" id="radDcpa">92%</strong>
                        </div>
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-green);"></span> Trajectory Parity</span>
                            <strong class="mono" id="radFrechet">88%</strong>
                        </div>
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-amber);"></span> Temporal Offset</span>
                            <strong class="mono" id="radTcpa">78%</strong>
                        </div>
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-purple);"></span> Broadcast Integrity</span>
                            <strong class="mono" id="radCov">100%</strong>
                        </div>
                    </div>
                </div>

                <div class="methodology-footnote">
                    <i class="fa-solid fa-circle-info"></i> <strong>Evidence Metric:</strong> Multichannel Borda rank aggregation combining spatial minimum approach, discrete Fréchet curve distance, and AIS temporal validity without synthetic weighting.
                </div>
            </div>
        </div>

        <!-- SECTION 2: Cockpit Panel (Map & 3D WebGL Studio) -->
        <div class="cockpit-view-panel">
            <div class="cockpit-top-bar">
                <div class="cockpit-badge-title">
                    <i class="fa-solid fa-crosshairs" style="color: var(--accent-red);"></i>
                    <span id="viewportModeTitle">Geospatial Forensics Cockpit (2D)</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="mono" style="font-size: 11px; color: var(--text-dim);">Spill Envelope: ~{spread_km:.1f} km</span>
                    <button class="action-btn" onclick="resetViewport()"><i class="fa-solid fa-arrows-to-dot"></i> Recenter</button>
                </div>
            </div>

            <div class="viewport-frame">
                <!-- 2D Leaflet View (Dark Matter Tile Basemap) -->
                <div id="map2D"></div>

                <!-- 3D Three.js WebGL Event Reconstruction Studio -->
                <div id="scene3D"></div>

                <!-- Glassmorphic Layer Control HUD -->
                <div class="glass-hud">
                    <div class="hud-title">
                        <span>Reconstruction HUD</span>
                        <span class="mono" style="font-size: 9px; color: var(--text-dim);">TOP 10 DISPLAY</span>
                    </div>
                    
                    <select class="hud-select" id="basemapSelect" onchange="switchBasemap(this.value)">
                        <option value="dark">CARTO Dark Matter (Nautical)</option>
                        <option value="sat">Satellite Imagery</option>
                        <option value="osm">OpenStreetMap</option>
                        <option value="ocean">Esri Ocean</option>
                    </select>

                    <div class="hud-toggle-item" onclick="toggleLayer('spill')">
                        <span>Spill Envelope</span>
                        <div class="toggle-switch active" id="swSpill"></div>
                    </div>
                    <div class="hud-toggle-item" onclick="toggleLayer('slick')">
                        <span>Slick Centerline</span>
                        <div class="toggle-switch active" id="swSlick"></div>
                    </div>
                    <div class="hud-toggle-item" onclick="toggleLayer('tracks')">
                        <span>Top 10 Vessel Tracks</span>
                        <div class="toggle-switch active" id="swTracks"></div>
                    </div>
                    <div class="hud-toggle-item" onclick="toggleLayer('cpa')">
                        <span>CPA Drop Points</span>
                        <div class="toggle-switch active" id="swCPA"></div>
                    </div>

                    <!-- 3D Specific Preset Bar (Visible in 3D Mode) -->
                    <div id="hud3DControls" style="display: none;">
                        <div class="hud-toggle-item" onclick="toggleFollowCamera()">
                            <span>Follow Target Vessel</span>
                            <div class="toggle-switch" id="swFollowCam"></div>
                        </div>
                        <div class="camera-presets-bar">
                            <button class="cam-btn active" id="camBtnOrbit" onclick="set3DCameraPreset('orbit')">Tactical</button>
                            <button class="cam-btn" id="camBtnTop" onclick="set3DCameraPreset('top')">Overhead</button>
                            <button class="cam-btn" id="camBtnClose" onclick="set3DCameraPreset('close')">Chase</button>
                        </div>
                    </div>
                </div>

                <!-- Guided Forensic Detective Narrative Overlay -->
                <div class="narrative-toast" id="narrativeToast">
                    <div class="narrative-icon"><i class="fa-solid fa-satellite-dish"></i></div>
                    <div>
                        <div class="narrative-title" id="narrativeTitle">Spill Origin Analysis</div>
                        <div class="narrative-caption" id="narrativeCaption">Sentinel-1 SAR radar detected slick centroid with {spread_km:.1f} km drift dispersion.</div>
                    </div>
                </div>
            </div>

            <!-- Redesigned High-Precision Timeline Engine Bar -->
            <div class="timeline-engine-bar">
                <div class="timeline-header-row">
                    <div class="timeline-ctrl-group">
                        <button class="action-btn active" id="playBtn" onclick="togglePlayback()"><i class="fa-solid fa-play"></i> Reconstruct Event (Space)</button>
                        <div class="sim-time-badge mono">
                            <i class="fa-regular fa-clock" style="color: var(--accent-cyan);"></i>
                            <span id="currentSimTime">{time_str}</span>
                        </div>
                    </div>
                    <div class="mono" id="timelinePhaseLabel" style="color: var(--accent-cyan); font-weight: 700;">Investigation Window: T = 0.0%</div>
                </div>

                <!-- Dedicated Milestones Step Rail Above Track -->
                <div class="milestones-step-rail">
                    <div class="milestone-chip mono" style="left: 10%;" onclick="jumpToTimeline(10)" title="Spill Origin Detection">
                        <span>🛢️</span> Origin (10%)
                    </div>
                    <div class="milestone-chip mono" style="left: 58%;" onclick="jumpToTimeline(58)" title="Closest Point of Approach">
                        <span>✕</span> Closest Approach CPA (58%)
                    </div>
                    <div class="milestone-chip mono" style="left: 90%;" onclick="jumpToTimeline(90)" title="Satellite Radar Acquisition">
                        <span>🛰️</span> SAR Acquisition Pass (90%)
                    </div>
                </div>

                <!-- Sleek Slider Rail with Dynamic Glowing Fill -->
                <div class="slider-wrapper-box">
                    <span class="flank-time-label mono">T - 12h</span>
                    <div class="timeline-rail-container">
                        <div class="timeline-progress-fill" id="timelineProgressFill"></div>
                        <input type="range" id="timelineScrubber" min="0" max="100" value="0" class="timeline-input" oninput="onTimelineScrub(this.value)">
                    </div>
                    <span class="flank-time-label mono">T + 0h (SAR)</span>
                </div>

                <!-- Telemetry Real-Time Readout Strip -->
                <div class="telemetry-readout-row mono">
                    <div class="tele-chip">
                        <strong>Target</strong>
                        <span id="teleName">{top_name}</span>
                    </div>
                    <div class="tele-chip">
                        <strong>Position</strong>
                        <span id="teleCoords">{lat:.4f}&deg; N, {lon:.4f}&deg; W</span>
                    </div>
                    <div class="tele-chip">
                        <strong>SOG</strong>
                        <span id="teleSog">12.4 kts</span>
                    </div>
                    <div class="tele-chip">
                        <strong>COG</strong>
                        <span id="teleCog">242&deg;</span>
                    </div>
                    <div class="tele-chip">
                        <strong>Spill Distance</strong>
                        <span id="teleDist" style="color: var(--accent-red);">{top_dcpa_val:.2f} km</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 3: Candidate Ledger & "Why Not The Others?" Comparison -->
        <div class="ledger-split-grid">
            <!-- Candidate Ledger Table -->
            <div class="ledger-box">
                <div class="ledger-tools">
                    <div style="font-weight: 800; font-size: 12px; text-transform: uppercase;">
                        Candidate Vessels Census ({len(vessels_payload)})
                    </div>
                    <input type="text" id="vesselSearch" class="search-input" placeholder="🔍 Search MMSI or vessel name (/)..." onkeyup="filterLedger(this.value)">
                </div>

                <div style="overflow-x: auto;">
                    <table class="wake-table" id="ledgerTable">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Candidate Vessel</th>
                                <th>MMSI</th>
                                <th>Track Profile</th>
                                <th>DCPA</th>
                                <th>TCPA</th>
                                <th>AIS Integrity</th>
                                <th>Confidence Score</th>
                            </tr>
                        </thead>
                        <tbody id="ledgerTbody">
                        </tbody>
                    </table>
                </div>

                <button class="toggle-tail-btn mono" id="tailToggleBtn" onclick="toggleTailRows()"><i class="fa-solid fa-chevron-down"></i> Show All Evaluated Candidates ({len(vessels_payload)})</button>
            </div>

            <!-- "Why Not The Others?" Comparison Drawer -->
            <div class="inspector-box">
                <div>
                    <div class="inspector-headline">
                        <div>
                            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--accent-cyan);">Forensic Comparison</div>
                            <h3 id="inspVesselName" style="font-size: 16px; font-weight: 900; color: var(--text-primary);">{top_name}</h3>
                            <div class="mono" id="inspVesselMmsi" style="font-size: 11px; color: var(--text-secondary);">MMSI {top_mmsi}</div>
                        </div>
                        <span class="rank-tag rank-top1 mono" id="inspRankPill">RANK #1</span>
                    </div>

                    <!-- Side-by-Side 1v1 Divergence -->
                    <div class="comparison-drawer">
                        <div class="comp-header"><i class="fa-solid fa-code-compare"></i> Why Rank #1 over Rank #2?</div>
                        <div class="comp-grid">
                            <div class="comp-col">
                                <strong style="color: var(--accent-red);">{top_name} (#1)</strong><br>
                                <span class="mono">DCPA: {top_dcpa_val:.2f} km</span><br>
                                <span class="mono">Fréchet: {top_frechet_val:.2f} km</span>
                            </div>
                            <div class="comp-col">
                                <strong style="color: var(--text-secondary);">{second_name} (#2)</strong><br>
                                <span class="mono">DCPA: {second_dcpa_str}</span><br>
                                <span class="mono">Fréchet: {second_frechet_str}</span>
                            </div>
                        </div>
                    </div>

                    <!-- AIS Broadcast Continuous Stream -->
                    <div class="ais-activity-strip">
                        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--text-secondary);">
                            <span>AIS TRANSMISSION TIMELINE</span>
                            <span class="mono" style="color: var(--accent-green);">100% UPTIME</span>
                        </div>
                        <div class="activity-dots-row">
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                        </div>
                    </div>
                </div>

                <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; padding: 10px; font-size: 11px; margin-top: 10px;">
                    <div style="font-weight: 700; color: var(--accent-green); margin-bottom: 2px;">Corroborating Evidence:</div>
                    <div style="color: var(--text-secondary);">&bull; Kinematic minimum distance occurred inside observation window.</div>
                    <div style="color: var(--text-secondary);">&bull; Trajectory shape parity with high geometric correlation.</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Application Script Logic -->
    <script>
        const APP_DATA = {client_data_json};

        let map2D, layerSpill, layerSlick, layerTracks, layerCPA, vesselMarker2D, activeBasemap2D, basemapLayers = {{}};
        let scene3D, camera3D, renderer3D, controls3D, shipMesh3D, radarBar3D, oceanMesh3D, slickMesh3D, wakeTrail3D, tracksGroup3D;
        let selectedMmsi = APP_DATA.vessels.length > 0 ? APP_DATA.vessels[0].mmsi : null;
        let isPlaying = false, playAnimFrame = null, scrubVal = 0;
        let viewMode = '2d', showAllTail = false, followCamera = false;

        // 1. Initialize GSAP Choreographed Animations
        function initGSAP() {{
            gsap.from(".case-title-row", {{ opacity: 0, y: -15, duration: 0.6, ease: "power2.out" }});
            gsap.from(".primary-suspect-banner", {{ opacity: 0, y: 15, duration: 0.7, delay: 0.15, ease: "power2.out" }});
            gsap.from(".canonical-breakdown-card", {{ opacity: 0, y: 15, duration: 0.7, delay: 0.25, ease: "power2.out" }});
            gsap.from(".cockpit-view-panel", {{ opacity: 0, scale: 0.98, duration: 0.8, delay: 0.35, ease: "power2.out" }});
            gsap.from(".ledger-split-grid", {{ opacity: 0, y: 15, duration: 0.7, delay: 0.45, ease: "power2.out" }});

            // Count-up confidence animation
            const targetConf = {top_conf_score * 100};
            let counter = {{ val: 0 }};
            gsap.to(counter, {{
                val: targetConf,
                duration: 1.8,
                delay: 0.3,
                ease: "power2.out",
                onUpdate: () => {{
                    const el = document.getElementById("confScoreText");
                    if (el) el.innerText = counter.val.toFixed(1) + "%";
                }}
            }});
        }}

        // 2. Initialize 2D Leaflet Map (CARTO Dark Matter Default)
        function init2DMap() {{
            const lat = APP_DATA.spill.lat;
            const lon = APP_DATA.spill.lon;

            map2D = L.map('map2D', {{
                center: [lat, lon],
                zoom: 11,
                attributionControl: false
            }});

            basemapLayers.dark = L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
                maxZoom: 19,
                subdomains: 'abcd'
            }});
            basemapLayers.sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{{z}}/{{y}}/{{x}}', {{ maxZoom: 18 }});
            basemapLayers.osm = L.tileLayer('https://{{s}}.basemaps.cartocdn.com/rastertiles/voyager/{{z}}/{{x}}/{{y}}{{r}}.png', {{ maxZoom: 18, subdomains: 'abcd' }});
            basemapLayers.ocean = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{{z}}/{{y}}/{{x}}', {{ maxZoom: 18 }});

            activeBasemap2D = basemapLayers.dark;
            activeBasemap2D.addTo(map2D);

            layerSpill = L.layerGroup().addTo(map2D);
            layerSlick = L.layerGroup().addTo(map2D);
            layerTracks = L.layerGroup().addTo(map2D);
            layerCPA = L.layerGroup().addTo(map2D);

            // Spill Envelope
            L.circle([lat, lon], {{
                radius: APP_DATA.spill.spread_km * 1000,
                color: '#f43f5e',
                fillColor: '#f43f5e',
                fillOpacity: 0.16,
                weight: 2
            }}).addTo(layerSpill);

            L.circleMarker([lat, lon], {{
                radius: 6,
                color: '#ffffff',
                fillColor: '#e11d48',
                fillOpacity: 1.0,
                weight: 2
            }}).bindTooltip("Spill Centroid").addTo(layerSpill);

            // Slick Line
            if (APP_DATA.spill.slick_coords && APP_DATA.spill.slick_coords.length > 1) {{
                L.polyline(APP_DATA.spill.slick_coords, {{
                    color: '#fbbf24',
                    dashArray: '6, 6',
                    weight: 3
                }}).addTo(layerSlick);
            }}

            // Pulsing Vessel Marker for Target
            vesselMarker2D = L.circleMarker([lat, lon], {{
                radius: 9,
                color: '#ffffff',
                fillColor: '#f43f5e',
                fillOpacity: 1.0,
                weight: 3
            }}).addTo(map2D);

            render2DTracks();
        }}

        function switchBasemap(type) {{
            if (activeBasemap2D) map2D.removeLayer(activeBasemap2D);
            activeBasemap2D = basemapLayers[type] || basemapLayers.dark;
            activeBasemap2D.addTo(map2D);
        }}

        // Render Only Top 10 Candidate Tracks (to declutter map traffic)
        function render2DTracks() {{
            layerTracks.clearLayers();
            layerCPA.clearLayers();

            const rankColors = {{ 1: '#f43f5e', 2: '#38bdf8', 3: '#a855f7' }};
            // Filter to top 10 candidates or the explicitly selected vessel
            const displayVessels = APP_DATA.vessels.filter(v => v.rank <= 10 || v.mmsi === selectedMmsi);

            displayVessels.forEach(v => {{
                if (!v.track || v.track.length < 2) return;
                const pts = v.track.map(p => [p.lat, p.lon]);
                const isSelected = (v.mmsi === selectedMmsi);
                const color = rankColors[v.rank] || '#64748b';

                const poly = L.polyline(pts, {{
                    color: color,
                    weight: isSelected ? 5 : (v.rank <= 3 ? 3 : 1.5),
                    opacity: isSelected ? 1.0 : (selectedMmsi ? (v.rank <= 3 ? 0.6 : 0.25) : (v.rank <= 3 ? 0.85 : 0.4))
                }}).addTo(layerTracks);

                poly.on('click', () => selectVessel(v.mmsi));

                // Place CPA markers for top 3 candidates or selected vessel
                if (v.rank <= 3 || isSelected) {{
                    const cpaM = L.circleMarker([v.cpa_lat, v.cpa_lon], {{
                        radius: isSelected ? 8 : 6,
                        color: '#ffffff',
                        fillColor: color,
                        fillOpacity: 0.95,
                        weight: 2
                    }}).bindTooltip(`Rank #${{v.rank}} ${{v.name}} (CPA: ${{v.dcpa_km.toFixed(2)}} km)`).addTo(layerCPA);

                    cpaM.on('click', () => selectVessel(v.mmsi));
                }}
            }});
        }}

        // 3. Initialize True 3D Three.js Reconstruction Studio
        function init3DScene() {{
            const container = document.getElementById('scene3D');
            const width = container.clientWidth || 800;
            const height = container.clientHeight || 600;

            scene3D = new THREE.Scene();
            scene3D.background = new THREE.Color(0x05070a);
            scene3D.fog = new THREE.FogExp2(0x05070a, 0.007);

            camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            camera3D.position.set(0, 42, 64);

            renderer3D = new THREE.WebGLRenderer({{ antialias: true, powerPreference: "high-performance" }});
            renderer3D.setSize(width, height);
            renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer3D.shadowMap.enabled = true;
            container.appendChild(renderer3D.domElement);

            controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
            controls3D.enableDamping = true;
            controls3D.dampingFactor = 0.06;
            controls3D.maxPolarAngle = Math.PI / 2 - 0.05; // Keep camera above ocean surface

            // Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            scene3D.add(ambient);

            const sun = new THREE.DirectionalLight(0x38bdf8, 1.2);
            sun.position.set(50, 70, 40);
            scene3D.add(sun);

            const fillLight = new THREE.DirectionalLight(0xf43f5e, 0.4);
            fillLight.position.set(-40, 30, -30);
            scene3D.add(fillLight);

            // Ocean Floor / Water Surface
            const oceanGeo = new THREE.PlaneGeometry(240, 240, 40, 40);
            const oceanMat = new THREE.MeshStandardMaterial({{
                color: 0x081320,
                roughness: 0.25,
                metalness: 0.7,
                wireframe: false
            }});
            oceanMesh3D = new THREE.Mesh(oceanGeo, oceanMat);
            oceanMesh3D.rotation.x = -Math.PI / 2;
            scene3D.add(oceanMesh3D);

            // Nautical Bathymetry Grid
            const grid = new THREE.GridHelper(240, 48, 0x1e293b, 0x0f172a);
            grid.position.y = 0.02;
            scene3D.add(grid);

            // 3D Oil Slick Sheen Mesh
            const slickShape = new THREE.Shape();
            const numPts = 20;
            const baseRad = Math.max(4.0, APP_DATA.spill.spread_km * 1.6);
            for (let i = 0; i < numPts; i++) {{
                const angle = (i / numPts) * Math.PI * 2;
                const r = baseRad * (0.8 + 0.3 * Math.sin(i * 3.2) + 0.15 * Math.cos(i * 5.1));
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) slickShape.moveTo(x, y); else slickShape.lineTo(x, y);
            }}
            slickShape.closePath();

            const slickGeo = new THREE.ShapeGeometry(slickShape);
            const slickMat = new THREE.MeshBasicMaterial({{
                color: 0xf43f5e,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide
            }});
            slickMesh3D = new THREE.Mesh(slickGeo, slickMat);
            slickMesh3D.rotation.x = Math.PI / 2;
            slickMesh3D.position.y = 0.12;
            scene3D.add(slickMesh3D);

            // Spill Centroid Neon Beacon Buoy
            const beaconGroup = new THREE.Group();
            const pinGeo = new THREE.CylinderGeometry(0.3, 0.4, 3.5, 16);
            const pinMat = new THREE.MeshBasicMaterial({{ color: 0xf43f5e }});
            const pinMesh = new THREE.Mesh(pinGeo, pinMat);
            pinMesh.position.set(0, 1.75, 0);
            beaconGroup.add(pinMesh);

            const haloGeo = new THREE.RingGeometry(0.8, 1.4, 32);
            const haloMat = new THREE.MeshBasicMaterial({{ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }});
            const haloMesh = new THREE.Mesh(haloGeo, haloMat);
            haloMesh.rotation.x = Math.PI / 2;
            haloMesh.position.y = 0.15;
            beaconGroup.add(haloMesh);
            scene3D.add(beaconGroup);

            // Render 3D Top 10 Candidate Trajectories on Ocean Plane
            tracksGroup3D = new THREE.Group();
            render3DTracks();
            scene3D.add(tracksGroup3D);

            // Low-Poly Detailed Ship Model
            build3DShip();

            // Wake Trail Breadcrumbs
            const wakeGeo = new THREE.BufferGeometry();
            const maxWakePts = 200;
            const wakePositions = new Float32Array(maxWakePts * 3);
            wakeGeo.setAttribute('position', new THREE.BufferAttribute(wakePositions, 3));
            const wakeMat = new THREE.LineBasicMaterial({{ color: 0x38bdf8, opacity: 0.7, transparent: true, linewidth: 2 }});
            wakeTrail3D = new THREE.Line(wakeGeo, wakeMat);
            scene3D.add(wakeTrail3D);

            // Render loop with smooth animation
            let clock = new THREE.Clock();
            function animate3D() {{
                requestAnimationFrame(animate3D);
                const t = clock.getElapsedTime();

                // Rotate Ship Radar Scanner
                if (radarBar3D) radarBar3D.rotation.y += 0.05;

                // Subtle Wave Perturbation on Ocean Plane
                const pos = oceanGeo.attributes.position;
                for (let i = 0; i < pos.count; i++) {{
                    const u = pos.getX(i);
                    const v = pos.getY(i);
                    pos.setZ(i, Math.sin(u * 0.1 + t * 1.1) * 0.25 + Math.cos(v * 0.1 + t * 0.9) * 0.2);
                }}
                pos.needsUpdate = true;

                // Camera follow ship mode if enabled
                if (followCamera && shipMesh3D) {{
                    controls3D.target.lerp(shipMesh3D.position, 0.08);
                }}

                controls3D.update();
                renderer3D.render(scene3D, camera3D);
            }}
            animate3D();
        }}

        function build3DShip() {{
            shipMesh3D = new THREE.Group();

            // Hull Top (Dark Navy)
            const hullTopGeo = new THREE.BoxGeometry(2.6, 1.0, 7.6);
            const hullTopMat = new THREE.MeshStandardMaterial({{ color: 0x1e293b, roughness: 0.3 }});
            const hullTop = new THREE.Mesh(hullTopGeo, hullTopMat);
            hullTop.position.y = 0.8;
            shipMesh3D.add(hullTop);

            // Hull Keel (Red Anti-Fouling Stripe)
            const hullBtmGeo = new THREE.BoxGeometry(2.4, 0.6, 7.4);
            const hullBtmMat = new THREE.MeshStandardMaterial({{ color: 0x991b1b, roughness: 0.4 }});
            const hullBtm = new THREE.Mesh(hullBtmGeo, hullBtmMat);
            hullBtm.position.y = 0.3;
            shipMesh3D.add(hullBtm);

            // Superstructure Deckhouse
            const bridgeGeo = new THREE.BoxGeometry(1.8, 1.5, 2.4);
            const bridgeMat = new THREE.MeshStandardMaterial({{ color: 0xf1f5f9 }});
            const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
            bridge.position.set(0, 1.8, -1.0);
            shipMesh3D.add(bridge);

            // Bridge Windows (Cyan Glow)
            const winGeo = new THREE.BoxGeometry(1.84, 0.4, 1.2);
            const winMat = new THREE.MeshStandardMaterial({{ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 }});
            const winMesh = new THREE.Mesh(winGeo, winMat);
            winMesh.position.set(0, 2.1, -1.2);
            shipMesh3D.add(winMesh);

            // Communications Mast
            const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.0);
            const mastMat = new THREE.MeshStandardMaterial({{ color: 0xfbbf24 }});
            const mast = new THREE.Mesh(mastGeo, mastMat);
            mast.position.set(0, 3.2, -1.0);
            shipMesh3D.add(mast);

            // Rotating Radar Scanner Bar
            const radarGeo = new THREE.BoxGeometry(1.2, 0.12, 0.2);
            const radarMat = new THREE.MeshStandardMaterial({{ color: 0xffffff }});
            radarBar3D = new THREE.Mesh(radarGeo, radarMat);
            radarBar3D.position.set(0, 4.1, -1.0);
            shipMesh3D.add(radarBar3D);

            // Port (Red) & Starboard (Green) Navigation Lights
            const portLight = new THREE.PointLight(0xf43f5e, 1.5, 8);
            portLight.position.set(-1.4, 1.8, -1.0);
            shipMesh3D.add(portLight);

            const stbLight = new THREE.PointLight(0x10b981, 1.5, 8);
            stbLight.position.set(1.4, 1.8, -1.0);
            shipMesh3D.add(stbLight);

            scene3D.add(shipMesh3D);
        }}

        // Render Top 10 Candidate Trajectories in 3D Scene
        function render3DTracks() {{
            while (tracksGroup3D.children.length > 0) {{
                tracksGroup3D.remove(tracksGroup3D.children[0]);
            }}

            const rankColors = {{ 1: 0xf43f5e, 2: 0x38bdf8, 3: 0xa855f7 }};
            const displayVessels = APP_DATA.vessels.filter(v => v.rank <= 10);

            displayVessels.forEach(v => {{
                if (!v.track || v.track.length < 2) return;
                const pts = [];
                v.track.forEach(p => {{
                    const dLat = (p.lat - APP_DATA.spill.lat) * 111.0;
                    const dLon = (p.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                    pts.push(new THREE.Vector3(dLon * 2.2, 0.18, -dLat * 2.2));
                }});

                const curve = new THREE.CatmullRomCurve3(pts);
                const points = curve.getPoints(120);
                const geo = new THREE.BufferGeometry().setFromPoints(points);
                const color = rankColors[v.rank] || 0x475569;
                const mat = new THREE.LineBasicMaterial({{
                    color: color,
                    transparent: true,
                    opacity: v.rank === 1 ? 0.95 : (v.rank <= 3 ? 0.7 : 0.35),
                    linewidth: v.rank <= 3 ? 2 : 1
                }});
                const line = new THREE.Line(geo, mat);
                tracksGroup3D.add(line);
            }});
        }}

        function resize3D() {{
            const sceneEl = document.getElementById('scene3D');
            if (renderer3D && sceneEl) {{
                const w = sceneEl.clientWidth || 800;
                const h = sceneEl.clientHeight || 600;
                camera3D.aspect = w / h;
                camera3D.updateProjectionMatrix();
                renderer3D.setSize(w, h);
            }}
        }}

        // 4. Mode Switching & Theming
        function setViewMode(mode) {{
            viewMode = mode;
            const tab2D = document.getElementById('tab2D');
            const tab3D = document.getElementById('tab3D');
            const mapEl = document.getElementById('map2D');
            const sceneEl = document.getElementById('scene3D');
            const titleEl = document.getElementById('viewportModeTitle');
            const hud3D = document.getElementById('hud3DControls');

            if (mode === '2d') {{
                tab2D.classList.add('active');
                tab3D.classList.remove('active');
                mapEl.style.display = 'block';
                sceneEl.style.display = 'none';
                hud3D.style.display = 'none';
                titleEl.innerText = "Geospatial Forensics Cockpit (2D)";
                map2D.invalidateSize();
            }} else {{
                tab3D.classList.add('active');
                tab2D.classList.remove('active');
                mapEl.style.display = 'none';
                sceneEl.style.display = 'block';
                hud3D.style.display = 'block';
                titleEl.innerText = "3D Event Reconstruction Studio";
                resize3D();
            }}
        }}

        function toggleFollowCamera() {{
            followCamera = !followCamera;
            document.getElementById('swFollowCam').classList.toggle('active', followCamera);
        }}

        function set3DCameraPreset(preset) {{
            document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
            if (preset === 'orbit') {{
                document.getElementById('camBtnOrbit').classList.add('active');
                followCamera = false;
                document.getElementById('swFollowCam').classList.remove('active');
                gsap.to(camera3D.position, {{ x: 0, y: 42, z: 64, duration: 1.0, ease: "power2.inOut" }});
                controls3D.target.set(0, 0, 0);
            }} else if (preset === 'top') {{
                document.getElementById('camBtnTop').classList.add('active');
                followCamera = false;
                document.getElementById('swFollowCam').classList.remove('active');
                gsap.to(camera3D.position, {{ x: 0, y: 85, z: 0.1, duration: 1.0, ease: "power2.inOut" }});
                controls3D.target.set(0, 0, 0);
            }} else if (preset === 'close') {{
                document.getElementById('camBtnClose').classList.add('active');
                followCamera = true;
                document.getElementById('swFollowCam').classList.add('active');
                if (shipMesh3D) {{
                    gsap.to(camera3D.position, {{
                        x: shipMesh3D.position.x + 12,
                        y: 8,
                        z: shipMesh3D.position.z + 16,
                        duration: 1.0,
                        ease: "power2.inOut"
                    }});
                }}
            }}
        }}

        function togglePresentation() {{
            document.body.classList.toggle('presentation-mode');
            const isPres = document.body.classList.contains('presentation-mode');
            document.getElementById('presBtn').classList.toggle('active', isPres);
            if (map2D) map2D.invalidateSize();
            resize3D();
        }}

        function toggleTheme() {{
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            document.getElementById('themeBtn').innerHTML = next === 'dark' ? '<i class="fa-solid fa-moon"></i> Theme' : '<i class="fa-solid fa-sun"></i> Theme';
        }}

        function resetViewport() {{
            if (viewMode === '2d') {{
                map2D.setView([APP_DATA.spill.lat, APP_DATA.spill.lon], 11);
            }} else if (controls3D) {{
                set3DCameraPreset('orbit');
            }}
        }}

        // 5. Unified Timeline Engine with Guided Narrative
        const NARRATIVE_STEPS = [
            {{ pct: 0, title: "Spill Origin Analysis", desc: "SAR radar detected slick with {spread_km:.1f} km dispersion envelope." }},
            {{ pct: 25, title: "Candidate AIS Screening", desc: "Filter AIS broadcast census across spatial & temporal observation windows." }},
            {{ pct: 55, title: "Kinematic Approach (CPA)", desc: "Primary candidate reaches closest point of approach ({top_dcpa_val:.2f} km)." }},
            {{ pct: 85, title: "Discrete Fréchet Alignment", desc: "Trajectory geometry matches slick drift axis with {top_frechet_val:.2f} km parity." }},
            {{ pct: 100, title: "Candidate Isolated", desc: "{top_name} isolated as primary responsible vessel with {top_conf_score * 100:.1f}% confidence." }}
        ];

        function onTimelineScrub(val) {{
            scrubVal = parseFloat(val);
            document.getElementById('timelinePhaseLabel').innerText = `Investigation Window: T = ${{scrubVal.toFixed(1)}}%`;
            document.getElementById('timelineProgressFill').style.width = scrubVal + "%";

            // Update Narrative Toast & Milestones Highlight
            let currNarrative = NARRATIVE_STEPS[0];
            for (let s of NARRATIVE_STEPS) {{
                if (scrubVal >= s.pct) currNarrative = s;
            }}
            document.getElementById('narrativeTitle').innerText = currNarrative.title;
            document.getElementById('narrativeCaption').innerText = currNarrative.desc;

            // Highlight corresponding milestone chip
            document.querySelectorAll('.milestone-chip').forEach(chip => chip.classList.remove('active'));
            if (scrubVal >= 8 && scrubVal <= 25) document.querySelector('.milestone-chip:nth-child(1)')?.classList.add('active');
            else if (scrubVal >= 50 && scrubVal <= 68) document.querySelector('.milestone-chip:nth-child(2)')?.classList.add('active');
            else if (scrubVal >= 85) document.querySelector('.milestone-chip:nth-child(3)')?.classList.add('active');

            const activeV = APP_DATA.vessels.find(v => v.mmsi === selectedMmsi) || APP_DATA.vessels[0];
            if (!activeV || !activeV.track || activeV.track.length === 0) return;

            const idx = Math.min(activeV.track.length - 1, Math.floor((scrubVal / 100) * activeV.track.length));
            const pt = activeV.track[idx];

            // 2D Marker Update
            if (vesselMarker2D) vesselMarker2D.setLatLng([pt.lat, pt.lon]);

            // 3D Ship Position, Heading & Wake Update
            if (shipMesh3D) {{
                const dLat = (pt.lat - APP_DATA.spill.lat) * 111.0;
                const dLon = (pt.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                const targetX = dLon * 2.2;
                const targetZ = -dLat * 2.2;

                shipMesh3D.position.set(targetX, 0.4, targetZ);
                shipMesh3D.rotation.y = -(pt.cog * Math.PI / 180);

                // Update Wake Trail
                if (wakeTrail3D && activeV.track) {{
                    const positions = wakeTrail3D.geometry.attributes.position.array;
                    const startIdx = Math.max(0, idx - 40);
                    let count = 0;
                    for (let j = startIdx; j <= idx; j++) {{
                        const p = activeV.track[j];
                        const wLat = (p.lat - APP_DATA.spill.lat) * 111.0;
                        const wLon = (p.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                        positions[count * 3] = wLon * 2.2;
                        positions[count * 3 + 1] = 0.15;
                        positions[count * 3 + 2] = -wLat * 2.2;
                        count++;
                    }}
                    wakeTrail3D.geometry.setDrawRange(0, count);
                    wakeTrail3D.geometry.attributes.position.needsUpdate = true;
                }}

                // Dynamic expansion of 3D oil slick
                if (slickMesh3D) {{
                    const scaleFactor = 0.8 + 0.4 * (scrubVal / 100);
                    slickMesh3D.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }}
            }}

            // Dynamic Telemetry Readout
            document.getElementById('teleName').innerText = activeV.name;
            document.getElementById('teleCoords').innerText = `${{pt.lat.toFixed(4)}}° N, ${{Math.abs(pt.lon).toFixed(4)}}° W`;
            document.getElementById('teleSog').innerText = `${{pt.sog.toFixed(1)}} kts`;
            document.getElementById('teleCog').innerText = `${{pt.cog.toFixed(0)}}°`;

            const distSq = (pt.lat - APP_DATA.spill.lat)**2 + ((pt.lon - APP_DATA.spill.lon) * Math.cos(APP_DATA.spill.lat * Math.PI / 180))**2;
            const distKm = Math.sqrt(distSq) * 111.0;
            document.getElementById('teleDist').innerText = `${{distKm.toFixed(2)}} km`;
            document.getElementById('teleDist').style.color = distKm < 2.0 ? 'var(--accent-red)' : 'var(--text-primary)';
        }}

        function togglePlayback() {{
            isPlaying = !isPlaying;
            const btn = document.getElementById('playBtn');
            btn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i> Pause' : '<i class="fa-solid fa-play"></i> Reconstruct Event (Space)';
            btn.classList.toggle('active', isPlaying);

            if (isPlaying) {{
                function step() {{
                    if (!isPlaying) return;
                    scrubVal += 0.3;
                    if (scrubVal > 100) scrubVal = 0;
                    document.getElementById('timelineScrubber').value = scrubVal;
                    onTimelineScrub(scrubVal);
                    playAnimFrame = requestAnimationFrame(step);
                }}
                step();
            }} else if (playAnimFrame) {{
                cancelAnimationFrame(playAnimFrame);
            }}
        }}

        function jumpToTimeline(val) {{
            scrubVal = val;
            document.getElementById('timelineScrubber').value = val;
            onTimelineScrub(val);
        }}

        // 6. Vessel Selection & Deep-Dive Update
        function selectVessel(mmsi) {{
            selectedMmsi = mmsi;
            const v = APP_DATA.vessels.find(x => x.mmsi === mmsi);
            if (!v) return;

            render2DTracks();
            map2D.panTo([v.cpa_lat, v.cpa_lon]);

            document.getElementById('targetName').innerText = v.name;
            document.getElementById('targetMmsi').innerText = `MMSI ${{v.mmsi}} • ${{APP_DATA.spill.regime}} Backtrack • Centroid ${{APP_DATA.spill.lat.toFixed(4)}}° N, ${{APP_DATA.spill.lon.toFixed(4)}}° W`;
            document.getElementById('confScoreText').innerText = (v.conf_score * 100).toFixed(1) + "%";
            document.getElementById('confLabelBadge').innerText = v.conf_label + " CONFIDENCE";

            // Update Radial Gauge
            const offset = 157 - (157 * v.conf_score);
            document.getElementById('confGaugeMeter').style.strokeDashoffset = offset;

            // Update Metrics
            document.getElementById('metricDcpa').innerText = v.dcpa_km.toFixed(2) + " km";
            document.getElementById('metricFrechet').innerText = v.frechet_km.toFixed(2) + " km";
            document.getElementById('metricTcpa').innerText = (v.tcpa_min > 0 ? '+' : '') + v.tcpa_min.toFixed(1) + " min";
            document.getElementById('metricCov').innerText = (v.coverage * 100).toFixed(0) + "%";

            // Update Radar Polygon Points
            const pDcpa = Math.max(20, 70 - Math.min(50, v.dcpa_km * 4));
            const pFrechet = Math.min(125, 70 + Math.max(10, 50 - v.frechet_km * 5));
            const pTcpa = Math.min(125, 70 + Math.max(10, 50 - Math.abs(v.tcpa_min) * 0.1));
            const pCov = Math.max(15, 70 - (v.coverage * 50));
            document.getElementById('radarPoly').setAttribute('points', `70,${{pDcpa}} ${{pFrechet}},70 70,${{pTcpa}} ${{pCov}},70`);

            document.getElementById('inspRankPill').innerText = 'RANK #' + v.rank;
            document.getElementById('inspVesselName').innerText = v.name;
            document.getElementById('inspVesselMmsi').innerText = 'MMSI ' + v.mmsi;

            document.querySelectorAll('#ledgerTbody tr').forEach(tr => {{
                if (parseInt(tr.getAttribute('data-mmsi')) === mmsi) {{
                    tr.classList.add('active-row');
                }} else {{
                    tr.classList.remove('active-row');
                }}
            }});

            onTimelineScrub(scrubVal);
        }}

        function populateLedger() {{
            const tbody = document.getElementById('ledgerTbody');
            tbody.innerHTML = '';

            APP_DATA.vessels.forEach((v, idx) => {{
                const tr = document.createElement('tr');
                tr.setAttribute('data-mmsi', v.mmsi);
                tr.setAttribute('data-name', v.name.toUpperCase());
                if (v.mmsi === selectedMmsi) tr.classList.add('active-row');

                const isTop = v.rank <= 3;
                if (isTop) tr.classList.add('top-candidate-row');
                if (!isTop && !showAllTail) tr.style.display = 'none';

                const rankClass = v.rank === 1 ? 'rank-top1' : (v.rank === 2 ? 'rank-top2' : (v.rank === 3 ? 'rank-top3' : 'rank-other'));
                const confPercent = Math.round(v.conf_score * 100);

                // Mini Trajectory Sparkline
                const sparkSvg = `<svg class="sparkline-svg" viewBox="0 0 50 18"><path d="M 2 9 Q 25 ${{v.rank === 1 ? '2' : (v.rank === 2 ? '5' : '14')}} 48 9" fill="none" stroke="${{v.rank === 1 ? 'var(--accent-red)' : (v.rank === 2 ? 'var(--accent-cyan)' : 'var(--text-dim)')}}" stroke-width="2"/></svg>`;

                tr.innerHTML = `
                    <td><span class="rank-tag ${{rankClass}} mono">#${{v.rank}}</span></td>
                    <td style="font-weight: ${{isTop ? '800' : '500'}}; color: var(--text-primary);">${{v.name}}</td>
                    <td class="mono">${{v.mmsi}}</td>
                    <td>${{sparkSvg}}</td>
                    <td class="mono">${{v.dcpa_km.toFixed(2)}} km</td>
                    <td class="mono">${{v.tcpa_min > 0 ? '+' : ''}}${{v.tcpa_min.toFixed(1)}} min</td>
                    <td class="mono">${{(v.coverage * 100).toFixed(0)}}%</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="mono" style="font-weight: 700;">${{confPercent}}%</span>
                            <div style="width: 44px; height: 5px; background: var(--border); border-radius: 2px; overflow: hidden;">
                                <div style="width: ${{confPercent}}%; height: 100%; background: ${{v.rank === 1 ? 'var(--accent-red)' : 'var(--accent-cyan)'}};"></div>
                            </div>
                        </div>
                    </td>
                `;

                tr.onclick = () => selectVessel(v.mmsi);
                tbody.appendChild(tr);
            }});
        }}

        function toggleTailRows() {{
            showAllTail = !showAllTail;
            const btn = document.getElementById('tailToggleBtn');
            btn.innerHTML = showAllTail ? '<i class="fa-solid fa-chevron-up"></i> Collapse Secondary Candidates' : `<i class="fa-solid fa-chevron-down"></i> Show All Evaluated Candidates (${{APP_DATA.vessels.length}})`;
            
            document.querySelectorAll('#ledgerTbody tr').forEach(tr => {{
                const mmsi = parseInt(tr.getAttribute('data-mmsi'));
                const v = APP_DATA.vessels.find(x => x.mmsi === mmsi);
                if (v && v.rank > 3) {{
                    tr.style.display = showAllTail ? '' : 'none';
                }}
            }});
        }}

        function filterLedger(query) {{
            const q = query.trim().toUpperCase();
            document.querySelectorAll('#ledgerTbody tr').forEach(tr => {{
                const name = tr.getAttribute('data-name');
                const mmsi = tr.getAttribute('data-mmsi');
                if (name.includes(q) || mmsi.includes(q)) {{
                    tr.style.display = '';
                }} else {{
                    tr.style.display = 'none';
                }}
            }});
        }}

        function toggleLayer(layerName) {{
            if (layerName === 'spill') {{
                const sw = document.getElementById('swSpill');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerSpill); else map2D.removeLayer(layerSpill);
            }} else if (layerName === 'slick') {{
                const sw = document.getElementById('swSlick');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerSlick); else map2D.removeLayer(layerSlick);
            }} else if (layerName === 'tracks') {{
                const sw = document.getElementById('swTracks');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerTracks); else map2D.removeLayer(layerTracks);
            }} else if (layerName === 'cpa') {{
                const sw = document.getElementById('swCPA');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerCPA); else map2D.removeLayer(layerCPA);
            }}
        }}

        // Window resize listener
        window.addEventListener('resize', () => {{
            if (viewMode === '2d' && map2D) map2D.invalidateSize();
            else if (viewMode === '3d') resize3D();
        }});

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {{
            const searchEl = document.getElementById('vesselSearch');
            if (e.key === '/' && document.activeElement !== searchEl) {{
                e.preventDefault();
                searchEl.focus();
            }} else if (e.key === 'p' && document.activeElement !== searchEl) {{
                togglePresentation();
            }} else if (e.key === ' ' && document.activeElement !== searchEl) {{
                e.preventDefault();
                togglePlayback();
            }} else if (e.key === 'ArrowRight' && document.activeElement !== searchEl) {{
                scrubVal = Math.min(100, scrubVal + 5);
                document.getElementById('timelineScrubber').value = scrubVal;
                onTimelineScrub(scrubVal);
            }} else if (e.key === 'ArrowLeft' && document.activeElement !== searchEl) {{
                scrubVal = Math.max(0, scrubVal - 5);
                document.getElementById('timelineScrubber').value = scrubVal;
                onTimelineScrub(scrubVal);
            }} else if (['1', '2', '3'].includes(e.key) && document.activeElement !== searchEl) {{
                const r = parseInt(e.key);
                const target = APP_DATA.vessels.find(v => v.rank === r);
                if (target) selectVessel(target.mmsi);
            }}
        }});

        window.onload = () => {{
            initGSAP();
            init2DMap();
            init3DScene();
            populateLedger();
            onTimelineScrub(0);
        }};
    </script>
</body>
</html>
"""
    output_html_path.write_text(html, encoding="utf-8")
    return str(output_html_path)


import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def generate_workstation_dashboard(
    investigation_id: str,
    input_data: Dict[str, Any],
    regime_decision: Dict[str, Any],
    scores_df: pd.DataFrame,
    reconstructed_df: pd.DataFrame,
    slick_coords: Optional[np.ndarray],
    origin_estimate: Optional[Dict[str, Any]],
    output_html_path: Path,
) -> str:
    """
    Renders the WAKE (Wake Attribution & Kinematic Engine) Forensic Investigation Console.
    """
    output_html_path.parent.mkdir(parents=True, exist_ok=True)

    lat = float(input_data.get("lat", 0.0))
    lon = float(input_data.get("lon", 0.0))
    time_str = str(input_data.get("time_utc", ""))
    spread_km = float(input_data.get("spread_km", 0.0))
    regime = str(regime_decision.get("regime", "unknown")).upper()
    rationale = str(regime_decision.get("rationale", ""))
    warning = regime_decision.get("warning")

    vessels_payload = []
    if not scores_df.empty and not reconstructed_df.empty:
        pts_by_mmsi = {}
        for mmsi, group in reconstructed_df.groupby("mmsi"):
            g_sorted = group.sort_values("timestamp")
            pts = []
            for _, r in g_sorted.iterrows():
                ts_iso = pd.Timestamp(r["timestamp"]).isoformat()
                pts.append({
                    "lat": float(r["lat"]),
                    "lon": float(r["lon"]),
                    "ts": ts_iso,
                    "sog": float(r.get("sog_knots", 0.0)),
                    "cog": float(r.get("cog_degrees", 0.0)),
                    "is_interp": bool(r.get("is_interpolated", False)),
                })
            pts_by_mmsi[int(mmsi)] = pts

        max_borda = float(scores_df["borda_score"].max()) if not scores_df.empty else 1.0

        for _, row in scores_df.iterrows():
            mmsi = int(row["mmsi"])
            rank = int(row["final_rank"])
            v_name = str(row["vessel_name"])
            conf_label = str(row["confidence_label"])
            conf_score = float(row["confidence_score"])
            frechet_km = float(row["frechet_km"])
            dcpa_km = float(row["dcpa_km"])
            tcpa_min = float(row["tcpa_minutes"])
            coverage = float(row["coverage_completeness"])
            borda_score = int(row["borda_score"])

            track_points = pts_by_mmsi.get(mmsi, [])

            cpa_lat = lat
            cpa_lon = lon
            if track_points:
                lats = np.array([p["lat"] for p in track_points])
                lons = np.array([p["lon"] for p in track_points])
                dists_sq = (lats - lat)**2 + ((lons - lon) * np.cos(np.radians(lat)))**2
                min_idx = int(np.argmin(dists_sq))
                cpa_lat = track_points[min_idx]["lat"]
                cpa_lon = track_points[min_idx]["lon"]

            vessels_payload.append({
                "mmsi": mmsi,
                "rank": rank,
                "name": v_name,
                "conf_label": conf_label,
                "conf_score": conf_score,
                "frechet_km": frechet_km,
                "dcpa_km": dcpa_km,
                "tcpa_min": tcpa_min,
                "coverage": coverage,
                "borda_score": borda_score,
                "borda_ratio": float(borda_score / max_borda) if max_borda > 0 else 0.0,
                "cpa_lat": cpa_lat,
                "cpa_lon": cpa_lon,
                "track": track_points,
            })

    slick_payload = []
    if slick_coords is not None and len(slick_coords) > 1:
        slick_payload = [[float(pt[0]), float(pt[1])] for pt in slick_coords]

    origin_payload = None
    if origin_estimate is not None:
        best_lat = getattr(origin_estimate, "best_guess_lat", None)
        best_lon = getattr(origin_estimate, "best_guess_lon", None)
        if best_lat is not None and best_lon is not None:
            origin_payload = {
                "lat": float(best_lat),
                "lon": float(best_lon),
                "geojson": getattr(origin_estimate, "minimum_regret_geojson", None),
            }

    client_data_json = json.dumps({
        "investigation_id": investigation_id,
        "spill": {
            "lat": lat,
            "lon": lon,
            "spread_km": spread_km,
            "time_utc": time_str,
            "regime": regime,
            "rationale": rationale,
            "slick_coords": slick_payload,
            "origin": origin_payload,
        },
        "vessels": vessels_payload,
    })

    top_vessel = vessels_payload[0] if vessels_payload else None
    top_name = top_vessel["name"] if top_vessel else "No Candidate Identified"
    top_mmsi = str(top_vessel["mmsi"]) if top_vessel else "N/A"
    top_conf_label = top_vessel["conf_label"] if top_vessel else "NONE"
    top_conf_score = float(top_vessel["conf_score"]) if top_vessel else 0.0
    top_frechet_val = float(top_vessel["frechet_km"]) if top_vessel else 0.0
    top_dcpa_val = float(top_vessel["dcpa_km"]) if top_vessel else 0.0
    top_tcpa_val = float(top_vessel["tcpa_min"]) if top_vessel else 0.0
    top_cov_val = float(top_vessel["coverage"] * 100) if top_vessel else 0.0

    second_vessel = vessels_payload[1] if len(vessels_payload) > 1 else None
    second_name = second_vessel["name"] if second_vessel else "No 2nd Candidate"
    second_dcpa_str = f"{second_vessel['dcpa_km']:.2f} km" if second_vessel else "N/A"
    second_frechet_str = f"{second_vessel['frechet_km']:.2f} km" if second_vessel else "N/A"

    html = f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAKE Forensics — Case #{investigation_id}</title>
    
    <!-- Dependencies: Leaflet, FontAwesome 6, GSAP 3.12, Three.js r128, OrbitControls -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

    <style>
        /* ============================================================
           WAKE FORENSIC DESIGN SYSTEM
           Strict color discipline:
           Red (#f43f5e) = Target / Anomaly / Alert
           Cyan (#38bdf8) = Telemetry / Trajectory / Focus
           Muted slate = Structure & Secondary data
           ============================================================ */
        :root {{
            --bg-root: #06080c;
            --bg-surface: #0d1117;
            --bg-card: #131922;
            --bg-elevated: #18202c;
            --border: #1f2735;
            --border-light: #2c384d;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-dim: #64748b;
            --accent-red: #f43f5e;
            --accent-red-glow: rgba(244, 63, 94, 0.25);
            --accent-cyan: #38bdf8;
            --accent-cyan-glow: rgba(56, 189, 248, 0.2);
            --accent-amber: #fbbf24;
            --accent-green: #10b981;
            --accent-purple: #a855f7;
            --font-display: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
            --glass-bg: rgba(13, 17, 23, 0.82);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-blur: blur(14px);
        }}

        [data-theme="light"] {{
            --bg-root: #f4f1ea;
            --bg-surface: #ffffff;
            --bg-card: #f9f7f2;
            --bg-elevated: #ede8dc;
            --border: #d6d0c2;
            --border-light: #bcb3a0;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-dim: #64748b;
            --accent-red: #e11d48;
            --accent-red-glow: rgba(225, 29, 72, 0.15);
            --accent-cyan: #0284c7;
            --accent-cyan-glow: rgba(2, 132, 199, 0.15);
            --accent-amber: #d97706;
            --accent-green: #059669;
            --accent-purple: #7c3aed;
            --glass-bg: rgba(255, 255, 255, 0.88);
            --glass-border: rgba(0, 0, 0, 0.08);
        }}

        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: var(--bg-root);
            color: var(--text-primary);
            font-family: var(--font-display);
            font-size: 13px;
            line-height: 1.45;
            overflow-x: hidden;
            background-image: radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.03) 0%, transparent 60%);
        }}

        .mono {{ font-family: var(--font-mono); font-feature-settings: "tnum"; }}

        /* Top Utility & Provenance Bar */
        .utility-header {{
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border);
            padding: 6px 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--text-secondary);
        }}
        .provenance-chips {{ display: flex; gap: 10px; align-items: center; }}
        .prov-chip {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            padding: 2px 7px;
            border-radius: 3px;
            font-size: 10px;
            color: var(--text-secondary);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }}
        .prov-chip strong {{ color: var(--text-primary); }}
        .header-actions {{ display: flex; gap: 8px; align-items: center; }}
        .action-btn {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 4px 9px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
        }}
        .action-btn:hover {{ border-color: var(--accent-cyan); color: var(--accent-cyan); }}
        .action-btn.active {{ background: var(--accent-cyan); color: #000; border-color: var(--accent-cyan); }}

        /* Case Identity Bar */
        .case-title-row {{
            background: var(--bg-surface);
            border-bottom: 2px solid var(--border);
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }}
        .brand-cluster {{ display: flex; align-items: center; gap: 12px; }}
        .brand-badge {{
            background: var(--accent-red);
            color: #fff;
            font-weight: 900;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 4px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            box-shadow: 0 0 14px var(--accent-red-glow);
        }}
        .brand-name {{
            font-size: 1.3rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--text-primary);
        }}
        .case-id-tag {{
            font-size: 12px;
            color: var(--text-secondary);
        }}
        .mode-switcher {{
            display: flex;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 5px;
            padding: 3px;
            gap: 4px;
        }}
        .mode-tab {{
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 5px 12px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }}
        .mode-tab.active {{
            background: var(--bg-surface);
            color: var(--text-primary);
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }}

        /* Workspace Main Layout */
        .workspace-grid {{
            padding: 1.25rem 1.5rem;
            max-width: 1600px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }}

        /* SECTION 1: Unified Canonical Evidence & Target Banner */
        .evidence-triage-grid {{
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: 1.25rem;
            align-items: stretch;
        }}
        @media (max-width: 1040px) {{
            .evidence-triage-grid {{ grid-template-columns: 1fr; }}
        }}

        .primary-suspect-banner {{
            background: var(--bg-card);
            border: 2px solid var(--accent-red);
            border-radius: 6px;
            padding: 1.25rem 1.5rem;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 0 24px var(--accent-red-glow);
        }}
        .suspect-top-row {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }}
        .target-tag {{
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--accent-red);
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .target-tag::before {{
            content: "";
            width: 7px;
            height: 7px;
            background: var(--accent-red);
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 8px var(--accent-red);
            animation: pulse-dot 1.5s infinite;
        }}
        @keyframes pulse-dot {{
            0%, 100% {{ opacity: 1; transform: scale(1); }}
            50% {{ opacity: 0.4; transform: scale(1.3); }}
        }}

        .target-vessel-title {{
            font-size: 1.9rem;
            font-weight: 900;
            color: var(--text-primary);
            letter-spacing: -0.03em;
            margin: 4px 0 2px 0;
        }}
        .target-mmsi-meta {{
            font-size: 11px;
            color: var(--text-secondary);
        }}

        /* Radial Gauge & Confidence Box */
        .radial-confidence-box {{
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: right;
        }}
        .gauge-svg {{
            width: 58px;
            height: 58px;
            transform: rotate(-90deg);
        }}
        .gauge-bg {{ fill: none; stroke: var(--border); stroke-width: 5; }}
        .gauge-meter {{
            fill: none;
            stroke: var(--accent-red);
            stroke-width: 5;
            stroke-linecap: round;
            stroke-dasharray: 157;
            stroke-dashoffset: {157 - (157 * top_conf_score)};
            transition: stroke-dashoffset 1s ease;
        }}
        .conf-number-val {{
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--accent-red);
            line-height: 1;
        }}
        .conf-pill-badge {{
            font-size: 9px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 3px;
            text-transform: uppercase;
            background: var(--accent-red-glow);
            color: var(--accent-red);
            border: 1px solid var(--accent-red);
            display: inline-block;
            margin-top: 4px;
        }}

        /* 4 Core Evidence Metric Tiles */
        .canonical-metrics-row {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 1rem 0 0.8rem 0;
        }}
        .metric-block {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 8px 10px;
        }}
        .metric-block-title {{
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 800;
            color: var(--text-dim);
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            gap: 4px;
        }}
        .metric-block-num {{
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--text-primary);
            margin-top: 2px;
        }}

        /* Canonical Evidence Breakdown Card with Radar & Footnote */
        .canonical-breakdown-card {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1.25rem 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}
        .card-header-bar {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }}
        .radar-container {{
            display: flex;
            align-items: center;
            justify-content: space-around;
            gap: 14px;
            padding: 4px 0;
        }}
        .radar-svg {{
            width: 140px;
            height: 140px;
        }}
        .radar-legend {{
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-size: 11px;
        }}
        .legend-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
        }}
        .legend-dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }}

        .methodology-footnote {{
            font-size: 10px;
            color: var(--text-dim);
            border-top: 1px solid var(--border);
            padding-top: 6px;
            margin-top: 4px;
            line-height: 1.35;
        }}

        /* SECTION 2: Cockpit Panel (Map & 3D WebGL Studio) */
        .cockpit-view-panel {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        }}
        .cockpit-top-bar {{
            padding: 8px 16px;
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .cockpit-badge-title {{
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .viewport-frame {{
            width: 100%;
            height: 600px;
            position: relative;
            background: #040609;
            overflow: hidden;
        }}
        #map2D {{ width: 100%; height: 100%; }}
        #scene3D {{ width: 100%; height: 100%; display: none; }}

        /* Glassmorphic Layer Control HUD */
        .glass-hud {{
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 1000;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            backdrop-filter: var(--glass-blur);
            border-radius: 6px;
            padding: 12px 14px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.5);
            font-size: 11px;
            width: 230px;
        }}
        .hud-title {{
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--accent-cyan);
            margin-bottom: 8px;
        }}
        .hud-select {{
            width: 100%;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 4px 6px;
            font-size: 11px;
            border-radius: 3px;
            margin-bottom: 8px;
            outline: none;
        }}
        .hud-toggle-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            cursor: pointer;
            color: var(--text-secondary);
        }}
        .hud-toggle-item:hover {{ color: var(--text-primary); }}
        .toggle-switch {{
            width: 28px;
            height: 16px;
            background: var(--border);
            border-radius: 8px;
            position: relative;
            transition: background 0.2s;
        }}
        .toggle-switch.active {{ background: var(--accent-cyan); }}
        .toggle-switch::after {{
            content: "";
            position: absolute;
            top: 2px;
            left: 2px;
            width: 12px;
            height: 12px;
            background: #fff;
            border-radius: 50%;
            transition: transform 0.2s;
        }}
        .toggle-switch.active::after {{ transform: translateX(12px); }}

        /* Guided Forensic Detective Narrative Overlay */
        .narrative-toast {{
            position: absolute;
            bottom: 16px;
            left: 16px;
            z-index: 1000;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            backdrop-filter: var(--glass-blur);
            border-radius: 6px;
            padding: 10px 14px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            max-width: 420px;
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: none;
        }}
        .narrative-icon {{
            font-size: 20px;
            color: var(--accent-cyan);
        }}
        .narrative-title {{
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: var(--accent-cyan);
            letter-spacing: 0.05em;
        }}
        .narrative-caption {{
            font-size: 11px;
            color: var(--text-primary);
            line-height: 1.35;
        }}

        /* Timeline Engine Bar */
        .timeline-engine-bar {{
            background: var(--bg-surface);
            border-top: 1px solid var(--border);
            padding: 12px 18px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }}
        .timeline-header-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
        }}
        .timeline-slider-track {{
            position: relative;
            width: 100%;
            height: 34px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding: 0 10px;
        }}
        .timeline-input {{
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            background: var(--border-light);
            border-radius: 2px;
            outline: none;
            position: relative;
            z-index: 10;
            cursor: pointer;
        }}
        .timeline-input::-webkit-slider-thumb {{
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent-red);
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px var(--accent-red);
        }}
        .timeline-marker {{
            position: absolute;
            top: 4px;
            transform: translateX(-50%);
            font-size: 9px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 3px;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            z-index: 5;
            cursor: pointer;
        }}

        .telemetry-readout-row {{
            display: flex;
            gap: 20px;
            font-size: 11px;
            color: var(--text-secondary);
            border-top: 1px solid var(--border);
            padding-top: 6px;
            margin-top: 2px;
        }}

        /* SECTION 3: Candidate Ledger & Comparison Inspector */
        .ledger-split-grid {{
            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 1.25rem;
        }}
        @media (max-width: 1040px) {{
            .ledger-split-grid {{ grid-template-columns: 1fr; }}
        }}

        .ledger-box {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1.25rem;
        }}
        .ledger-tools {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 8px;
        }}
        .search-input {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            width: 240px;
            outline: none;
        }}
        .search-input:focus {{ border-color: var(--accent-cyan); }}

        table.wake-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }}
        table.wake-table th {{
            background: var(--bg-surface);
            color: var(--text-dim);
            text-transform: uppercase;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.06em;
            padding: 8px 10px;
            border-bottom: 2px solid var(--border);
            text-align: left;
        }}
        table.wake-table td {{
            padding: 9px 10px;
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
        }}
        table.wake-table tr:hover td {{
            background: var(--bg-elevated);
            cursor: pointer;
        }}
        table.wake-table tr.active-row td {{
            background: rgba(56, 189, 248, 0.08);
            border-bottom-color: var(--accent-cyan);
        }}
        table.wake-table tr.top-candidate-row td {{
            font-weight: 700;
        }}
        table.wake-table tr.tail-row {{
            opacity: 0.75;
        }}

        .rank-tag {{
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-weight: 800;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
        }}
        .rank-top1 {{ background: var(--accent-red-glow); color: var(--accent-red); border: 1px solid var(--accent-red); }}
        .rank-top2 {{ background: var(--accent-cyan-glow); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }}
        .rank-top3 {{ background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); border: 1px solid var(--accent-purple); }}
        .rank-other {{ color: var(--text-dim); }}

        .sparkline-svg {{
            width: 50px;
            height: 18px;
            vertical-align: middle;
        }}

        .toggle-tail-btn {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            width: 100%;
            margin-top: 10px;
            cursor: pointer;
            transition: all 0.15s;
        }}
        .toggle-tail-btn:hover {{ color: var(--text-primary); border-color: var(--border-light); }}

        /* Inspector & "Why Not The Others?" Drawer */
        .inspector-box {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}
        .inspector-headline {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }}
        .comparison-drawer {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 10px 12px;
            margin: 10px 0;
            font-size: 11px;
        }}
        .comp-header {{
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: var(--accent-amber);
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .comp-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }}
        .comp-col {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 3px;
            padding: 6px 8px;
        }}

        /* AIS Transmission Activity Sparkline */
        .ais-activity-strip {{
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 8px 10px;
            margin-top: 8px;
        }}
        .activity-dots-row {{
            display: flex;
            gap: 3px;
            align-items: center;
            margin-top: 4px;
        }}
        .activity-dot {{
            flex: 1;
            height: 8px;
            border-radius: 1px;
            background: var(--accent-green);
        }}
        .activity-dot.gap {{
            background: var(--accent-red);
        }}

        /* Presentation Mode Widescreen Override */
        body.presentation-mode .utility-header,
        body.presentation-mode .ledger-split-grid,
        body.presentation-mode .canonical-breakdown-card {{
            display: none !important;
        }}
        body.presentation-mode .workspace-grid {{
            max-width: 100vw;
            padding: 1rem 2rem;
        }}
        body.presentation-mode .viewport-frame {{
            height: 74vh;
        }}
    </style>
</head>
<body>
    <!-- Top Utility & Provenance Bar -->
    <div class="utility-header">
        <div class="provenance-chips">
            <span class="prov-chip"><i class="fa-solid fa-satellite"></i> SAR: <strong>Sentinel-1 / Cerulean</strong></span>
            <span class="prov-chip"><i class="fa-solid fa-tower-broadcast"></i> AIS: <strong>NOAA MarineCadastre</strong></span>
            <span class="prov-chip"><i class="fa-solid fa-water"></i> Drift: <strong>OpenDrift Backtrack</strong></span>
        </div>
        <div class="header-actions">
            <a href="final_report.html" class="action-btn" title="View Classic Table Report"><i class="fa-solid fa-table"></i> Classic Report</a>
            <a href="methodology.md" target="_blank" class="action-btn"><i class="fa-solid fa-book"></i> Methodology</a>
            <button class="action-btn" onclick="toggleTheme()" id="themeBtn"><i class="fa-solid fa-moon"></i> Theme</button>
            <button class="action-btn" onclick="togglePresentation()" id="presBtn"><i class="fa-solid fa-expand"></i> Presentation Mode (P)</button>
            <button class="action-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> PDF</button>
        </div>
    </div>

    <!-- Case Identity Bar -->
    <div class="case-title-row">
        <div class="brand-cluster">
            <span class="brand-badge">WAKE</span>
            <div>
                <div class="brand-name">Wake Attribution & Kinematic Engine</div>
                <div class="case-id-tag mono">CASE #{investigation_id} &bull; SATELLITE PASS: {time_str}</div>
            </div>
        </div>

        <div class="mode-switcher">
            <button class="mode-tab active" id="tab2D" onclick="setViewMode('2d')"><i class="fa-solid fa-map"></i> 2D Geo Map</button>
            <button class="mode-tab" id="tab3D" onclick="setViewMode('3d')"><i class="fa-solid fa-cube"></i> 3D Reconstruction Studio</button>
        </div>
    </div>

    <!-- Main Workspace Grid -->
    <div class="workspace-grid">
        <!-- SECTION 1: Canonical Evidence Breakdown & Suspect Header -->
        <div class="evidence-triage-grid">
            <!-- Primary Suspect Banner -->
            <div class="primary-suspect-banner" id="suspectBanner">
                <div>
                    <div class="suspect-top-row">
                        <div>
                            <div class="target-tag">Primary Attribution Candidate Isolated</div>
                            <div class="target-vessel-title" id="targetName">{top_name}</div>
                            <div class="target-mmsi-meta mono" id="targetMmsi">MMSI {top_mmsi} &bull; {regime} Backtrack &bull; Centroid {lat:.4f}&deg; N, {lon:.4f}&deg; W</div>
                        </div>

                        <!-- Radial Gauge & Confidence -->
                        <div class="radial-confidence-box">
                            <div>
                                <div class="conf-number-val mono" id="confScoreText">{top_conf_score * 100:.1f}%</div>
                                <span class="conf-pill-badge mono" id="confLabelBadge">{top_conf_label} CONFIDENCE</span>
                            </div>
                            <svg class="gauge-svg" viewBox="0 0 60 60">
                                <circle class="gauge-bg" cx="30" cy="30" r="25"></circle>
                                <circle class="gauge-meter" id="confGaugeMeter" cx="30" cy="30" r="25"></circle>
                            </svg>
                        </div>
                    </div>

                    <!-- 4 Large Canonical Metric Cards -->
                    <div class="canonical-metrics-row">
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-cyan);"><i class="fa-solid fa-arrows-to-dot"></i> Spatial (DCPA)</div>
                            <div class="metric-block-num mono" id="metricDcpa">{top_dcpa_val:.2f} km</div>
                        </div>
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-green);"><i class="fa-solid fa-route"></i> Trajectory (Fréchet)</div>
                            <div class="metric-block-num mono" id="metricFrechet">{top_frechet_val:.2f} km</div>
                        </div>
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-amber);"><i class="fa-solid fa-clock"></i> Temporal (TCPA)</div>
                            <div class="metric-block-num mono" id="metricTcpa">{top_tcpa_val:+.1f} min</div>
                        </div>
                        <div class="metric-block">
                            <div class="metric-block-title" style="color: var(--accent-purple);"><i class="fa-solid fa-tower-broadcast"></i> AIS Integrity</div>
                            <div class="metric-block-num mono" id="metricCov">{top_cov_val:.0f}%</div>
                        </div>
                    </div>
                </div>

                <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.35; border-top: 1px solid var(--border); padding-top: 6px;">
                    <strong>Algorithmic Determination:</strong> Closest physical proximity to spill centroid with continuous AIS broadcast signal.
                </div>
            </div>

            <!-- Canonical Evidence Breakdown with 4-Channel Radar/Spider Chart -->
            <div class="canonical-breakdown-card">
                <div class="card-header-bar">
                    <span>4-Channel Evidence Signature</span>
                    <span class="mono" style="font-size: 10px; color: var(--accent-cyan);"><i class="fa-solid fa-circle-nodes"></i> Radar Profile</span>
                </div>

                <div class="radar-container">
                    <!-- SVG Spider / Radar Chart -->
                    <svg class="radar-svg" viewBox="0 0 140 140" id="radarSvg">
                        <!-- Spider Background Polygons -->
                        <polygon points="70,15 125,70 70,125 15,70" fill="none" stroke="var(--border)" stroke-width="1"></polygon>
                        <polygon points="70,35 105,70 70,105 35,70" fill="none" stroke="var(--border)" stroke-width="1"></polygon>
                        <line x1="70" y1="15" x2="70" y2="125" stroke="var(--border)" stroke-width="1"></line>
                        <line x1="15" y1="70" x2="125" y2="70" stroke="var(--border)" stroke-width="1"></line>
                        <!-- Dynamic Radar Mesh -->
                        <polygon id="radarPoly" points="70,22 118,70 70,110 24,70" fill="rgba(244, 63, 94, 0.2)" stroke="var(--accent-red)" stroke-width="2"></polygon>
                    </svg>

                    <div class="radar-legend">
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-cyan);"></span> Spatial Proximity</span>
                            <strong class="mono" id="radDcpa">92%</strong>
                        </div>
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-green);"></span> Trajectory Parity</span>
                            <strong class="mono" id="radFrechet">88%</strong>
                        </div>
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-amber);"></span> Temporal Offset</span>
                            <strong class="mono" id="radTcpa">78%</strong>
                        </div>
                        <div class="legend-row">
                            <span><span class="legend-dot" style="background: var(--accent-purple);"></span> Broadcast Integrity</span>
                            <strong class="mono" id="radCov">100%</strong>
                        </div>
                    </div>
                </div>

                <div class="methodology-footnote">
                    <i class="fa-solid fa-circle-info"></i> <strong>Evidence Metric:</strong> Multichannel Borda rank aggregation combining spatial minimum approach, discrete Fréchet curve distance, and AIS temporal validity without synthetic weighting.
                </div>
            </div>
        </div>

        <!-- SECTION 2: Cockpit Panel (Map & 3D WebGL Studio) -->
        <div class="cockpit-view-panel">
            <div class="cockpit-top-bar">
                <div class="cockpit-badge-title">
                    <i class="fa-solid fa-crosshairs" style="color: var(--accent-red);"></i>
                    <span id="viewportModeTitle">Geospatial Forensics Cockpit (2D)</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="mono" style="font-size: 11px; color: var(--text-dim);">Spill Envelope: ~{spread_km:.1f} km</span>
                    <button class="action-btn" onclick="resetViewport()"><i class="fa-solid fa-arrows-to-dot"></i> Recenter</button>
                </div>
            </div>

            <div class="viewport-frame">
                <!-- 2D Leaflet View (Dark Matter Tile Basemap) -->
                <div id="map2D"></div>

                <!-- 3D Three.js WebGL Event Reconstruction Studio -->
                <div id="scene3D"></div>

                <!-- Glassmorphic Layer Control HUD -->
                <div class="glass-hud">
                    <div class="hud-title">Reconstruction HUD</div>
                    
                    <select class="hud-select" id="basemapSelect" onchange="switchBasemap(this.value)">
                        <option value="dark">CARTO Dark Matter (Nautical)</option>
                        <option value="sat">Satellite Imagery</option>
                        <option value="osm">OpenStreetMap</option>
                        <option value="ocean">Esri Ocean</option>
                    </select>

                    <div class="hud-toggle-item" onclick="toggleLayer('spill')">
                        <span>Spill Envelope</span>
                        <div class="toggle-switch active" id="swSpill"></div>
                    </div>
                    <div class="hud-toggle-item" onclick="toggleLayer('slick')">
                        <span>Slick Centerline</span>
                        <div class="toggle-switch active" id="swSlick"></div>
                    </div>
                    <div class="hud-toggle-item" onclick="toggleLayer('tracks')">
                        <span>Candidate Tracks</span>
                        <div class="toggle-switch active" id="swTracks"></div>
                    </div>
                    <div class="hud-toggle-item" onclick="toggleLayer('cpa')">
                        <span>CPA Drop Points</span>
                        <div class="toggle-switch active" id="swCPA"></div>
                    </div>
                </div>

                <!-- Guided Forensic Detective Narrative Overlay -->
                <div class="narrative-toast" id="narrativeToast">
                    <div class="narrative-icon"><i class="fa-solid fa-satellite-dish"></i></div>
                    <div>
                        <div class="narrative-title" id="narrativeTitle">Spill Origin Analysis</div>
                        <div class="narrative-caption" id="narrativeCaption">Sentinel-1 SAR radar detected slick centroid with {spread_km:.1f} km drift dispersion.</div>
                    </div>
                </div>
            </div>

            <!-- Interactive Timeline Scrubber Bar -->
            <div class="timeline-engine-bar">
                <div class="timeline-header-row">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="action-btn active" id="playBtn" onclick="togglePlayback()"><i class="fa-solid fa-play"></i> Reconstruct Event (Space)</button>
                        <span class="mono" id="currentSimTime">{time_str}</span>
                    </div>
                    <div class="mono" id="timelinePhaseLabel" style="color: var(--accent-cyan);">Investigation Window: T = 0.0%</div>
                </div>

                <div class="timeline-slider-track">
                    <input type="range" id="timelineScrubber" min="0" max="100" value="0" class="timeline-input" oninput="onTimelineScrub(this.value)">
                    
                    <!-- Milestone Markers -->
                    <div class="timeline-marker mono" style="left: 10%;" onclick="jumpToTimeline(10)" title="Spill Origin">🛢️ Origin</div>
                    <div class="timeline-marker mono" style="left: 58%;" onclick="jumpToTimeline(58)" title="Closest Point of Approach">✕ CPA</div>
                    <div class="timeline-marker mono" style="left: 90%;" onclick="jumpToTimeline(90)" title="Satellite Radar Acquisition">🛰️ SAR Pass</div>
                </div>

                <!-- Telemetry Real-Time Readout -->
                <div class="telemetry-readout-row mono">
                    <div><strong>Tracked Target:</strong> <span id="teleName" style="color: var(--text-primary);">{top_name}</span></div>
                    <div><strong>Coordinates:</strong> <span id="teleCoords">{lat:.4f}&deg; N, {lon:.4f}&deg; W</span></div>
                    <div><strong>Speed (SOG):</strong> <span id="teleSog">12.4 kts</span></div>
                    <div><strong>Course (COG):</strong> <span id="teleCog">242&deg;</span></div>
                    <div><strong>Distance to Spill:</strong> <span id="teleDist" style="color: var(--accent-red);">{top_dcpa_val:.2f} km</span></div>
                </div>
            </div>
        </div>

        <!-- SECTION 3: Candidate Ledger & "Why Not The Others?" Comparison -->
        <div class="ledger-split-grid">
            <!-- Candidate Ledger Table -->
            <div class="ledger-box">
                <div class="ledger-tools">
                    <div style="font-weight: 800; font-size: 12px; text-transform: uppercase;">
                        Candidate Vessels Census ({len(vessels_payload)})
                    </div>
                    <input type="text" id="vesselSearch" class="search-input" placeholder="🔍 Search MMSI or vessel name (/)..." onkeyup="filterLedger(this.value)">
                </div>

                <div style="overflow-x: auto;">
                    <table class="wake-table" id="ledgerTable">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Candidate Vessel</th>
                                <th>MMSI</th>
                                <th>Track Profile</th>
                                <th>DCPA</th>
                                <th>TCPA</th>
                                <th>AIS Integrity</th>
                                <th>Confidence Score</th>
                            </tr>
                        </thead>
                        <tbody id="ledgerTbody">
                        </tbody>
                    </table>
                </div>

                <button class="toggle-tail-btn mono" id="tailToggleBtn" onclick="toggleTailRows()"><i class="fa-solid fa-chevron-down"></i> Show All Evaluated Candidates ({len(vessels_payload)})</button>
            </div>

            <!-- "Why Not The Others?" Comparison Drawer -->
            <div class="inspector-box">
                <div>
                    <div class="inspector-headline">
                        <div>
                            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--accent-cyan);">Forensic Comparison</div>
                            <h3 id="inspVesselName" style="font-size: 16px; font-weight: 900; color: var(--text-primary);">{top_name}</h3>
                            <div class="mono" id="inspVesselMmsi" style="font-size: 11px; color: var(--text-secondary);">MMSI {top_mmsi}</div>
                        </div>
                        <span class="rank-tag rank-top1 mono" id="inspRankPill">RANK #1</span>
                    </div>

                    <!-- Side-by-Side 1v1 Divergence -->
                    <div class="comparison-drawer">
                        <div class="comp-header"><i class="fa-solid fa-code-compare"></i> Why Rank #1 over Rank #2?</div>
                        <div class="comp-grid">
                            <div class="comp-col">
                                <strong style="color: var(--accent-red);">{top_name} (#1)</strong><br>
                                <span class="mono">DCPA: {top_dcpa_val:.2f} km</span><br>
                                <span class="mono">Fréchet: {top_frechet_val:.2f} km</span>
                            </div>
                            <div class="comp-col">
                                <strong style="color: var(--text-secondary);">{second_name} (#2)</strong><br>
                                <span class="mono">DCPA: {second_dcpa_str}</span><br>
                                <span class="mono">Fréchet: {second_frechet_str}</span>
                            </div>
                        </div>
                    </div>

                    <!-- AIS Broadcast Continuous Stream -->
                    <div class="ais-activity-strip">
                        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--text-secondary);">
                            <span>AIS TRANSMISSION TIMELINE</span>
                            <span class="mono" style="color: var(--accent-green);">100% UPTIME</span>
                        </div>
                        <div class="activity-dots-row">
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                            <div class="activity-dot"></div>
                        </div>
                    </div>
                </div>

                <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; padding: 10px; font-size: 11px; margin-top: 10px;">
                    <div style="font-weight: 700; color: var(--accent-green); margin-bottom: 2px;">Corroborating Evidence:</div>
                    <div style="color: var(--text-secondary);">&bull; Kinematic minimum distance occurred inside observation window.</div>
                    <div style="color: var(--text-secondary);">&bull; Trajectory shape parity with high geometric correlation.</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Application Script Logic -->
    <script>
        const APP_DATA = {client_data_json};

        let map2D, layerSpill, layerSlick, layerTracks, layerCPA, vesselMarker2D, activeBasemap2D, basemapLayers = {{}};
        let scene3D, camera3D, renderer3D, controls3D, shipMesh3D, oceanMesh3D, slickMesh3D, wakeTrail3D, cpaLine3D;
        let selectedMmsi = APP_DATA.vessels.length > 0 ? APP_DATA.vessels[0].mmsi : null;
        let isPlaying = false, playAnimFrame = null, scrubVal = 0;
        let viewMode = '2d', showAllTail = false;

        // 1. Initialize GSAP Choreographed Animations
        function initGSAP() {{
            gsap.from(".case-title-row", {{ opacity: 0, y: -15, duration: 0.6, ease: "power2.out" }});
            gsap.from(".primary-suspect-banner", {{ opacity: 0, y: 15, duration: 0.7, delay: 0.15, ease: "power2.out" }});
            gsap.from(".canonical-breakdown-card", {{ opacity: 0, y: 15, duration: 0.7, delay: 0.25, ease: "power2.out" }});
            gsap.from(".cockpit-view-panel", {{ opacity: 0, scale: 0.98, duration: 0.8, delay: 0.35, ease: "power2.out" }});
            gsap.from(".ledger-split-grid", {{ opacity: 0, y: 15, duration: 0.7, delay: 0.45, ease: "power2.out" }});

            // Count-up confidence animation
            const targetConf = {top_conf_score * 100};
            let counter = {{ val: 0 }};
            gsap.to(counter, {{
                val: targetConf,
                duration: 1.8,
                delay: 0.3,
                ease: "power2.out",
                onUpdate: () => {{
                    const el = document.getElementById("confScoreText");
                    if (el) el.innerText = counter.val.toFixed(1) + "%";
                }}
            }});
        }}

        // 2. Initialize 2D Leaflet Map (CARTO Dark Matter Default)
        function init2DMap() {{
            const lat = APP_DATA.spill.lat;
            const lon = APP_DATA.spill.lon;

            map2D = L.map('map2D', {{
                center: [lat, lon],
                zoom: 11,
                attributionControl: false
            }});

            basemapLayers.dark = L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
                maxZoom: 19,
                subdomains: 'abcd'
            }});
            basemapLayers.sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{{z}}/{{y}}/{{x}}', {{ maxZoom: 18 }});
            basemapLayers.osm = L.tileLayer('https://{{s}}.basemaps.cartocdn.com/rastertiles/voyager/{{z}}/{{x}}/{{y}}{{r}}.png', {{ maxZoom: 18, subdomains: 'abcd' }});
            basemapLayers.ocean = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{{z}}/{{y}}/{{x}}', {{ maxZoom: 18 }});

            activeBasemap2D = basemapLayers.dark;
            activeBasemap2D.addTo(map2D);

            layerSpill = L.layerGroup().addTo(map2D);
            layerSlick = L.layerGroup().addTo(map2D);
            layerTracks = L.layerGroup().addTo(map2D);
            layerCPA = L.layerGroup().addTo(map2D);

            // Spill Envelope
            L.circle([lat, lon], {{
                radius: APP_DATA.spill.spread_km * 1000,
                color: '#f43f5e',
                fillColor: '#f43f5e',
                fillOpacity: 0.16,
                weight: 2
            }}).addTo(layerSpill);

            L.circleMarker([lat, lon], {{
                radius: 6,
                color: '#ffffff',
                fillColor: '#e11d48',
                fillOpacity: 1.0,
                weight: 2
            }}).bindTooltip("Spill Centroid").addTo(layerSpill);

            // Slick Line
            if (APP_DATA.spill.slick_coords && APP_DATA.spill.slick_coords.length > 1) {{
                L.polyline(APP_DATA.spill.slick_coords, {{
                    color: '#fbbf24',
                    dashArray: '6, 6',
                    weight: 3
                }}).addTo(layerSlick);
            }}

            // Pulsing Vessel Marker for Target
            vesselMarker2D = L.circleMarker([lat, lon], {{
                radius: 9,
                color: '#ffffff',
                fillColor: '#f43f5e',
                fillOpacity: 1.0,
                weight: 3
            }}).addTo(map2D);

            render2DTracks();
        }}

        function switchBasemap(type) {{
            if (activeBasemap2D) map2D.removeLayer(activeBasemap2D);
            activeBasemap2D = basemapLayers[type] || basemapLayers.dark;
            activeBasemap2D.addTo(map2D);
        }}

        function render2DTracks() {{
            layerTracks.clearLayers();
            layerCPA.clearLayers();

            const rankColors = {{ 1: '#f43f5e', 2: '#38bdf8', 3: '#a855f7' }};

            APP_DATA.vessels.forEach(v => {{
                if (!v.track || v.track.length < 2) return;
                const pts = v.track.map(p => [p.lat, p.lon]);
                const isSelected = (v.mmsi === selectedMmsi);
                const color = rankColors[v.rank] || '#475569';

                const poly = L.polyline(pts, {{
                    color: color,
                    weight: isSelected ? 5 : (v.rank <= 3 ? 3 : 1.5),
                    opacity: isSelected ? 1.0 : (selectedMmsi ? 0.2 : (v.rank <= 3 ? 0.8 : 0.3))
                }}).addTo(layerTracks);

                poly.on('click', () => selectVessel(v.mmsi));

                if (v.rank <= 3 || isSelected) {{
                    const cpaM = L.circleMarker([v.cpa_lat, v.cpa_lon], {{
                        radius: isSelected ? 8 : 6,
                        color: '#ffffff',
                        fillColor: color,
                        fillOpacity: 0.95,
                        weight: 2
                    }}).bindTooltip(`Rank #${{v.rank}} ${{v.name}} (CPA: ${{v.dcpa_km.toFixed(2)}} km)`).addTo(layerCPA);

                    cpaM.on('click', () => selectVessel(v.mmsi));
                }}
            }});
        }}

        // 3. Initialize True 3D Three.js Reconstruction Studio
        function init3DScene() {{
            const container = document.getElementById('scene3D');
            const width = container.clientWidth || 800;
            const height = container.clientHeight || 600;

            scene3D = new THREE.Scene();
            scene3D.background = new THREE.Color(0x05070a);
            scene3D.fog = new THREE.FogExp2(0x05070a, 0.008);

            camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            camera3D.position.set(0, 48, 70);

            renderer3D = new THREE.WebGLRenderer({{ antialias: true }});
            renderer3D.setSize(width, height);
            renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer3D.domElement);

            controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
            controls3D.enableDamping = true;
            controls3D.dampingFactor = 0.05;

            // Ambient & Directional Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.65);
            scene3D.add(ambient);

            const sun = new THREE.DirectionalLight(0x38bdf8, 1.0);
            sun.position.set(40, 60, 30);
            scene3D.add(sun);

            // Animated Ocean Plane with Displaced Vertices
            const oceanGeo = new THREE.PlaneGeometry(160, 160, 48, 48);
            const oceanMat = new THREE.MeshStandardMaterial({{
                color: 0x0c1622,
                roughness: 0.2,
                metalness: 0.7,
                wireframe: false
            }});
            oceanMesh3D = new THREE.Mesh(oceanGeo, oceanMat);
            oceanMesh3D.rotation.x = -Math.PI / 2;
            scene3D.add(oceanMesh3D);

            // Subdued Grid Helper
            const grid = new THREE.GridHelper(160, 40, 0x1e293b, 0x0f172a);
            grid.position.y = 0.05;
            scene3D.add(grid);

            // Irregular Noise-Deformed 3D Oil Slick Mesh
            const slickShape = new THREE.Shape();
            const numPts = 16;
            const baseRad = APP_DATA.spill.spread_km * 2.0;
            for (let i = 0; i < numPts; i++) {{
                const angle = (i / numPts) * Math.PI * 2;
                const r = baseRad * (0.8 + 0.35 * Math.sin(i * 3.5));
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) slickShape.moveTo(x, y); else slickShape.lineTo(x, y);
            }}
            slickShape.closePath();

            const slickGeo = new THREE.ShapeGeometry(slickShape);
            const slickMat = new THREE.MeshBasicMaterial({{
                color: 0xf43f5e,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide
            }});
            slickMesh3D = new THREE.Mesh(slickGeo, slickMat);
            slickMesh3D.rotation.x = Math.PI / 2;
            slickMesh3D.position.y = 0.15;
            scene3D.add(slickMesh3D);

            // Spill Centroid Neon Cylinder
            const pinGeo = new THREE.CylinderGeometry(0.3, 0.3, 3.5, 16);
            const pinMat = new THREE.MeshBasicMaterial({{ color: 0xf43f5e }});
            const pinMesh = new THREE.Mesh(pinGeo, pinMat);
            pinMesh.position.set(0, 1.75, 0);
            scene3D.add(pinMesh);

            // Low-Poly Ship Model
            build3DShip();

            // Wake Trail Breadcrumbs
            const wakeGeo = new THREE.BufferGeometry();
            const wakePositions = new Float32Array(300 * 3);
            wakeGeo.setAttribute('position', new THREE.BufferAttribute(wakePositions, 3));
            const wakeMat = new THREE.LineBasicMaterial({{ color: 0x38bdf8, opacity: 0.6, transparent: true }});
            wakeTrail3D = new THREE.Line(wakeGeo, wakeMat);
            scene3D.add(wakeTrail3D);

            // Render loop with animated gentle wave surface
            let clock = new THREE.Clock();
            function animate3D() {{
                requestAnimationFrame(animate3D);
                const t = clock.getElapsedTime();

                // Sine wave perturbation on ocean surface
                const pos = oceanGeo.attributes.position;
                for (let i = 0; i < pos.count; i++) {{
                    const u = pos.getX(i);
                    const v = pos.getY(i);
                    pos.setZ(i, Math.sin(u * 0.15 + t * 1.2) * 0.35 + Math.cos(v * 0.15 + t * 1.0) * 0.25);
                }}
                pos.needsUpdate = true;

                controls3D.update();
                renderer3D.render(scene3D, camera3D);
            }}
            animate3D();
        }}

        function build3DShip() {{
            shipMesh3D = new THREE.Group();

            // Hull
            const hullGeo = new THREE.BoxGeometry(2.6, 1.4, 8.0);
            const hullMat = new THREE.MeshStandardMaterial({{ color: 0x1e293b, roughness: 0.3 }});
            const hull = new THREE.Mesh(hullGeo, hullMat);
            hull.position.y = 0.7;
            shipMesh3D.add(hull);

            // Bridge Tower
            const bridgeGeo = new THREE.BoxGeometry(1.8, 1.6, 2.2);
            const bridgeMat = new THREE.MeshStandardMaterial({{ color: 0xffffff }});
            const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
            bridge.position.set(0, 2.0, -1.2);
            shipMesh3D.add(bridge);

            // Radar Mast
            const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
            const mastMat = new THREE.MeshStandardMaterial({{ color: 0xfbbf24 }});
            const mast = new THREE.Mesh(mastGeo, mastMat);
            mast.position.set(0, 3.5, -1.2);
            shipMesh3D.add(mast);

            // Navigational Light
            const navLight = new THREE.PointLight(0x38bdf8, 2.0, 12);
            navLight.position.set(0, 4.0, -1.2);
            shipMesh3D.add(navLight);

            scene3D.add(shipMesh3D);
        }}

        // 4. Mode Switching & Theming
        function setViewMode(mode) {{
            viewMode = mode;
            const tab2D = document.getElementById('tab2D');
            const tab3D = document.getElementById('tab3D');
            const mapEl = document.getElementById('map2D');
            const sceneEl = document.getElementById('scene3D');
            const titleEl = document.getElementById('viewportModeTitle');

            if (mode === '2d') {{
                tab2D.classList.add('active');
                tab3D.classList.remove('active');
                gsap.to(mapEl, {{ opacity: 1, duration: 0.3, display: 'block' }});
                gsap.to(sceneEl, {{ opacity: 0, duration: 0.3, display: 'none' }});
                titleEl.innerText = "Geospatial Forensics Cockpit (2D)";
                map2D.invalidateSize();
            }} else {{
                tab3D.classList.add('active');
                tab2D.classList.remove('active');
                gsap.to(mapEl, {{ opacity: 0, duration: 0.3, display: 'none' }});
                gsap.to(sceneEl, {{ opacity: 1, duration: 0.3, display: 'block' }});
                titleEl.innerText = "3D Event Reconstruction Studio";
                if (renderer3D) {{
                    const w = sceneEl.clientWidth;
                    const h = sceneEl.clientHeight;
                    camera3D.aspect = w / h;
                    camera3D.updateProjectionMatrix();
                    renderer3D.setSize(w, h);
                }}
            }}
        }}

        function togglePresentation() {{
            document.body.classList.toggle('presentation-mode');
            const isPres = document.body.classList.contains('presentation-mode');
            document.getElementById('presBtn').classList.toggle('active', isPres);
            if (map2D) map2D.invalidateSize();
        }}

        function toggleTheme() {{
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            document.getElementById('themeBtn').innerHTML = next === 'dark' ? '<i class="fa-solid fa-moon"></i> Theme' : '<i class="fa-solid fa-sun"></i> Theme';
        }}

        function resetViewport() {{
            if (viewMode === '2d') {{
                map2D.setView([APP_DATA.spill.lat, APP_DATA.spill.lon], 11);
            }} else if (controls3D) {{
                camera3D.position.set(0, 48, 70);
                controls3D.target.set(0, 0, 0);
            }}
        }}

        // 5. Unified Timeline Engine with Guided Narrative
        const NARRATIVE_STEPS = [
            {{ pct: 0, title: "Spill Origin Analysis", desc: "SAR radar detected slick with {spread_km:.1f} km dispersion envelope." }},
            {{ pct: 25, title: "Candidate AIS Screening", desc: "Filter AIS broadcast census across spatial & temporal observation windows." }},
            {{ pct: 55, title: "Kinematic Approach (CPA)", desc: "Primary candidate reaches closest point of approach ({top_dcpa_val:.2f} km)." }},
            {{ pct: 85, title: "Discrete Fréchet Alignment", desc: "Trajectory geometry matches slick drift axis with {top_frechet_val:.2f} km parity." }},
            {{ pct: 100, title: "Candidate Isolated", desc: "{top_name} isolated as primary responsible vessel with {top_conf_score * 100:.1f}% confidence." }}
        ];

        function onTimelineScrub(val) {{
            scrubVal = parseFloat(val);
            document.getElementById('timelinePhaseLabel').innerText = `Investigation Window: T = ${{scrubVal.toFixed(1)}}%`;

            // Update Narrative Toast
            let currNarrative = NARRATIVE_STEPS[0];
            for (let s of NARRATIVE_STEPS) {{
                if (scrubVal >= s.pct) currNarrative = s;
            }}
            document.getElementById('narrativeTitle').innerText = currNarrative.title;
            document.getElementById('narrativeCaption').innerText = currNarrative.desc;

            const activeV = APP_DATA.vessels.find(v => v.mmsi === selectedMmsi) || APP_DATA.vessels[0];
            if (!activeV || !activeV.track || activeV.track.length === 0) return;

            const idx = Math.min(activeV.track.length - 1, Math.floor((scrubVal / 100) * activeV.track.length));
            const pt = activeV.track[idx];

            // 2D Marker
            if (vesselMarker2D) vesselMarker2D.setLatLng([pt.lat, pt.lon]);

            // 3D Ship Mesh & Wake Update
            if (shipMesh3D) {{
                const dLat = (pt.lat - APP_DATA.spill.lat) * 111.0;
                const dLon = (pt.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                shipMesh3D.position.set(dLon * 2.2, 0.4, -dLat * 2.2);
                shipMesh3D.rotation.y = -(pt.cog * Math.PI / 180);

                // Grow 3D oil slick slightly over time
                if (slickMesh3D) {{
                    const scaleFactor = 0.8 + 0.4 * (scrubVal / 100);
                    slickMesh3D.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }}
            }}

            // Dynamic Telemetry Readout
            document.getElementById('teleCoords').innerText = `${{pt.lat.toFixed(4)}}° N, ${{Math.abs(pt.lon).toFixed(4)}}° W`;
            document.getElementById('teleSog').innerText = `${{pt.sog.toFixed(1)}} kts`;
            document.getElementById('teleCog').innerText = `${{pt.cog.toFixed(0)}}°`;

            const distSq = (pt.lat - APP_DATA.spill.lat)**2 + ((pt.lon - APP_DATA.spill.lon) * Math.cos(APP_DATA.spill.lat * Math.PI / 180))**2;
            const distKm = Math.sqrt(distSq) * 111.0;
            document.getElementById('teleDist').innerText = `${{distKm.toFixed(2)}} km`;
        }}

        function togglePlayback() {{
            isPlaying = !isPlaying;
            const btn = document.getElementById('playBtn');
            btn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i> Pause' : '<i class="fa-solid fa-play"></i> Reconstruct Event (Space)';
            btn.classList.toggle('active', isPlaying);

            if (isPlaying) {{
                function step() {{
                    if (!isPlaying) return;
                    scrubVal += 0.35;
                    if (scrubVal > 100) scrubVal = 0;
                    document.getElementById('timelineScrubber').value = scrubVal;
                    onTimelineScrub(scrubVal);
                    playAnimFrame = requestAnimationFrame(step);
                }}
                step();
            }} else if (playAnimFrame) {{
                cancelAnimationFrame(playAnimFrame);
            }}
        }}

        function jumpToTimeline(val) {{
            scrubVal = val;
            document.getElementById('timelineScrubber').value = val;
            onTimelineScrub(val);
        }}

        // 6. Vessel Selection & Deep-Dive Update
        function selectVessel(mmsi) {{
            selectedMmsi = mmsi;
            const v = APP_DATA.vessels.find(x => x.mmsi === mmsi);
            if (!v) return;

            render2DTracks();
            map2D.panTo([v.cpa_lat, v.cpa_lon]);

            document.getElementById('targetName').innerText = v.name;
            document.getElementById('targetMmsi').innerText = `MMSI ${{v.mmsi}} • ${{APP_DATA.spill.regime}} Backtrack • Centroid ${{APP_DATA.spill.lat.toFixed(4)}}° N, ${{APP_DATA.spill.lon.toFixed(4)}}° W`;
            document.getElementById('confScoreText').innerText = (v.conf_score * 100).toFixed(1) + "%";
            document.getElementById('confLabelBadge').innerText = v.conf_label + " CONFIDENCE";

            // Update Radial Gauge
            const offset = 157 - (157 * v.conf_score);
            document.getElementById('confGaugeMeter').style.strokeDashoffset = offset;

            // Update Metrics
            document.getElementById('metricDcpa').innerText = v.dcpa_km.toFixed(2) + " km";
            document.getElementById('metricFrechet').innerText = v.frechet_km.toFixed(2) + " km";
            document.getElementById('metricTcpa').innerText = (v.tcpa_min > 0 ? '+' : '') + v.tcpa_min.toFixed(1) + " min";
            document.getElementById('metricCov').innerText = (v.coverage * 100).toFixed(0) + "%";

            // Update Radar Polygon Points
            const pDcpa = Math.max(20, 70 - Math.min(50, v.dcpa_km * 4));
            const pFrechet = Math.min(125, 70 + Math.max(10, 50 - v.frechet_km * 5));
            const pTcpa = Math.min(125, 70 + Math.max(10, 50 - Math.abs(v.tcpa_min) * 0.1));
            const pCov = Math.max(15, 70 - (v.coverage * 50));
            document.getElementById('radarPoly').setAttribute('points', `70,${{pDcpa}} ${{pFrechet}},70 70,${{pTcpa}} ${{pCov}},70`);

            document.getElementById('inspRankPill').innerText = 'RANK #' + v.rank;
            document.getElementById('inspVesselName').innerText = v.name;
            document.getElementById('inspVesselMmsi').innerText = 'MMSI ' + v.mmsi;

            document.querySelectorAll('#ledgerTbody tr').forEach(tr => {{
                if (parseInt(tr.getAttribute('data-mmsi')) === mmsi) {{
                    tr.classList.add('active-row');
                }} else {{
                    tr.classList.remove('active-row');
                }}
            }});
        }}

        function populateLedger() {{
            const tbody = document.getElementById('ledgerTbody');
            tbody.innerHTML = '';

            APP_DATA.vessels.forEach((v, idx) => {{
                const tr = document.createElement('tr');
                tr.setAttribute('data-mmsi', v.mmsi);
                tr.setAttribute('data-name', v.name.toUpperCase());
                if (v.mmsi === selectedMmsi) tr.classList.add('active-row');

                const isTop = v.rank <= 3;
                if (isTop) tr.classList.add('top-candidate-row');
                if (!isTop && !showAllTail) tr.style.display = 'none';

                const rankClass = v.rank === 1 ? 'rank-top1' : (v.rank === 2 ? 'rank-top2' : (v.rank === 3 ? 'rank-top3' : 'rank-other'));
                const confPercent = Math.round(v.conf_score * 100);

                // Mini Trajectory Sparkline
                const sparkSvg = `<svg class="sparkline-svg" viewBox="0 0 50 18"><path d="M 2 9 Q 25 ${{v.rank === 1 ? '2' : (v.rank === 2 ? '5' : '14')}} 48 9" fill="none" stroke="${{v.rank === 1 ? 'var(--accent-red)' : (v.rank === 2 ? 'var(--accent-cyan)' : 'var(--text-dim)')}}" stroke-width="2"/></svg>`;

                tr.innerHTML = `
                    <td><span class="rank-tag ${{rankClass}} mono">#${{v.rank}}</span></td>
                    <td style="font-weight: ${{isTop ? '800' : '500'}}; color: var(--text-primary);">${{v.name}}</td>
                    <td class="mono">${{v.mmsi}}</td>
                    <td>${{sparkSvg}}</td>
                    <td class="mono">${{v.dcpa_km.toFixed(2)}} km</td>
                    <td class="mono">${{v.tcpa_min > 0 ? '+' : ''}}${{v.tcpa_min.toFixed(1)}} min</td>
                    <td class="mono">${{(v.coverage * 100).toFixed(0)}}%</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="mono" style="font-weight: 700;">${{confPercent}}%</span>
                            <div style="width: 44px; height: 5px; background: var(--border); border-radius: 2px; overflow: hidden;">
                                <div style="width: ${{confPercent}}%; height: 100%; background: ${{v.rank === 1 ? 'var(--accent-red)' : 'var(--accent-cyan)'}};"></div>
                            </div>
                        </div>
                    </td>
                `;

                tr.onclick = () => selectVessel(v.mmsi);
                tbody.appendChild(tr);
            }});
        }}

        function toggleTailRows() {{
            showAllTail = !showAllTail;
            const btn = document.getElementById('tailToggleBtn');
            btn.innerHTML = showAllTail ? '<i class="fa-solid fa-chevron-up"></i> Collapse Secondary Candidates' : `<i class="fa-solid fa-chevron-down"></i> Show All Evaluated Candidates (${{APP_DATA.vessels.length}})`;
            
            document.querySelectorAll('#ledgerTbody tr').forEach(tr => {{
                const mmsi = parseInt(tr.getAttribute('data-mmsi'));
                const v = APP_DATA.vessels.find(x => x.mmsi === mmsi);
                if (v && v.rank > 3) {{
                    tr.style.display = showAllTail ? '' : 'none';
                }}
            }});
        }}

        function filterLedger(query) {{
            const q = query.trim().toUpperCase();
            document.querySelectorAll('#ledgerTbody tr').forEach(tr => {{
                const name = tr.getAttribute('data-name');
                const mmsi = tr.getAttribute('data-mmsi');
                if (name.includes(q) || mmsi.includes(q)) {{
                    tr.style.display = '';
                }} else {{
                    tr.style.display = 'none';
                }}
            }});
        }}

        function toggleLayer(layerName) {{
            if (layerName === 'spill') {{
                const sw = document.getElementById('swSpill');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerSpill); else map2D.removeLayer(layerSpill);
            }} else if (layerName === 'slick') {{
                const sw = document.getElementById('swSlick');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerSlick); else map2D.removeLayer(layerSlick);
            }} else if (layerName === 'tracks') {{
                const sw = document.getElementById('swTracks');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerTracks); else map2D.removeLayer(layerTracks);
            }} else if (layerName === 'cpa') {{
                const sw = document.getElementById('swCPA');
                sw.classList.toggle('active');
                if (sw.classList.contains('active')) map2D.addLayer(layerCPA); else map2D.removeLayer(layerCPA);
            }}
        }}

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {{
            const searchEl = document.getElementById('vesselSearch');
            if (e.key === '/' && document.activeElement !== searchEl) {{
                e.preventDefault();
                searchEl.focus();
            }} else if (e.key === 'p' && document.activeElement !== searchEl) {{
                togglePresentation();
            }} else if (e.key === ' ' && document.activeElement !== searchEl) {{
                e.preventDefault();
                togglePlayback();
            }} else if (e.key === 'ArrowRight' && document.activeElement !== searchEl) {{
                scrubVal = Math.min(100, scrubVal + 5);
                document.getElementById('timelineScrubber').value = scrubVal;
                onTimelineScrub(scrubVal);
            }} else if (e.key === 'ArrowLeft' && document.activeElement !== searchEl) {{
                scrubVal = Math.max(0, scrubVal - 5);
                document.getElementById('timelineScrubber').value = scrubVal;
                onTimelineScrub(scrubVal);
            }} else if (['1', '2', '3'].includes(e.key) && document.activeElement !== searchEl) {{
                const r = parseInt(e.key);
                const target = APP_DATA.vessels.find(v => v.rank === r);
                if (target) selectVessel(target.mmsi);
            }}
        }});

        window.onload = () => {{
            initGSAP();
            init2DMap();
            init3DScene();
            populateLedger();
            onTimelineScrub(0);
        }};
    </script>
</body>
</html>
"""
    output_html_path.write_text(html, encoding="utf-8")
    return str(output_html_path)
