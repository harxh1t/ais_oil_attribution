"""Unified 4-Stage Maritime Forensic Case Experience Generator.

Emits a modular, offline-capable, four-stage investigative experience
routed by URL hash (#/intro, #/input, #/report, #/reconstruction).
Embeds the untouched 3D workstation (reconstruction_3d_v3.html) and 2D GIS console
(workstation.html) via iframes with DESIGN.md token styling.
Strictly additive and non-destructive.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


def _sanitize_for_json(obj: Any) -> Any:
    """Recursively sanitize data structures for JSON serialization."""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [_sanitize_for_json(x) for x in obj.tolist()]
    if isinstance(obj, dict):
        return {str(k): _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(x) for x in obj]
    if pd.isna(obj):
        return None
    if isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat()
    return obj


THEME_STYLE_PATCH = """
<style id="wake-design-token-patch">
:root {
  --bg-void: #09080E !important;
  --bg-panel: rgba(19, 16, 32, 0.94) !important;
  --bg-card: rgba(26, 21, 46, 0.8) !important;
  --bg-input: rgba(13, 11, 20, 0.9) !important;
  --border-subtle: rgba(148, 163, 184, 0.12) !important;
  --border-active: #7C3AED !important;
  --accent-cyan: #38BDF8 !important;
  --accent-red: #F43F5E !important;
  --accent-purple: #7C3AED !important;
  --accent-green: #10B981 !important;
  --accent-amber: #FBBF24 !important;
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
}
html, body {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
}
.app-header {
  background: rgba(13, 11, 20, 0.95) !important;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12) !important;
}
.header-brand-group .badge-v3 {
  background: linear-gradient(135deg, #7C3AED 0%, #38BDF8 100%) !important;
  color: #FFFFFF !important;
}
.mode-tab.active {
  background: rgba(124, 58, 237, 0.25) !important;
  color: #D2BBFF !important;
  border: 1px solid #7C3AED !important;
}
.btn-action:hover {
  border-color: #7C3AED !important;
  color: #D2BBFF !important;
}
</style>
"""


def _get_styles_css() -> str:
    """Returns the full DESIGN.md-derived token system + component CSS."""
    return """/* WAKE Forensic Intelligence Platform - DESIGN.md Verbatim Token System */
:root {
  /* Colors from DESIGN.md frontmatter */
  --surface: #14121b;
  --surface-dim: #14121b;
  --surface-bright: #3b3842;
  --surface-container-lowest: #0f0d16;
  --surface-container-low: #1c1a24;
  --surface-container: #211e28;
  --surface-container-high: #2b2933;
  --surface-container-highest: #36333e;
  --on-surface: #e6e0ee;
  --on-surface-variant: #ccc3d8;
  --inverse-surface: #e6e0ee;
  --inverse-on-surface: #322f39;
  --outline: #958da1;
  --outline-variant: #4a4455;
  --surface-tint: #d2bbff;
  --primary: #d2bbff;
  --on-primary: #3f008e;
  --primary-container: #7c3aed;
  --on-primary-container: #ede0ff;
  --inverse-primary: #732ee4;
  --secondary: #7bd0ff;
  --on-secondary: #00354a;
  --secondary-container: #00a6e0;
  --on-secondary-container: #00374d;
  --tertiary: #ffb2b7;
  --on-tertiary: #67001b;
  --tertiary-container: #c81a42;
  --on-tertiary-container: #ffdedf;
  --error: #ffb4ab;
  --on-error: #690005;
  --error-container: #93000a;
  --on-error-container: #ffdad6;
  --primary-fixed: #eaddff;
  --primary-fixed-dim: #d2bbff;
  --on-primary-fixed: #25005a;
  --on-primary-fixed-variant: #5a00c6;
  --secondary-fixed: #c4e7ff;
  --secondary-fixed-dim: #7bd0ff;
  --on-secondary-fixed: #001e2c;
  --on-secondary-fixed-variant: #004c69;
  --tertiary-fixed: #ffdadb;
  --tertiary-fixed-dim: #ffb2b7;
  --on-tertiary-fixed: #40000d;
  --on-tertiary-fixed-variant: #92002a;
  --background: #14121b;
  --on-background: #e6e0ee;
  --surface-variant: #36333e;

  /* Tactical Role Allocations (DESIGN.md line 183-207) */
  --base-deep-space: #09080E;
  --surface-foundation: #0D0B14;
  --surface-elevated: #131020;
  --surface-floating: #1A152E;
  --surface-focus: #231C3D;
  --primary-violet-core: #7C3AED;
  --primary-violet-hover: #8B5CF6;
  --primary-violet-active: #6D28D9;
  --geospatial-cyan: #38BDF8;
  --anomaly-rose: #F43F5E;
  --anomaly-rose-text: #FB7185;
  --verified-emerald: #10B981;
  --structural-hairline: rgba(148, 163, 184, 0.12);

  /* Typography from DESIGN.md frontmatter */
  --font-family-display: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", monospace;

  /* Rounded from DESIGN.md frontmatter */
  --rounded-sm: 0.125rem;
  --rounded-default: 0.25rem;
  --rounded-md: 0.375rem;
  --rounded-lg: 0.5rem;
  --rounded-xl: 0.75rem;
  --rounded-full: 9999px;

  /* Spacing from DESIGN.md frontmatter */
  --gutter: 1rem;
  --gutter-desktop: 1.5rem;
  --margin: 1rem;
  --margin-tablet: 1.5rem;
  --margin-desktop: 2rem;
  --space-2xs: 0.125rem;
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 0.75rem;
  --space-base: 1rem;
  --space-lg: 1.25rem;
  --space-xl: 1.5rem;
  --space-2xl: 2rem;
  --space-3xl: 3rem;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  background-color: var(--base-deep-space);
  color: var(--on-surface);
  font-family: var(--font-family-display);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

body {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  background-color: var(--base-deep-space);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto !important;
  }
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

.mono, .tabular-nums {
  font-family: var(--font-family-mono);
  font-feature-settings: "tnum" 1, "zero" 1, "cv02" 1;
}

button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--primary-violet-core);
  outline-offset: 2px;
}

/* ========================================================
   COMPONENTS -> BUTTONS (DESIGN.md section 262-266)
   ======================================================== */
.btn-primary {
  background-color: var(--primary-violet-core);
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--rounded-default);
  height: 40px;
  padding: 0 var(--space-base);
  font-family: var(--font-family-display);
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.btn-primary:hover {
  background-color: var(--primary-violet-hover);
}
.btn-primary:active {
  background-color: var(--primary-violet-active);
}
.btn-primary.btn-compact {
  height: 32px;
  padding: 0 var(--space-sm);
  font-size: 0.75rem;
}

.btn-secondary {
  background-color: var(--surface-floating);
  color: #F8FAFC;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: var(--rounded-default);
  height: 40px;
  padding: 0 var(--space-base);
  font-family: var(--font-family-display);
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
}
.btn-secondary:hover {
  border-color: rgba(124, 58, 237, 0.5);
  background-color: var(--surface-focus);
}
.btn-secondary:active {
  background-color: var(--surface-foundation);
}
.btn-secondary.btn-compact {
  height: 32px;
  padding: 0 var(--space-sm);
  font-size: 0.75rem;
}

.btn-destructive {
  background-color: rgba(244, 63, 94, 0.1);
  color: var(--anomaly-rose-text);
  border: 1px solid rgba(244, 63, 94, 0.4);
  border-radius: var(--rounded-default);
  height: 40px;
  padding: 0 var(--space-base);
  font-family: var(--font-family-display);
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s ease;
}
.btn-destructive:hover {
  background-color: rgba(244, 63, 94, 0.2);
}
.btn-destructive.btn-compact {
  height: 32px;
  padding: 0 var(--space-sm);
  font-size: 0.75rem;
}

/* App Header & Navigation */
.app-header {
  position: sticky;
  top: 0;
  width: 100%;
  height: 56px;
  background: rgba(13, 11, 20, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--structural-hairline);
  z-index: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--gutter-desktop);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.logo-mark {
  width: 30px;
  height: 30px;
  border-radius: var(--rounded-default);
  background: linear-gradient(135deg, var(--geospatial-cyan) 0%, var(--primary-violet-core) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 15px;
  color: #000000;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.05em;
  color: var(--on-surface);
  text-transform: uppercase;
}

.brand-sub {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--geospatial-cyan);
  text-transform: uppercase;
  font-family: var(--font-family-mono);
}

.nav-tabs {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  padding: 3px;
  border-radius: var(--rounded-lg);
}

.nav-tab {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--outline);
  border-radius: var(--rounded-default);
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  text-decoration: none;
}

.nav-tab:hover {
  color: var(--on-surface);
  background: var(--surface-container-low);
}

.nav-tab.active {
  background: var(--primary-container);
  color: #FFFFFF;
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.4);
}

.header-status {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.status-pill {
  padding: 4px 10px;
  border-radius: var(--rounded-full);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-family-mono);
  background: var(--surface-container-low);
  border: 1px solid var(--structural-hairline);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--rounded-full);
  background: currentColor;
}

/* Stage Sections */
.stage-section {
  width: 100%;
  min-height: calc(100vh - 56px);
  position: relative;
}

#stage-intro {
  zoom: 1.25;
}

#stage-input,
#stage-report {
  zoom: 1;
}

/* ========================================================
   STAGE 01: INTRODUCTION & SEMANTIC PIPELINE VISUALS
   ======================================================== */
.intro-hero {
  padding: var(--space-3xl) var(--gutter-desktop) var(--space-xl) var(--gutter-desktop);
  max-width: 1120px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.constellation-strip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px 14px;
  border-radius: var(--rounded-full);
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  font-size: 11px;
  font-family: var(--font-family-mono);
  color: var(--on-surface-variant);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-title {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.03em;
  color: var(--on-surface);
  max-width: 920px;
}

.hero-title .highlight {
  color: var(--primary);
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--on-surface-variant);
  max-width: 760px;
  line-height: 1.6;
}

.hero-cta-dock {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-md);
  flex-wrap: wrap;
  justify-content: center;
}

.pipeline-section {
  max-width: 1200px;
  margin: var(--space-2xl) auto var(--space-3xl) auto;
  padding: 0 var(--gutter-desktop);
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid var(--structural-hairline);
  padding-bottom: var(--space-base);
  margin-bottom: var(--space-xl);
}

.pipeline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: var(--space-lg);
}

/* Pipeline Phase Card with Semantic Color Accents */
.pipeline-node {
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.pipeline-node:hover {
  transform: translateY(-2px);
  background: var(--surface-floating);
  box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.65);
}

.pipeline-node.node-observed {
  border-left: 3px solid var(--verified-emerald);
}
.pipeline-node.node-derived {
  border-left: 3px solid var(--geospatial-cyan);
}
.pipeline-node.node-inference {
  border-left: 3px solid var(--primary-violet-core);
}

.node-graphic {
  width: 100%;
  height: 64px;
  border-radius: var(--rounded-default);
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-xs);
  overflow: hidden;
}

.node-phase-tag {
  font-size: 11px;
  font-family: var(--font-family-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.node-observed .node-phase-tag { color: var(--verified-emerald); }
.node-derived .node-phase-tag { color: var(--geospatial-cyan); }
.node-inference .node-phase-tag { color: var(--primary); }

.node-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--on-surface);
}

.node-desc {
  font-size: 12px;
  color: var(--on-surface-variant);
  line-height: 1.5;
}

