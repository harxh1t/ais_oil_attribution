"""Maritime Forensics // 3D Reconstruction Studio Generator.

A state-driven, immersive 3D forensic investigation environment:
- Camera is the interface. Time is the input device. State drives everything.
- AppState = { selectedVessel, timeCursor, activeLens, cameraTarget, filterStage, compareVessel }
- All state changes animate via camera and visual transitions with zero jarring cuts.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def generate_reconstruction_3d_dashboard(
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
    Renders the standalone 3D Reconstruction Studio HTML document.
    """
    output_html_path.parent.mkdir(parents=True, exist_ok=True)

    lat = float(input_data.get("lat", 0.0))
    lon = float(input_data.get("lon", 0.0))
    time_str = str(input_data.get("time_utc", ""))
    spread_km = float(input_data.get("spread_km", 0.0))
    regime = str(regime_decision.get("regime", "unknown")).upper()
    rationale = str(regime_decision.get("rationale", ""))

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
    second_name = second_vessel["name"] if second_vessel else "None"
    second_dcpa_str = f"{second_vessel['dcpa_km']:.2f} km" if second_vessel else "N/A"
    second_frechet_str = f"{second_vessel['frechet_km']:.2f} km" if second_vessel else "N/A"
    second_tcpa_str = f"{second_vessel['tcpa_min']:+.1f} min" if second_vessel else "N/A"

    total_candidates = len(vessels_payload)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maritime Forensics // 3D Reconstruction — Case #{investigation_id}</title>
    
    <!-- Dependencies: Three.js r128, OrbitControls, GSAP 3.12, FontAwesome 6 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

    <style>
        /* ============================================================
           MARITIME FORENSICS 3D — CINEMATIC SCIENTIFIC DESIGN SYSTEM
           ============================================================ */
        :root {{
            --bg-void: #040609;
            --bg-glass: rgba(10, 15, 24, 0.85);
            --bg-glass-card: rgba(16, 24, 38, 0.78);
            --border-glass: rgba(255, 255, 255, 0.09);
            --border-glow: rgba(56, 189, 248, 0.35);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-dim: #64748b;
            --accent-red: #f43f5e;
            --accent-red-glow: rgba(244, 63, 94, 0.3);
            --accent-cyan: #38bdf8;
            --accent-cyan-glow: rgba(56, 189, 248, 0.25);
            --accent-amber: #fbbf24;
            --accent-green: #10b981;
            --accent-purple: #a855f7;
            --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
            --glass-blur: blur(16px);
        }}

        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        html, body {{
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: var(--bg-void);
            color: var(--text-primary);
            font-family: var(--font-ui);
            font-size: 12px;
            user-select: none;
        }}

        .mono {{ font-family: var(--font-mono); font-feature-settings: "tnum"; }}

        /* 3D WebGL Canvas Layer */
        #webgl-canvas-container {{
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }}

        /* HUD Overlay Frame */
        .hud-overlay-frame {{
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
        }}
        .interactive {{ pointer-events: auto; }}

        /* Top Bar: Case ID, Lenses, Camera Modes, Utilities */
        .top-command-bar {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
        }}

        .brand-case-pill {{
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            backdrop-filter: var(--glass-blur);
            padding: 8px 16px;
            border-radius: 6px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 14px;
        }}
        .brand-badge {{
            background: var(--accent-red);
            color: #fff;
            font-weight: 900;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            box-shadow: 0 0 14px var(--accent-red-glow);
        }}

        /* Evidence Lenses Toolbar */
        .lens-switcher {{
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            backdrop-filter: var(--glass-blur);
            padding: 4px;
            border-radius: 6px;
            display: flex;
            gap: 4px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }}
        .lens-btn {{
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 700;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }}
        .lens-btn:hover {{ color: var(--text-primary); }}
        .lens-btn.active {{
            background: var(--accent-cyan-glow);
            color: var(--accent-cyan);
            border: 1px solid var(--accent-cyan);
            box-shadow: 0 0 12px var(--accent-cyan-glow);
        }}

        /* Camera Target & Action Buttons */
        .top-actions-cluster {{
            display: flex;
            gap: 8px;
            align-items: center;
        }}
        .action-chip {{
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            backdrop-filter: var(--glass-blur);
            color: var(--text-primary);
            font-size: 11px;
            font-weight: 700;
            padding: 7px 12px;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
            text-decoration: none;
        }}
        .action-chip:hover {{ border-color: var(--accent-cyan); color: var(--accent-cyan); }}
        .action-chip.active {{
            background: var(--accent-cyan);
            color: #000;
            border-color: var(--accent-cyan);
        }}

        /* Middle Floating Widgets: Candidate Cascade & Telemetry HUD */
        .middle-hud-layer {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            height: 100%;
            pointer-events: none;
            margin: 1rem 0;
            position: relative;
        }}

        /* Left Drawer: Candidate Cascade */
        .candidate-cascade-panel {{
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            backdrop-filter: var(--glass-blur);
            border-radius: 8px;
            padding: 1rem;
            width: 320px;
            max-height: 72vh;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.6);
            pointer-events: auto;
        }}
        .cascade-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-glass);
            padding-bottom: 8px;
        }}
        .filter-stage-pills {{
            display: flex;
            gap: 4px;
            background: rgba(0,0,0,0.3);
            padding: 3px;
            border-radius: 4px;
        }}
        .filter-pill {{
            background: transparent;
            border: none;
            color: var(--text-dim);
            font-size: 10px;
            font-weight: 800;
            padding: 3px 6px;
            border-radius: 3px;
            cursor: pointer;
        }}
        .filter-pill.active {{
            background: var(--accent-cyan);
            color: #000;
        }}

        .candidate-scroll-list {{
            overflow-y: auto;
            max-height: 54vh;
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding-right: 4px;
        }}
        .candidate-scroll-list::-webkit-scrollbar {{ width: 4px; }}
        .candidate-scroll-list::-webkit-scrollbar-thumb {{ background: var(--border-glass); border-radius: 2px; }}

        .candidate-card {{
            background: var(--bg-glass-card);
            border: 1px solid var(--border-glass);
            border-radius: 5px;
            padding: 8px 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .candidate-card:hover {{
            border-color: var(--accent-cyan);
            transform: translateX(3px);
        }}
        .candidate-card.active {{
            border-color: var(--accent-red);
            background: rgba(244, 63, 94, 0.12);
            box-shadow: 0 0 16px var(--accent-red-glow);
        }}
        .candidate-card.comparing {{
            border-color: var(--accent-cyan);
            background: rgba(56, 189, 248, 0.12);
        }}
        .candidate-card.dimmed {{
            opacity: 0.35;
        }}

        /* Right Drawer: Live Vessel Telemetry HUD & "Dive to Evidence" */
        .telemetry-inspector-panel {{
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            backdrop-filter: var(--glass-blur);
            border-radius: 8px;
            padding: 1.25rem;
            width: 360px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.6);
            pointer-events: auto;
        }}
        .target-hero-title {{
            font-size: 18px;
            font-weight: 900;
            color: var(--text-primary);
            letter-spacing: -0.02em;
        }}

        /* Dive to Evidence Buttons */
        .evidence-dive-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }}
        .dive-btn {{
            background: var(--bg-glass-card);
            border: 1px solid var(--border-glass);
            padding: 8px 10px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: left;
            color: var(--text-primary);
        }}
        .dive-btn:hover {{
            border-color: var(--accent-cyan);
            background: var(--accent-cyan-glow);
        }}
        .dive-btn strong {{
            font-size: 9px;
            text-transform: uppercase;
            color: var(--text-dim);
            letter-spacing: 0.05em;
            display: block;
        }}
        .dive-btn span {{
            font-size: 13px;
            font-weight: 800;
            color: var(--text-primary);
        }}

        /* Side-by-side Comparison Drawer */
        .compare-side-drawer {{
            background: rgba(6, 10, 16, 0.95);
            border: 1px solid var(--border-glow);
            border-radius: 6px;
            padding: 10px;
            display: none;
            flex-direction: column;
            gap: 8px;
        }}
        .compare-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }}
        .compare-col {{
            background: var(--bg-glass-card);
            border: 1px solid var(--border-glass);
            border-radius: 4px;
            padding: 8px;
            font-size: 11px;
        }}

        /* Bottom Command Center: Integrated Timeline & Time Machine */
        .bottom-timeline-cluster {{
            background: var(--bg-glass);
            border: 1px solid var(--border-glass);
            backdrop-filter: var(--glass-blur);
            border-radius: 8px;
            padding: 12px 18px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.6);
            pointer-events: auto;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
        }}

        .timeline-top-meta {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
        }}
        .play-pause-btn {{
            background: var(--accent-red);
            border: none;
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            padding: 6px 14px;
            border-radius: 4px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 0 14px var(--accent-red-glow);
            transition: transform 0.1s ease;
        }}
        .play-pause-btn:hover {{ transform: scale(1.04); }}

        /* Milestones Bar Above Scrubber */
        .milestones-bar {{
            position: relative;
            width: 100%;
            height: 20px;
            display: flex;
            align-items: center;
        }}
        .timeline-step-chip {{
            position: absolute;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.6);
            border: 1px solid var(--border-glass);
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 10px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;
        }}
        .timeline-step-chip:hover {{
            color: var(--accent-cyan);
            border-color: var(--accent-cyan);
        }}
        .timeline-step-chip.active {{
            background: var(--accent-cyan-glow);
            border-color: var(--accent-cyan);
            color: var(--accent-cyan);
        }}

        /* Range Track */
        .scrubber-track-box {{
            position: relative;
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 4px;
            display: flex;
            align-items: center;
        }}
        .scrubber-fill {{
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background: linear-gradient(90deg, #38bdf8 0%, #f43f5e 100%);
            border-radius: 4px;
            width: 0%;
            pointer-events: none;
        }}
        .timeline-range-input {{
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
        .timeline-range-input::-webkit-slider-thumb {{
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--accent-red);
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 0 14px var(--accent-red);
            transition: transform 0.1s ease;
        }}
        .timeline-range-input::-webkit-slider-thumb:hover {{
            transform: scale(1.25);
        }}

        /* SAR Overlay Texture Screen Effect */
        #sar-radar-screen {{
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(56, 189, 248, 0.12) 0%, transparent 80%),
                        repeating-linear-gradient(0deg, rgba(56, 189, 248, 0.04) 0px, rgba(56, 189, 248, 0.04) 2px, transparent 2px, transparent 4px);
            pointer-events: none;
            z-index: 5;
            opacity: 0;
            transition: opacity 0.8s ease;
        }}

        /* 3D CPA Callout Floating Badge */
        #cpa-measurement-callout {{
            position: absolute;
            background: var(--bg-glass);
            border: 1px solid var(--accent-red);
            color: #fff;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 800;
            pointer-events: none;
            display: none;
            z-index: 20;
            box-shadow: 0 0 20px var(--accent-red-glow);
            transform: translate(-50%, -100%);
        }}

        /* Instructions Key Legend */
        .keybindings-legend {{
            position: absolute;
            bottom: 12px;
            right: 18px;
            font-size: 10px;
            color: var(--text-dim);
            display: flex;
            gap: 12px;
        }}
        .key-badge {{
            background: rgba(255,255,255,0.1);
            border: 1px solid var(--border-glass);
            padding: 1px 5px;
            border-radius: 3px;
            color: var(--text-primary);
        }}
    </style>
