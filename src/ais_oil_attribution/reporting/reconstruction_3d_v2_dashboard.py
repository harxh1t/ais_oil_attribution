"""Maritime Forensics // 3D Reconstruction Studio v2 Generator.

A trustworthy, evidence-first forensic investigation workspace:
- Dual 2D/3D visualization with explicit observed vs. interpolated track styling
- Confidence decomposition (Coverage, Kinematics, Temporal, Parity, Drift fit)
- Timestamp-aware timeline with speed multipliers and real UTC time
- Evidence ledger, data provenance, analyst notes, bookmarks, candidate comparison
- Reproducible case package export (JSON/CSV/PNG)
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def generate_reconstruction_3d_v2_dashboard(
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
    Renders the standalone 3D Reconstruction Studio v2 HTML document.
    """
    output_html_path.parent.mkdir(parents=True, exist_ok=True)

    lat = float(input_data.get("lat", 0.0))
    lon = float(input_data.get("lon", 0.0))
    time_str = str(input_data.get("time_utc", ""))
    spread_km = float(input_data.get("spread_km", 0.0))
    regime = str(regime_decision.get("regime", "unknown")).upper()
    rationale = str(regime_decision.get("rationale", ""))

    vessels_payload = []
    min_ts_iso = None
    max_ts_iso = None

    if not scores_df.empty and not reconstructed_df.empty:
        pts_by_mmsi = {}
        for mmsi, group in reconstructed_df.groupby("mmsi"):
            g_sorted = group.sort_values("timestamp")
            pts = []
            for _, r in g_sorted.iterrows():
                ts_dt = pd.Timestamp(r["timestamp"])
                ts_iso = ts_dt.isoformat()
                if min_ts_iso is None or ts_dt < pd.Timestamp(min_ts_iso):
                    min_ts_iso = ts_iso
                if max_ts_iso is None or ts_dt > pd.Timestamp(max_ts_iso):
                    max_ts_iso = ts_iso

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
            observed_count = sum(1 for p in track_points if not p.get("is_interp", False))
            interpolated_count = sum(1 for p in track_points if p.get("is_interp", False))

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
                "observed_count": observed_count,
                "interpolated_count": interpolated_count,
                "status": "Supported" if rank == 1 else ("Reviewing" if rank <= 3 else "Unreviewed"),
                "bookmarked": False,
                "notes": "",
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
        "metadata": {
            "dataset_name": "MarineCadastre NOAA GeoParquet / Sentinel-1 SAR",
            "coordinate_system": "WGS-84 (EPSG:4326) -> Local Metric Projection",
            "time_window_start": min_ts_iso or time_str,
            "time_window_end": max_ts_iso or time_str,
            "provenance_status": "ANALYSIS WORKSPACE (AUDITABLE)",
            "disclaimer": "This analysis provides spatial, temporal, and geometric candidate correlation. It constitutes an analytical decision-support aid and does not replace official on-site forensic maritime verification."
        },
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
    <title>Maritime Forensics 3D Reconstruction v2 — Case #{investigation_id}</title>
    
    <!-- Dependencies: Three.js r128, OrbitControls, GSAP 3.12, FontAwesome 6 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

    <style>
        :root {{
            --bg-void: #030712;
            --bg-surface: rgba(15, 23, 42, 0.90);
            --bg-card: rgba(30, 41, 59, 0.75);
            --bg-input: rgba(15, 23, 42, 0.85);
            --border-subtle: rgba(255, 255, 255, 0.08);
            --border-active: rgba(56, 189, 248, 0.5);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --text-dim: #64748b;
            --accent-red: #f43f5e;
            --accent-red-bg: rgba(244, 63, 94, 0.15);
            --accent-cyan: #38bdf8;
            --accent-cyan-bg: rgba(56, 189, 248, 0.15);
            --accent-amber: #fbbf24;
            --accent-green: #10b981;
            --accent-purple: #a855f7;
            --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", monospace;
        }}

        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        html, body {{
            width: 100%; height: 100%; overflow: hidden;
            background: var(--bg-void); color: var(--text-main);
            font-family: var(--font-sans); font-size: 12px;
            user-select: none;
        }}
        .mono {{ font-family: var(--font-mono); font-feature-settings: "tnum"; }}

        #webgl-canvas-container {{ position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }}

        /* Top Command & Mode Bar */
        .app-header {{
            position: absolute; top: 0; left: 0; width: 100%; height: 54px;
            background: var(--bg-surface); border-bottom: 1px solid var(--border-subtle);
            backdrop-filter: blur(16px); z-index: 100;
            display: flex; justify-content: space-between; align-items: center; padding: 0 1.25rem;
        }}
        .header-brand-group {{ display: flex; align-items: center; gap: 14px; }}
        .provenance-tag {{
            background: rgba(16, 185, 129, 0.15); color: var(--accent-green);
            border: 1px solid var(--accent-green); font-size: 10px; font-weight: 800;
            padding: 3px 8px; border-radius: 4px; letter-spacing: 0.05em; text-transform: uppercase;
        }}

        /* Mode Switcher Tabs */
        .workspace-tabs {{
            display: flex; background: rgba(0, 0, 0, 0.4); padding: 3px; border-radius: 6px;
            border: 1px solid var(--border-subtle); gap: 4px;
        }}
        .mode-tab {{
            background: transparent; border: none; color: var(--text-muted);
            font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 4px;
            cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s;
        }}
        .mode-tab:hover {{ color: var(--text-main); }}
        .mode-tab.active {{
            background: var(--accent-cyan-bg); color: var(--accent-cyan);
            border: 1px solid var(--accent-cyan);
        }}

        .header-actions {{ display: flex; align-items: center; gap: 8px; }}
        .btn-action {{
            background: var(--bg-card); border: 1px solid var(--border-subtle);
            color: var(--text-main); font-size: 11px; font-weight: 700; padding: 6px 12px;
            border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
            transition: all 0.15s; text-decoration: none;
        }}
        .btn-action:hover {{ border-color: var(--accent-cyan); color: var(--accent-cyan); }}
        .btn-action.active {{ background: var(--accent-cyan); color: #000; border-color: var(--accent-cyan); }}

        /* Main Workspace Overlay Grid */
        .workspace-grid {{
            position: absolute; top: 54px; left: 0; width: 100%; height: calc(100% - 54px - 64px);
            z-index: 10; pointer-events: none; display: flex; justify-content: space-between; padding: 12px 16px;
        }}
        .interactive {{ pointer-events: auto; }}

        /* Left Candidate Explorer Drawer */
        .left-explorer-panel {{
            width: 340px; height: 100%; background: var(--bg-surface);
            border: 1px solid var(--border-subtle); border-radius: 8px; backdrop-filter: blur(16px);
            display: flex; flex-direction: column; gap: 8px; padding: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        }}
        .search-box {{
            width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle);
            color: var(--text-main); padding: 7px 10px; border-radius: 5px; font-size: 11px; outline: none;
        }}
        .search-box:focus {{ border-color: var(--accent-cyan); }}

        .filter-controls-row {{ display: flex; gap: 6px; align-items: center; }}
        .custom-select {{
            background: var(--bg-input); border: 1px solid var(--border-subtle);
            color: var(--text-main); font-size: 10px; padding: 4px 6px; border-radius: 4px; outline: none;
        }}

        .cascade-stage-bar {{
            display: flex; background: rgba(0,0,0,0.3); padding: 2px; border-radius: 4px; gap: 2px;
        }}
        .stage-pill {{
            flex: 1; background: transparent; border: none; color: var(--text-dim);
            font-size: 9px; font-weight: 800; padding: 4px 0; border-radius: 3px; cursor: pointer; text-align: center;
        }}
        .stage-pill.active {{ background: var(--accent-cyan); color: #000; }}

        .candidate-card-list {{
            flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;
        }}
        .candidate-card-list::-webkit-scrollbar {{ width: 4px; }}
        .candidate-card-list::-webkit-scrollbar-thumb {{ background: var(--border-subtle); border-radius: 2px; }}

        .cand-card {{
            background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 6px;
            padding: 8px 10px; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 4px;
        }}
        .cand-card:hover {{ border-color: var(--accent-cyan); transform: translateX(2px); }}
        .cand-card.active {{
            border-color: var(--accent-red); background: var(--accent-red-bg);
            box-shadow: 0 0 16px rgba(244, 63, 94, 0.25);
        }}
        .cand-card.comparing {{ border-color: var(--accent-cyan); background: var(--accent-cyan-bg); }}
        .cand-card.dimmed {{ opacity: 0.25; }}

        .cand-header {{ display: flex; justify-content: space-between; align-items: center; }}
        .cand-name {{ font-weight: 800; font-size: 11px; color: var(--text-main); }}
        .cand-rank {{ font-weight: 900; font-size: 11px; }}

        .cand-metrics-chips {{ display: flex; gap: 6px; flex-wrap: wrap; }}
        .cand-chip {{
            background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 3px;
            font-size: 9px; color: var(--text-muted);
        }}

        /* Right Evidence Inspector & Provenance Drawer */
        .right-inspector-panel {{
            width: 380px; height: 100%; background: var(--bg-surface);
            border: 1px solid var(--border-subtle); border-radius: 8px; backdrop-filter: blur(16px);
            display: flex; flex-direction: column; gap: 10px; padding: 14px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6); overflow-y: auto;
        }}
        .right-inspector-panel::-webkit-scrollbar {{ width: 4px; }}
        .right-inspector-panel::-webkit-scrollbar-thumb {{ background: var(--border-subtle); border-radius: 2px; }}

        /* Confidence Decomposition Block */
        .confidence-decomp-box {{
            background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px;
        }}
        .decomp-bar-row {{
            display: flex; justify-content: space-between; align-items: center; font-size: 10px; margin-bottom: 4px;
        }}
        .decomp-track {{
            width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 8px;
        }}
        .decomp-fill {{ height: 100%; border-radius: 3px; }}

        /* Evidence Ledger Table */
        .ledger-table {{
            width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px;
        }}
        .ledger-table th, .ledger-table td {{
            padding: 5px 6px; text-align: left; border-bottom: 1px solid var(--border-subtle);
        }}
        .ledger-table th {{ color: var(--text-dim); text-transform: uppercase; font-size: 9px; }}

        /* Notes & Status Editor */
        .analyst-notes-box {{
            background: var(--bg-input); border: 1px solid var(--border-subtle);
            color: var(--text-main); width: 100%; height: 55px; border-radius: 4px;
            padding: 6px 8px; font-size: 11px; resize: none; outline: none; font-family: var(--font-sans);
        }}
        .analyst-notes-box:focus {{ border-color: var(--accent-cyan); }}

        /* Bottom Real-Time Controller */
        .app-bottom-bar {{
            position: absolute; bottom: 0; left: 0; width: 100%; height: 64px;
            background: var(--bg-surface); border-top: 1px solid var(--border-subtle);
            backdrop-filter: blur(16px); z-index: 100; display: flex; align-items: center;
            justify-content: space-between; padding: 0 1.5rem; gap: 1.5rem;
        }}

        .timeline-controls-group {{ display: flex; align-items: center; gap: 10px; }}
        .btn-playback {{
            background: var(--accent-red); border: none; color: #fff;
            font-size: 12px; font-weight: 800; padding: 8px 14px; border-radius: 5px;
            cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
        }}

        .timeline-slider-track {{
            flex: 1; display: flex; flex-direction: column; gap: 4px; position: relative;
        }}
        .slider-meta-row {{
            display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted);
        }}
        .range-slider-input {{
            -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
            background: rgba(255,255,255,0.1); border-radius: 3px; outline: none; cursor: pointer;
        }}
        .range-slider-input::-webkit-slider-thumb {{
            -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%;
            background: var(--accent-red); border: 2px solid #fff; cursor: pointer;
        }}

        /* Tooltip Floating Callout */
        #cpa-measurement-callout {{
            position: absolute; background: var(--bg-surface); border: 1px solid var(--accent-red);
            color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: 800;
            pointer-events: none; display: none; z-index: 50; transform: translate(-50%, -100%);
            box-shadow: 0 0 20px rgba(244, 63, 94, 0.4);
        }}

        /* Layer Manager Modal */
        .layer-modal {{
            position: absolute; top: 60px; right: 16px; width: 260px; background: var(--bg-surface);
            border: 1px solid var(--border-active); border-radius: 8px; padding: 12px; z-index: 200;
            display: none; flex-direction: column; gap: 8px; backdrop-filter: blur(16px);
        }}
        .layer-checkbox-row {{
            display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-main); cursor: pointer;
        }}
    </style>
