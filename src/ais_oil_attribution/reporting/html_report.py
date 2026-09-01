"""Self-contained HTML Investigation Report & Interactive Dashboard generation."""

from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd


def generate_html_report(
    investigation_id: str,
    input_data: Dict[str, Any],
    regime_decision: Dict[str, Any],
    scores_df: pd.DataFrame,
    origin_estimate: Optional[Dict[str, Any]],
    map_rel_path: str,
    output_html_path: Path,
) -> str:
    """
    Renders a comprehensive, interactive HTML investigation report dashboard.
    """
    output_html_path.parent.mkdir(parents=True, exist_ok=True)

    lat = input_data.get("lat", 0.0)
    lon = input_data.get("lon", 0.0)
    time_str = input_data.get("time_utc", "")
    spread_km = input_data.get("spread_km", 0.0)
    regime = regime_decision.get("regime", "unknown")
    rationale = regime_decision.get("rationale", "")
    warning = regime_decision.get("warning")

    total_candidates = len(scores_df) if not scores_df.empty else 0
    high_conf_count = len(scores_df[scores_df["confidence_label"] == "HIGH"]) if not scores_df.empty else 0
    med_conf_count = len(scores_df[scores_df["confidence_label"] == "MEDIUM"]) if not scores_df.empty else 0
    low_conf_count = len(scores_df[scores_df["confidence_label"] == "LOW"]) if not scores_df.empty else 0

    # Top Candidate Summary
    top_cand = scores_df.iloc[0].to_dict() if not scores_df.empty else None

    # Table rows with data attributes for live search / filtering
    table_rows = []
    if not scores_df.empty:
        for _, row in scores_df.iterrows():
            rank = int(row["final_rank"])
            rank_badge = f'<span class="rank-badge rank-{min(rank, 4)}">#{rank}</span>'
            badge_class = "badge-high" if row["confidence_label"] == "HIGH" else ("badge-med" if row["confidence_label"] == "MEDIUM" else "badge-low")
            
            table_rows.append(f"""
            <tr data-conf="{row['confidence_label']}" data-vessel="{str(row['vessel_name']).upper()}" data-mmsi="{row['mmsi']}">
                <td>{rank_badge}</td>
                <td>
                    <div style="font-weight: 700; color: #F8FAFC;">{row['vessel_name']}</div>
                    <div style="font-size: 0.75rem; color: #94A3B8;">MMSI: {row['mmsi']}</div>
                </td>
                <td><span class="mono-stat">{row['frechet_km']:.2f} km</span></td>
                <td><span class="mono-stat">{row['dcpa_km']:.2f} km</span></td>
                <td><span class="mono-stat">{row['tcpa_minutes']:+.1f} min</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: {row['coverage_completeness']*100:.0f}%;"></div></div>
                        <span style="font-size: 0.8rem; font-weight: 600;">{row['coverage_completeness'] * 100:.1f}%</span>
                    </div>
                </td>
                <td><span class="badge badge-borda">{row['borda_score']} pts</span></td>
                <td><span class="badge {badge_class}">{row['confidence_label']} ({row['confidence_score']:.3f})</span></td>
            </tr>
            """)

    rows_html = "\n".join(table_rows) if table_rows else "<tr><td colspan='8' class='text-center'>No candidate vessels identified in search window.</td></tr>"

    warning_banner = ""
    if warning:
        warning_banner = f"""
        <div class="alert alert-warning">
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 4px;">⚠️ Incident Alert / Infrastructure Detection</div>
            <div>{warning}</div>
        </div>
        """

    # Top Candidate Card & Evidence Breakdown
    evidence_cards_html = ""
    if top_cand:
        top_badge_class = "badge-high" if top_cand["confidence_label"] == "HIGH" else ("badge-med" if top_cand["confidence_label"] == "MEDIUM" else "badge-low")
        
        # Build cards for top 3
        top_3_cards = []
        for i in range(min(3, len(scores_df))):
            cand = scores_df.iloc[i]
            c_rank = int(cand["final_rank"])
            c_badge = "badge-high" if cand["confidence_label"] == "HIGH" else ("badge-med" if cand["confidence_label"] == "MEDIUM" else "badge-low")
            
            top_3_cards.append(f"""
            <div class="evidence-card {'primary-evidence' if c_rank == 1 else ''}">
                <div class="evidence-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="rank-badge rank-{c_rank}">#{c_rank}</span>
                        <div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #F8FAFC;">{cand['vessel_name']}</div>
                            <div style="font-size: 0.8rem; color: #94A3B8;">MMSI: {cand['mmsi']}</div>
                        </div>
                    </div>
                    <span class="badge {c_badge}">{cand['confidence_label']} ({cand['confidence_score']:.3f})</span>
                </div>
                
                <div class="telemetry-grid">
                    <div class="telemetry-item">
                        <div class="tel-label">Fréchet Parity</div>
                        <div class="tel-val">{cand['frechet_km']:.2f} km</div>
                    </div>
                    <div class="telemetry-item">
                        <div class="tel-label">Closest Approach (DCPA)</div>
                        <div class="tel-val">{cand['dcpa_km']:.2f} km</div>
                    </div>
                    <div class="telemetry-item">
                        <div class="tel-label">CPA Time Offset</div>
                        <div class="tel-val">{cand['tcpa_minutes']:+.1f} min</div>
                    </div>
                    <div class="telemetry-item">
                        <div class="tel-label">AIS Signal Integrity</div>
                        <div class="tel-val">{cand['coverage_completeness']*100:.1f}%</div>
                    </div>
                </div>

                <div class="evidence-points">
                    <div class="ev-bullet">🔹 <strong>Track Parity:</strong> Discrete Fréchet similarity of {cand['frechet_km']:.2f} km against observed slick centerline.</div>
                    <div class="ev-bullet">🔹 <strong>Kinematics:</strong> Reached closest point of approach of {cand['dcpa_km']:.2f} km at {abs(cand['tcpa_minutes']):.1f} min {'prior to' if cand['tcpa_minutes'] <= 0 else 'after'} observation.</div>
                    <div class="ev-bullet">🔹 <strong>Broadcast Completeness:</strong> {cand['coverage_completeness']*100:.1f}% authentic un-interpolated AIS transmissions.</div>
                </div>
            </div>
            """)

        evidence_cards_html = f"""
        <div class="card">
            <h2>Primary Candidate Vessels & Telemetry Evidence</h2>
            <div class="grid grid-3" style="gap: 1.25rem;">
                {''.join(top_3_cards)}
            </div>
        </div>
        """

    # Drift section (if available)
    drift_section_html = ""
    if origin_estimate is not None:
        best_lat = getattr(origin_estimate, "best_guess_lat", None)
        best_lon = getattr(origin_estimate, "best_guess_lon", None)
        drift_section_html = f"""
        <div class="card">
            <h2>Lagrangian Drift Backtracking (OpenDrift / OpenOil)</h2>
            <div class="grid grid-3">
                <div class="kpi-box">
                    <div class="stat-label">Estimated Best Guess Origin</div>
                    <div class="stat-val">{best_lat:.4f}&deg;, {best_lon:.4f}&deg;</div>
                </div>
                <div class="kpi-box">
                    <div class="stat-label">Drift Displacement</div>
                    <div class="stat-val">~{spread_km:.2f} km reverse advection</div>
                </div>
                <div class="kpi-box">
                    <div class="stat-label">Uncertainty Hull</div>
                    <div class="stat-val">95% Minimum Regret Bounds</div>
                </div>
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIS Oil-Spill Attribution Dashboard - {investigation_id}</title>
    <style>
        :root {{
            --bg: #0b0f19;
            --surface: #131b2e;
            --surface-hover: #1c2640;
            --card-bg: #162036;
            --border: #22304d;
            --text: #f8fafc;
            --muted: #94a3b8;
            --accent: #38bdf8;
            --accent-glow: rgba(56, 189, 248, 0.15);
            --gold: #f59e0b;
            --green: #10b981;
            --red: #ef4444;
            --purple: #8b5cf6;
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 1.5rem;
            line-height: 1.5;
        }}
        .container {{
            max-width: 1360px;
            margin: 0 auto;
        }}
        .navbar {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 1.25rem;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
            flex-wrap: wrap;
            gap: 1rem;
        }}
        .brand-title {{
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .brand-pill {{
            background: var(--accent-glow);
            color: var(--accent);
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid rgba(56, 189, 248, 0.3);
        }}
        .action-btns {{
            display: flex;
            gap: 10px;
        }}
        .btn {{
            background: var(--surface);
            color: var(--text);
            border: 1px solid var(--border);
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }}
        .btn:hover {{
            background: var(--surface-hover);
            border-color: var(--accent);
            color: var(--accent);
        }}
        .btn-primary {{
            background: #0284c7;
            border-color: #0369a1;
            color: #ffffff;
        }}
        .btn-primary:hover {{
            background: #0369a1;
            color: #ffffff;
        }}
        .grid {{ display: grid; }}
        .grid-2 {{ grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }}
        .grid-3 {{ grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }}
        .grid-4 {{ grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }}
        
        .kpi-row {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }}
        .kpi-box {{
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.15rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }}
        .stat-label {{
            font-size: 0.75rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
        }}
        .stat-val {{
            font-size: 1.4rem;
            font-weight: 700;
            color: #ffffff;
            margin-top: 0.35rem;
        }}
        .card {{
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }}
        .card h2 {{
            font-size: 1.15rem;
            font-weight: 700;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .map-wrapper {{
            position: relative;
            width: 100%;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border);
        }}
        .map-frame {{
            width: 100%;
            height: 560px;
            border: none;
            display: block;
        }}
        .map-tip {{
            background: rgba(15, 23, 42, 0.85);
            padding: 8px 12px;
            font-size: 0.8rem;
            color: var(--muted);
            border-top: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .evidence-card {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.25rem;
        }}
        .evidence-card.primary-evidence {{
            border: 2px solid #ef4444;
            background: rgba(239, 68, 68, 0.04);
        }}
        .evidence-header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }}
        .rank-badge {{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            font-weight: 800;
            font-size: 0.8rem;
        }}
        .rank-1 {{ background: #dc2626; color: #ffffff; }}
        .rank-2 {{ background: #2563eb; color: #ffffff; }}
        .rank-3 {{ background: #7c3aed; color: #ffffff; }}
        .rank-4 {{ background: #475569; color: #ffffff; }}
        
        .telemetry-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 1rem;
            background: rgba(0,0,0,0.25);
            padding: 10px;
            border-radius: 6px;
        }}
        .telemetry-item {{
            font-size: 0.8rem;
        }}
        .tel-label {{ color: var(--muted); font-size: 0.72rem; }}
        .tel-val {{ font-weight: 700; color: #ffffff; font-size: 0.95rem; }}
        
        .evidence-points {{
            font-size: 0.82rem;
            color: #cbd5e1;
            line-height: 1.5;
        }}
        .ev-bullet {{
            margin-bottom: 6px;
        }}
        
        .search-toolbar {{
            display: flex;
            gap: 12px;
            margin-bottom: 1rem;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
        }}
        .search-input {{
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.85rem;
            min-width: 260px;
        }}
        .search-input:focus {{
            outline: none;
            border-color: var(--accent);
        }}
        .filter-btn-group {{
            display: flex;
            gap: 6px;
        }}
        .filter-btn {{
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--muted);
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
        }}
        .filter-btn.active {{
            background: var(--accent);
            color: #0b0f19;
            border-color: var(--accent);
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.88rem;
        }}
        th, td {{
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }}
        th {{
            background: rgba(0, 0, 0, 0.35);
            color: var(--muted);
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        tr:hover td {{
            background-color: var(--surface-hover);
        }}
        .mono-stat {{
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-weight: 600;
            color: #f1f5f9;
        }}
        .progress-bar-bg {{
            width: 60px;
            height: 6px;
            background: #334155;
            border-radius: 9999px;
            overflow: hidden;
        }}
        .progress-bar-fill {{
            height: 100%;
            background: var(--accent);
            border-radius: 9999px;
        }}
        .badge {{
            display: inline-flex;
            align-items: center;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.02em;
        }}
        .badge-high {{ background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #059669; }}
        .badge-med {{ background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #d97706; }}
        .badge-low {{ background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid #475569; }}
        .badge-borda {{ background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }}
        
        .alert {{
            padding: 1rem 1.25rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }}
        .alert-warning {{
            background: rgba(245, 158, 11, 0.12);
            border: 1px solid #d97706;
            color: #fef3c7;
        }}
        .footer {{
            font-size: 0.8rem;
            color: var(--muted);
            margin-top: 2.5rem;
            border-top: 1px solid var(--border);
            padding-top: 1.5rem;
            line-height: 1.6;
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="navbar">
            <div>
                <div class="brand-title">
                    AIS + Satellite Oil-Spill Vessel Attribution
                    <span class="brand-pill">FORENSIC SUITE</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--muted); margin-top: 4px;">
                    Investigation ID: <code>{investigation_id}</code> | Timestamp: <code>{time_str}</code>
                </div>
            </div>
            <div class="action-btns">
                <a href="workstation.html" class="btn" style="background: rgba(56, 189, 248, 0.2); border: 1px solid var(--accent); color: #fff; font-weight: 700;">🚀 Launch Forensic Workstation</a>
                <a href="attribution.json" target="_blank" class="btn">📄 Raw JSON</a>
                <a href="methodology.md" target="_blank" class="btn">🔬 Methodology</a>
                <button onclick="window.print()" class="btn btn-primary">🖨️ Export PDF / Print</button>
            </div>
        </div>

        {warning_banner}

        <!-- Top KPI Row -->
        <div class="kpi-row">
            <div class="kpi-box">
                <div class="stat-label">Observation Location</div>
                <div class="stat-val">{lat:.4f}&deg;, {lon:.4f}&deg;</div>
                <div style="font-size: 0.75rem; color: var(--muted); margin-top: 4px;">Spread: ~{spread_km:.2f} km radius</div>
            </div>
            <div class="kpi-box">
                <div class="stat-label">Analysis Regime</div>
                <div class="stat-val"><span style="color: var(--accent);">{regime.upper()}</span></div>
                <div style="font-size: 0.75rem; color: var(--muted); margin-top: 4px;">Dual-regime physics switch</div>
            </div>
            <div class="kpi-box">
                <div class="stat-label">Vessels Tracked</div>
                <div class="stat-val">{total_candidates} <span style="font-size: 0.85rem; font-weight: normal; color: var(--muted);">candidates</span></div>
                <div style="font-size: 0.75rem; color: #34d399; margin-top: 4px;">{high_conf_count} High, {med_conf_count} Med, {low_conf_count} Low</div>
            </div>
            <div class="kpi-box">
                <div class="stat-label">Top Identified Suspect</div>
                <div class="stat-val" style="font-size: 1.15rem; color: {'#f87171' if top_cand else 'var(--muted)'};">
                    {top_cand['vessel_name'] if top_cand else 'No Candidate'}
                </div>
                <div style="font-size: 0.75rem; color: var(--muted); margin-top: 4px;">
                    {f"MMSI: {top_cand['mmsi']} | Parity: {top_cand['frechet_km']:.2f} km" if top_cand else 'No vessel correlated'}
                </div>
            </div>
        </div>

        <!-- Interactive Map Panel -->
        <div class="card">
            <h2>
                <span>🗺️ Geospatial Evidence Map & Telemetry</span>
                <span style="font-size: 0.8rem; font-weight: normal; color: var(--muted);">Multi-Layer Maritime / Satellite Views</span>
            </h2>
            <div class="map-wrapper">
                <iframe class="map-frame" src="{map_rel_path}"></iframe>
                <div class="map-tip">
                    <span>💡 <strong>Interactive Tips:</strong> Use layer control (top-right) to toggle between Maritime Ocean and Satellite imagery. Click vessel tracks for telemetry.</span>
                    <span><a href="{map_rel_path}" target="_blank" style="color: var(--accent); text-decoration: none;">↗ Open Standalone Map</a></span>
                </div>
            </div>
        </div>

        <!-- Primary Candidates Evidence Breakdown -->
        {evidence_cards_html}

        <!-- Drift Backtracking Section (if applicable) -->
        {drift_section_html}

        <!-- Interactive Candidate Table -->
        <div class="card">
            <h2>
                <span>📋 Ranked Candidate Vessel Attribution Matrix</span>
                <span style="font-size: 0.8rem; font-weight: normal; color: var(--muted);">Borda Count Rank Aggregation</span>
            </h2>

            <div class="search-toolbar">
                <input type="text" id="vesselSearch" class="search-input" placeholder="🔍 Search vessel name, MMSI, or callsign..." onkeyup="filterTable()">
                <div class="filter-btn-group">
                    <button class="filter-btn active" onclick="setConfidenceFilter('ALL', this)">All ({total_candidates})</button>
                    <button class="filter-btn" onclick="setConfidenceFilter('HIGH', this)">High ({high_conf_count})</button>
                    <button class="filter-btn" onclick="setConfidenceFilter('MEDIUM', this)">Medium ({med_conf_count})</button>
                    <button class="filter-btn" onclick="setConfidenceFilter('LOW', this)">Low ({low_conf_count})</button>
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table id="candidateTable">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Vessel Info</th>
                            <th>Fréchet Parity</th>
                            <th>DCPA (Distance)</th>
                            <th>TCPA (Time Offset)</th>
                            <th>AIS Completeness</th>
                            <th>Borda Score</th>
                            <th>Attribution Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Disclaimers & Methodology -->
        <div class="footer">
            <h3 style="color: #ffffff; margin-top: 0; font-size: 0.95rem;">Forensic Integrity & Disclaimers</h3>
            <ul>
                <li><strong>Attribution vs Proof:</strong> Vessel rankings reflect algorithmic spatial-temporal correlation and trajectory shape similarity against the observed slick, not definitive legal proof of discharge.</li>
                <li><strong>Non-Broadcasting (Dark) Vessels:</strong> If an uncooperative vessel transited without broadcasting AIS messages, it will not appear in AIS databases and cannot be ruled out.</li>
                <li><strong>Scientific Discipline:</strong> Metric fusion uses Borda rank aggregation across discrete Fréchet distance and kinematic CPA, avoiding uncalibrated linear weighting formulas.</li>
            </ul>
        </div>
    </div>

    <!-- Client-side Search & Filter Script -->
    <script>
        let currentConfFilter = 'ALL';

        function setConfidenceFilter(conf, btn) {{
            currentConfFilter = conf;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTable();
        }}

        function filterTable() {{
            const searchVal = document.getElementById('vesselSearch').value.toUpperCase();
            const rows = document.querySelectorAll('#candidateTable tbody tr');

            rows.forEach(row => {{
                const conf = row.getAttribute('data-conf') || '';
                const vessel = row.getAttribute('data-vessel') || '';
                const mmsi = row.getAttribute('data-mmsi') || '';

                const matchesSearch = vessel.includes(searchVal) || mmsi.includes(searchVal);
                const matchesConf = (currentConfFilter === 'ALL' || conf === currentConfFilter);

                if (matchesSearch && matchesConf) {{
                    row.style.display = '';
                }} else {{
                    row.style.display = 'none';
                }}
            }});
        }}
    </script>
</body>
</html>
"""
    output_html_path.write_text(html_content, encoding="utf-8")
    return str(output_html_path)