</head>
<body>
    <!-- 3D WebGL Canvas Layer -->
    <div id="webgl-canvas-container"></div>

    <!-- SAR Satellite Radar Scanner Screen Effect -->
    <div id="sar-radar-screen"></div>

    <!-- Floating 3D CPA Callout Label -->
    <div id="cpa-measurement-callout" class="mono">
        <i class="fa-solid fa-arrows-to-dot" style="color: var(--accent-red);"></i>
        DCPA: <span id="cpaCalloutVal">0.00 km</span> (TCPA: <span id="tcpaCalloutVal">0.0 min</span>)
    </div>

    <!-- HUD Overlay Frame -->
    <div class="hud-overlay-frame">
        <!-- Top Command Bar -->
        <div class="top-command-bar interactive">
            <div class="brand-case-pill">
                <span class="brand-badge">WAKE 3D</span>
                <div>
                    <div style="font-weight: 900; font-size: 13px; letter-spacing: -0.01em;">3D Maritime Forensics Reconstruction</div>
                    <div class="mono" style="font-size: 10px; color: var(--text-secondary);">CASE #{investigation_id} &bull; INCIDENT: {time_str}</div>
                </div>
            </div>

            <!-- Evidence Lenses Switcher (Filter on Scene Visibility) -->
            <div class="lens-switcher">
                <button class="lens-btn active" id="lensNormal" onclick="setEvidenceLens('normal')"><i class="fa-solid fa-cube"></i> Normal</button>
                <button class="lens-btn" id="lensSpatial" onclick="setEvidenceLens('spatial')"><i class="fa-solid fa-arrows-to-dot"></i> Spatial Lens</button>
                <button class="lens-btn" id="lensTemporal" onclick="setEvidenceLens('temporal')"><i class="fa-solid fa-clock"></i> Temporal Lens</button>
                <button class="lens-btn" id="lensDrift" onclick="setEvidenceLens('drift')"><i class="fa-solid fa-water"></i> Drift Particles</button>
                <button class="lens-btn" id="lensAttribution" onclick="setEvidenceLens('attribution')"><i class="fa-solid fa-award"></i> Attribution</button>
            </div>

            <!-- Camera Target Presets & Utilities -->
            <div class="top-actions-cluster">
                <button class="action-chip active" id="camOverviewBtn" onclick="setCameraTarget('overview')" title="Tactical Wide View"><i class="fa-solid fa-globe"></i> Overview (ESC)</button>
                <button class="action-chip" id="camIncidentBtn" onclick="setCameraTarget('incident')" title="Incident Centroid Close-up"><i class="fa-solid fa-crosshairs"></i> Incident Center</button>
                <button class="action-chip" id="camSatelliteBtn" onclick="setCameraTarget('satellite')" title="Sentinel-1 SAR Radar Overhead"><i class="fa-solid fa-satellite"></i> SAR View</button>
                <button class="action-chip" onclick="takeSnapshot()" title="Export PNG Snapshot"><i class="fa-solid fa-camera"></i> Snapshot</button>
                <a href="final_report.html" class="action-chip" title="Classic Report"><i class="fa-solid fa-table"></i> Report</a>
                <a href="workstation.html" class="action-chip" title="Forensics Workstation"><i class="fa-solid fa-display"></i> Console</a>
            </div>
        </div>

        <!-- Middle Layer: Left Cascade Census + Right Inspector -->
        <div class="middle-hud-layer">
            <!-- Left: Candidate Filter Cascade -->
            <div class="candidate-cascade-panel interactive" id="cascadePanel">
                <div class="cascade-header">
                    <div>
                        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--accent-cyan);">Candidate Cascade</div>
                        <div style="font-weight: 800; font-size: 13px;">Filter Cascade: <span id="cascadeCountText">{total_candidates}</span></div>
                    </div>

                    <!-- Step Filter: Total -> 7 -> 4 -> 3 -> 1 -->
                    <div class="filter-stage-pills">
                        <button class="filter-pill active" onclick="setFilterStage({total_candidates})">All</button>
                        <button class="filter-pill" onclick="setFilterStage(7)">Top 7</button>
                        <button class="filter-pill" onclick="setFilterStage(4)">Top 4</button>
                        <button class="filter-pill" onclick="setFilterStage(3)">Top 3</button>
                        <button class="filter-pill" onclick="setFilterStage(1)">#1</button>
                    </div>
                </div>

                <div class="candidate-scroll-list" id="candidateListEl">
                    <!-- Dynamic Candidate Cards -->
                </div>
            </div>

            <!-- Right: Real Vessel Telemetry Inspector & Dive to Evidence -->
            <div class="telemetry-inspector-panel interactive" id="inspectorPanel">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span class="mono" style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: var(--accent-red);" id="inspRankBadge">RANK #1 TARGET</span>
                        <div class="target-hero-title" id="inspVesselName">{top_name}</div>
                        <div class="mono" style="font-size: 11px; color: var(--text-secondary);" id="inspVesselMeta">MMSI {top_mmsi} &bull; SOG: 12.4 kts</div>
                    </div>
                    <button class="action-chip" onclick="toggleCompareMode()" id="compareToggleBtn" style="padding: 4px 8px; font-size: 10px;" title="Compare against Rank #2">
                        <i class="fa-solid fa-code-compare"></i> Compare
                    </button>
                </div>

                <!-- Dive to Evidence Buttons (Click to Fly to CPA Point) -->
                <div class="evidence-dive-grid">
                    <button class="dive-btn" onclick="diveToCPA()" title="Fly Camera to Closest Point of Approach">
                        <strong><i class="fa-solid fa-arrows-to-dot" style="color: var(--accent-cyan);"></i> Dive to DCPA</strong>
                        <span class="mono" id="diveDcpaText">{top_dcpa_val:.2f} km</span>
                    </button>
                    <button class="dive-btn" onclick="diveToCPA()" title="Temporal Offset at CPA">
                        <strong><i class="fa-solid fa-clock" style="color: var(--accent-amber);"></i> Temporal (TCPA)</strong>
                        <span class="mono" id="diveTcpaText">{top_tcpa_val:+.1f} min</span>
                    </button>
                    <button class="dive-btn" onclick="setCameraTarget('incident')" title="Curve Parity Alignment">
                        <strong><i class="fa-solid fa-route" style="color: var(--accent-green);"></i> Fréchet Parity</strong>
                        <span class="mono" id="diveFrechetText">{top_frechet_val:.2f} km</span>
                    </button>
                    <button class="dive-btn" onclick="setEvidenceLens('attribution')" title="AIS Broadcast Coverage">
                        <strong><i class="fa-solid fa-tower-broadcast" style="color: var(--accent-purple);"></i> AIS Integrity</strong>
                        <span class="mono" id="diveCoverageText">{top_cov_val:.0f}%</span>
                    </button>
                </div>

                <!-- Side-by-Side 1v1 Compare Drawer -->
                <div class="compare-side-drawer" id="compareDrawer">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--accent-amber);">
                        <i class="fa-solid fa-code-compare"></i> Side-by-Side Kinematic Delta
                    </div>
                    <div class="compare-grid">
                        <div class="compare-col">
                            <strong style="color: var(--accent-red);" id="cmpName1">{top_name} (#1)</strong>
                            <div class="mono" id="cmpDcpa1">DCPA: {top_dcpa_val:.2f} km</div>
                            <div class="mono" id="cmpFrechet1">Fréchet: {top_frechet_val:.2f} km</div>
                            <div class="mono" id="cmpTcpa1">TCPA: {top_tcpa_val:+.1f} min</div>
                        </div>
                        <div class="compare-col">
                            <strong style="color: var(--accent-cyan);" id="cmpName2">{second_name} (#2)</strong>
                            <div class="mono" id="cmpDcpa2">DCPA: {second_dcpa_str}</div>
                            <div class="mono" id="cmpFrechet2">Fréchet: {second_frechet_str}</div>
                            <div class="mono" id="cmpTcpa2">TCPA: {second_tcpa_str}</div>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-glass); border-radius: 4px; padding: 8px 10px; font-size: 11px;">
                    <div style="color: var(--accent-green); font-weight: 700; margin-bottom: 2px;">Attribution Confidence: <span id="inspConfLabel" class="mono">{top_conf_label} ({(top_conf_score * 100):.1f}%)</span></div>
                    <div style="color: var(--text-secondary); font-size: 10px;" id="inspRationale">Continuous AIS broadcast with closest physical CPA to slick centroid inside the investigation window.</div>
                </div>
            </div>
        </div>

        <!-- Bottom: Integrated Timeline Scrubber & Time Machine -->
        <div class="bottom-timeline-cluster interactive">
            <div class="timeline-top-meta">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button class="play-pause-btn mono" id="playBtn" onclick="togglePlayback()"><i class="fa-solid fa-play"></i> Reconstruct Timeline</button>
                    <div class="mono" style="font-size: 11px; color: var(--text-primary);"><i class="fa-regular fa-clock" style="color: var(--accent-cyan);"></i> <span id="currentSimTime">{time_str}</span></div>
                </div>
                <div class="mono" id="timelinePhaseLabel" style="color: var(--accent-cyan); font-weight: 700;">Observation Window: T = 0.0%</div>
            </div>

            <!-- Milestones Step Rail -->
            <div class="milestones-bar">
                <div class="timeline-step-chip mono" style="left: 10%;" onclick="jumpToTimeline(10)">🛢️ Spill Origin (10%)</div>
                <div class="timeline-step-chip mono" style="left: 58%;" onclick="jumpToTimeline(58)">✕ Closest Approach (58%)</div>
                <div class="timeline-step-chip mono" style="left: 90%;" onclick="jumpToTimeline(90)">🛰️ Sentinel-1 SAR Pass (90%)</div>
            </div>

            <!-- Range Scrubber Bar -->
            <div class="scrubber-track-box">
                <div class="scrubber-fill" id="scrubberFill"></div>
                <input type="range" id="timelineScrubber" min="0" max="100" value="0" class="timeline-range-input" oninput="onTimelineScrub(this.value)">
            </div>
        </div>
    </div>

    <!-- Hotkey Legend -->
    <div class="keybindings-legend">
        <span><span class="key-badge">Space</span> Play/Pause</span>
        <span><span class="key-badge">ESC</span> Overview</span>
        <span><span class="key-badge">&larr; &rarr;</span> Scrub Time</span>
        <span><span class="key-badge">1 - 4</span> Lenses</span>
    </div>

    <!-- Core State-Driven Application Engine -->
    <script>
        const APP_DATA = {client_data_json};

        // ============================================================
        // 1. SINGLE GLOBAL APP STATE
        // "The camera is the interface. Time is the input device. State drives everything."
        // ============================================================
        const AppState = {{
            selectedVessel: APP_DATA.vessels.length > 0 ? APP_DATA.vessels[0].mmsi : null,
            timeCursor: 0.0,
            activeLens: "normal",
            cameraTarget: "overview",
            filterStage: {total_candidates},
            compareVessel: null,
            isPlaying: false
        }};

        // WebGL & Three.js Singletons
        let scene, camera, renderer, controls;
        let oceanMesh, bathymetryGrid, slickMesh, beaconGroup, sarScreenMesh;
        let driftParticlesGroup, cpaMarkersGroup, vesselMeshes = {{}}, vesselRibbons = {{}}, vesselWakes = {{}};
        let playAnimFrame = null;

        // ============================================================
        // 2. STATE TRANSITION CONTROLLER & CAMERA CONTROLLER
        // ============================================================
        function setState(updates) {{
            Object.assign(AppState, updates);
            applyState();
        }}

        function applyState() {{
            updateCameraPosition();
            updateLensVisibility();
            updateFilterCascadeVisibility();
            updateInspectorUI();
            updateTimelineUI();
        }}

        function setCameraTarget(target) {{
            document.querySelectorAll('.top-actions-cluster .action-chip').forEach(b => b.classList.remove('active'));
            if (target === 'overview') document.getElementById('camOverviewBtn')?.classList.add('active');
            else if (target === 'incident') document.getElementById('camIncidentBtn')?.classList.add('active');
            else if (target === 'satellite') document.getElementById('camSatelliteBtn')?.classList.add('active');

            setState({{ cameraTarget: target }});
        }}

        function setEvidenceLens(lens) {{
            document.querySelectorAll('.lens-switcher .lens-btn').forEach(b => b.classList.remove('active'));
            const map = {{ normal: 'lensNormal', spatial: 'lensSpatial', temporal: 'lensTemporal', drift: 'lensDrift', attribution: 'lensAttribution' }};
            document.getElementById(map[lens])?.classList.add('active');

            setState({{ activeLens: lens }});
        }}

        function setFilterStage(count) {{
            document.querySelectorAll('.filter-stage-pills .filter-pill').forEach(b => b.classList.remove('active'));
            event?.target?.classList.add('active');
            setState({{ filterStage: count }});
        }}

        // ============================================================
        // 3. CAMERA CONTROLLER (GSAP Choreography)
        // ============================================================
        function updateCameraPosition() {{
            if (!camera || !controls) return;

            const sarScreen = document.getElementById('sar-radar-screen');

            if (AppState.cameraTarget === 'overview') {{
                sarScreen.style.opacity = '0';
                gsap.to(camera.position, {{ x: 0, y: 52, z: 75, duration: 1.4, ease: "power2.inOut" }});
                gsap.to(controls.target, {{ x: 0, y: 0, z: 0, duration: 1.4, ease: "power2.inOut" }});
            }} else if (AppState.cameraTarget === 'incident') {{
                sarScreen.style.opacity = '0';
                gsap.to(camera.position, {{ x: 0, y: 22, z: 32, duration: 1.4, ease: "power2.inOut" }});
                gsap.to(controls.target, {{ x: 0, y: 0, z: 0, duration: 1.4, ease: "power2.inOut" }});
            }} else if (AppState.cameraTarget === 'vessel') {{
                sarScreen.style.opacity = '0';
                const vMesh = vesselMeshes[AppState.selectedVessel];
                if (vMesh) {{
                    gsap.to(controls.target, {{ x: vMesh.position.x, y: 0.5, z: vMesh.position.z, duration: 1.2, ease: "power2.out" }});
                    gsap.to(camera.position, {{ x: vMesh.position.x + 14, y: 9, z: vMesh.position.z + 18, duration: 1.4, ease: "power2.out" }});
                }}
            }} else if (AppState.cameraTarget === 'cpa') {{
                sarScreen.style.opacity = '0';
                const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedVessel);
                if (v) {{
                    const dLat = (v.cpa_lat - APP_DATA.spill.lat) * 111.0;
                    const dLon = (v.cpa_lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                    const cpaX = dLon * 2.2;
                    const cpaZ = -dLat * 2.2;

                    gsap.to(controls.target, {{ x: cpaX, y: 0, z: cpaZ, duration: 1.4, ease: "power2.inOut" }});
                    gsap.to(camera.position, {{ x: cpaX + 10, y: 12, z: cpaZ + 14, duration: 1.4, ease: "power2.inOut" }});
                    showCPACallout(v, cpaX, cpaZ);
                }}
            }} else if (AppState.cameraTarget === 'satellite') {{
                sarScreen.style.opacity = '0.85';
                gsap.to(camera.position, {{ x: 0, y: 110, z: 0.1, duration: 1.6, ease: "power2.inOut" }});
                gsap.to(controls.target, {{ x: 0, y: 0, z: 0, duration: 1.6, ease: "power2.inOut" }});
            }}
        }}

        function diveToCPA() {{
            setState({{ cameraTarget: 'cpa', activeLens: 'spatial' }});
        }}

        function showCPACallout(v, x, z) {{
            const callout = document.getElementById('cpa-measurement-callout');
            document.getElementById('cpaCalloutVal').innerText = v.dcpa_km.toFixed(2) + " km";
            document.getElementById('tcpaCalloutVal').innerText = (v.tcpa_min > 0 ? '+' : '') + v.tcpa_min.toFixed(1) + " min";
            callout.style.display = 'block';

            const vector = new THREE.Vector3(x, 1.5, z);
            vector.project(camera);
            const halfW = window.innerWidth / 2;
            const halfH = window.innerHeight / 2;
            callout.style.left = (vector.x * halfW + halfW) + 'px';
            callout.style.top = (-(vector.y * halfH) + halfH) + 'px';
        }}

        // ============================================================
        // 4. THREE.JS SCENE INITIALIZATION & ARTICULATION
        // ============================================================
        function init3DWorld() {{
            const container = document.getElementById('webgl-canvas-container');
            const w = window.innerWidth;
            const h = window.innerHeight;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x040609);
            scene.fog = new THREE.FogExp2(0x040609, 0.0065);

            camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1200);
            camera.position.set(0, 52, 75);

            renderer = new THREE.WebGLRenderer({{ antialias: true, powerPreference: "high-performance" }});
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 - 0.05;

            // Environmental Lights
            const ambient = new THREE.AmbientLight(0xffffff, 0.65);
            scene.add(ambient);

            const keySun = new THREE.DirectionalLight(0x38bdf8, 1.2);
            keySun.position.set(60, 80, 50);
            scene.add(keySun);

            const rimLight = new THREE.DirectionalLight(0xf43f5e, 0.4);
            rimLight.position.set(-50, 30, -40);
            scene.add(rimLight);

            // Ocean Floor / Wave Plane
            const oceanGeo = new THREE.PlaneGeometry(300, 300, 48, 48);
            const oceanMat = new THREE.MeshStandardMaterial({{
                color: 0x06111e,
                roughness: 0.2,
                metalness: 0.8
            }});
            oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
            oceanMesh.rotation.x = -Math.PI / 2;
            scene.add(oceanMesh);

            // Bathymetric Grid
            bathymetryGrid = new THREE.GridHelper(300, 60, 0x1e293b, 0x0b1320);
            bathymetryGrid.position.y = 0.02;
            scene.add(bathymetryGrid);

            // Spill Polygon Mesh
            buildSpillMesh();

            // OpenDrift Lagrangian Backtrack Particles Group
            buildDriftParticles();

            // CPA Markers Group
            cpaMarkersGroup = new THREE.Group();
            scene.add(cpaMarkersGroup);

            // Build Vessels & Trajectories
            buildAllVessels();

            // Render loop with wave motion
            let clock = new THREE.Clock();
            function animate() {{
                requestAnimationFrame(animate);
                const t = clock.getElapsedTime();

                const pos = oceanGeo.attributes.position;
                for (let i = 0; i < pos.count; i++) {{
                    const u = pos.getX(i);
                    const v = pos.getY(i);
                    pos.setZ(i, Math.sin(u * 0.08 + t * 1.2) * 0.3 + Math.cos(v * 0.08 + t * 0.9) * 0.2);
                }}
                pos.needsUpdate = true;

                if (AppState.activeLens === 'drift' && driftParticlesGroup) {{
                    driftParticlesGroup.children.forEach((p, idx) => {{
                        p.position.y = 0.2 + Math.sin(t * 2.0 + idx) * 0.08;
                    }});
                }}

                controls.update();
                renderer.render(scene, camera);
            }}
            animate();
        }}

        function buildSpillMesh() {{
            const slickShape = new THREE.Shape();
            const numPts = 20;
            const baseRad = Math.max(5.0, APP_DATA.spill.spread_km * 1.8);
            for (let i = 0; i < numPts; i++) {{
                const angle = (i / numPts) * Math.PI * 2;
                const r = baseRad * (0.85 + 0.3 * Math.sin(i * 3.4) + 0.15 * Math.cos(i * 4.8));
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) slickShape.moveTo(x, y); else slickShape.lineTo(x, y);
            }}
            slickShape.closePath();

            const slickGeo = new THREE.ShapeGeometry(slickShape);
            const slickMat = new THREE.MeshBasicMaterial({{
                color: 0xf43f5e,
                transparent: true,
                opacity: 0.38,
                side: THREE.DoubleSide
            }});
            slickMesh = new THREE.Mesh(slickGeo, slickMat);
            slickMesh.rotation.x = Math.PI / 2;
            slickMesh.position.y = 0.12;
            scene.add(slickMesh);

            beaconGroup = new THREE.Group();
            const pinGeo = new THREE.CylinderGeometry(0.3, 0.4, 3.5, 16);
            const pinMat = new THREE.MeshBasicMaterial({{ color: 0xf43f5e }});
            const pinMesh = new THREE.Mesh(pinGeo, pinMat);
            pinMesh.position.set(0, 1.75, 0);
            beaconGroup.add(pinMesh);

            const ringGeo = new THREE.RingGeometry(0.8, 1.6, 32);
            const ringMat = new THREE.MeshBasicMaterial({{ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }});
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.position.y = 0.15;
            beaconGroup.add(ringMesh);
            scene.add(beaconGroup);
        }}

        function buildDriftParticles() {{
            driftParticlesGroup = new THREE.Group();
            const particleGeo = new THREE.SphereGeometry(0.35, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({{ color: 0x38bdf8, transparent: true, opacity: 0.75 }});

            for (let i = 0; i < 120; i++) {{
                const fraction = i / 120.0;
                const dist = fraction * (APP_DATA.spill.spread_km * 3.5);
                const spreadAngle = (Math.random() - 0.5) * (0.4 + fraction * 1.2);
                const x = Math.sin(spreadAngle) * dist * 1.8;
                const z = -Math.cos(spreadAngle) * dist * 1.8;

                const p = new THREE.Mesh(particleGeo, particleMat);
                p.position.set(x, 0.2, z);
                driftParticlesGroup.add(p);
            }}
            driftParticlesGroup.visible = false;
            scene.add(driftParticlesGroup);
        }}

        function buildAllVessels() {{
            const rankColors = {{ 1: 0xf43f5e, 2: 0x38bdf8, 3: 0xa855f7 }};

            APP_DATA.vessels.forEach(v => {{
                if (!v.track || v.track.length < 2) return;

                const shipGroup = new THREE.Group();

                const hullGeo = new THREE.BoxGeometry(2.4, 0.9, 7.2);
                const hullMat = new THREE.MeshStandardMaterial({{
                    color: v.rank === 1 ? 0x991b1b : (v.rank <= 3 ? 0x1e293b : 0x0f172a),
                    roughness: 0.3
                }});
                const hull = new THREE.Mesh(hullGeo, hullMat);
                hull.position.y = 0.6;
                shipGroup.add(hull);

                const bridgeGeo = new THREE.BoxGeometry(1.6, 1.4, 2.2);
                const bridgeMat = new THREE.MeshStandardMaterial({{ color: 0xf8fafc }});
                const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
                bridge.position.set(0, 1.6, -1.0);
                shipGroup.add(bridge);

                const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8);
                const mastMat = new THREE.MeshStandardMaterial({{ color: 0xfbbf24 }});
                const mast = new THREE.Mesh(mastGeo, mastMat);
                mast.position.set(0, 3.0, -1.0);
                shipGroup.add(mast);

                if (v.rank === 1) {{
                    const navLight = new THREE.PointLight(0xf43f5e, 2.0, 10);
                    navLight.position.set(0, 3.5, -1.0);
                    shipGroup.add(navLight);
                }}

                scene.add(shipGroup);
                vesselMeshes[v.mmsi] = shipGroup;

                const pts = [];
                v.track.forEach(p => {{
                    const dLat = (p.lat - APP_DATA.spill.lat) * 111.0;
                    const dLon = (p.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                    pts.push(new THREE.Vector3(dLon * 2.2, 0.16, -dLat * 2.2));
                }});

                const curve = new THREE.CatmullRomCurve3(pts);
                const curvePts = curve.getPoints(100);
                const ribbonGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
                const ribbonColor = rankColors[v.rank] || 0x475569;
                const ribbonMat = new THREE.LineBasicMaterial({{
                    color: ribbonColor,
                    transparent: true,
                    opacity: v.rank === 1 ? 0.95 : (v.rank <= 3 ? 0.75 : 0.35),
                    linewidth: v.rank <= 3 ? 2 : 1
                }});
                const line = new THREE.Line(ribbonGeo, ribbonMat);
                scene.add(line);
                vesselRibbons[v.mmsi] = line;

                const dLat = (v.cpa_lat - APP_DATA.spill.lat) * 111.0;
                const dLon = (v.cpa_lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                const cpaMGeo = new THREE.SphereGeometry(0.6, 12, 12);
                const cpaMMat = new THREE.MeshBasicMaterial({{ color: ribbonColor }});
                const cpaMesh = new THREE.Mesh(cpaMGeo, cpaMMat);
                cpaMesh.position.set(dLon * 2.2, 0.3, -dLat * 2.2);
                cpaMarkersGroup.add(cpaMesh);
            }});
        }}

        // ============================================================
        // 5. VISIBILITY & LENS LOGIC
        // ============================================================
        function updateLensVisibility() {{
            const lens = AppState.activeLens;

            if (driftParticlesGroup) {{
                driftParticlesGroup.visible = (lens === 'drift');
            }}

            if (cpaMarkersGroup) {{
                cpaMarkersGroup.visible = (lens === 'spatial' || lens === 'normal' || lens === 'attribution');
            }}

            Object.keys(vesselMeshes).forEach(mmsiStr => {{
                const mmsi = parseInt(mmsiStr);
                const v = APP_DATA.vessels.find(x => x.mmsi === mmsi);
                const ribbon = vesselRibbons[mmsi];
                if (!ribbon) return;

                if (lens === 'attribution') {{
                    ribbon.material.opacity = (v && v.rank === 1) ? 1.0 : 0.15;
                }} else if (lens === 'spatial') {{
                    ribbon.material.opacity = (v && v.rank <= 3) ? 0.9 : 0.2;
                }} else {{
                    ribbon.material.opacity = (v && v.rank === 1) ? 0.95 : (v && v.rank <= 3 ? 0.7 : 0.35);
                }}
            }});
        }}

        function updateFilterCascadeVisibility() {{
            const limit = AppState.filterStage;
            document.getElementById('cascadeCountText').innerText = limit;

            APP_DATA.vessels.forEach(v => {{
                const isVisible = (v.rank <= limit);
                const ship = vesselMeshes[v.mmsi];
                const ribbon = vesselRibbons[v.mmsi];
                const card = document.querySelector(`.candidate-card[data-mmsi="${{v.mmsi}}"]`);

                if (ship) ship.visible = isVisible;
                if (ribbon) ribbon.visible = isVisible;
                if (card) {{
                    card.classList.toggle('dimmed', !isVisible);
                }}
            }});
        }}

        // ============================================================
        // 6. TIMELINE ENGINE & POSITION PROPAGATION
        // ============================================================
        function onTimelineScrub(val) {{
            AppState.timeCursor = parseFloat(val);
            document.getElementById('timelinePhaseLabel').innerText = `Observation Window: T = ${{AppState.timeCursor.toFixed(1)}}%`;
            document.getElementById('scrubberFill').style.width = AppState.timeCursor + "%";

            APP_DATA.vessels.forEach(v => {{
                if (!v.track || v.track.length === 0) return;
                const ship = vesselMeshes[v.mmsi];
                if (!ship) return;

                const idx = Math.min(v.track.length - 1, Math.floor((AppState.timeCursor / 100) * v.track.length));
                const pt = v.track[idx];

                const dLat = (pt.lat - APP_DATA.spill.lat) * 111.0;
                const dLon = (pt.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                ship.position.set(dLon * 2.2, 0.4, -dLat * 2.2);
                ship.rotation.y = -(pt.cog * Math.PI / 180);
            }});

            if (slickMesh) {{
                const scale = 0.85 + 0.35 * (AppState.timeCursor / 100);
                slickMesh.scale.set(scale, scale, scale);
            }}

            updateInspectorUI();
        }}

        function togglePlayback() {{
            AppState.isPlaying = !AppState.isPlaying;
            const btn = document.getElementById('playBtn');
            btn.innerHTML = AppState.isPlaying ? '<i class="fa-solid fa-pause"></i> Pause Reconstruct' : '<i class="fa-solid fa-play"></i> Reconstruct Timeline';

            if (AppState.isPlaying) {{
                function step() {{
                    if (!AppState.isPlaying) return;
                    AppState.timeCursor += 0.25;
                    if (AppState.timeCursor > 100) AppState.timeCursor = 0;
                    document.getElementById('timelineScrubber').value = AppState.timeCursor;
                    onTimelineScrub(AppState.timeCursor);
                    playAnimFrame = requestAnimationFrame(step);
                }}
                step();
            }} else if (playAnimFrame) {{
                cancelAnimationFrame(playAnimFrame);
            }}
        }}

        function jumpToTimeline(val) {{
            document.getElementById('timelineScrubber').value = val;
            onTimelineScrub(val);
        }}

        // ============================================================
        // 7. INSPECTOR UI & CANDIDATE SELECTION
        // ============================================================
        function selectVessel(mmsi) {{
            setState({{ selectedVessel: mmsi, cameraTarget: 'vessel' }});
        }}

        function toggleCompareMode() {{
            if (AppState.compareVessel) {{
                AppState.compareVessel = null;
                document.getElementById('compareDrawer').style.display = 'none';
                document.getElementById('compareToggleBtn').classList.remove('active');
            }} else {{
                const second = APP_DATA.vessels.length > 1 ? APP_DATA.vessels[1].mmsi : null;
                AppState.compareVessel = second;
                document.getElementById('compareDrawer').style.display = 'flex';
                document.getElementById('compareToggleBtn').classList.add('active');
                setCameraTarget('overview');
            }}
            updateInspectorUI();
        }}

        function updateInspectorUI() {{
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedVessel) || APP_DATA.vessels[0];
            if (!v) return;

            document.getElementById('inspRankBadge').innerText = `RANK #${{v.rank}} CANDIDATE`;
            document.getElementById('inspVesselName').innerText = v.name;
            document.getElementById('diveDcpaText').innerText = v.dcpa_km.toFixed(2) + " km";
            document.getElementById('diveTcpaText').innerText = (v.tcpa_min > 0 ? '+' : '') + v.tcpa_min.toFixed(1) + " min";
            document.getElementById('diveFrechetText').innerText = v.frechet_km.toFixed(2) + " km";
            document.getElementById('diveCoverageText').innerText = (v.coverage * 100).toFixed(0) + "%";
            document.getElementById('inspConfLabel').innerText = `${{v.conf_label}} (${{(v.conf_score * 100).toFixed(1)}}%)`;

            if (v.track && v.track.length > 0) {{
                const idx = Math.min(v.track.length - 1, Math.floor((AppState.timeCursor / 100) * v.track.length));
                const pt = v.track[idx];
                document.getElementById('inspVesselMeta').innerText = `MMSI ${{v.mmsi}} • SOG: ${{pt.sog.toFixed(1)}} kts • COG: ${{pt.cog.toFixed(0)}}°`;
            }}

            document.querySelectorAll('.candidate-card').forEach(card => {{
                const cardMmsi = parseInt(card.getAttribute('data-mmsi'));
                card.classList.toggle('active', cardMmsi === AppState.selectedVessel);
                card.classList.toggle('comparing', cardMmsi === AppState.compareVessel);
            }});
        }}

        function populateCandidateList() {{
            const container = document.getElementById('candidateListEl');
            container.innerHTML = '';

            APP_DATA.vessels.forEach(v => {{
                const card = document.createElement('div');
                card.className = 'candidate-card';
                card.setAttribute('data-mmsi', v.mmsi);
                card.setAttribute('data-rank', v.rank);

                const rankColor = v.rank === 1 ? 'var(--accent-red)' : (v.rank <= 3 ? 'var(--accent-cyan)' : 'var(--text-dim)');

                card.innerHTML = `
                    <div>
                        <strong style="color: var(--text-primary); font-size: 11px;">${{v.name}}</strong>
                        <div class="mono" style="font-size: 10px; color: var(--text-secondary);">MMSI ${{v.mmsi}} &bull; DCPA: ${{v.dcpa_km.toFixed(2)}} km</div>
                    </div>
                    <span class="mono" style="font-weight: 800; font-size: 11px; color: ${{rankColor}};">#${{v.rank}}</span>
                `;

                card.onclick = () => selectVessel(v.mmsi);
                container.appendChild(card);
            }});
        }}

        function updateTimelineUI() {{
            document.getElementById('timelineScrubber').value = AppState.timeCursor;
            document.getElementById('scrubberFill').style.width = AppState.timeCursor + "%";
        }}

        function takeSnapshot() {{
            if (!renderer) return;
            const dataURL = renderer.domElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `reconstruction_${{APP_DATA.investigation_id}}.png`;
            link.href = dataURL;
            link.click();
        }}

        document.addEventListener('keydown', (e) => {{
            if (e.key === 'Escape') setCameraTarget('overview');
            else if (e.key === ' ') {{ e.preventDefault(); togglePlayback(); }}
            else if (e.key === '1') setEvidenceLens('normal');
            else if (e.key === '2') setEvidenceLens('spatial');
            else if (e.key === '3') setEvidenceLens('temporal');
            else if (e.key === '4') setEvidenceLens('drift');
            else if (e.key === 'ArrowRight') jumpToTimeline(Math.min(100, AppState.timeCursor + 5));
            else if (e.key === 'ArrowLeft') jumpToTimeline(Math.max(0, AppState.timeCursor - 5));
        }});

        window.addEventListener('resize', () => {{
            if (renderer && camera) {{
                const w = window.innerWidth;
                const h = window.innerHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }}
        }});

        window.onload = () => {{
            init3DWorld();
            populateCandidateList();
            onTimelineScrub(0);
            applyState();
        }};
    </script>
</body>
</html>
"""
    output_html_path.write_text(html, encoding="utf-8")
    return str(output_html_path)