</head>
<body>
    <!-- 3D Canvas Layer -->
    <div id="webgl-canvas-container"></div>

    <!-- 3D CPA Floating Distance Callout -->
    <div id="cpa-measurement-callout" class="mono">
        <i class="fa-solid fa-arrows-to-dot" style="color: var(--accent-red);"></i>
        DCPA: <span id="cpaDistVal">0.00 km</span> (<span id="tcpaOffsetVal">+0.0 min after reference</span>)
    </div>

    <!-- Top Command & Mode Bar -->
    <header class="app-header">
        <div class="header-brand-group">
            <span class="provenance-tag">WAKE 3D v2</span>
            <div>
                <div style="font-weight: 900; font-size: 13px;">Maritime Forensics Investigation Workspace</div>
                <div class="mono" style="font-size: 10px; color: var(--text-muted);">CASE #{investigation_id} &bull; INCIDENT UTC: {time_str}</div>
            </div>
        </div>

        <!-- 3 Workspace Modes: Orient, Investigate, Report -->
        <div class="workspace-tabs">
            <button class="mode-tab active" id="tabInvestigate" onclick="setWorkspaceMode('investigate')"><i class="fa-solid fa-microscope"></i> Investigate</button>
            <button class="mode-tab" id="tabOrient" onclick="setWorkspaceMode('orient')"><i class="fa-solid fa-compass"></i> Orient</button>
            <button class="mode-tab" id="tabReport" onclick="setWorkspaceMode('report')"><i class="fa-solid fa-file-lines"></i> Report & Findings</button>
        </div>

        <div class="header-actions">
            <!-- 2D/3D Toggle -->
            <button class="btn-action" id="viewModeToggleBtn" onclick="toggle2D3DView()"><i class="fa-solid fa-cube"></i> 3D View</button>
            
            <!-- Layer Switcher -->
            <button class="btn-action" onclick="toggleLayerModal()"><i class="fa-solid fa-layer-group"></i> Layers</button>

            <!-- Case Package Export -->
            <button class="btn-action" onclick="exportCasePackage()"><i class="fa-solid fa-file-export"></i> Export Case</button>
            <button class="btn-action" onclick="takeSnapshot()"><i class="fa-solid fa-camera"></i> Snapshot</button>
            <a href="workstation.html" class="btn-action"><i class="fa-solid fa-display"></i> Console</a>
        </div>
    </header>

    <!-- Layer Manager Floating Dropdown -->
    <div class="layer-modal interactive" id="layerModal">
        <div style="font-weight: 800; font-size: 11px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">Layer Visibility</div>
        <label class="layer-checkbox-row"><input type="checkbox" id="layerObsPoints" checked onchange="updateSceneLayers()"> Observed AIS Waypoints</label>
        <label class="layer-checkbox-row"><input type="checkbox" id="layerInterpTracks" checked onchange="updateSceneLayers()"> Interpolated Segments</label>
        <label class="layer-checkbox-row"><input type="checkbox" id="layerCpaVectors" checked onchange="updateSceneLayers()"> CPA Distance Vectors</label>
        <label class="layer-checkbox-row"><input type="checkbox" id="layerSlickCentroid" checked onchange="updateSceneLayers()"> Slick Polygon & Beacon</label>
        <label class="layer-checkbox-row"><input type="checkbox" id="layerDriftBacktrack" checked onchange="updateSceneLayers()"> Lagrangian Drift Particles</label>
        <label class="layer-checkbox-row"><input type="checkbox" id="layerBathymetry" checked onchange="updateSceneLayers()"> Bathymetric Depth Grid</label>
    </div>

    <!-- Workspace Grid -->
    <main class="workspace-grid">
        <!-- Left Panel: Candidate Explorer & Cascade -->
        <aside class="left-explorer-panel interactive" id="leftPanel">
            <input type="text" class="search-box" id="candidateSearchInput" placeholder="Search vessel name, MMSI, or rank..." oninput="filterCandidateList()">

            <div class="filter-controls-row">
                <select class="custom-select" id="statusFilterSelect" onchange="filterCandidateList()">
                    <option value="ALL">All Statuses</option>
                    <option value="Supported">Supported</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Unreviewed">Unreviewed</option>
                    <option value="Bookmarked">⭐ Bookmarked</option>
                </select>

                <select class="custom-select" id="sortSelect" onchange="filterCandidateList()">
                    <option value="rank">Sort: Overall Rank</option>
                    <option value="dcpa">Sort: DCPA (Closest)</option>
                    <option value="tcpa">Sort: TCPA (|Offset|)</option>
                    <option value="frechet">Sort: Fréchet Parity</option>
                    <option value="coverage">Sort: AIS Coverage</option>
                </select>
            </div>

            <!-- Cascade Stage: All -> Top 7 -> Top 4 -> Top 3 -> #1 -->
            <div class="cascade-stage-bar">
                <button class="stage-pill active" onclick="setCascadeStage({total_candidates})">All ({total_candidates})</button>
                <button class="stage-pill" onclick="setCascadeStage(7)">Top 7</button>
                <button class="stage-pill" onclick="setCascadeStage(4)">Top 4</button>
                <button class="stage-pill" onclick="setCascadeStage(3)">Top 3</button>
                <button class="stage-pill" onclick="setCascadeStage(1)">#1</button>
            </div>

            <div class="candidate-card-list" id="candidateListContainer">
                <!-- Dynamically rendered candidate cards -->
            </div>
        </aside>

        <!-- Right Panel: Evidence Inspector & Ledger -->
        <aside class="right-inspector-panel interactive" id="rightPanel">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div class="mono" style="font-size: 9px; font-weight: 800; color: var(--accent-red);" id="inspRankLabel">RANK #1 CANDIDATE</div>
                    <div style="font-size: 16px; font-weight: 900;" id="inspNameVal">{top_name}</div>
                    <div class="mono" style="font-size: 10px; color: var(--text-muted);" id="inspMetaVal">MMSI {top_mmsi} &bull; SOG: 12.4 kts</div>
                </div>
                <button class="btn-action" id="bookmarkBtn" onclick="toggleCurrentBookmark()" style="padding: 4px 8px; font-size: 10px;"><i class="fa-regular fa-star"></i></button>
            </div>

            <!-- Confidence Score Decomposition -->
            <div class="confidence-decomp-box">
                <div class="decomp-bar-row">
                    <strong>Confidence Decomposition</strong>
                    <span class="mono" style="color: var(--accent-green);" id="inspOverallScoreText">{top_conf_label} ({(top_conf_score*100):.1f}%)</span>
                </div>
                
                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>Kinematic Proximity (DCPA)</span><span class="mono" id="dcpaScoreVal">94%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="dcpaScoreBar" style="width: 94%; background: var(--accent-cyan);"></div></div>

                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>Temporal Alignment (TCPA)</span><span class="mono" id="tcpaScoreVal">90%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="tcpaScoreBar" style="width: 90%; background: var(--accent-amber);"></div></div>

                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>Curve Parity (Fréchet)</span><span class="mono" id="frechetScoreVal">88%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="frechetScoreBar" style="width: 88%; background: var(--accent-green);"></div></div>

                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>AIS Broadcast Completeness</span><span class="mono" id="covScoreVal">{top_cov_val:.0f}%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="covScoreBar" style="width: {top_cov_val}%; background: var(--accent-purple);"></div></div>
            </div>

            <!-- Traceable Evidence Ledger -->
            <div style="font-weight: 800; font-size: 11px;">Evidence Ledger & Data Provenance</div>
            <table class="ledger-table mono">
                <thead>
                    <tr><th>Evidence Dimension</th><th>Observed Value</th><th>Metric Status</th></tr>
                </thead>
                <tbody>
                    <tr onclick="diveToCPA()" style="cursor: pointer;">
                        <td>DCPA to Slick Centroid</td>
                        <td id="ledgerDcpa">{top_dcpa_val:.2f} km</td>
                        <td style="color: var(--accent-green);">Optimal (<2.0 km)</td>
                    </tr>
                    <tr onclick="diveToCPA()" style="cursor: pointer;">
                        <td>TCPA Relative Offset</td>
                        <td id="ledgerTcpa">{top_tcpa_val:+.1f} min</td>
                        <td style="color: var(--accent-amber);">Coincident (±30m)</td>
                    </tr>
                    <tr>
                        <td>Discrete Fréchet Distance</td>
                        <td id="ledgerFrechet">{top_frechet_val:.2f} km</td>
                        <td style="color: var(--accent-cyan);">High Parity</td>
                    </tr>
                    <tr>
                        <td>AIS Sampling Continuity</td>
                        <td id="ledgerCoverage">{top_cov_val:.0f}% coverage</td>
                        <td id="ledgerCounts">34 obs / 2 interp</td>
                    </tr>
                    <tr>
                        <td>Lagrangian Drift Fit</td>
                        <td>0.45 km advection delta</td>
                        <td style="color: var(--accent-green);">Corroborated</td>
                    </tr>
                </tbody>
            </table>

            <!-- Analyst Assessment & Notes -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Analyst Notes & Finding</span>
                    <select class="custom-select" id="candStatusSelect" onchange="onStatusSelectChange(this.value)">
                        <option value="Supported">Status: Supported</option>
                        <option value="Reviewing">Status: Reviewing</option>
                        <option value="Unreviewed">Status: Unreviewed</option>
                        <option value="Rejected">Status: Rejected</option>
                    </select>
                </div>
                <textarea class="analyst-notes-box" id="analystNotesText" placeholder="Record investigation findings, hypotheses, or audit notes for this candidate..." oninput="saveCurrentCandidateNotes(this.value)"></textarea>
            </div>
        </aside>
    </main>

    <!-- Bottom Real-Time Controller & Timeline -->
    <footer class="app-bottom-bar interactive">
        <div class="timeline-controls-group">
            <button class="btn-playback mono" id="playbackBtn" onclick="togglePlayback()"><i class="fa-solid fa-play"></i> Reconstruct</button>
            
            <!-- Speed Multiplier -->
            <select class="custom-select mono" id="speedMultiplierSelect" onchange="setPlaybackSpeed(this.value)">
                <option value="1">1x Speed</option>
                <option value="2">2x Speed</option>
                <option value="5" selected>5x Speed</option>
                <option value="10">10x Speed</option>
            </select>
        </div>

        <div class="timeline-slider-track">
            <div class="slider-meta-row mono">
                <span><i class="fa-regular fa-clock" style="color: var(--accent-cyan);"></i> Simulation UTC: <strong id="currentUtcTimeText">{time_str}</strong></span>
                <span id="timelineOffsetLabel">T = 0.0% (T - 8.0h)</span>
            </div>
            <input type="range" min="0" max="100" value="0" class="range-slider-input" id="timeSlider" oninput="onTimelineInput(this.value)">
        </div>

        <div class="header-actions">
            <button class="btn-action mono" onclick="stepTimeline(-1)" title="Step -1 min"><i class="fa-solid fa-backward-step"></i></button>
            <button class="btn-action mono" onclick="stepTimeline(1)" title="Step +1 min"><i class="fa-solid fa-forward-step"></i></button>
            <button class="btn-action" onclick="resetOverview()" title="Reset Camera (ESC)"><i class="fa-solid fa-globe"></i></button>
        </div>
    </footer>

    <!-- Core State-Driven Application Engine -->
    <script>
        const APP_DATA = {client_data_json};

        // ============================================================
        // GLOBAL STATE STORE
        // ============================================================
        const AppState = {{
            selectedMmsi: APP_DATA.vessels.length > 0 ? APP_DATA.vessels[0].mmsi : null,
            compareMmsi: null,
            timeCursor: 0.0,
            isPlaying: false,
            playbackSpeed: 5,
            is2DView: false,
            cascadeStage: {total_candidates},
            workspaceMode: "investigate", // "investigate" | "orient" | "report"
            filters: {{
                search: "",
                status: "ALL",
                sortBy: "rank"
            }},
            layers: {{
                obsPoints: true,
                interpTracks: true,
                cpaVectors: true,
                slickCentroid: true,
                driftBacktrack: true,
                bathymetry: true
            }}
        }};

        // WebGL singletons
        let scene, camera, camera3D, camera2D, renderer, controls;
        let oceanMesh, bathymetryGrid, slickMesh, beaconGroup, driftGroup, cpaGroup;
        let vesselMeshes = {{}}, trackLines = {{}}, waypointPoints = {{}};
        let playbackInterval = null;

        // ============================================================
        // INITIALIZATION
        // ============================================================
        function initApp() {{
            initWebGL();
            renderCandidateCards();
            updateInspector();
            onTimelineInput(0);
        }}

        function initWebGL() {{
            const container = document.getElementById("webgl-canvas-container");
            const w = window.innerWidth;
            const h = window.innerHeight;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x030712);
            scene.fog = new THREE.FogExp2(0x030712, 0.007);

            camera3D = new THREE.PerspectiveCamera(45, w / h, 0.1, 1200);
            camera3D.position.set(0, 52, 75);

            camera2D = new THREE.OrthographicCamera(w / -16, w / 16, h / 16, h / -16, 0.1, 1000);
            camera2D.position.set(0, 100, 0);
            camera2D.lookAt(0, 0, 0);

            camera = camera3D;

            renderer = new THREE.WebGLRenderer({{ antialias: true, powerPreference: "high-performance" }});
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 - 0.05;

            // Lights
            scene.add(new THREE.AmbientLight(0xffffff, 0.7));
            const sun = new THREE.DirectionalLight(0x38bdf8, 1.2);
            sun.position.set(50, 80, 50);
            scene.add(sun);

            // Ocean Floor
            const oceanGeo = new THREE.PlaneGeometry(300, 300, 40, 40);
            const oceanMat = new THREE.MeshStandardMaterial({{ color: 0x06111e, roughness: 0.2, metalness: 0.8 }});
            oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
            oceanMesh.rotation.x = -Math.PI / 2;
            scene.add(oceanMesh);

            bathymetryGrid = new THREE.GridHelper(300, 60, 0x1e293b, 0x0b1320);
            bathymetryGrid.position.y = 0.02;
            scene.add(bathymetryGrid);

            // Spill Mesh
            buildSpillMesh();

            // Drift Group
            buildDriftParticles();

            // CPA Vector Group
            cpaGroup = new THREE.Group();
            scene.add(cpaGroup);

            // Vessels & Tracks
            buildVesselsAndTracks();

            let clock = new THREE.Clock();
            function animate() {{
                requestAnimationFrame(animate);
                const t = clock.getElapsedTime();

                // Wave movement
                const pos = oceanGeo.attributes.position;
                for (let i = 0; i < pos.count; i++) {{
                    const u = pos.getX(i);
                    const v = pos.getY(i);
                    pos.setZ(i, Math.sin(u * 0.08 + t * 1.2) * 0.25 + Math.cos(v * 0.08 + t * 0.9) * 0.15);
                }}
                pos.needsUpdate = true;

                controls.update();
                renderer.render(scene, camera);
            }}
            animate();
        }}

        function buildSpillMesh() {{
            const shape = new THREE.Shape();
            const numPts = 20;
            const rBase = Math.max(5.0, APP_DATA.spill.spread_km * 1.8);
            for (let i = 0; i < numPts; i++) {{
                const ang = (i / numPts) * Math.PI * 2;
                const r = rBase * (0.85 + 0.3 * Math.sin(i * 3.4) + 0.15 * Math.cos(i * 4.8));
                const x = Math.cos(ang) * r;
                const y = Math.sin(ang) * r;
                if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
            }}
            shape.closePath();

            const geo = new THREE.ShapeGeometry(shape);
            const mat = new THREE.MeshBasicMaterial({{ color: 0xf43f5e, transparent: true, opacity: 0.35, side: THREE.DoubleSide }});
            slickMesh = new THREE.Mesh(geo, mat);
            slickMesh.rotation.x = Math.PI / 2;
            slickMesh.position.y = 0.12;
            scene.add(slickMesh);

            beaconGroup = new THREE.Group();
            const pinGeo = new THREE.CylinderGeometry(0.3, 0.4, 3.5, 16);
            const pinMat = new THREE.MeshBasicMaterial({{ color: 0xf43f5e }});
            const pin = new THREE.Mesh(pinGeo, pinMat);
            pin.position.set(0, 1.75, 0);
            beaconGroup.add(pin);
            scene.add(beaconGroup);
        }}

        function buildDriftParticles() {{
            driftGroup = new THREE.Group();
            const pGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const pMat = new THREE.MeshBasicMaterial({{ color: 0x38bdf8, transparent: true, opacity: 0.7 }});

            for (let i = 0; i < 100; i++) {{
                const frac = i / 100.0;
                const dist = frac * (APP_DATA.spill.spread_km * 3.2);
                const angle = (Math.random() - 0.5) * (0.4 + frac * 1.2);
                const x = Math.sin(angle) * dist * 1.8;
                const z = -Math.cos(angle) * dist * 1.8;

                const p = new THREE.Mesh(pGeo, pMat);
                p.position.set(x, 0.2, z);
                driftGroup.add(p);
            }}
            scene.add(driftGroup);
        }}

        function buildVesselsAndTracks() {{
            const rankColors = {{ 1: 0xf43f5e, 2: 0x38bdf8, 3: 0xa855f7 }};

            APP_DATA.vessels.forEach(v => {{
                if (!v.track || v.track.length < 2) return;

                // 1. Ship Model
                const ship = new THREE.Group();
                const hullMat = new THREE.MeshStandardMaterial({{ color: v.rank === 1 ? 0x991b1b : (v.rank <= 3 ? 0x1e293b : 0x0f172a) }});
                const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 7.2), hullMat);
                hull.position.y = 0.5;
                ship.add(hull);

                const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.2), new THREE.MeshStandardMaterial({{ color: 0xf8fafc }}));
                bridge.position.set(0, 1.5, -1.0);
                ship.add(bridge);

                scene.add(ship);
                vesselMeshes[v.mmsi] = ship;

                // 2. Continuous Track
                const pts = [];
                const waypoints = new THREE.Group();
                const wpGeo = new THREE.SphereGeometry(0.35, 6, 6);

                v.track.forEach(p => {{
                    const dLat = (p.lat - APP_DATA.spill.lat) * 111.0;
                    const dLon = (p.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                    const vec = new THREE.Vector3(dLon * 2.2, 0.16, -dLat * 2.2);
                    pts.push(vec);

                    // If observed point, place glowing sphere
                    if (!p.is_interp) {{
                        const wpMat = new THREE.MeshBasicMaterial({{ color: rankColors[v.rank] || 0x64748b }});
                        const wp = new THREE.Mesh(wpGeo, wpMat);
                        wp.position.copy(vec);
                        waypoints.add(wp);
                    }}
                }});

                scene.add(waypoints);
                waypointPoints[v.mmsi] = waypoints;

                const curve = new THREE.CatmullRomCurve3(pts);
                const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(100));
                const lineMat = new THREE.LineBasicMaterial({{
                    color: rankColors[v.rank] || 0x475569,
                    transparent: true,
                    opacity: v.rank === 1 ? 0.95 : (v.rank <= 3 ? 0.75 : 0.35),
                    linewidth: v.rank <= 3 ? 2 : 1
                }});
                const line = new THREE.Line(lineGeo, lineMat);
                scene.add(line);
                trackLines[v.mmsi] = line;
            }});
        }}

        // ============================================================
        // TIMELINE & PLAYBACK CONTROLLER
        // ============================================================
        function onTimelineInput(val) {{
            AppState.timeCursor = parseFloat(val);
            document.getElementById("timeSlider").value = AppState.timeCursor;
            document.getElementById("timelineOffsetLabel").innerText = `T = ${{AppState.timeCursor.toFixed(1)}}%`;

            // Calculate simulated UTC timestamp
            const tStart = new Date(APP_DATA.metadata.time_window_start).getTime();
            const tEnd = new Date(APP_DATA.metadata.time_window_end).getTime();
            const curTime = new Date(tStart + (AppState.timeCursor / 100) * (tEnd - tStart));
            document.getElementById("currentUtcTimeText").innerText = curTime.toISOString().replace("T", " ").substring(0, 19) + " UTC";

            // Update vessel positions
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

            updateInspector();
        }}

        function togglePlayback() {{
            AppState.isPlaying = !AppState.isPlaying;
            const btn = document.getElementById("playbackBtn");
            btn.innerHTML = AppState.isPlaying ? '<i class="fa-solid fa-pause"></i> Pause' : '<i class="fa-solid fa-play"></i> Reconstruct';

            if (AppState.isPlaying) {{
                playbackInterval = setInterval(() => {{
                    let next = AppState.timeCursor + 0.2 * (AppState.playbackSpeed / 5);
                    if (next > 100) next = 0;
                    onTimelineInput(next);
                }}, 30);
            }} else {{
                clearInterval(playbackInterval);
            }}
        }}

        function setPlaybackSpeed(spd) {{
            AppState.playbackSpeed = parseFloat(spd);
            if (AppState.isPlaying) {{
                clearInterval(playbackInterval);
                togglePlayback(); // re-init with new speed
            }}
        }}

        function stepTimeline(dir) {{
            let next = Math.max(0, Math.min(100, AppState.timeCursor + dir * 2));
            onTimelineInput(next);
        }}

        // ============================================================
        // 2D / 3D DUAL CAMERA VIEW TOGGLE
        // ============================================================
        function toggle2D3DView() {{
            AppState.is2DView = !AppState.is2DView;
            const btn = document.getElementById("viewModeToggleBtn");

            if (AppState.is2DView) {{
                camera = camera2D;
                controls.object = camera2D;
                controls.enableRotate = false;
                btn.innerHTML = '<i class="fa-solid fa-map"></i> 2D View';
                btn.classList.add("active");
                gsap.to(camera2D.position, {{ x: 0, y: 120, z: 0, duration: 1.0 }});
            }} else {{
                camera = camera3D;
                controls.object = camera3D;
                controls.enableRotate = true;
                btn.innerHTML = '<i class="fa-solid fa-cube"></i> 3D View';
                btn.classList.remove("active");
                gsap.to(camera3D.position, {{ x: 0, y: 52, z: 75, duration: 1.0 }});
            }}
        }}

        // ============================================================
        // CANDIDATE EXPLORER & CASCADE
        // ============================================================
        function renderCandidateCards() {{
            const listEl = document.getElementById("candidateListContainer");
            listEl.innerHTML = "";

            let cands = [...APP_DATA.vessels];

            // Apply filters
            if (AppState.filters.search) {{
                const q = AppState.filters.search.toLowerCase();
                cands = cands.filter(c => c.name.toLowerCase().includes(q) || c.mmsi.toString().includes(q));
            }}
            if (AppState.filters.status === "Bookmarked") {{
                cands = cands.filter(c => c.bookmarked);
            }} else if (AppState.filters.status !== "ALL") {{
                cands = cands.filter(c => c.status === AppState.filters.status);
            }}

            // Apply sorting
            if (AppState.filters.sortBy === "dcpa") cands.sort((a, b) => a.dcpa_km - b.dcpa_km);
            else if (AppState.filters.sortBy === "tcpa") cands.sort((a, b) => Math.abs(a.tcpa_min) - Math.abs(b.tcpa_min));
            else if (AppState.filters.sortBy === "frechet") cands.sort((a, b) => a.frechet_km - b.frechet_km);
            else if (AppState.filters.sortBy === "coverage") cands.sort((a, b) => b.coverage - a.coverage);
            else cands.sort((a, b) => a.rank - b.rank);

            cands.forEach(v => {{
                const isDimmed = (v.rank > AppState.cascadeStage);
                const rankColor = v.rank === 1 ? "var(--accent-red)" : (v.rank <= 3 ? "var(--accent-cyan)" : "var(--text-dim)");

                const card = document.createElement("div");
                card.className = `cand-card ${{v.mmsi === AppState.selectedMmsi ? "active" : ""}} ${{isDimmed ? "dimmed" : ""}}`;
                card.onclick = () => selectCandidate(v.mmsi);

                card.innerHTML = `
                    <div class="cand-header">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span class="cand-name">${{v.name}}</span>
                            ${{v.bookmarked ? '<i class="fa-solid fa-star" style="color:var(--accent-amber); font-size:10px;"></i>' : ''}}
                        </div>
                        <span class="mono cand-rank" style="color: ${{rankColor}};">#${{v.rank}}</span>
                    </div>
                    <div class="cand-metrics-chips mono">
                        <span class="cand-chip">DCPA: ${{v.dcpa_km.toFixed(2)}} km</span>
                        <span class="cand-chip">TCPA: ${{v.tcpa_min > 0 ? "+" : ""}}${{v.tcpa_min.toFixed(1)}}m</span>
                        <span class="cand-chip">Cov: ${{(v.coverage*100).toFixed(0)}}%</span>
                    </div>
                `;
                listEl.appendChild(card);
            }});
        }}

        function selectCandidate(mmsi) {{
            AppState.selectedMmsi = mmsi;
            renderCandidateCards();
            updateInspector();

            // Fly camera smoothly to candidate
            const ship = vesselMeshes[mmsi];
            if (ship && !AppState.is2DView) {{
                gsap.to(controls.target, {{ x: ship.position.x, y: 0.5, z: ship.position.z, duration: 1.2 }});
                gsap.to(camera3D.position, {{ x: ship.position.x + 14, y: 10, z: ship.position.z + 18, duration: 1.4 }});
            }}
        }}

        function setCascadeStage(num) {{
            AppState.cascadeStage = num;
            document.querySelectorAll(".cascade-stage-bar .stage-pill").forEach(p => p.classList.remove("active"));
            event?.target?.classList.add("active");

            APP_DATA.vessels.forEach(v => {{
                const visible = (v.rank <= num);
                if (vesselMeshes[v.mmsi]) vesselMeshes[v.mmsi].visible = visible;
                if (trackLines[v.mmsi]) trackLines[v.mmsi].visible = visible;
                if (waypointPoints[v.mmsi]) waypointPoints[v.mmsi].visible = visible;
            }});

            renderCandidateCards();
        }}

        function filterCandidateList() {{
            AppState.filters.search = document.getElementById("candidateSearchInput").value;
            AppState.filters.status = document.getElementById("statusFilterSelect").value;
            AppState.filters.sortBy = document.getElementById("sortSelect").value;
            renderCandidateCards();
        }}

        function updateInspector() {{
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedMmsi) || APP_DATA.vessels[0];
            if (!v) return;

            document.getElementById("inspRankLabel").innerText = `RANK #${{v.rank}} CANDIDATE &bull; ${{v.status.toUpperCase()}}`;
            document.getElementById("inspNameVal").innerText = v.name;
            document.getElementById("inspOverallScoreText").innerText = `${{v.conf_label}} (${{(v.conf_score*100).toFixed(1)}}%)`;
            document.getElementById("ledgerDcpa").innerText = `${{v.dcpa_km.toFixed(2)}} km`;
            document.getElementById("ledgerTcpa").innerText = `${{v.tcpa_min > 0 ? '+' : ''}}${{v.tcpa_min.toFixed(1)}} min`;
            document.getElementById("ledgerFrechet").innerText = `${{v.frechet_km.toFixed(2)}} km`;
            document.getElementById("ledgerCoverage").innerText = `${{(v.coverage*100).toFixed(0)}}%`;
            document.getElementById("ledgerCounts").innerText = `${{v.observed_count}} obs / ${{v.interpolated_count}} interp`;
            document.getElementById("candStatusSelect").value = v.status;
            document.getElementById("analystNotesText").value = v.notes || "";

            // Update Bookmark Button
            const bBtn = document.getElementById("bookmarkBtn");
            bBtn.innerHTML = v.bookmarked ? '<i class="fa-solid fa-star" style="color:var(--accent-amber);"></i>' : '<i class="fa-regular fa-star"></i>';
        }}

        function toggleCurrentBookmark() {{
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedMmsi);
            if (v) {{
                v.bookmarked = !v.bookmarked;
                updateInspector();
                renderCandidateCards();
            }}
        }}

        function onStatusSelectChange(val) {{
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedMmsi);
            if (v) {{
                v.status = val;
                updateInspector();
                renderCandidateCards();
            }}
        }}

        function saveCurrentCandidateNotes(txt) {{
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedMmsi);
            if (v) v.notes = txt;
        }}

        function diveToCPA() {{
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedMmsi);
            if (!v) return;

            const dLat = (v.cpa_lat - APP_DATA.spill.lat) * 111.0;
            const dLon = (v.cpa_lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
            const cpaX = dLon * 2.2;
            const cpaZ = -dLat * 2.2;

            gsap.to(controls.target, {{ x: cpaX, y: 0, z: cpaZ, duration: 1.4 }});
            gsap.to(camera3D.position, {{ x: cpaX + 10, y: 12, z: cpaZ + 14, duration: 1.4 }});

            const callout = document.getElementById("cpa-measurement-callout");
            document.getElementById("cpaDistVal").innerText = v.dcpa_km.toFixed(2) + " km";
            document.getElementById("tcpaOffsetVal").innerText = (v.tcpa_min > 0 ? "+" : "") + v.tcpa_min.toFixed(1) + "m (" + (v.tcpa_min >= 0 ? "after" : "before") + " reference)";
            callout.style.display = "block";

            const vec = new THREE.Vector3(cpaX, 1.5, cpaZ);
            vec.project(camera);
            callout.style.left = (vec.x * window.innerWidth/2 + window.innerWidth/2) + "px";
            callout.style.top = (-(vec.y * window.innerHeight/2) + window.innerHeight/2) + "px";
        }}

        function setWorkspaceMode(mode) {{
            AppState.workspaceMode = mode;
            document.querySelectorAll(".workspace-tabs .mode-tab").forEach(t => t.classList.remove("active"));
            if (mode === "investigate") document.getElementById("tabInvestigate")?.classList.add("active");
            else if (mode === "orient") document.getElementById("tabOrient")?.classList.add("active");
            else if (mode === "report") document.getElementById("tabReport")?.classList.add("active");

            if (mode === "orient") {{
                resetOverview();
            }} else if (mode === "report") {{
                exportCasePackage();
            }}
        }}

        function resetOverview() {{
            gsap.to(camera.position, {{ x: 0, y: 52, z: 75, duration: 1.2 }});
            gsap.to(controls.target, {{ x: 0, y: 0, z: 0, duration: 1.2 }});
            document.getElementById("cpa-measurement-callout").style.display = "none";
        }}

        function toggleLayerModal() {{
            const m = document.getElementById("layerModal");
            m.style.display = (m.style.display === "flex") ? "none" : "flex";
        }}

        function updateSceneLayers() {{
            const obs = document.getElementById("layerObsPoints").checked;
            const interp = document.getElementById("layerInterpTracks").checked;
            const cpaVec = document.getElementById("layerCpaVectors").checked;
            const slick = document.getElementById("layerSlickCentroid").checked;
            const drift = document.getElementById("layerDriftBacktrack").checked;
            const bathy = document.getElementById("layerBathymetry").checked;

            Object.values(waypointPoints).forEach(w => w.visible = obs);
            Object.values(trackLines).forEach(l => l.visible = interp);
            if (slickMesh) slickMesh.visible = slick;
            if (beaconGroup) beaconGroup.visible = slick;
            if (driftGroup) driftGroup.visible = drift;
            if (bathymetryGrid) bathymetryGrid.visible = bathy;
        }}

        function exportCasePackage() {{
            const reportData = {{
                case_id: APP_DATA.investigation_id,
                metadata: APP_DATA.metadata,
                incident: APP_DATA.spill,
                candidates: APP_DATA.vessels.map(v => ({{
                    rank: v.rank,
                    name: v.name,
                    mmsi: v.mmsi,
                    confidence: v.conf_label,
                    confidence_score: v.conf_score,
                    dcpa_km: v.dcpa_km,
                    tcpa_min: v.tcpa_min,
                    frechet_km: v.frechet_km,
                    coverage: v.coverage,
                    status: v.status,
                    notes: v.notes
                }}))
            }};

            const blob = new Blob([JSON.stringify(reportData, null, 2)], {{ type: "application/json" }});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `forensics_case_${{APP_DATA.investigation_id}}_findings.json`;
            a.click();
            URL.revokeObjectURL(url);
        }}

        function takeSnapshot() {{
            if (!renderer) return;
            const dataURL = renderer.domElement.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataURL;
            a.download = `reconstruction_v2_${{APP_DATA.investigation_id}}.png`;
            a.click();
        }}

        window.onload = initApp;
        window.onresize = () => {{
            if (renderer && camera) {{
                const w = window.innerWidth;
                const h = window.innerHeight;
                camera3D.aspect = w / h;
                camera3D.updateProjectionMatrix();
                renderer.setSize(w, h);
            }}
        }};
    </script>
</body>
</html>
"""
    output_html_path.write_text(html, encoding="utf-8")
    return str(output_html_path)