.node-footer {
  margin-top: auto;
  padding-top: var(--space-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--structural-hairline);
  font-size: 11px;
  font-family: var(--font-family-mono);
}

/* ========================================================
   STAGE 02: INVESTIGATION PARAMETERS
   ======================================================== */
.params-container {
  max-width: 1040px;
  margin: var(--space-2xl) auto;
  padding: 0 var(--gutter-desktop);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.params-hero {
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-lg);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-base);
  margin-top: var(--space-xs);
}

.param-card {
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-default);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.param-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--outline);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.param-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--on-surface);
}

.param-note {
  font-size: 11px;
  color: var(--geospatial-cyan);
  font-family: var(--font-family-mono);
}

.advanced-disclosure {
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-lg);
  padding: var(--space-md) var(--space-lg);
}

.advanced-disclosure summary {
  font-size: 12px;
  font-weight: 700;
  color: var(--on-surface-variant);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.advanced-content {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--structural-hairline);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-base);
  font-size: 12px;
}

/* ========================================================
   STAGE 03: CASE REPORT & PROGRESSIVE DISCLOSURE
   ======================================================== */
.report-container {
  max-width: 1240px;
  margin: var(--space-xl) auto var(--space-3xl) auto;
  padding: 0 var(--gutter-desktop);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.kpi-mosaic {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-base);
}

.kpi-card {
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-xs);
}

.kpi-card.highlight-card {
  border-color: rgba(124, 58, 237, 0.4);
  background: linear-gradient(135deg, var(--surface-elevated) 0%, rgba(124, 58, 237, 0.1) 100%);
}

.kpi-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--outline);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-val {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--on-surface);
}

.kpi-sub {
  font-size: 11px;
  color: var(--on-surface-variant);
  font-family: var(--font-family-mono);
}

.roster-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-base);
  flex-wrap: wrap;
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-lg);
  padding: var(--space-md) var(--space-lg);
}

.search-input {
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  color: var(--on-surface);
  padding: 6px 12px;
  border-radius: var(--rounded-default);
  font-size: 12px;
  min-width: 280px;
  outline: none;
}
.search-input:focus {
  border-color: var(--primary-violet-core);
}

.filter-pills {
  display: flex;
  gap: var(--space-xs);
}

.filter-btn {
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  color: var(--outline);
  padding: 4px 12px;
  border-radius: var(--rounded-default);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.filter-btn:hover {
  color: var(--on-surface);
  border-color: var(--outline-variant);
}
.filter-btn.active {
  background: var(--primary-container);
  color: #FFFFFF;
  border-color: var(--primary-container);
}

/* Candidate Progressive Disclosure Rows */
.candidate-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.candidate-row-card {
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-lg);
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.candidate-row-card:hover {
  border-color: rgba(148, 163, 184, 0.28);
}

.candidate-row-card.expanded {
  border-color: rgba(124, 58, 237, 0.6);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.candidate-compact-header {
  padding: var(--space-md) var(--space-lg);
  display: grid;
  grid-template-columns: 48px 2fr 1.5fr 1fr 100px 32px;
  align-items: center;
  gap: var(--space-md);
  cursor: pointer;
  user-select: none;
}

.rank-pill {
  width: 32px;
  height: 32px;
  border-radius: var(--rounded-default);
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12px;
  font-family: var(--font-family-mono);
  color: var(--on-surface);
}

.candidate-compact-header.rank-1 .rank-pill {
  background: var(--primary-violet-core);
  color: #FFFFFF;
  border-color: var(--primary-violet-core);
}

.vessel-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--on-surface);
}

.vessel-mmsi {
  font-size: 11px;
  color: var(--outline);
  font-family: var(--font-family-mono);
}

.confidence-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: var(--rounded-default);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-family-mono);
  width: fit-content;
}
.confidence-badge.high {
  background: rgba(16, 185, 129, 0.12);
  color: var(--verified-emerald);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.confidence-badge.medium {
  background: rgba(251, 191, 36, 0.12);
  color: #FBBF24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}
.confidence-badge.low, .confidence-badge.abstained {
  background: var(--surface-foundation);
  color: var(--outline);
  border: 1px solid var(--structural-hairline);
}

.sparkline-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spark-bar-bg {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.spark-bar-fill {
  height: 100%;
  border-radius: 2px;
}

.chevron-icon {
  font-size: 12px;
  color: var(--outline);
  transition: transform 0.2s ease;
  display: flex;
  justify-content: center;
}

.candidate-row-card.expanded .chevron-icon {
  transform: rotate(180deg);
  color: var(--primary);
}

.candidate-expanded-drawer {
  display: none;
  padding: var(--space-lg);
  background: var(--surface-foundation);
  border-top: 1px solid var(--structural-hairline);
  flex-direction: column;
  gap: var(--space-lg);
}

.candidate-row-card.expanded .candidate-expanded-drawer {
  display: flex;
}

.provenance-tiers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-base);
}

.provenance-card {
  border-radius: var(--rounded-default);
  padding: var(--space-base);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
}

.provenance-card.tier-observed {
  border-left: 3px solid var(--verified-emerald);
}
.provenance-card.tier-derived {
  border-left: 3px solid var(--geospatial-cyan);
}
.provenance-card.tier-inference {
  border-left: 3px solid var(--primary-violet-core);
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tier-pill {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: var(--rounded-default);
  font-family: var(--font-family-mono);
  text-transform: uppercase;
}

.tier-observed .tier-pill {
  background: rgba(16, 185, 129, 0.12);
  color: var(--verified-emerald);
}
.tier-derived .tier-pill {
  background: rgba(56, 189, 248, 0.12);
  color: var(--geospatial-cyan);
}
.tier-inference .tier-pill {
  background: rgba(124, 58, 237, 0.16);
  color: var(--primary);
}

.metric-table {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  font-size: 11px;
}

.metric-cell {
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--rounded-default);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-cell-label {
  font-size: 10px;
  color: var(--outline);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-cell-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--on-surface);
  font-family: var(--font-family-mono);
}

.ais-provenance-bar-container {
  background: var(--surface-foundation);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-default);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ais-provenance-bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  background: rgba(255, 255, 255, 0.05);
}

.ais-bar-observed {
  background: var(--verified-emerald);
  height: 100%;
}

.ais-bar-interpolated {
  background: var(--geospatial-cyan);
  height: 100%;
  opacity: 0.8;
}

.ais-legend {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-family: var(--font-family-mono);
  color: var(--on-surface-variant);
}

.disclaimers-card {
  background: var(--surface-elevated);
  border: 1px solid var(--structural-hairline);
  border-radius: var(--rounded-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.disclaimers-header {
  font-size: 11px;
  font-weight: 700;
  color: var(--on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.disclaimer-text {
  font-size: 11px;
  color: var(--outline);
  line-height: 1.5;
}

/* ========================================================
   STAGE 04: EMBEDDED 3D / 2D FORENSIC STUDIO
   ======================================================== */
#stage-reconstruction {
  width: 100%;
  height: calc(100vh - 64px);
  min-height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  overflow: hidden;
  position: relative;
}

.stage-recon-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--base-deep-space);
  overflow: hidden;
}

.recon-control-toolbar {
  height: 40px;
  min-height: 40px;
  background: var(--surface-container-low);
  border-bottom: 1px solid var(--outline-variant);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--gutter-desktop);
  z-index: 20;
  flex-shrink: 0;
}

.recon-viewport-container {
  flex: 1 1 auto;
  width: 100%;
  height: calc(100% - 40px);
  position: relative;
  background: #000000;
  overflow: hidden;
}

.recon-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hero-title { font-size: 1.85rem; }
  .candidate-compact-header {
    grid-template-columns: 36px 1fr 90px 24px;
  }
  .candidate-compact-header .sparkline-preview,
  .candidate-compact-header .vessel-identity span:last-child {
    display: none;
  }
}
"""


def _get_app_js() -> str:
    """Returns the routing, data-binding, and progressive-disclosure script."""
    return """/* WAKE Forensic Case Experience - Core Client Runtime */
