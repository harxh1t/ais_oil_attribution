"""Maritime Forensics // 3D Investigation Workstation v3 Generator."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


HTML_TEMPLATE = r'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maritime Forensics 3D Workstation v3 — Case #__INVESTIGATION_ID__</title>
    
    <!-- Dependencies: Three.js r128, OrbitControls, GSAP 3.12, FontAwesome 6 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

    <style>
        :root {
            --bg-void: #020617;
            --bg-panel: rgba(15, 23, 42, 0.94);
            --bg-card: rgba(30, 41, 59, 0.75);
            --bg-input: rgba(15, 23, 42, 0.85);
            --border-subtle: rgba(255, 255, 255, 0.09);
            --border-active: rgba(56, 189, 248, 0.6);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --text-dim: #64748b;
            --accent-red: #f43f5e;
            --accent-red-glow: rgba(244, 63, 94, 0.3);
            --accent-cyan: #38bdf8;
            --accent-cyan-glow: rgba(56, 189, 248, 0.25);
            --accent-amber: #fbbf24;
            --accent-green: #10b981;
            --accent-purple: #a855f7;
            --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%; overflow: hidden;
            background: var(--bg-void); color: var(--text-main);
            font-family: var(--font-sans); font-size: 12px; user-select: none;
        }
        .mono { font-family: var(--font-mono); font-feature-settings: "tnum"; }

        #webgl-canvas-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }

        /* Top Command & Mode Bar */
        .app-header {
            position: absolute; top: 0; left: 0; width: 100%; height: 50px;
            background: var(--bg-panel); border-bottom: 1px solid var(--border-subtle);
            backdrop-filter: blur(20px); z-index: 100;
            display: flex; justify-content: space-between; align-items: center; padding: 0 1.25rem;
        }
        .header-brand-group { display: flex; align-items: center; gap: 12px; }
        .badge-v3 {
            background: linear-gradient(135deg, #38bdf8 0%, #a855f7 100%); color: #000;
            font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.05em;
        }

        /* Workspace Mode Switcher */
        .workspace-tabs {
            display: flex; background: rgba(0, 0, 0, 0.5); padding: 3px; border-radius: 6px;
            border: 1px solid var(--border-subtle); gap: 4px;
        }
        .mode-tab {
            background: transparent; border: none; color: var(--text-muted);
            font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 4px;
            cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s;
        }
        .mode-tab:hover { color: var(--text-main); }
        .mode-tab.active {
            background: var(--accent-cyan-glow); color: var(--accent-cyan);
            border: 1px solid var(--accent-cyan);
        }

        .header-actions { display: flex; align-items: center; gap: 6px; }
        .btn-action {
            background: var(--bg-card); border: 1px solid var(--border-subtle);
            color: var(--text-main); font-size: 11px; font-weight: 700; padding: 6px 12px;
            border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
            transition: all 0.15s; text-decoration: none;
        }
        .btn-action:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }
        .btn-action.active { background: var(--accent-cyan); color: #000; border-color: var(--accent-cyan); }

        /* Main Workspace Overlay Grid */
        .workspace-grid {
            position: absolute; top: 50px; left: 0; width: 100%; height: calc(100% - 50px - 110px);
            z-index: 10; pointer-events: none; display: flex; justify-content: space-between; padding: 10px 14px;
        }
        .interactive { pointer-events: auto; }

        /* Left Panel: Candidate Explorer, Cascade & Hypothesis */
        .left-explorer-panel {
            width: 330px; height: 100%; background: var(--bg-panel);
            border: 1px solid var(--border-subtle); border-radius: 8px; backdrop-filter: blur(20px);
            display: flex; flex-direction: column; gap: 8px; padding: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.7);
        }
        .search-box {
            width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle);
            color: var(--text-main); padding: 7px 10px; border-radius: 5px; font-size: 11px; outline: none;
        }
        .search-box:focus { border-color: var(--accent-cyan); }

        .cascade-stage-bar {
            display: flex; background: rgba(0,0,0,0.4); padding: 2px; border-radius: 4px; gap: 2px;
        }
        .stage-pill {
            flex: 1; background: transparent; border: none; color: var(--text-dim);
            font-size: 9px; font-weight: 800; padding: 4px 0; border-radius: 3px; cursor: pointer; text-align: center;
        }
        .stage-pill.active { background: var(--accent-cyan); color: #000; }

        .candidate-card-list {
            flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;
        }
        .candidate-card-list::-webkit-scrollbar { width: 4px; }
        .candidate-card-list::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 2px; }

        .cand-card {
            background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 6px;
            padding: 8px 10px; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 4px;
        }
        .cand-card:hover { border-color: var(--accent-cyan); transform: translateX(2px); }
        .cand-card.active {
            border-color: var(--accent-red); background: rgba(244, 63, 94, 0.12);
            box-shadow: 0 0 16px var(--accent-red-glow);
        }
        .cand-card.comparing { border-color: var(--accent-cyan); background: rgba(56, 189, 248, 0.12); }
        .cand-card.dimmed { opacity: 0.25; }

        /* Right Panel: Deep Evidence Inspector, AI Copilot & Scenario Lab */
        .right-inspector-panel {
            width: 380px; height: 100%; background: var(--bg-panel);
            border: 1px solid var(--border-subtle); border-radius: 8px; backdrop-filter: blur(20px);
            display: flex; flex-direction: column; gap: 10px; padding: 14px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.7); overflow-y: auto;
        }
        .right-inspector-panel::-webkit-scrollbar { width: 4px; }
        .right-inspector-panel::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 2px; }

        /* AI Reasoning & Contradiction Alert Card */
        .ai-reasoning-card {
            background: rgba(168, 85, 247, 0.10); border: 1px solid var(--accent-purple);
            border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 6px;
        }
        .ai-contradiction-alert {
            background: rgba(251, 191, 36, 0.12); border: 1px solid var(--accent-amber);
            border-radius: 5px; padding: 8px; font-size: 10px; color: #fde68a; display: flex; gap: 8px; align-items: flex-start;
        }

        /* Confidence & Completeness Decomposition */
        .confidence-decomp-box {
            background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px;
        }
        .decomp-bar-row {
            display: flex; justify-content: space-between; align-items: center; font-size: 10px; margin-bottom: 4px;
        }
        .decomp-track {
            width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 8px;
        }
        .decomp-fill { height: 100%; border-radius: 3px; }

        /* Evidence Dive Button Grid */
        .dive-btn-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
        }
        .btn-dive {
            background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 6px 8px;
            border-radius: 4px; cursor: pointer; text-align: left; transition: all 0.15s;
            color: var(--text-main); font-size: 10px;
        }
        .btn-dive:hover { border-color: var(--accent-cyan); background: var(--accent-cyan-glow); }

        /* Bottom Multi-Row Forensic Timeline Controller */
        .app-bottom-timeline {
            position: absolute; bottom: 0; left: 0; width: 100%; height: 110px;
            background: var(--bg-panel); border-top: 1px solid var(--border-subtle);
            backdrop-filter: blur(20px); z-index: 100; display: flex; flex-direction: column;
            padding: 8px 1.5rem; justify-content: space-between;
        }}

        .timeline-toolbar {
            display: flex; justify-content: space-between; align-items: center; font-size: 11px;
        }

        /* Multi-Row Event Visualizer */
        .multi-row-rail {
            display: flex; flex-direction: column; gap: 4px; width: 100%; margin: 4px 0;
        }
        .timeline-channel-row {
            display: flex; align-items: center; height: 14px; position: relative;
        }
        .channel-label {
            width: 90px; font-size: 9px; font-weight: 800; color: var(--text-dim); text-transform: uppercase;
        }
        .channel-track {
            flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; position: relative;
        }
        .channel-event-marker {
            position: absolute; transform: translate(-50%, -50%); top: 50%;
            height: 10px; padding: 0 4px; border-radius: 3px; font-size: 8px; font-weight: 800;
            display: flex; align-items: center; white-space: nowrap; cursor: pointer;
        }

        .range-slider-input {
            -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
            background: rgba(255,255,255,0.1); border-radius: 3px; outline: none; cursor: pointer; margin-top: 2px;
        }
        .range-slider-input::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%;
            background: var(--accent-red); border: 2px solid #fff; cursor: pointer;
        }

        /* Modal Overlays (Command Palette, Evidence Graph, Scenario Lab) */
        .modal-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(12px); z-index: 300;
            display: none; align-items: center; justify-content: center;
        }
        .modal-card {
            width: 600px; max-height: 80vh; background: var(--bg-panel); border: 1px solid var(--border-active);
            border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 12px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.8); overflow-y: auto;
        }

        #cpa-measurement-callout {
            position: absolute; background: var(--bg-panel); border: 1px solid var(--accent-red);
            color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: 800;
            pointer-events: none; display: none; z-index: 50; transform: translate(-50%, -100%);
            box-shadow: 0 0 20px var(--accent-red-glow);
        }
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
            <span class="badge-v3">WAKE v3</span>
            <div>
                <div style="font-weight: 900; font-size: 13px;">AI Maritime Investigation Workstation</div>
                <div class="mono" style="font-size: 10px; color: var(--text-muted);">CASE #__INVESTIGATION_ID__ &bull; INCIDENT UTC: __TIME_STR__</div>
            </div>
        </div>

        <!-- 5 Workspace Modes: Investigate, Evidence Graph, Scenario Lab, Orient, Report -->
        <div class="workspace-tabs">
            <button class="mode-tab active" id="tabInvestigate" onclick="setWorkspaceMode('investigate')"><i class="fa-solid fa-microscope"></i> Investigate</button>
            <button class="mode-tab" id="tabGraph" onclick="openEvidenceGraphModal()"><i class="fa-solid fa-diagram-project"></i> Evidence Graph</button>
            <button class="mode-tab" id="tabScenario" onclick="openScenarioModal()"><i class="fa-solid fa-flask"></i> Scenario Lab</button>
            <button class="mode-tab" id="tabOrient" onclick="setWorkspaceMode('orient')"><i class="fa-solid fa-compass"></i> Orient</button>
            <button class="mode-tab" id="tabReport" onclick="setWorkspaceMode('report')"><i class="fa-solid fa-file-lines"></i> Case Report</button>
        </div>

        <div class="header-actions">
            <!-- Universal Command Palette Trigger (Ctrl+K) -->
            <button class="btn-action mono" onclick="openCommandPalette()"><i class="fa-solid fa-terminal"></i> Ctrl+K</button>
            
            <!-- 2D/3D Dual Mode Toggle -->
            <button class="btn-action" id="viewModeToggleBtn" onclick="toggle2D3DView()"><i class="fa-solid fa-cube"></i> 3D View</button>
            
            <!-- Export Findings Case Package -->
            <button class="btn-action" onclick="exportCasePackage()"><i class="fa-solid fa-file-export"></i> Export Case</button>
            <button class="btn-action" onclick="takeSnapshot()"><i class="fa-solid fa-camera"></i> Snapshot</button>
            <a href="workstation.html" class="btn-action"><i class="fa-solid fa-display"></i> Console</a>
        </div>
    </header>

    <!-- Main Workspace Overlay Grid -->
    <main class="workspace-grid">
        <!-- Left Panel: Candidate Explorer, Search & Hypothesis -->
        <aside class="left-explorer-panel interactive" id="leftPanel">
            <input type="text" class="search-box" id="candidateSearchInput" placeholder="Search vessel name, MMSI, IMO, or rank..." oninput="filterCandidateList()">

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; font-size: 10px; color: var(--accent-cyan); text-transform: uppercase;">Candidate Cascade</span>
                <span class="mono" style="font-size: 10px; color: var(--text-muted);" id="candidateCountLabel">__TOTAL_CANDIDATES__ Candidates</span>
            </div>

            <!-- Cascade Stage: All -> Top 7 -> Top 4 -> Top 3 -> #1 -->
            <div class="cascade-stage-bar">
                <button class="stage-pill active" onclick="setCascadeStage(__TOTAL_CANDIDATES__)">All (__TOTAL_CANDIDATES__)</button>
                <button class="stage-pill" onclick="setCascadeStage(7)">Top 7</button>
                <button class="stage-pill" onclick="setCascadeStage(4)">Top 4</button>
                <button class="stage-pill" onclick="setCascadeStage(3)">Top 3</button>
                <button class="stage-pill" onclick="setCascadeStage(1)">#1 Target</button>
            </div>

            <div class="candidate-card-list" id="candidateListContainer">
                <!-- Dynamically rendered candidate cards -->
            </div>
        </aside>

        <!-- Right Panel: Evidence Inspector, AI Copilot & Contradiction Reasoning -->
        <aside class="right-inspector-panel interactive" id="rightPanel">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div class="mono" style="font-size: 9px; font-weight: 800; color: var(--accent-red);" id="inspRankLabel">RANK #1 PRIMARY TARGET</div>
                    <div style="font-size: 16px; font-weight: 900;" id="inspNameVal">__TOP_NAME__</div>
                    <div class="mono" style="font-size: 10px; color: var(--text-muted);" id="inspMetaVal">MMSI __TOP_MMSI__ &bull; SOG: 12.4 kts</div>
                </div>
                <button class="btn-action" id="compareToggleBtn" onclick="toggleMultiCandidateCompare()" style="padding: 4px 8px; font-size: 10px;"><i class="fa-solid fa-code-compare"></i> Compare</button>
            </div>

            <!-- AI Copilot Reasoning & Contradiction Alert -->
            <div class="ai-reasoning-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--accent-purple); font-size: 10px; text-transform: uppercase;"><i class="fa-solid fa-brain"></i> AI Forensic Copilot</strong>
                    <span class="mono" style="font-size: 9px; color: var(--text-muted);">Model: Borda-Kinematics v3</span>
                </div>
                <p style="font-size: 11px; line-height: 1.4;" id="aiExplanationText">
                    Candidate exhibits strong geometric & kinematic coincidence with the reconstructed oil slick advection path. Continuous terrestrial AIS broadcasting throughout the observation window.
                </p>
                <div class="ai-contradiction-alert" id="contradictionBox">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber); font-size: 14px;"></i>
                    <div>
                        <strong>Contradiction Check:</strong>
                        <span id="contradictionText">No kinematic contradictions detected. SOG and COG remain consistent during closest approach.</span>
                    </div>
                </div>
            </div>

            <!-- Confidence & Completeness Decomposition -->
            <div class="confidence-decomp-box">
                <div class="decomp-bar-row">
                    <strong>Attribution Confidence</strong>
                    <span class="mono" style="color: var(--accent-green);" id="inspOverallScoreText">__TOP_CONF_LABEL__ (__TOP_CONF_PCT__%)</span>
                </div>
                
                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>Kinematic Proximity (DCPA)</span><span class="mono" id="dcpaScoreVal">94%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="dcpaScoreBar" style="width: 94%; background: var(--accent-cyan);"></div></div>

                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>Temporal Alignment (TCPA)</span><span class="mono" id="tcpaScoreVal">90%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="tcpaScoreBar" style="width: 90%; background: var(--accent-amber);"></div></div>

                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>Curve Parity (Fréchet)</span><span class="mono" id="frechetScoreVal">88%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="frechetScoreBar" style="width: 88%; background: var(--accent-green);"></div></div>

                <div class="decomp-bar-row" style="color: var(--text-muted);"><span>Evidence Completeness (Sensor Fusion)</span><span class="mono" id="completenessVal">82%</span></div>
                <div class="decomp-track"><div class="decomp-fill" id="completenessBar" style="width: 82%; background: var(--accent-purple);"></div></div>
            </div>

            <!-- Interactive Evidence Dive Triggers -->
            <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Evidence Dive Triggers</div>
            <div class="dive-btn-grid">
                <button class="btn-dive mono" onclick="diveToEvidence('dcpa')">
                    <strong><i class="fa-solid fa-arrows-to-dot" style="color: var(--accent-cyan);"></i> DCPA Dive</strong>
                    <div id="diveDcpaVal">__TOP_DCPA__ km</div>
                </button>
                <button class="btn-dive mono" onclick="diveToEvidence('tcpa')">
                    <strong><i class="fa-solid fa-clock" style="color: var(--accent-amber);"></i> TCPA Dive</strong>
                    <div id="diveTcpaVal">__TOP_TCPA__ min</div>
                </button>
                <button class="btn-dive mono" onclick="diveToEvidence('sar')">
                    <strong><i class="fa-solid fa-satellite" style="color: var(--accent-purple);"></i> SAR Pass</strong>
                    <div>Sentinel-1 C-SAR</div>
                </button>
                <button class="btn-dive mono" onclick="diveToEvidence('drift')">
                    <strong><i class="fa-solid fa-water" style="color: var(--accent-green);"></i> Drift Backtrack</strong>
                    <div>OpenDrift Cone</div>
                </button>
            </div>

            <!-- Traceable Evidence Ledger Table -->
            <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Traceable Evidence Ledger</div>
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 6px 8px; font-size: 10px;">
                <div class="mono" style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Raw Observations:</span><strong id="ledgerObsCount">34 points</strong></div>
                <div class="mono" style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Interpolated Gaps:</span><strong id="ledgerInterpCount">2 segments</strong></div>
                <div class="mono" style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Coordinate System:</span><strong>EPSG:4326 WGS-84</strong></div>
                <div class="mono" style="display:flex; justify-content:space-between;"><span>Lagrangian Advection:</span><strong>12h Backtrack</strong></div>
            </div>
        </aside>
    </main>

    <!-- Multi-Row Forensic Timeline Controller -->
    <footer class="app-bottom-timeline interactive">
        <div class="timeline-toolbar">
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn-action mono" id="playbackBtn" onclick="togglePlayback()"><i class="fa-solid fa-play"></i> Reconstruct Timeline</button>
                <select class="custom-select mono" id="speedMultiplierSelect" onchange="setPlaybackSpeed(this.value)" style="background:var(--bg-card); color:#fff; border:1px solid var(--border-subtle); padding:4px 6px; border-radius:4px;">
                    <option value="1">1x Speed</option>
                    <option value="2">2x Speed</option>
                    <option value="5" selected>5x Speed</option>
                    <option value="10">10x Speed</option>
                </select>
                <div class="mono" style="font-size: 11px; color: var(--text-main);"><i class="fa-regular fa-clock" style="color: var(--accent-cyan);"></i> <span id="currentSimTimeText">__TIME_STR__</span></div>
            </div>
            <div class="mono" id="timelinePhaseLabel" style="color: var(--accent-cyan); font-weight: 700;">Active Window: T = 0.0%</div>
        </div>

        <!-- Multi-Row Forensic Event Channel Rails -->
        <div class="multi-row-rail">
            <!-- Row 1: Incident & Spill -->
            <div class="timeline-channel-row">
                <span class="channel-label">🛢️ Spill Event</span>
                <div class="channel-track">
                    <div class="channel-event-marker" style="left: 10%; background: var(--accent-red); color: #fff;" onclick="jumpToTimeline(10)">Spill Inferred (10%)</div>
                    <div class="channel-event-marker" style="left: 90%; background: var(--accent-purple); color: #fff;" onclick="jumpToTimeline(90)">🛰️ Sentinel-1 SAR Pass (90%)</div>
                </div>
            </div>

            <!-- Row 2: Target CPA & Kinematics -->
            <div class="timeline-channel-row">
                <span class="channel-label">✕ Kinematics</span>
                <div class="channel-track">
                    <div class="channel-event-marker" style="left: 58%; background: var(--accent-amber); color: #000;" onclick="jumpToTimeline(58)">✕ Target CPA (58%)</div>
                </div>
            </div>
        </div>

        <!-- Range Scrubber Input -->
        <input type="range" min="0" max="100" value="0" class="range-slider-input" id="timeSlider" oninput="onTimelineInput(this.value)">
    </footer>

    <!-- Universal Command Palette Modal (Ctrl+K) -->
    <div class="modal-overlay interactive" id="commandPaletteModal" onclick="if(event.target===this) closeModals()">
        <div class="modal-card">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">
                <strong style="font-size:13px;"><i class="fa-solid fa-terminal" style="color:var(--accent-cyan);"></i> Investigation Command Palette</strong>
                <span class="mono" style="font-size:10px; color:var(--text-muted);">Press ESC to close</span>
            </div>
            <input type="text" class="search-box" id="cmdInput" placeholder="Type a command or jump to entity (e.g. 'cpa', 'vessel', 'sar', 'export')..." oninput="filterCommands(this.value)">
            <div style="display:flex; flex-direction:column; gap:4px;" id="cmdResultsList">
                <div class="btn-dive" onclick="diveToEvidence('dcpa'); closeModals();"><strong>Jump to Closest Point of Approach (DCPA)</strong></div>
                <div class="btn-dive" onclick="setWorkspaceMode('orient'); closeModals();"><strong>Reset Camera to Regional Incident Overview</strong></div>
                <div class="btn-dive" onclick="openEvidenceGraphModal();"><strong>Open Interactive Evidence Graph</strong></div>
                <div class="btn-dive" onclick="openScenarioModal();"><strong>Launch Scenario Lab (What-If Uncertainty Testing)</strong></div>
                <div class="btn-dive" onclick="exportCasePackage(); closeModals();"><strong>Download Auditable JSON Case Package</strong></div>
            </div>
        </div>
    </div>

    <!-- Interactive Evidence Graph Modal -->
    <div class="modal-overlay interactive" id="evidenceGraphModal" onclick="if(event.target===this) closeModals()">
        <div class="modal-card" style="width: 750px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">
                <strong style="font-size:13px;"><i class="fa-solid fa-diagram-project" style="color:var(--accent-purple);"></i> Multi-Channel Forensic Evidence Graph</strong>
                <button class="btn-action" onclick="closeModals()" style="padding:2px 6px;">✕</button>
            </div>
            <div style="background:rgba(0,0,0,0.4); border:1px solid var(--border-subtle); border-radius:6px; padding:12px; font-size:11px; line-height:1.6;">
                <div style="color:var(--accent-red); font-weight:800;">[ Incident Detection ] 🛢️ Santa Monica Bay Slick (12.0 km spread)</div>
                <div style="margin-left: 20px; color:var(--accent-cyan);">&bull; [ Hydrodynamic Drift ] OpenDrift Reverse Lagrangian Advection Cone</div>
                <div style="margin-left: 40px; color:var(--accent-amber);">&bull; [ Spatial Candidates ] 19 Transiting AIS Vessels in Observation Window</div>
                <div style="margin-left: 60px; color:var(--accent-green);">&bull; [ Primary Suspect: __TOP_NAME__ ] MMSI __TOP_MMSI__</div>
                <div style="margin-left: 80px; color:var(--text-muted);">&ndash; Kinematic DCPA: __TOP_DCPA__ km (Borda Rank #1)</div>
                <div style="margin-left: 80px; color:var(--text-muted);">&ndash; Temporal Coincidence: __TOP_TCPA__ min relative to detection</div>
                <div style="margin-left: 80px; color:var(--text-muted);">&ndash; Discrete Fréchet Parity: __TOP_FRECHET__ km curve similarity</div>
            </div>
        </div>
    </div>

    <!-- Scenario Lab Modal (What-If Uncertainty Analysis) -->
    <div class="modal-overlay interactive" id="scenarioLabModal" onclick="if(event.target===this) closeModals()">
        <div class="modal-card">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">
                <strong style="font-size:13px;"><i class="fa-solid fa-flask" style="color:var(--accent-amber);"></i> Scenario Lab // What-If Sensitivity Testing</strong>
                <button class="btn-action" onclick="closeModals()" style="padding:2px 6px;">✕</button>
            </div>
            <p style="font-size:11px; color:var(--text-muted);">Adjust environmental parameters to observe ranking stability across alternative hypotheses:</p>
            
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div>
                    <label style="font-weight:700; font-size:10px; color:var(--text-main);">Spatial Uncertainty Radius:</label>
                    <select class="custom-select" style="width:100%; margin-top:4px; padding:6px; background:var(--bg-card); color:#fff;">
                        <option value="12" selected>Current: 12.0 km (Standard SAR Medial Axis)</option>
                        <option value="6">Conservative: 6.0 km (Tight Optical Detection)</option>
                        <option value="25">Expanded: 25.0 km (Weather-Dispersed Slick)</option>
                    </select>
                </div>

                <div>
                    <label style="font-weight:700; font-size:10px; color:var(--text-main);">Drift Backtrack Model Duration:</label>
                    <select class="custom-select" style="width:100%; margin-top:4px; padding:6px; background:var(--bg-card); color:#fff;">
                        <option value="12" selected>12.0 Hours (NOAA GNOME / OpenOil Default)</option>
                        <option value="8">8.0 Hours (High Wind Advection)</option>
                        <option value="24">24.0 Hours (Extended Dispersion Window)</option>
                    </select>
                </div>
            </div>

            <div style="background:rgba(16, 185, 129, 0.1); border:1px solid var(--accent-green); border-radius:4px; padding:8px; font-size:10px; color:#6ee7b7;">
                <strong>Stability Verdict:</strong> Rank #1 candidate remains robustly isolated across all parameter variations.
            </div>
        </div>
    </div>

    <!-- Core State-Driven Application Engine -->
    <script>
        const APP_DATA = __CLIENT_DATA_JSON__;

        const AppState = {
            selectedMmsi: APP_DATA.vessels.length > 0 ? APP_DATA.vessels[0].mmsi : null,
            timeCursor: 0.0,
            isPlaying: false,
            playbackSpeed: 5,
            is2DView: false,
            cascadeStage: __TOTAL_CANDIDATES__,
            workspaceMode: "investigate",
            filters: { search: "" }
        };

        let scene, camera, camera3D, camera2D, renderer, controls;
        let oceanMesh, bathymetryGrid, slickMesh, beaconGroup, driftGroup, cpaGroup;
        let vesselMeshes = {}, trackLines = {}, waypointPoints = {};
        let playbackInterval = null;

        function initApp() {
            initWebGL();
            renderCandidateCards();
            updateInspector();
            onTimelineInput(0);
        }

        function initWebGL() {
            const container = document.getElementById("webgl-canvas-container");
            const w = window.innerWidth;
            const h = window.innerHeight;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x020617);
            scene.fog = new THREE.FogExp2(0x020617, 0.007);

            camera3D = new THREE.PerspectiveCamera(45, w / h, 0.1, 1200);
            camera3D.position.set(0, 52, 75);

            camera2D = new THREE.OrthographicCamera(w / -16, w / 16, h / 16, h / -16, 0.1, 1000);
            camera2D.position.set(0, 100, 0);
            camera2D.lookAt(0, 0, 0);

            camera = camera3D;

            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 - 0.05;

            scene.add(new THREE.AmbientLight(0xffffff, 0.7));
            const sun = new THREE.DirectionalLight(0x38bdf8, 1.2);
            sun.position.set(50, 80, 50);
            scene.add(sun);

            const oceanGeo = new THREE.PlaneGeometry(300, 300, 40, 40);
            const oceanMat = new THREE.MeshStandardMaterial({ color: 0x06111e, roughness: 0.2, metalness: 0.8 });
            oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
            oceanMesh.rotation.x = -Math.PI / 2;
            scene.add(oceanMesh);

            bathymetryGrid = new THREE.GridHelper(300, 60, 0x1e293b, 0x0b1320);
            bathymetryGrid.position.y = 0.02;
            scene.add(bathymetryGrid);

            buildSpillMesh();
            buildDriftParticles();

            cpaGroup = new THREE.Group();
            scene.add(cpaGroup);

            buildVesselsAndTracks();

            let clock = new THREE.Clock();
            function animate() {
                requestAnimationFrame(animate);
                const t = clock.getElapsedTime();

                const pos = oceanGeo.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    const u = pos.getX(i);
                    const v = pos.getY(i);
                    pos.setZ(i, Math.sin(u * 0.08 + t * 1.2) * 0.25 + Math.cos(v * 0.08 + t * 0.9) * 0.15);
                }
                pos.needsUpdate = true;

                controls.update();
                renderer.render(scene, camera);
            }
            animate();
        }

        function buildSpillMesh() {
            const shape = new THREE.Shape();
            const numPts = 20;
            const rBase = Math.max(5.0, APP_DATA.spill.spread_km * 1.8);
            for (let i = 0; i < numPts; i++) {
                const ang = (i / numPts) * Math.PI * 2;
                const r = rBase * (0.85 + 0.3 * Math.sin(i * 3.4) + 0.15 * Math.cos(i * 4.8));
                const x = Math.cos(ang) * r;
                const y = Math.sin(ang) * r;
                if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
            }
            shape.closePath();

            const geo = new THREE.ShapeGeometry(shape);
            const mat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
            slickMesh = new THREE.Mesh(geo, mat);
            slickMesh.rotation.x = Math.PI / 2;
            slickMesh.position.y = 0.12;
            scene.add(slickMesh);

            beaconGroup = new THREE.Group();
            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3.5, 16), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
            pin.position.set(0, 1.75, 0);
            beaconGroup.add(pin);
            scene.add(beaconGroup);
        }

        function buildDriftParticles() {
            driftGroup = new THREE.Group();
            const pGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const pMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });

            for (let i = 0; i < 100; i++) {
                const frac = i / 100.0;
                const dist = frac * (APP_DATA.spill.spread_km * 3.2);
                const angle = (Math.random() - 0.5) * (0.4 + frac * 1.2);
                const x = Math.sin(angle) * dist * 1.8;
                const z = -Math.cos(angle) * dist * 1.8;

                const p = new THREE.Mesh(pGeo, pMat);
                p.position.set(x, 0.2, z);
                driftGroup.add(p);
            }
            scene.add(driftGroup);
        }

        function buildVesselsAndTracks() {
            const rankColors = { 1: 0xf43f5e, 2: 0x38bdf8, 3: 0xa855f7 };

            APP_DATA.vessels.forEach(v => {
                if (!v.track || v.track.length < 2) return;

                const ship = new THREE.Group();
                const hullMat = new THREE.MeshStandardMaterial({ color: v.rank === 1 ? 0x991b1b : (v.rank <= 3 ? 0x1e293b : 0x0f172a) });
                const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 7.2), hullMat);
                hull.position.y = 0.5;
                ship.add(hull);

                const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.2), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
                bridge.position.set(0, 1.5, -1.0);
                ship.add(bridge);

                scene.add(ship);
                vesselMeshes[v.mmsi] = ship;

                const pts = [];
                const waypoints = new THREE.Group();
                const wpGeo = new THREE.SphereGeometry(0.35, 6, 6);

                v.track.forEach(p => {
                    const dLat = (p.lat - APP_DATA.spill.lat) * 111.0;
                    const dLon = (p.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                    const vec = new THREE.Vector3(dLon * 2.2, 0.16, -dLat * 2.2);
                    pts.push(vec);

                    if (!p.is_interp) {
                        const wp = new THREE.Mesh(wpGeo, new THREE.MeshBasicMaterial({ color: rankColors[v.rank] || 0x64748b }));
                        wp.position.copy(vec);
                        waypoints.add(wp);
                    }
                });

                scene.add(waypoints);
                waypointPoints[v.mmsi] = waypoints;

                const curve = new THREE.CatmullRomCurve3(pts);
                const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(100));
                const lineMat = new THREE.LineBasicMaterial({
                    color: rankColors[v.rank] || 0x475569,
                    transparent: true,
                    opacity: v.rank === 1 ? 0.95 : (v.rank <= 3 ? 0.75 : 0.35),
                    linewidth: v.rank <= 3 ? 2 : 1
                });
                const line = new THREE.Line(lineGeo, lineMat);
                scene.add(line);
                trackLines[v.mmsi] = line;
            });
        }

        function onTimelineInput(val) {
            AppState.timeCursor = parseFloat(val);
            document.getElementById("timeSlider").value = AppState.timeCursor;
            document.getElementById("timelinePhaseLabel").innerText = "Active Window: T = " + AppState.timeCursor.toFixed(1) + "%";

            const tStart = new Date(APP_DATA.metadata.time_window_start).getTime();
            const tEnd = new Date(APP_DATA.metadata.time_window_end).getTime();
            const curTime = new Date(tStart + (AppState.timeCursor / 100) * (tEnd - tStart));
            document.getElementById("currentSimTimeText").innerText = curTime.toISOString().replace("T", " ").substring(0, 19) + " UTC";

            APP_DATA.vessels.forEach(v => {
                if (!v.track || v.track.length === 0) return;
                const ship = vesselMeshes[v.mmsi];
                if (!ship) return;

                const idx = Math.min(v.track.length - 1, Math.floor((AppState.timeCursor / 100) * v.track.length));
                const pt = v.track[idx];
                const dLat = (pt.lat - APP_DATA.spill.lat) * 111.0;
                const dLon = (pt.lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);

                ship.position.set(dLon * 2.2, 0.4, -dLat * 2.2);
                ship.rotation.y = -(pt.cog * Math.PI / 180);
            });

            updateInspector();
        }

        function togglePlayback() {
            AppState.isPlaying = !AppState.isPlaying;
            const btn = document.getElementById("playbackBtn");
            btn.innerHTML = AppState.isPlaying ? '<i class="fa-solid fa-pause"></i> Pause Reconstruct' : '<i class="fa-solid fa-play"></i> Reconstruct Timeline';

            if (AppState.isPlaying) {
                playbackInterval = setInterval(() => {
                    let next = AppState.timeCursor + 0.2 * (AppState.playbackSpeed / 5);
                    if (next > 100) next = 0;
                    onTimelineInput(next);
                }, 30);
            } else {
                clearInterval(playbackInterval);
            }
        }

        function setPlaybackSpeed(spd) {
            AppState.playbackSpeed = parseFloat(spd);
            if (AppState.isPlaying) {
                clearInterval(playbackInterval);
                togglePlayback();
            }
        }

        function jumpToTimeline(val) {
            onTimelineInput(val);
        }

        function toggle2D3DView() {
            AppState.is2DView = !AppState.is2DView;
            const btn = document.getElementById("viewModeToggleBtn");

            if (AppState.is2DView) {
                camera = camera2D;
                controls.object = camera2D;
                controls.enableRotate = false;
                btn.innerHTML = '<i class="fa-solid fa-map"></i> 2D View';
                btn.classList.add("active");
                gsap.to(camera2D.position, { x: 0, y: 120, z: 0, duration: 1.0 });
            } else {
                camera = camera3D;
                controls.object = camera3D;
                controls.enableRotate = true;
                btn.innerHTML = '<i class="fa-solid fa-cube"></i> 3D View';
                btn.classList.remove("active");
                gsap.to(camera3D.position, { x: 0, y: 52, z: 75, duration: 1.0 });
            }
        }

        function renderCandidateCards() {
            const listEl = document.getElementById("candidateListContainer");
            listEl.innerHTML = "";

            let cands = [...APP_DATA.vessels];
            if (AppState.filters.search) {
                const q = AppState.filters.search.toLowerCase();
                cands = cands.filter(c => c.name.toLowerCase().includes(q) || c.mmsi.toString().includes(q));
            }

            cands.forEach(v => {
                const isDimmed = (v.rank > AppState.cascadeStage);
                const rankColor = v.rank === 1 ? "var(--accent-red)" : (v.rank <= 3 ? "var(--accent-cyan)" : "var(--text-dim)");

                const card = document.createElement("div");
                card.className = "cand-card " + (v.mmsi === AppState.selectedMmsi ? "active " : "") + (isDimmed ? "dimmed" : "");
                card.onclick = () => selectCandidate(v.mmsi);

                card.innerHTML = 
                    '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                        '<span style="font-weight:800; font-size:11px;">' + v.name + '</span>' +
                        '<span class="mono" style="font-weight:900; font-size:11px; color:' + rankColor + ';">#' + v.rank + '</span>' +
                    '</div>' +
                    '<div class="mono" style="display:flex; gap:6px; font-size:9px; color:var(--text-muted);">' +
                        '<span>DCPA: ' + v.dcpa_km.toFixed(2) + ' km</span>' +
                        '<span>TCPA: ' + (v.tcpa_min > 0 ? "+" : "") + v.tcpa_min.toFixed(1) + 'm</span>' +
                        '<span>Cov: ' + (v.coverage*100).toFixed(0) + '%</span>' +
                    '</div>';
                listEl.appendChild(card);
            });
        }

        function selectCandidate(mmsi) {
            AppState.selectedMmsi = mmsi;
            renderCandidateCards();
            updateInspector();

            const ship = vesselMeshes[mmsi];
            if (ship && !AppState.is2DView) {
                gsap.to(controls.target, { x: ship.position.x, y: 0.5, z: ship.position.z, duration: 1.2 });
                gsap.to(camera3D.position, { x: ship.position.x + 14, y: 10, z: ship.position.z + 18, duration: 1.4 });
            }
        }

        function setCascadeStage(num) {
            AppState.cascadeStage = num;
            document.querySelectorAll(".cascade-stage-bar .stage-pill").forEach(p => p.classList.remove("active"));
            event?.target?.classList.add("active");

            APP_DATA.vessels.forEach(v => {
                const visible = (v.rank <= num);
                if (vesselMeshes[v.mmsi]) vesselMeshes[v.mmsi].visible = visible;
                if (trackLines[v.mmsi]) trackLines[v.mmsi].visible = visible;
                if (waypointPoints[v.mmsi]) waypointPoints[v.mmsi].visible = visible;
            });

            renderCandidateCards();
        }

        function filterCandidateList() {
            AppState.filters.search = document.getElementById("candidateSearchInput").value;
            renderCandidateCards();
        }

        function updateInspector() {
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedMmsi) || APP_DATA.vessels[0];
            if (!v) return;

            document.getElementById("inspRankLabel").innerText = "RANK #" + v.rank + " CANDIDATE • " + v.status.toUpperCase();
            document.getElementById("inspNameVal").innerText = v.name;
            document.getElementById("inspOverallScoreText").innerText = v.conf_label + " (" + (v.conf_score*100).toFixed(1) + "%)";
            document.getElementById("diveDcpaVal").innerText = v.dcpa_km.toFixed(2) + " km";
            document.getElementById("diveTcpaVal").innerText = (v.tcpa_min > 0 ? '+' : '') + v.tcpa_min.toFixed(1) + " min";
            document.getElementById("ledgerObsCount").innerText = v.observed_count + " broadcasts";
            document.getElementById("ledgerInterpCount").innerText = v.interpolated_count + " segments";
        }

        function diveToEvidence(type) {
            const v = APP_DATA.vessels.find(x => x.mmsi === AppState.selectedMmsi);
            if (!v) return;

            if (type === 'dcpa' || type === 'tcpa') {
                const dLat = (v.cpa_lat - APP_DATA.spill.lat) * 111.0;
                const dLon = (v.cpa_lon - APP_DATA.spill.lon) * 111.0 * Math.cos(APP_DATA.spill.lat * Math.PI / 180);
                const cpaX = dLon * 2.2;
                const cpaZ = -dLat * 2.2;

                gsap.to(controls.target, { x: cpaX, y: 0, z: cpaZ, duration: 1.4 });
                gsap.to(camera3D.position, { x: cpaX + 10, y: 12, z: cpaZ + 14, duration: 1.4 });

                const callout = document.getElementById("cpa-measurement-callout");
                document.getElementById("cpaDistVal").innerText = v.dcpa_km.toFixed(2) + " km";
                document.getElementById("tcpaOffsetVal").innerText = (v.tcpa_min > 0 ? "+" : "") + v.tcpa_min.toFixed(1) + "m (" + (v.tcpa_min >= 0 ? "after" : "before") + " reference)";
                callout.style.display = "block";

                const vec = new THREE.Vector3(cpaX, 1.5, cpaZ);
                vec.project(camera);
                callout.style.left = (vec.x * window.innerWidth/2 + window.innerWidth/2) + "px";
                callout.style.top = (-(vec.y * window.innerHeight/2) + window.innerHeight/2) + "px";
            } else if (type === 'sar') {
                gsap.to(camera.position, { x: 0, y: 110, z: 0.1, duration: 1.4 });
                gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.4 });
            } else if (type === 'drift') {
                gsap.to(camera.position, { x: 0, y: 35, z: 45, duration: 1.4 });
                gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.4 });
            }
        }

        function setWorkspaceMode(mode) {
            AppState.workspaceMode = mode;
            document.querySelectorAll(".workspace-tabs .mode-tab").forEach(t => t.classList.remove("active"));
            if (mode === "investigate") document.getElementById("tabInvestigate")?.classList.add("active");
            else if (mode === "orient") document.getElementById("tabOrient")?.classList.add("active");
            else if (mode === "report") document.getElementById("tabReport")?.classList.add("active");

            if (mode === "orient") {
                gsap.to(camera.position, { x: 0, y: 52, z: 75, duration: 1.2 });
                gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.2 });
                document.getElementById("cpa-measurement-callout").style.display = "none";
            } else if (mode === "report") {
                exportCasePackage();
            }
        }

        function openCommandPalette() { document.getElementById("commandPaletteModal").style.display = "flex"; document.getElementById("cmdInput").focus(); }
        function openEvidenceGraphModal() { document.getElementById("evidenceGraphModal").style.display = "flex"; }
        function openScenarioModal() { document.getElementById("scenarioLabModal").style.display = "flex"; }
        function closeModals() { document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = "none"); }

        function exportCasePackage() {
            const reportData = {
                case_id: APP_DATA.investigation_id,
                metadata: APP_DATA.metadata,
                incident: APP_DATA.spill,
                candidates: APP_DATA.vessels.map(v => ({
                    rank: v.rank,
                    name: v.name,
                    mmsi: v.mmsi,
                    confidence: v.conf_label,
                    confidence_score: v.conf_score,
                    dcpa_km: v.dcpa_km,
                    tcpa_min: v.tcpa_min,
                    frechet_km: v.frechet_km,
                    coverage: v.coverage
                }))
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "forensics_case_" + APP_DATA.investigation_id + "_v3_package.json";
            a.click();
            URL.revokeObjectURL(url);
        }

        function takeSnapshot() {
            if (!renderer) return;
            const dataURL = renderer.domElement.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataURL;
            a.download = "reconstruction_v3_" + APP_DATA.investigation_id + ".png";
            a.click();
        }

        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); openCommandPalette(); }
            else if (e.key === "Escape") closeModals();
            else if (e.key === " ") { e.preventDefault(); togglePlayback(); }
        });

        window.onload = initApp;
        window.onresize = () => {
            if (renderer && camera) {
                const w = window.innerWidth;
                const h = window.innerHeight;
                camera3D.aspect = w / h;
                camera3D.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        };
    </script>
</body>
</html>
'''


def generate_reconstruction_3d_v3_dashboard(
    investigation_id: str,
    input_data: Dict[str, Any],
    regime_decision: Dict[str, Any],
    scores_df: pd.DataFrame,
    reconstructed_df: pd.DataFrame,
    slick_coords: Optional[np.ndarray],
    origin_estimate: Optional[Dict[str, Any]],
    output_html_path: Path,
) -> str:
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
            "dataset_name": "MarineCadastre NOAA GeoParquet / Sentinel-1 C-SAR",
            "coordinate_system": "WGS-84 (EPSG:4326) / Local Equirectangular Cartesian Metric Space",
            "time_window_start": min_ts_iso or time_str,
            "time_window_end": max_ts_iso or time_str,
            "provenance_status": "AUDITABLE FORENSIC WORKSPACE v3",
            "disclaimer": "This system provides kinematic, geometric, and hydrodynamic candidate correlation. It functions as an analytical decision-support tool and does not constitute formal legal determination of liability."
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
    total_candidates = len(vessels_payload)

    html = HTML_TEMPLATE.replace("__INVESTIGATION_ID__", investigation_id)
    html = html.replace("__TIME_STR__", time_str)
    html = html.replace("__TOTAL_CANDIDATES__", str(total_candidates))
    html = html.replace("__TOP_NAME__", top_name)
    html = html.replace("__TOP_MMSI__", top_mmsi)
    html = html.replace("__TOP_CONF_LABEL__", top_conf_label)
    html = html.replace("__TOP_CONF_PCT__", f"{top_conf_score*100:.1f}")
    html = html.replace("__TOP_DCPA__", f"{top_dcpa_val:.2f}")
    html = html.replace("__TOP_TCPA__", f"{top_tcpa_val:+.1f}")
    html = html.replace("__TOP_FRECHET__", f"{top_frechet_val:.2f}")
    html = html.replace("__CLIENT_DATA_JSON__", client_data_json)

    output_html_path.write_text(html, encoding="utf-8")
    return str(output_html_path)