(function() {
  'use strict';

  // 1. Data Ingestion
  let CASE_DATA = window.WAKE_CASE_DATA || null;

  const AppState = {
    currentStage: 'intro',
    currentReconView: '3d',
    rosterFilter: 'ALL',
    searchQuery: '',
  };

  // 2. Hash Routing
  function getStageFromHash() {
    const h = window.location.hash || '#/intro';
    if (h.includes('pipeline') || h.includes('demo-case')) return 'intro';
    if (h.includes('input') || h.includes('02-input') || h.includes('02-investigation-input')) return 'input';
    if (h.includes('report') || h.includes('03-case-report')) return 'report';
    if (h.includes('reconstruction') || h.includes('workspace') || h.includes('04-3d-workspace') || h.includes('04-workspace')) return 'reconstruction';
    return 'intro';
  }

  function setStage(stageId) {
    AppState.currentStage = stageId;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const stages = ['intro', 'input', 'report', 'reconstruction'];
    stages.forEach(s => {
      const el = document.getElementById('stage-' + s);
      if (el) el.style.display = (s === stageId) ? 'block' : 'none';
    });

    // Hide outer footer on Stage 04 so 3D/2D workstations get full viewport height
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = (stageId === 'reconstruction') ? 'none' : 'block';
    }
    document.body.style.overflow = (stageId === 'reconstruction') ? 'hidden' : '';

    document.querySelectorAll('[data-stage]').forEach(t => {
      const isActive = t.getAttribute('data-stage') === stageId;
      t.classList.toggle('active', isActive);
      if (isActive) {
        t.classList.add('bg-primary-container', 'text-on-primary-container');
        t.classList.remove('text-on-surface-variant', 'hover:bg-surface-container-high', 'hover:text-on-surface');
      } else {
        t.classList.remove('bg-primary-container', 'text-on-primary-container');
        t.classList.add('text-on-surface-variant', 'hover:bg-surface-container-high', 'hover:text-on-surface');
      }
    });

    if (stageId === 'reconstruction') {
      // Trigger iframe resize
      const f3d = document.getElementById('recon-iframe-3d');
      const f2d = document.getElementById('recon-iframe-2d');
      if (f3d && f3d.contentWindow) f3d.contentWindow.dispatchEvent(new Event('resize'));
      if (f2d && f2d.contentWindow) f2d.contentWindow.dispatchEvent(new Event('resize'));
    }

    const h = window.location.hash || '';
    if (stageId === 'intro' && (h === '#pipeline' || h === '#demo-case')) {
      setTimeout(() => {
        const target = document.querySelector(h);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }

  window.addEventListener('hashchange', () => {
    setStage(getStageFromHash());
  });

  // 3. Stage 04 2D / 3D Studio Switching
  window.switchReconView = function(view) {
    AppState.currentReconView = view;
    const frame3d = document.getElementById('recon-iframe-3d');
    const frame2d = document.getElementById('recon-iframe-2d');
    const btn3d = document.getElementById('btn-view-3d');
    const btn2d = document.getElementById('btn-view-2d');

    if (view === '2d') {
      if (frame3d) frame3d.style.display = 'none';
      if (frame2d) {
        frame2d.style.display = 'block';
        if (frame2d.contentWindow) frame2d.contentWindow.dispatchEvent(new Event('resize'));
      }
      if (btn3d) {
        btn3d.classList.remove('btn-primary');
        btn3d.classList.add('btn-secondary');
      }
      if (btn2d) {
        btn2d.classList.remove('btn-secondary');
        btn2d.classList.add('btn-primary');
      }
    } else {
      if (frame2d) frame2d.style.display = 'none';
      if (frame3d) {
        frame3d.style.display = 'block';
        if (frame3d.contentWindow) frame3d.contentWindow.dispatchEvent(new Event('resize'));
      }
      if (btn2d) {
        btn2d.classList.remove('btn-primary');
        btn2d.classList.add('btn-secondary');
      }
      if (btn3d) {
        btn3d.classList.remove('btn-secondary');
        btn3d.classList.add('btn-primary');
      }
    }
  };

  // 4. Stage 03 Progressive Disclosure
  window.renderRoster = function() {
    const container = document.getElementById('candidateListContainer');
    if (!container) return;

    if (!CASE_DATA) {
      container.innerHTML = '<div style="padding:2rem;text-align:center;">Loading case evidence...</div>';
      return;
    }

    const vessels = CASE_DATA.vessels || [];
    if (vessels.length === 0) {
      container.innerHTML = `
        <div style="background:var(--surface-elevated); border:1px solid var(--structural-hairline); border-radius:var(--rounded-lg); padding:2.5rem; text-align:center;">
          <h3 style="font-size:1.15rem; font-weight:700; color:var(--on-surface);">No Correlated AIS Candidates</h3>
          <p style="font-size:12px; color:var(--on-surface-variant); max-width:500px; margin:6px auto 0 auto;">
            No vessel broadcasts were detected within the spatiotemporal search window. Potential dark vessel transit or fixed seabed source.
          </p>
        </div>
      `;
      return;
    }

    const q = AppState.searchQuery.toLowerCase();
    const filtered = vessels.filter(v => {
      const matchesQuery = !q || v.name.toLowerCase().includes(q) || String(v.mmsi).includes(q);
      const matchesFilter = (AppState.rosterFilter === 'ALL') || (v.conf_label.toUpperCase() === AppState.rosterFilter);
      return matchesQuery && matchesFilter;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--outline);">No candidates match the active filter criteria.</div>';
      return;
    }

    let html = '';
    filtered.forEach((v, idx) => {
      const isRank1 = (v.rank === 1);
      const confClass = v.conf_label.toLowerCase().includes('high') ? 'high' : (v.conf_label.toLowerCase().includes('med') ? 'medium' : 'low');
      const frechetStr = (v.frechet_km !== null && v.frechet_km !== undefined) ? (v.frechet_km.toFixed(2) + ' km') : 'N/A';
      const forwardFitStr = (v.forward_fit_score !== null && v.forward_fit_score !== undefined) ? v.forward_fit_score.toFixed(2) : 'N/A';

      const totalPings = (v.observed_count || 0) + (v.interpolated_count || 0);
      const obsPct = totalPings > 0 ? ((v.observed_count / totalPings) * 100).toFixed(1) : (v.coverage * 100).toFixed(1);
      const interpPct = totalPings > 0 ? (100 - parseFloat(obsPct)).toFixed(1) : (100 - (v.coverage * 100)).toFixed(1);

      html += `
        <div class="candidate-row-card ${idx === 0 ? 'expanded' : ''}" id="cand-card-${v.mmsi}">
          <div class="candidate-compact-header ${isRank1 ? 'rank-1' : ''}" onclick="window.toggleCandidateAccordion(${v.mmsi})">
            <div class="rank-pill">#${v.rank}</div>
            
            <div class="vessel-identity">
              <span class="vessel-name">${v.name}</span>
              <span class="vessel-mmsi">MMSI: ${v.mmsi}</span>
            </div>

            <div>
              <span class="confidence-badge ${confClass}">
                ${v.conf_score.toFixed(3)} &bull; ${v.conf_label}
              </span>
            </div>

            <div class="sparkline-preview">
              <div class="mono" style="font-size:10px; color:var(--outline);">DCPA: ${v.dcpa_km.toFixed(2)} km</div>
              <div class="spark-bar-bg">
                <div class="spark-bar-fill" style="width: ${Math.max(5, Math.min(100, (1 - v.dcpa_km / 25) * 100))}%; background: var(--geospatial-cyan);"></div>
              </div>
            </div>

            <div class="mono tabular-nums" style="font-size:11px; color:var(--on-surface-variant); text-align:right;">
              ${v.borda_score} pts
            </div>

            <div class="chevron-icon">▼</div>
          </div>

          <!-- Expanded Progressive Disclosure Drawer -->
          <div class="candidate-expanded-drawer">
            <div class="provenance-tiers-grid">
              <!-- TIER 1: OBSERVED (Emerald) -->
              <div class="provenance-card tier-observed">
                <div class="tier-header">
                  <span class="tier-pill">Tier 1 // Observed</span>
                  <span style="font-size:11px; color:var(--verified-emerald); font-weight:600;">Direct Telemetry</span>
                </div>
                <div class="metric-table">
                  <div class="metric-cell">
                    <span class="metric-cell-label">Observed AIS Pings</span>
                    <span class="metric-cell-val">${v.observed_count || 0}</span>
                  </div>
                  <div class="metric-cell">
                    <span class="metric-cell-label">Coverage Ratio</span>
                    <span class="metric-cell-val">${(v.coverage * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div class="ais-provenance-bar-container">
                  <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--outline);">AIS Telemetry Provenance</span>
                  <div class="ais-provenance-bar">
                    <div class="ais-bar-observed" style="width:${obsPct}%;"></div>
                    <div class="ais-bar-interpolated" style="width:${interpPct}%;"></div>
                  </div>
                  <div class="ais-legend">
                    <span><strong style="color:var(--verified-emerald);">Solid:</strong> ${obsPct}% Genuine</span>
                    <span><strong style="color:var(--geospatial-cyan);">Dashed:</strong> ${interpPct}% Interpolated</span>
                  </div>
                </div>
              </div>

              <!-- TIER 2: DERIVED (Cyan) -->
              <div class="provenance-card tier-derived">
                <div class="tier-header">
                  <span class="tier-pill">Tier 2 // Derived</span>
                  <span style="font-size:11px; color:var(--geospatial-cyan); font-weight:600;">Kinematic & Geometry</span>
                </div>
                <div class="metric-table">
                  <div class="metric-cell">
                    <span class="metric-cell-label">Closest Approach (DCPA)</span>
                    <span class="metric-cell-val">${v.dcpa_km.toFixed(2)} km</span>
                  </div>
                  <div class="metric-cell">
                    <span class="metric-cell-label">Time Offset (TCPA)</span>
                    <span class="metric-cell-val">${v.tcpa_min >= 0 ? '+' : ''}${v.tcpa_min.toFixed(1)} min</span>
                  </div>
                  <div class="metric-cell">
                    <span class="metric-cell-label">Fréchet Parity</span>
                    <span class="metric-cell-val">${frechetStr}</span>
                  </div>
                  <div class="metric-cell">
                    <span class="metric-cell-label">Forward-Fit Score</span>
                    <span class="metric-cell-val">${forwardFitStr}</span>
                  </div>
                </div>
                <div style="font-size:10px; color:var(--outline); font-family:var(--font-family-mono); padding-top:4px;">
                  CPA Coordinate: ${v.cpa_lat.toFixed(4)}&deg; N, ${Math.abs(v.cpa_lon).toFixed(4)}&deg; W
                </div>
              </div>

              <!-- TIER 3: INFERENCE (Violet) -->
              <div class="provenance-card tier-inference">
                <div class="tier-header">
                  <span class="tier-pill">Tier 3 // Inference</span>
                  <span style="font-size:11px; color:var(--primary); font-weight:600;">Consensus Model</span>
                </div>
                <div class="metric-table">
                  <div class="metric-cell">
                    <span class="metric-cell-label">Consensus Rank</span>
                    <span class="metric-cell-val">#${v.rank} of ${vessels.length}</span>
                  </div>
                  <div class="metric-cell">
                    <span class="metric-cell-label">Borda Score</span>
                    <span class="metric-cell-val">${v.borda_score} pts</span>
                  </div>
                  <div class="metric-cell" style="grid-column: span 2;">
                    <span class="metric-cell-label">Confidence Attribution</span>
                    <span class="metric-cell-val" style="color:var(--primary);">${v.conf_score.toFixed(3)} &bull; ${v.conf_label}</span>
                  </div>
                </div>
                <ul style="font-size:11px; color:var(--outline); padding-left:14px; margin-top:4px; line-height:1.4;">
                  ${(v.explanation || []).map(e => `<li>${e}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  };

  window.toggleCandidateAccordion = function(mmsi) {
    const card = document.getElementById('cand-card-' + mmsi);
    if (card) card.classList.toggle('expanded');
  };

  window.setRosterFilter = function(filt) {
    AppState.rosterFilter = filt;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === filt);
    });
    window.renderRoster();
  };

  window.filterRoster = function() {
    const input = document.getElementById('rosterSearchInput');
    if (input) {
      AppState.searchQuery = input.value;
      window.renderRoster();
    }
  };

  // 5. Initial Bootstrapping
  async function init() {
    if (!CASE_DATA) {
      try {
        const resp = await fetch('./case-data.json');
        if (resp.ok) {
          CASE_DATA = await resp.json();
          window.WAKE_CASE_DATA = CASE_DATA;
        }
      } catch (e) {
        console.warn('Fetch fallback bypassed:', e);
      }
    }
    window.renderRoster();
    setStage(getStageFromHash());
  }

  document.addEventListener('DOMContentLoaded', init);
})();
"""


def _get_index_html(
    investigation_id: str,
    time_str: str,
    lat: float,
    lon: float,
    spread_km: float,
    regime: str,
    rationale: str,
    status_badge_text: str,
    status_badge_color: str,
    top_name: str,
    top_mmsi: str,
    top_conf_label: str,
    top_conf_score: float,
    total_candidates: int,
) -> str:
    """Returns the shell index.html referencing styles.css, case-data.js, and app.js."""
    return f"""<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <meta content="web_standard" name="shell-type"/>
  <title>WAKE Case Experience // #{investigation_id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet"/>
  <style>
    @layer base {{
      html, body {{ margin: 0; padding: 0; }}
      body {{ overscroll-behavior: none; }}
      main > :first-child {{ margin-top: 0 !important; }}
      main > :last-child {{ margin-bottom: 0 !important; }}
    }}
    ::-webkit-scrollbar {{ display: none; }}
    #stage-intro {{
      zoom: 1.25;
    }}
    #stage-input,
    #stage-report {{
      zoom: 1;
    }}
  </style>
  <script src="https://cdn.tailwindcss.com"></script>
  <script id="tailwind-config">tailwind.config = {{
    darkMode: "class",
    theme: {{
      extend: {{
        "colors": {{
          "on-surface-variant": "#ccc3d8",
          "tertiary": "#ffb2b7",
          "secondary-fixed": "#c4e7ff",
          "on-secondary-fixed-variant": "#004c69",
          "primary-fixed-dim": "#d2bbff",
          "tertiary-container": "#c81a42",
          "primary-fixed": "#eaddff",
          "on-tertiary-fixed-variant": "#92002a",
          "surface-tint": "#d2bbff",
          "on-tertiary-container": "#ffdedf",
          "on-surface": "#e6e0ee",
          "surface": "#14121b",
          "surface-container-low": "#1c1a24",
          "outline": "#958da1",
          "secondary-fixed-dim": "#7bd0ff",
          "outline-variant": "#4a4455",
          "surface-container-highest": "#36333e",
          "inverse-primary": "#732ee4",
          "surface-dim": "#14121b",
          "error-container": "#93000a",
          "primary": "#d2bbff",
          "on-error": "#690005",
          "error": "#ffb4ab",
          "primary-container": "#7c3aed",
          "background": "#14121b",
          "surface-bright": "#3b3842",
          "on-primary-fixed": "#25005a",
          "on-primary": "#3f008e",
          "on-tertiary-fixed": "#40000d",
          "on-secondary": "#00354a",
          "on-secondary-container": "#00374d",
          "on-background": "#e6e0ee",
          "secondary": "#7bd0ff",
          "on-error-container": "#ffdad6",
          "surface-container-lowest": "#0f0d16",
          "on-tertiary": "#67001b",
          "tertiary-fixed": "#ffdadb",
          "on-primary-container": "#ede0ff",
          "surface-variant": "#36333e",
          "surface-container": "#211e28",
          "on-secondary-fixed": "#001e2c",
          "secondary-container": "#00a6e0",
          "inverse-surface": "#e6e0ee",
          "tertiary-fixed-dim": "#ffb2b7",
          "on-primary-fixed-variant": "#5a00c6",
          "surface-container-high": "#2b2933",
          "inverse-on-surface": "#322f39"
        }},
        "borderRadius": {{
          "DEFAULT": "0.125rem",
          "lg": "0.25rem",
          "xl": "0.5rem",
          "full": "0.75rem"
        }},
        "spacing": {{
          "space-2xl": "2rem",
          "space-3xl": "3rem",
          "space-md": "0.75rem",
          "space-2xs": "0.125rem",
          "gutter-desktop": "1.5rem",
          "space-lg": "1.25rem",
          "space-xl": "1.5rem",
          "margin-desktop": "2rem",
          "space-base": "1rem",
          "gutter": "1rem",
          "margin": "1rem",
          "space-sm": "0.5rem",
          "margin-tablet": "1.5rem",
          "space-xs": "0.25rem"
        }},
        "fontFamily": {{
          "body-md": ["Inter"],
          "display-lg-mobile": ["Inter"],
          "headline-xl": ["Inter"],
          "headline-lg": ["Inter"],
          "body-sm": ["Inter"],
          "headline-sm": ["Inter"],
          "label-lg": ["Inter"],
          "data-mono-md": ["Inter"],
          "data-mono-sm": ["Inter"],
          "label-md": ["Inter"],
          "headline-md": ["Inter"],
          "label-sm": ["Inter"],
          "display-lg": ["Inter"],
          "headline-xl-mobile": ["Inter"],
          "body-lg": ["Inter"]
        }},
        "fontSize": {{
          "body-md": ["0.875rem", {{"lineHeight": "1.5", "letterSpacing": "0em", "fontWeight": "400"}}],
          "display-lg-mobile": ["2rem", {{"lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700"}}],
          "headline-xl": ["2rem", {{"lineHeight": "1.25", "letterSpacing": "-0.02em", "fontWeight": "600"}}],
          "headline-lg": ["1.5rem", {{"lineHeight": "1.3", "letterSpacing": "-0.015em", "fontWeight": "600"}}],
          "body-sm": ["0.75rem", {{"lineHeight": "1.45", "letterSpacing": "0.01em", "fontWeight": "400"}}],
          "headline-sm": ["1rem", {{"lineHeight": "1.4", "letterSpacing": "0em", "fontWeight": "600"}}],
          "label-lg": ["0.875rem", {{"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "500"}}],
          "data-mono-md": ["0.8125rem", {{"lineHeight": "1.35", "letterSpacing": "0.02em", "fontWeight": "500"}}],
          "data-mono-sm": ["0.6875rem", {{"lineHeight": "1.3", "letterSpacing": "0.03em", "fontWeight": "500"}}],
          "label-md": ["0.75rem", {{"lineHeight": "1.2", "letterSpacing": "0.02em", "fontWeight": "600"}}],
          "headline-md": ["1.25rem", {{"lineHeight": "1.4", "letterSpacing": "-0.01em", "fontWeight": "600"}}],
          "label-sm": ["0.6875rem", {{"lineHeight": "1.15", "letterSpacing": "0.04em", "fontWeight": "600"}}],
          "display-lg": ["3rem", {{"lineHeight": "1.15", "letterSpacing": "-0.03em", "fontWeight": "700"}}],
          "headline-xl-mobile": ["1.5rem", {{"lineHeight": "1.3", "letterSpacing": "-0.015em", "fontWeight": "600"}}],
          "body-lg": ["1rem", {{"lineHeight": "1.5", "letterSpacing": "0em", "fontWeight": "400"}}]
        }}
      }}
    }}
  }}</script>
  <link rel="stylesheet" href="./styles.css">
  <script src="./case-data.js"></script>
</head>
<body class="bg-surface font-body-md text-body-md text-on-surface antialiased">

  <!-- Top Application Command & Stage Navigation -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
    <div class="h-16 w-full px-gutter-desktop flex items-center justify-between gap-space-md">
      <div class="flex items-center gap-space-md shrink-0">
        <img alt="WAKE Maritime Forensics Logo" class="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1W8O7yRxCmTA06OeEq3hHo79pe5eBofJTJyPaxTgmRV6oSlijLyBrZhecF_8imuMQQBaS9kw3ggtTkTBn0DeX38HcgldDaJeWv0IqMPC1UyM0B5lEgRfeMFqzSyMjG0T-hZeXHGWQb4tM9LszQPaM9vQOG_dmsQoexgWSsuRJBlN1etIK9SelWP41vl0sMSxlCjdWGW9NrJqXwjnI3FjeL8F1u1nP7IlLWmb6UW2nV8NFtGHAYaziINiw"/>
        <div class="flex flex-col">
          <span class="font-headline-sm text-headline-sm tracking-tight text-on-surface uppercase">WAKE</span>
          <span class="font-data-mono-sm text-data-mono-sm text-outline tracking-wider uppercase">Attribution Engine</span>
        </div>
      </div>

      <!-- Stage Navigation Tabs -->
      <nav class="hidden xl:flex items-center gap-space-xs bg-surface-container-low/70 p-space-xs rounded-lg" id="stage-nav">
        <a aria-current="page" class="nav-tab px-space-md py-space-xs rounded transition-colors duration-150 bg-primary-container text-on-primary-container font-label-md active" data-stage="intro" id="nav-intro" href="#/intro">01 Introduction</a>
        <a class="nav-tab px-space-md py-space-xs rounded font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150" data-stage="input" id="nav-input" href="#/input">02 Investigation Input</a>
        <a class="nav-tab px-space-md py-space-xs rounded font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150" data-stage="report" id="nav-report" href="#/report">03 Case Report</a>
        <a class="nav-tab px-space-md py-space-xs rounded font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150" data-stage="reconstruction" id="nav-reconstruction" href="#/reconstruction">04 3D Workspace</a>
      </nav>

      <div class="flex items-center gap-space-md shrink-0">
        <div class="hidden md:flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-container-high/60" style="color: {status_badge_color};">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background-color: {status_badge_color};"></span>
          <span class="font-data-mono-sm text-data-mono-sm uppercase">{status_badge_text} // EPSG:4326</span>
        </div>
        <div class="flex items-center gap-space-xs px-space-sm py-space-xs rounded bg-surface-container-low">
          <span class="font-data-mono-sm text-data-mono-sm text-primary">#{investigation_id}</span>
        </div>
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
        </div>
      </div>
    </div>
  </header>

  <main class="w-full pt-16 bg-surface min-h-[calc(100vh-4rem)]">
    <div class="flex flex-col w-full">

      <!-- ========================================================
           STAGE 01: INTRODUCTION NARRATIVE & SEMANTIC PIPELINE
           ======================================================== -->
      <section id="stage-intro" class="stage-section">
        <!-- Top Ambient Orbital Mesh (Contained Relative Canvas) -->
        <div class="relative w-full overflow-hidden bg-surface-container-lowest">
          <!-- Spatial Glow Nodes -->
          <div class="absolute -top-32 left-1/4 w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div class="absolute top-1/2 -right-24 w-[30rem] h-[30rem] bg-secondary-container/15 rounded-full blur-[140px] pointer-events-none"></div>
          <div class="absolute bottom-10 left-10 w-72 h-72 bg-tertiary-container/15 rounded-full blur-[100px] pointer-events-none"></div>

          <!-- HERO SECTION -->
          <section class="relative w-full px-gutter-desktop pt-space-3xl pb-space-3xl flex flex-col items-center">
            <!-- Live Constellation Ticker Strip -->
            <div class="inline-flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-md mb-space-2xl">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span class="font-data-mono-sm text-data-mono-sm tracking-wider uppercase text-on-surface">
                SENTINEL-1 COPERNICUS CONSTELLATION &bull; HYDRODYNAMIC DRIFT ENGINE &bull; REPRODUCIBLE FORENSIC PROOF
              </span>
            </div>

            <!-- Main Headline Typography Overdrive -->
            <div class="max-w-5xl text-center space-y-space-lg">
              <h1 class="font-display-lg text-display-lg tracking-tight text-on-surface">
                When an oil spill appears at sea, the real question is not only where it is — <span class="text-primary font-bold">but where it came from.</span>
              </h1>
              <p class="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed">
                WAKE is a maritime forensic intelligence system detecting, analysing, and attributing offshore discharges by fusing Sentinel-1 SAR imagery, multi-temporal AIS telemetry, and hydrodynamic backwards-drift modelling.
              </p>
            </div>

            <!-- Tactical CTA Dock -->
            <div class="flex flex-wrap items-center justify-center gap-space-md mt-space-2xl z-20">
              <a class="inline-flex items-center gap-space-sm px-space-xl py-space-md rounded bg-primary-container text-on-primary-container font-label-lg text-label-lg shadow-xl hover:brightness-110 transition-all duration-150 group" href="#demo-case">
                <span>LAUNCH WAKE</span>
                <span class="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
              <a class="inline-flex items-center gap-space-sm px-space-xl py-space-md rounded bg-surface-container-high/90 text-on-surface font-label-lg text-label-lg hover:bg-surface-bright transition-colors shadow-md" href="#pipeline">
                <span>HOW IT WORKS</span>
                <span class="material-symbols-outlined text-[18px]">arrow_downward</span>
              </a>
            </div>

            <!-- Cinematic Overhead Spatial Canvas (Synthetic Radar HUD) -->
            <div class="relative w-full max-w-6xl mt-space-3xl rounded-xl overflow-hidden bg-surface-container shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)]">
              <!-- Technical HUD Framing Overlays -->
              <div class="absolute top-4 left-4 z-20 flex items-center gap-space-sm px-space-sm py-space-2xs rounded bg-surface-container-lowest/80 backdrop-blur-md">
                <span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                <span class="font-data-mono-sm text-data-mono-sm text-tertiary">SAR ANOMALY DETECTED: {spread_km:.1f} KM SLICK</span>
              </div>
              <div class="absolute top-4 right-4 z-20 font-data-mono-sm text-data-mono-sm text-outline flex items-center gap-space-md">
                <span>S1-B // IW_GRDH_1SDV</span>
                <span>LAT: {lat:.3f}&deg;N LON: {abs(lon):.3f}&deg;{'W' if lon < 0 else 'E'}</span>
              </div>

              <!-- Layer Container with Synthetic Radar & Ocean Imagery -->
              <div class="relative h-[440px] w-full bg-surface-container-lowest overflow-hidden">
                <div class="bg-cover bg-center absolute inset-0 opacity-40 mix-blend-luminosity" data-alt="Overhead satellite synthetic aperture radar view of deep dark ocean waters at night with fluorescent violet and cyan vessel tracks, thin iridescent oil slick surface film geometry, and geospatial HUD grid coordinate markers." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDINVF0q53Jw3V2fd0KlJTGE_ItnE_HyRF9QSvPzgbwg_K_5DCGstMB7gSbskTwGXjxarq4WdUXNZfwlP8Jl1ebyjrSz_TtO_kG7Brq4fB2oqq9mxy_QY2ekil3Ziw6ZbrVl-GPjhte-Mvv18IaL3jj7rDE0FGHl7WYflZcYVyVu5iTPBDRvRML1rDMAdw1q_gz5j7_JP5P8BeBI1MU68DGl7UWFFjj3KIPrklxL-aTn66tXgNbBFla')"></div>

                <!-- Radar Sweep & Vector Trajectory Overlays (SVG) -->
                <svg class="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient cx="50%" cy="50%" id="radar-glow" r="50%">
                      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"></stop>
                      <stop offset="70%" stop-color="#00a6e0" stop-opacity="0.08"></stop>
                      <stop offset="100%" stop-color="#000" stop-opacity="0"></stop>
                    </radialGradient>
                    <linearGradient id="slick-fill" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stop-color="#ffb2b7" stop-opacity="0.85"></stop>
                      <stop offset="100%" stop-color="#c81a42" stop-opacity="0.2"></stop>
                    </linearGradient>
                  </defs>
                  <!-- Bathymetric Iso-contours -->
                  <path d="M-50,180 Q300,120 700,240 T1400,160" fill="none" opacity="0.4" stroke="#4a4455" stroke-dasharray="3 5" stroke-width="1"></path>
                  <path d="M-50,260 Q340,210 740,320 T1400,230" fill="none" opacity="0.3" stroke="#4a4455" stroke-dasharray="3 5" stroke-width="1"></path>
                  <!-- Radar Sensor Swath Footprint -->
                  <polygon fill="url(#radar-glow)" points="120,40 1080,20 1000,410 40,390" stroke="#7bd0ff" stroke-opacity="0.35" stroke-width="0.75"></polygon>
                  <!-- Simulated Oil Slick Geometry -->
                  <path d="M 420,270 C 490,260 540,220 620,205 C 710,190 770,165 830,135 C 790,148 720,175 640,195 C 560,215 500,250 420,270 Z" fill="url(#slick-fill)" filter="drop-shadow(0 0 10px rgba(200, 26, 66, 0.7))"></path>
                  <!-- Historical Drift Vectors (Lagrangian Particles) -->
                  <g opacity="0.8" stroke="#ffb2b7" stroke-dasharray="2 3">
                    <line x1="830" x2="890" y1="135" y2="100"></line>
                    <line x1="720" x2="775" y1="175" y2="140"></line>
                    <line x1="620" x2="680" y1="205" y2="170"></line>
                    <line x1="490" x2="550" y1="260" y2="225"></line>
                  </g>
                  <!-- Candidate Vessel AIS Track Intercept -->
                  <polyline fill="none" points="200,380 340,320 480,265 630,210 760,150 920,80" stroke="#7bd0ff" stroke-dasharray="6 4" stroke-width="2"></polyline>
                  <!-- Suspect Intercept Node -->
                  <circle cx="630" cy="210" fill="#7c3aed" r="6" stroke="#d2bbff" stroke-width="2"></circle>
                  <circle class="animate-spin" cx="630" cy="210" fill="none" r="16" stroke="#d2bbff" stroke-dasharray="2 2" stroke-width="1"></circle>
                </svg>

                <!-- Floating Micro Telemetry Node -->
                <div class="absolute bottom-6 left-6 z-20 flex flex-col gap-space-2xs p-space-md rounded bg-surface-container-high/90 backdrop-blur-md max-w-sm shadow-lg">
                  <div class="flex items-center justify-between gap-space-base">
                    <span class="font-data-mono-sm text-data-mono-sm text-secondary font-semibold">T-0 INTERCEPT MATCH</span>
                    <span class="font-data-mono-sm text-data-mono-sm px-space-xs py-space-2xs bg-tertiary-container text-on-tertiary-container rounded">{top_conf_score * 100:.1f}% BAYESIAN CONF</span>
                  </div>
                  <p class="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                    Vessel MMSI {top_mmsi} ({top_name}) intersects computed Lagrangian back-projection locus at Celtic Sea Sector 04.
                  </p>
                </div>
                <div class="absolute bottom-6 right-6 z-20 hidden md:flex items-center gap-space-md p-space-sm rounded bg-surface-container-high/90 backdrop-blur-md">
                  <span class="font-data-mono-sm text-data-mono-sm text-outline">CURRENT: 1.42 kts @ 214&deg; SW</span>
                  <span class="font-data-mono-sm text-data-mono-sm text-outline">WIND: 18 kts ECMWF</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- SECTION 1: HOW IT WORKS (Visual Spatial Stream) -->
        <section class="relative w-full px-gutter-desktop py-space-3xl bg-surface-container-lowest" id="pipeline">
          <div class="max-w-6xl mx-auto space-y-space-3xl">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-base">
              <div>
                <span class="font-data-mono-sm text-data-mono-sm tracking-widest text-primary uppercase">FORENSIC ATTRIBUTION WORKFLOW</span>
                <h2 class="font-headline-xl text-headline-xl text-on-surface mt-space-xs">From Orbital Damping to Maritime Culpability</h2>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant max-w-md">
                A continuous deterministic-statistical pipeline linking high-resolution sensor observations to legally admissible evidence.
              </p>
            </div>

            <!-- Connected Spatial Stream Nodes -->
            <div class="grid grid-cols-1 md:grid-cols-5 gap-space-base relative">
              <!-- Node 1 -->
              <div class="relative flex flex-col p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group shadow-md">
                <div class="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-secondary mb-space-base group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined">satellite_alt</span>
                </div>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-xs">PHASE 01 // ORBITAL</span>
                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Satellite SAR</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Sentinel-1 C-band SAR captures low-backscatter signatures where capillary waves are suppressed by floating hydrocarbon slicks.
                </p>
                <div class="mt-space-base pt-space-base flex items-center justify-between">
                  <span class="font-data-mono-sm text-data-mono-sm text-secondary">C-SAR 5.405 GHz</span>
                  <span class="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                </div>
              </div>

              <!-- Node 2 -->
              <div class="relative flex flex-col p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group shadow-md">
                <div class="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-tertiary mb-space-base group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined">polyline</span>
                </div>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-xs">PHASE 02 // VISION</span>
                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Segmentation</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Neural segmentation differentiates true petroleum damping from natural biogenic lookalikes, extracting precise geometry &amp; volume.
                </p>
                <div class="mt-space-base pt-space-base flex items-center justify-between">
                  <span class="font-data-mono-sm text-data-mono-sm text-tertiary">CONF: &gt;99.1%</span>
                  <span class="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                </div>
              </div>

              <!-- Node 3 -->
              <div class="relative flex flex-col p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group shadow-md">
                <div class="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-primary mb-space-base group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined">waves</span>
                </div>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-xs">PHASE 03 // DYNAMICS</span>
                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Lagrangian Drift</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Backward particulate advection rewinds physical slick movement using hourly ECMWF hydrodynamic currents and GFS surface windage.
                </p>
                <div class="mt-space-base pt-space-base flex items-center justify-between">
                  <span class="font-data-mono-sm text-data-mono-sm text-primary">T-48h Advection</span>
                  <span class="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                </div>
              </div>

              <!-- Node 4 -->
              <div class="relative flex flex-col p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group shadow-md">
                <div class="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-secondary mb-space-base group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined">directions_boat</span>
                </div>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-xs">PHASE 04 // TELEMETRY</span>
                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">AIS Reconstruction</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Synthesizes terrestrial and satellite transponders, interpolating gaps and identifying intentional dark-vessel transmitter cuts.
                </p>
                <div class="mt-space-base pt-space-base flex items-center justify-between">
                  <span class="font-data-mono-sm text-data-mono-sm text-secondary">Spatial Correl.</span>
                  <span class="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                </div>
              </div>

              <!-- Node 5 -->
              <div class="relative flex flex-col p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group shadow-md">
                <div class="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-primary-fixed mb-space-base group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined">gavel</span>
                </div>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-xs">PHASE 05 // ATTRIBUTION</span>
                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-space-sm">Bayesian Match</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Ranks candidates via kinematic likelihood functions, producing mathematically robust, court-ready attribution packages.
                </p>
                <div class="mt-space-base pt-space-base flex items-center justify-between">
                  <span class="font-data-mono-sm text-data-mono-sm text-primary-fixed">P(V | Slick, T)</span>
                  <span class="material-symbols-outlined text-outline text-[16px]">verified</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 2: WHY WAKE (The Spatial & Temporal Problem) -->
        <section class="relative w-full px-gutter-desktop py-space-3xl bg-surface">
          <div class="max-w-6xl mx-auto">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center">
              <!-- Text Explanation -->
              <div class="lg:col-span-5 space-y-space-lg">
                <div class="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-container-high">
                  <span class="material-symbols-outlined text-tertiary text-[16px]">schedule</span>
                  <span class="font-data-mono-sm text-data-mono-sm text-on-surface uppercase">The Temporal Gap Dilemma</span>
                </div>
                <h2 class="font-headline-xl text-headline-xl text-on-surface">
                  The culprit is never where the slick was photographed.
                </h2>
                <p class="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  Oil spills at sea are elusive because by the time satellites capture the slick, the discharging vessel is already hours away over the horizon. Natural currents and winds distort the spill shape, making naive line-of-sight matching useless.
                </p>
                <div class="space-y-space-md pt-space-md">
                  <div class="flex items-start gap-space-md p-space-md rounded-lg bg-surface-container-low">
                    <span class="material-symbols-outlined text-tertiary mt-0.5">warning</span>
                    <div>
                      <span class="font-label-md text-label-md text-on-surface block">The Naive Error</span>
                      <p class="font-body-sm text-body-sm text-on-surface-variant">Looking directly at the satellite coordinates at acquisition time yields false accusations or zero suspects.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-space-md p-space-md rounded-lg bg-surface-container-low">
                    <span class="material-symbols-outlined text-secondary mt-0.5">sync_alt</span>
                    <div>
                      <span class="font-label-md text-label-md text-on-surface block">The WAKE Tripartite Bridge</span>
                      <p class="font-body-sm text-body-sm text-on-surface-variant">Synthesizes what the satellite saw, where vessels traveled, and precisely how hydrodynamic currents displaced the slick back to origin.</p>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Comparative Visual Diagram -->
              <div class="lg:col-span-7 flex flex-col gap-space-base">
                <div class="p-space-xl rounded-xl bg-surface-container-low shadow-xl">
                  <div class="flex items-center justify-between pb-space-md">
                    <span class="font-data-mono-sm text-data-mono-sm text-outline uppercase">SPATIAL ATTRIBUTION MATRIX</span>
                    <span class="font-data-mono-sm text-data-mono-sm text-secondary">SIMULATION STEP: T-14h</span>
                  </div>
                  <!-- Visual Graphic Representation -->
                  <div class="relative h-64 w-full rounded-lg bg-surface-container-lowest overflow-hidden flex items-center justify-center">
                    <div class="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen" data-alt="Dark nautical chart visualization depicting oceanic grid coordinates with purple historical vessel breadcrumb paths and dynamic backwards particle drift simulation in glowing cyan and crimson." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAfqG1vHDCrJg8eHMDnJasCQWOVWMK1uf_vScfrqQeAD1zA7F-M2ElbQvq8Vri0P87AWsQfRGraQ0YplEG7Wm0ovoaZPBLpsplk3Ryj2IBJPAO73XJJbDKTxF7JzKtWnJiTNZbG-dGluGYD9Z60qiW1g9devrDKef3MxlozMd6kJIQ5WxJoLKdP01_k5YD-9bInkqkcsQvlqeuCiKahe0jAu9y7qgYl6sOmbOrK3pS2stxGfKLIgUQC')"></div>
                    <!-- Graphic overlay lines -->
                    <svg class="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <!-- Drift vector arrows -->
                      <path d="M120,80 Q240,120 420,180" fill="none" stroke="#7bd0ff" stroke-dasharray="4 4" stroke-width="1.5"></path>
                      <path d="M420,180 Q480,200 560,220" fill="none" stroke="#ffb2b7" stroke-width="2"></path>
                      <circle cx="120" cy="80" fill="#7bd0ff" r="5"></circle>
                      <circle cx="560" cy="220" fill="#c81a42" r="6"></circle>
                    </svg>
                    <!-- Annotation overlays -->
                    <div class="absolute top-4 left-6 bg-surface-container-high/90 px-space-sm py-space-xs rounded shadow">
                      <span class="font-data-mono-sm text-data-mono-sm text-secondary block font-semibold">POINT A: T-14h (ORIGIN)</span>
                      <span class="font-body-sm text-body-sm text-on-surface-variant">Vessel Discharge Event</span>
                    </div>
                    <div class="absolute bottom-6 right-6 bg-surface-container-high/90 px-space-sm py-space-xs rounded shadow">
                      <span class="font-data-mono-sm text-data-mono-sm text-tertiary block font-semibold">POINT B: T-0 (OBSERVED)</span>
                      <span class="font-body-sm text-body-sm text-on-surface-variant">Sentinel-1 Detection 48km away</span>
                    </div>
                  </div>
                  <!-- Metrics bar -->
                  <div class="grid grid-cols-3 gap-space-sm mt-space-md pt-space-md text-center">
                    <div>
                      <span class="font-data-mono-sm text-data-mono-sm text-outline block">TEMPORAL OFFSET</span>
                      <span class="font-headline-sm text-headline-sm text-on-surface font-mono">14.2 hrs</span>
                    </div>
                    <div>
                      <span class="font-data-mono-sm text-data-mono-sm text-outline block">CURRENT DISPLACEMENT</span>
                      <span class="font-headline-sm text-headline-sm text-secondary font-mono">48.6 km</span>
                    </div>
                    <div>
                      <span class="font-data-mono-sm text-data-mono-sm text-outline block">INTERCEPT DCPA</span>
                      <span class="font-headline-sm text-headline-sm text-primary font-mono">0.14 nm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 3: THE EVIDENCE MODEL (Scientific Transparency & Legal Admissibility) -->
        <section class="relative w-full px-gutter-desktop py-space-3xl bg-surface-container-lowest">
          <div class="max-w-6xl mx-auto space-y-space-2xl">
            <div class="text-center max-w-2xl mx-auto space-y-space-sm">
              <span class="font-data-mono-sm text-data-mono-sm tracking-widest text-primary uppercase">EPISTEMOLOGICAL PROVENANCE</span>
              <h2 class="font-headline-xl text-headline-xl text-on-surface">Structured for Courtroom Admissibility</h2>
              <p class="font-body-md text-body-md text-on-surface-variant">
                Maritime enforcement requires unequivocal clarity. WAKE explicitly separates raw empirical records from dynamic models and mathematical inference.
              </p>
            </div>

            <!-- Three Pillars Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              <!-- Observed Column -->
              <div class="node-observed flex flex-col p-space-xl rounded-xl bg-surface-container-low shadow-lg">
                <div class="flex items-center justify-between mb-space-lg">
                  <span class="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]"></span>
                  <span class="font-data-mono-sm text-data-mono-sm text-outline uppercase tracking-wider">TIER 1</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-[#10b981] mb-space-xs">OBSERVED</h3>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-base">Ground-Truth Deterministic Data</span>
                <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-lg leading-relaxed">
                  Direct, tamper-evident physical records logged by orbital SAR satellites, coastal AIS receivers, and coastal radar networks.
                </p>
                <div class="space-y-space-sm mt-auto pt-space-md">
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-[#10b981]">check_circle</span>
                    <span>Copernicus S1 SAR RAW Backscatter</span>
                  </div>
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-[#10b981]">check_circle</span>
                    <span>Raw NMEA AIS Transponder Bursts</span>
                  </div>
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-[#10b981]">check_circle</span>
                    <span>Coast Guard Surveillance Logs</span>
                  </div>
                </div>
              </div>

              <!-- Derived Column -->
              <div class="node-derived flex flex-col p-space-xl rounded-xl bg-surface-container-low shadow-lg">
                <div class="flex items-center justify-between mb-space-lg">
                  <span class="w-3 h-3 rounded-full bg-secondary shadow-[0_0_10px_#7bd0ff]"></span>
                  <span class="font-data-mono-sm text-data-mono-sm text-outline uppercase tracking-wider">TIER 2</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-secondary mb-space-xs">DERIVED</h3>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-base">Hydrodynamic Physics Models</span>
                <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-lg leading-relaxed">
                  Physical equations computed from empirical oceanographic fields, current vectors, speed-over-ground drops, and closest approaches.
                </p>
                <div class="space-y-space-sm mt-auto pt-space-md">
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                    <span>DCPA &amp; TCPA Distance Computations</span>
                  </div>
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                    <span>ECMWF Current Vector Fields</span>
                  </div>
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                    <span>Kinematic Speed Deceleration Analysis</span>
                  </div>
                </div>
              </div>

              <!-- Inference Column -->
              <div class="node-inference flex flex-col p-space-xl rounded-xl bg-surface-container-low shadow-lg">
                <div class="flex items-center justify-between mb-space-lg">
                  <span class="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_#d2bbff]"></span>
                  <span class="font-data-mono-sm text-data-mono-sm text-outline uppercase tracking-wider">TIER 3</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-primary mb-space-xs">INFERENCE</h3>
                <span class="font-data-mono-sm text-data-mono-sm text-outline mb-space-base">Bayesian Posterior Reasoning</span>
                <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-lg leading-relaxed">
                  Statistical probabilistic ranking synthesizing thousands of Monte Carlo advection runs with vessel trajectories.
                </p>
                <div class="space-y-space-sm mt-auto pt-space-md">
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                    <span>Bayesian Likelihood Distribution</span>
                  </div>
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                    <span>10,000-Particle Monte Carlo Cones</span>
                  </div>
                  <div class="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
                    <span class="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                    <span>Prior / Posterior Culpability Ranking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 4: DEMONSTRATION CASE BRIDGE -->
        <section class="relative w-full px-gutter-desktop py-space-3xl bg-surface" id="demo-case">
          <div class="max-w-6xl mx-auto">
            <div class="relative rounded-2xl overflow-hidden bg-surface-container-low shadow-2xl p-space-2xl md:p-space-3xl">
              <!-- Subtle Background Glow -->
              <div class="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none"></div>
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center relative z-10">
                <div class="lg:col-span-7 space-y-space-lg">
                  <div class="flex items-center gap-space-sm">
                    <span class="px-space-sm py-space-2xs bg-tertiary-container text-on-tertiary-container font-data-mono-sm text-data-mono-sm rounded uppercase">
                      ACTIVE CASE FILE
                    </span>
                    <span class="font-data-mono-sm text-data-mono-sm text-outline">MARPOL ANNEX I INVESTIGATION</span>
                  </div>
                  <h2 class="font-headline-xl text-headline-xl text-on-surface">
                    CASE #{investigation_id} // CELTIC SEA DISCHARGE
                  </h2>
                  <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Explore how WAKE identified the rogue bulk carrier responsible for an unannounced {spread_km:.1f} km discharge in the St George's Channel. Reconstruct the backwards drift trajectory and inspect the corroborating AIS telemetry records.
                  </p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-space-base pt-space-md">
                    <div class="p-space-md rounded bg-surface-container">
                      <span class="font-data-mono-sm text-data-mono-sm text-outline block">TARGET SLICK</span>
                      <span class="font-label-lg text-label-lg text-on-surface mt-space-2xs block font-semibold">{spread_km:.1f} km Length</span>
                    </div>
                    <div class="p-space-md rounded bg-surface-container">
                      <span class="font-data-mono-sm text-data-mono-sm text-outline block">INTERCEPT TIME</span>
                      <span class="font-label-lg text-label-lg text-secondary mt-space-2xs block font-semibold">{time_str}</span>
                    </div>
                    <div class="p-space-md rounded bg-surface-container">
                      <span class="font-data-mono-sm text-data-mono-sm text-outline block">PRIMARY CANDIDATE</span>
                      <span class="font-label-lg text-label-lg text-tertiary mt-space-2xs block font-semibold">MMSI {top_mmsi}</span>
                    </div>
                  </div>
                  <div class="pt-space-lg flex flex-wrap items-center gap-space-md">
                    <a class="inline-flex items-center gap-space-sm px-space-xl py-space-md rounded bg-primary text-on-primary font-label-lg text-label-lg shadow-xl hover:brightness-105 transition-all" href="#/report">
                      <span>EXPLORE EXAMPLE CASE (START INVESTIGATION)</span>
                      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </a>
                    <span class="font-data-mono-sm text-data-mono-sm text-outline">DATA PRE-LOADED &bull; NO CREDENTIALS REQUIRED</span>
                  </div>
                </div>
                <!-- Preview Inspector Visual -->
                <div class="lg:col-span-5">
                  <div class="relative rounded-xl bg-surface-container-lowest overflow-hidden shadow-xl">
                    <div class="w-full h-72 bg-cover bg-center opacity-85" data-alt="Close-up forensic dashboard display showing SAR grayscale radar slick texture, vector displacement lines, and a verified AIS telemetry vessel card." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCHqMibFKxUTpMgJsoBy6tWRTeWpbTeZA5zBRZq9Me_nTTZr4Ng-pcrX-ZuVciATuoucaYJfwNMjkagC8ENU6pnDgcWxcaEVGaP7TPww-e8Xp0n-4XhbD14n5cLYr6wIyAQi3iUSRNXpOSOLYA4o2MrwMda85Mrc3DZzS8ZveO2Zv8AxDLJ-cogn1O9j52xzYpyDGSigqsI867o572oohceuWwz72W8zW0NxPXkdbuUgLe4PUqvA-ML')"></div>
                    <div class="p-space-md bg-surface-container-high/95 backdrop-blur-md flex items-center justify-between">
                      <div>
                        <span class="font-label-md text-label-md text-on-surface block">Celtic Sea Sector 04</span>
                        <span class="font-data-mono-sm text-data-mono-sm text-outline">Sensor: Sentinel-1B IW</span>
                      </div>
                      <a href="#/report" class="flex items-center gap-space-xs text-primary font-data-mono-sm text-data-mono-sm hover:underline">
                        <span class="material-symbols-outlined text-[16px]">visibility</span>
                        <span>VIEW DOSSIER</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

  <!-- ========================================================
       STAGE 02: INVESTIGATION PARAMETERS OF RECORD
       ======================================================== -->
  <section id="stage-input" class="stage-section" style="display: none;">
    <div class="params-container">
      <div class="params-hero">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-sm);">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--geospatial-cyan); text-transform: uppercase; font-family: var(--font-family-mono);">
              Telemetry Dossier
            </span>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--on-surface); margin-top: 2px;">
              Parameters of Record
            </h2>
          </div>
          <span class="mono" style="font-size: 11px; color: var(--outline); background: var(--surface-foundation); padding: 4px 10px; border-radius: var(--rounded-default); border: 1px solid var(--structural-hairline);">
            ID: #{investigation_id}
          </span>
        </div>
        <p style="font-size: 12px; color: var(--on-surface-variant); line-height: 1.6;">
          This record documents the exact observation coordinates and environmental criteria executed for this completed forensic attribution run.
        </p>

        <!-- 5 Core Parameters -->
        <div class="params-grid">
          <div class="param-card">
            <span class="param-label">Observed Latitude</span>
            <span class="param-value tabular-nums">{lat:.4f}&deg; N</span>
            <span class="param-note">WGS-84 Coordinate</span>
          </div>

          <div class="param-card">
            <span class="param-label">Observed Longitude</span>
            <span class="param-value tabular-nums">{lon:.4f}&deg; W</span>
            <span class="param-note">WGS-84 Coordinate</span>
          </div>

          <div class="param-card">
            <span class="param-label">Observation Epoch</span>
            <span class="param-value tabular-nums" style="font-size: 1.1rem;">{time_str}</span>
            <span class="param-note">Satellite Pass UTC</span>
          </div>

          <div class="param-card">
            <span class="param-label">Spread Radius</span>
            <span class="param-value tabular-nums">{spread_km:.2f} km</span>
            <span class="param-note">Tightest Estimate</span>
          </div>

          <div class="param-card">
            <span class="param-label">Analysis Regime</span>
            <span class="param-value" style="text-transform: capitalize; color: var(--primary);">{regime}</span>
            <span class="param-note">{rationale}</span>
          </div>
        </div>

        <!-- Collapsed Advanced Parameters -->
        <details class="advanced-disclosure">
          <summary>
            <span>Advanced Configuration & Environmental Criteria</span>
            <span class="mono" style="font-size: 11px; color: var(--geospatial-cyan);">[ + Expand Details ]</span>
          </summary>
          <div class="advanced-content">
            <div>
              <span class="param-label">Spatial Search Radius</span>
              <div class="mono" style="font-weight: 700; color: var(--on-surface);">50.00 km Outer Envelope</div>
            </div>
            <div>
              <span class="param-label">Temporal Window Span</span>
              <div class="mono" style="font-weight: 700; color: var(--on-surface);">-8.0h before / +6.0h after</div>
            </div>
            <div>
              <span class="param-label">Telemetry Ingestion Backend</span>
              <div class="mono" style="font-weight: 700; color: var(--on-surface);">NOAA MarineCadastre GeoParquet</div>
            </div>
            <div>
              <span class="param-label">Trajectory Spline Max Gap</span>
              <div class="mono" style="font-weight: 700; color: var(--on-surface);">120 minutes max interpolation</div>
            </div>
            <div>
              <span class="param-label">Primary Candidate Ranker</span>
              <div class="mono" style="font-weight: 700; color: var(--on-surface);">Non-Parametric Borda Consensus</div>
            </div>
            <div>
              <span class="param-label">Coordinate Frame</span>
              <div class="mono" style="font-weight: 700; color: var(--on-surface);">EPSG:4326 / Local Metric Space</div>
            </div>
          </div>
        </details>

        <div style="display: flex; gap: var(--space-md); margin-top: var(--space-md); justify-content: flex-end; flex-wrap: wrap;">
          <a href="#/report" class="btn-primary">
            <span>Proceed to Case Report</span>
            <span>→</span>
          </a>
          <a href="#/reconstruction" class="btn-secondary">
            <span>Launch 3D Workspace</span>
            <span>⤢</span>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================
       STAGE 03: CASE REPORT & EVIDENCE
       ======================================================== -->
  <section id="stage-report" class="stage-section" style="display: none;">
    <div class="report-container">
      <!-- 5-Second Executive Digest -->
      <div class="kpi-mosaic">
        <div class="kpi-card highlight-card">
          <span class="kpi-title">Primary Candidate</span>
          <span class="kpi-val" style="color: var(--primary);">{top_name}</span>
          <span class="kpi-sub">MMSI: {top_mmsi} &bull; Score: <strong style="color: var(--verified-emerald);">{top_conf_score:.3f} &bull; {top_conf_label}</strong></span>
        </div>

        <div class="kpi-card">
          <span class="kpi-title">Observation Target</span>
          <span class="kpi-val tabular-nums">{lat:.3f}&deg; N, {abs(lon):.3f}&deg; W</span>
          <span class="kpi-sub">{time_str}</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-title">Spread Dispersion</span>
          <span class="kpi-val tabular-nums">{spread_km:.2f} km</span>
          <span class="kpi-sub">Regime: {regime.upper()}</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-title">Vessels Screened</span>
          <span class="kpi-val tabular-nums">{total_candidates}</span>
          <span class="kpi-sub">Within 50 km Search Radius</span>
        </div>
      </div>

      <!-- Candidate Roster Toolbar -->
      <div class="roster-toolbar">
        <div style="display: flex; align-items: center; gap: var(--space-md);">
          <span style="font-weight: 800; font-size: 12px; text-transform: uppercase; color: var(--on-surface); letter-spacing: 0.05em;">
            Screened Candidates ({total_candidates})
          </span>
          <input type="text" class="search-input" id="rosterSearchInput" placeholder="Filter candidate name or MMSI..." oninput="window.filterRoster()">
        </div>

        <div class="filter-pills">
          <button class="filter-btn active" onclick="window.setRosterFilter('ALL')">ALL</button>
          <button class="filter-btn" onclick="window.setRosterFilter('HIGH')">HIGH</button>
          <button class="filter-btn" onclick="window.setRosterFilter('MEDIUM')">MEDIUM</button>
          <button class="filter-btn" onclick="window.setRosterFilter('LOW')">LOW</button>
        </div>
      </div>

      <!-- Progressive Disclosure Candidate List -->
      <div class="candidate-list" id="candidateListContainer">
        <!-- Rendered dynamically by app.js -->
      </div>

      <!-- Forensic Integrity Disclaimers -->
      <div class="disclaimers-card">
        <div class="disclaimers-header">
          <span style="color: #FBBF24;">⚠</span>
          <span>Forensic Integrity & Evidentiary Disclaimers</span>
        </div>
        <p class="disclaimer-text">
          &bull; <strong>Dark-Vessel Caveat:</strong> A vessel transiting without active AIS broadcasts will not appear in telemetry archives and cannot be ruled out as the responsible party.
        </p>
        <p class="disclaimer-text">
          &bull; <strong>Attribution Is Decision-Support:</strong> This dossier establishes physical, geometric, and kinematic correlation based on available data; it constitutes analytical decision-support, not formal judicial proof of liability.
        </p>
        <p class="disclaimer-text">
          &bull; <strong>Borda Score Notice:</strong> Borda points represent non-parametric rank aggregation across multi-channel metrics, not linear probabilities. Calibrated posteriors are separately labeled when LLR is enabled.
        </p>
      </div>

      <!-- Call to Action into Stage 04 -->
      <div style="background: linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface-floating) 100%); border: 1px solid rgba(124, 58, 237, 0.4); border-radius: var(--rounded-lg); padding: var(--space-xl); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-base);">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--on-surface);">Explore Trajectory Kinematics in Real 3D / 2D Studio</h3>
          <p style="font-size: 11px; color: var(--on-surface-variant); margin-top: 2px;">
            Full multi-row timeline scrubber, 3D orbit controls, Scenario Lab, contradiction detection, and 2D GIS console.
          </p>
        </div>
        <a href="#/reconstruction" class="btn-primary">
          <span>LAUNCH FORENSIC STUDIO</span>
          <span>⤢</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ========================================================
       STAGE 04: FORENSIC STUDIO (EMBEDDED REAL ENGINES)
       ======================================================== -->
  <section id="stage-reconstruction" class="stage-section" style="display: none;">
    <div class="stage-recon-wrapper">
      <!-- Chrome Toolbar with 2D / 3D Toggle -->
      <div class="recon-control-toolbar">
        <div style="display: flex; align-items: center; gap: var(--space-md);">
          <span style="font-size: 12px; font-weight: 700; color: var(--on-surface); text-transform: uppercase; letter-spacing: 0.05em;">
            Forensic Studio
          </span>
          <span class="mono" style="font-size: 11px; color: var(--outline);">
            #{investigation_id}
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: var(--space-sm);">
          <div style="display: flex; background: var(--surface-foundation); border: 1px solid var(--structural-hairline); border-radius: var(--rounded-default); padding: 2px;">
            <button class="btn-primary btn-compact" id="btn-view-3d" onclick="window.switchReconView('3d')">
              3D Kinematic Studio
            </button>
            <button class="btn-secondary btn-compact" id="btn-view-2d" onclick="window.switchReconView('2d')">
              2D GIS Console
            </button>
          </div>
          <a href="reconstruction-styled.html" target="_blank" class="btn-secondary btn-compact" title="Open standalone in new tab">
            <span>Pop Out</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      <!-- Viewport Frame Embedding Untouched Real Engines -->
      <div class="recon-viewport-container">
        <!-- 3D Real Engine Iframe -->
        <iframe id="recon-iframe-3d" class="recon-iframe" src="reconstruction-styled.html" title="WAKE 3D Workstation"></iframe>

        <!-- 2D Real GIS Console Iframe -->
        <iframe id="recon-iframe-2d" class="recon-iframe" src="workstation-styled.html" title="WAKE 2D Workstation" style="display: none;"></iframe>
      </div>
    </div>
  </section>
    </div>
  </main>

  <!-- WAKE Platform Footer -->
  <footer class="w-full bg-surface-container-lowest py-space-xl shadow-[0_-1px_8px_rgba(0,0,0,0.4)]">
    <div class="w-full px-gutter-desktop flex flex-col md:flex-row items-center justify-between gap-space-base">
      <div class="flex items-center gap-space-base">
        <span class="font-data-mono-sm text-data-mono-sm text-outline uppercase tracking-wider">WAKE FORENSIC KERNEL v4.2.1-PROD</span>
        <span class="hidden md:inline font-data-mono-sm text-data-mono-sm text-outline-variant">&bull;</span>
        <span class="font-body-sm text-body-sm text-on-surface-variant">European Maritime Safety &amp; Copernicus SAR Sensor Provenance Compliant</span>
      </div>
      <div class="flex items-center gap-space-lg">
        <span class="font-data-mono-sm text-data-mono-sm text-on-surface-variant">LAT/LON GRID: WGS84</span>
        <span class="font-data-mono-sm text-data-mono-sm text-secondary">AIS TELEMETRY: ACTIVE</span>
      </div>
    </div>
  </footer>

  <script src="./app.js"></script>
</body>
</html>
"""


def generate_case_experience(
    investigation_id: str,
    input_data: dict[str, Any],
    regime_decision: dict[str, Any],
    scores_df: pd.DataFrame,
    reconstructed_df: pd.DataFrame,
    slick_coords: np.ndarray | None,
    origin_estimate: Any | None,
    output_html_path: Path,
    config: dict[str, Any] | None = None,
) -> Path:
    """Generates the modular case_experience directory and entrypoint.

    Args:
        investigation_id: Unique identifier for the investigation.
        input_data: Raw investigation input parameters.
        regime_decision: Regime classification and rationale.
        scores_df: Scored candidate vessels.
        reconstructed_df: Spatiotemporal reconstructed AIS vessel tracks.
        slick_coords: Coordinates defining observed slick geometry.
        origin_estimate: Estimated backtracked spill origin if delayed regime.
        output_html_path: Path where the entrypoint HTML will be written.
        config: Optional configuration snapshot dictionary.

    Returns:
        Path to the primary index.html or entrypoint file.
    """
    output_html_path = Path(output_html_path)
    bundle_dir = output_html_path.parent
    bundle_dir.mkdir(parents=True, exist_ok=True)

    # Modular output folder (§5)
    case_exp_dir = bundle_dir / "case_experience"
    case_exp_dir.mkdir(parents=True, exist_ok=True)

    lat = float(input_data.get("lat", 0.0))
    lon = float(input_data.get("lon", 0.0))
    time_str = str(input_data.get("time_utc", "Unknown Time"))
    spread_km = float(input_data.get("spread_km", 10.0))
    regime = str(regime_decision.get("regime", "contemporaneous"))
    rationale = str(regime_decision.get("rationale", "Direct observation"))
    is_abstained = bool(regime_decision.get("is_abstained", False))
    abstention_reason = regime_decision.get("abstention_reason")

    # Build candidates payload
    vessels_payload: list[dict[str, Any]] = []
    max_borda = float(scores_df["borda_score"].max()) if not scores_df.empty and "borda_score" in scores_df.columns else 1.0
    if max_borda <= 0:
        max_borda = 1.0

    min_ts_iso = None
    max_ts_iso = None
    if not reconstructed_df.empty and "timestamp" in reconstructed_df.columns:
        valid_ts = pd.to_datetime(reconstructed_df["timestamp"], errors="coerce").dropna()
        if not valid_ts.empty:
            min_ts_iso = valid_ts.min().isoformat()
            max_ts_iso = valid_ts.max().isoformat()

    if not scores_df.empty:
        for _, row in scores_df.iterrows():
            mmsi = int(row["mmsi"])
            rank = int(row.get("final_rank", 1))
            name = str(row.get("vessel_name", f"VESSEL_{mmsi}"))
            conf_label = str(row.get("confidence_label", "UNKNOWN"))
            conf_score = float(row.get("confidence_score", 0.0))
            frechet_val = float(row["frechet_km"]) if pd.notna(row.get("frechet_km")) else None
            dcpa = float(row.get("dcpa_km", 0.0))
            tcpa = float(row.get("tcpa_minutes", 0.0))
            coverage = float(row.get("coverage_completeness", 0.0))
            ff_score = float(row["forward_fit_score"]) if pd.notna(row.get("forward_fit_score")) else None
            post_score = float(row["evidence_posterior"]) if pd.notna(row.get("evidence_posterior")) else None
            top_score = float(row["topsis_score"]) if pd.notna(row.get("topsis_score")) else None
            borda_score = int(row.get("borda_score", 0))

            v_track = reconstructed_df[reconstructed_df["mmsi"] == mmsi] if not reconstructed_df.empty else pd.DataFrame()
            track_points = []
            observed_count = 0
            interpolated_count = 0
            cpa_lat = lat
            cpa_lon = lon

            if not v_track.empty:
                v_track_sorted = v_track.sort_values("timestamp") if "timestamp" in v_track.columns else v_track
                dists = np.sqrt((v_track_sorted["lat"] - lat) ** 2 + ((v_track_sorted["lon"] - lon) * np.cos(np.radians(lat))) ** 2) * 111.0
                min_idx = dists.idxmin()
                cpa_lat = float(v_track_sorted.loc[min_idx, "lat"])
                cpa_lon = float(v_track_sorted.loc[min_idx, "lon"])

                for _, pt in v_track_sorted.iterrows():
                    is_interp = bool(pt.get("is_interpolated", False))
                    if is_interp:
                        interpolated_count += 1
                    else:
                        observed_count += 1
                    ts_val = pt.get("timestamp")
                    if hasattr(ts_val, "isoformat"):
                        ts_str = ts_val.isoformat()
                    else:
                        ts_str = str(ts_val)
                    track_points.append({
                        "lat": float(pt["lat"]),
                        "lon": float(pt["lon"]),
                        "timestamp": ts_str,
                        "sog": float(pt.get("sog", 10.0)) if pd.notna(pt.get("sog")) else 10.0,
                        "cog": float(pt.get("cog", 0.0)) if pd.notna(pt.get("cog")) else 0.0,
                        "is_interpolated": is_interp,
                    })

            expl = []
            if frechet_val is not None:
                expl.append(f"Fréchet shape parity: {frechet_val:.2f} km curve similarity")
            else:
                expl.append("Fréchet parity: not applicable (amorphous slick geometry)")
            expl.append(f"Closest kinematic approach (DCPA): {dcpa:.2f} km at {tcpa:+.1f} min relative to observation")
            expl.append(f"AIS coverage: {coverage * 100:.1f}% genuine broadcasts in observation window")
            if ff_score is not None:
                expl.append(f"Forward-fit trajectory simulation score: {ff_score:.2f}")

            vessels_payload.append({
                "rank": rank,
                "mmsi": mmsi,
                "name": name,
                "conf_label": conf_label,
                "conf_score": conf_score,
                "frechet_km": frechet_val,
                "dcpa_km": dcpa,
                "tcpa_min": tcpa,
                "coverage": coverage,
                "forward_fit_score": ff_score,
                "evidence_posterior": post_score,
                "topsis_score": top_score,
                "borda_score": borda_score,
                "borda_ratio": float(borda_score / max_borda) if max_borda > 0 else 0.0,
                "cpa_lat": cpa_lat,
                "cpa_lon": cpa_lon,
                "observed_count": observed_count,
                "interpolated_count": interpolated_count,
                "explanation": expl,
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
                "note": getattr(origin_estimate, "note", ""),
            }

    case_data_dict = {
        "investigation_id": investigation_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "coordinate_system": "WGS-84 (EPSG:4326)",
            "time_window_start": min_ts_iso or time_str,
            "time_window_end": max_ts_iso or time_str,
            "disclaimer": "Analytical decision-support tool correlating AIS tracks and satellite radar observations. Does not constitute formal judicial liability determination.",
        },
        "input": _sanitize_for_json(input_data),
        "regime_decision": _sanitize_for_json(regime_decision),
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
        "vessels": _sanitize_for_json(vessels_payload),
    }

    client_data_json = json.dumps(case_data_dict, indent=2, default=str)

    # 1. Write case_experience/case-data.json and case_experience/case-data.js
    (case_exp_dir / "case-data.json").write_text(client_data_json, encoding="utf-8")
    (case_exp_dir / "case-data.js").write_text(
        f"window.WAKE_CASE_DATA = {client_data_json};\n",
        encoding="utf-8",
    )

    # 2. Write case_experience/styles.css and case_experience/app.js
    (case_exp_dir / "styles.css").write_text(_get_styles_css(), encoding="utf-8")
    (case_exp_dir / "app.js").write_text(_get_app_js(), encoding="utf-8")

    # 3. Patch copies of reconstruction_3d_v3.html and workstation.html into case_experience folder (§1 & §5)
    # The originals on disk in bundle_dir are NEVER modified and remain 100% byte-identical.
    recon_src = bundle_dir / "reconstruction_3d_v3.html"
    if recon_src.exists():
        raw_recon_html = recon_src.read_text(encoding="utf-8")
        if "</head>" in raw_recon_html:
            patched_recon = raw_recon_html.replace("</head>", f"{THEME_STYLE_PATCH}\n</head>")
        else:
            patched_recon = raw_recon_html + THEME_STYLE_PATCH
        (case_exp_dir / "reconstruction-styled.html").write_text(patched_recon, encoding="utf-8")
    else:
        (case_exp_dir / "reconstruction-styled.html").write_text(
            "<!DOCTYPE html><html><body><p>3D reconstruction engine not found in bundle.</p></body></html>",
            encoding="utf-8",
        )

    workstation_src = bundle_dir / "workstation.html"
    if workstation_src.exists():
        raw_workstation_html = workstation_src.read_text(encoding="utf-8")
        if "</head>" in raw_workstation_html:
            patched_workstation = raw_workstation_html.replace("</head>", f"{THEME_STYLE_PATCH}\n</head>")
        else:
            patched_workstation = raw_workstation_html + THEME_STYLE_PATCH
        (case_exp_dir / "workstation-styled.html").write_text(patched_workstation, encoding="utf-8")
    else:
        (case_exp_dir / "workstation-styled.html").write_text(
            "<!DOCTYPE html><html><body><p>2D workstation console not found in bundle.</p></body></html>",
            encoding="utf-8",
        )

    # Top vessel summary
    top_vessel = vessels_payload[0] if vessels_payload else None
    top_name = top_vessel["name"] if top_vessel else "No Candidate Identified"
    top_mmsi = str(top_vessel["mmsi"]) if top_vessel else "N/A"
    top_conf_label = top_vessel["conf_label"] if top_vessel else "NONE"
    top_conf_score = float(top_vessel["conf_score"]) if top_vessel else 0.0
    total_candidates = len(vessels_payload)

    status_badge_text = "CONFIRMED ATTRIBUTION"
    status_badge_color = "#10B981"
    if is_abstained:
        status_badge_text = f"ABSTAINED: {abstention_reason}" if abstention_reason else "INCONCLUSIVE / ABSTAINED"
        status_badge_color = "#FBBF24"
    elif total_candidates == 0:
        status_badge_text = "NO CANDIDATES SCREENED"
        status_badge_color = "#94A3B8"

    # 4. Write case_experience/index.html
    index_html = _get_index_html(
        investigation_id=investigation_id,
        time_str=time_str,
        lat=lat,
        lon=lon,
        spread_km=spread_km,
        regime=regime,
        rationale=rationale,
        status_badge_text=status_badge_text,
        status_badge_color=status_badge_color,
        top_name=top_name,
        top_mmsi=top_mmsi,
        top_conf_label=top_conf_label,
        top_conf_score=top_conf_score,
        total_candidates=total_candidates,
    )
    index_path = case_exp_dir / "index.html"
    index_path.write_text(index_html, encoding="utf-8")

    # 5. Write top-level case_experience.html redirect entrypoint
    redirect_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=case_experience/index.html">
  <title>WAKE Case Experience</title>
</head>
<body style="background:#09080E; color:#E6E0EE; font-family:sans-serif; padding:2rem; text-align:center;">
  <p>Loading WAKE Case Experience... <a href="case_experience/index.html" style="color:#7C3AED;">Click here if not redirected automatically</a>.</p>
</body>
</html>
"""
    output_html_path.write_text(redirect_html, encoding="utf-8")

    return index_path
