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
.stage-recon-wrapper {
  width: 100%;
  height: calc(100vh - 56px);
  display: flex;
  flex-direction: column;
  background: var(--base-deep-space);
}

.recon-control-toolbar {
  height: 48px;
  background: var(--surface-foundation);
  border-bottom: 1px solid var(--structural-hairline);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--gutter-desktop);
  z-index: 10;
}

.recon-viewport-container {
  flex: 1;
  width: 100%;
  height: calc(100% - 48px);
  position: relative;
  background: #000000;
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
    if (h.includes('input') || h.includes('02-input')) return 'input';
    if (h.includes('report') || h.includes('demo-case') || h.includes('03-case-report')) return 'report';
    if (h.includes('reconstruction') || h.includes('workspace') || h.includes('04-workspace')) return 'reconstruction';
    return 'intro';
  }

  function setStage(stageId) {
    AppState.currentStage = stageId;
    const stages = ['intro', 'input', 'report', 'reconstruction'];
    stages.forEach(s => {
      const el = document.getElementById('stage-' + s);
      if (el) el.style.display = (s === stageId) ? 'block' : 'none';
    });

    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-stage') === stageId);
    });

    if (stageId === 'reconstruction') {
      // Trigger iframe resize
      const f3d = document.getElementById('recon-iframe-3d');
      const f2d = document.getElementById('recon-iframe-2d');
      if (f3d && f3d.contentWindow) f3d.contentWindow.dispatchEvent(new Event('resize'));
      if (f2d && f2d.contentWindow) f2d.contentWindow.dispatchEvent(new Event('resize'));
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WAKE Case Experience // #{investigation_id}</title>
  <link rel="stylesheet" href="./styles.css">
  <!-- Offline-safe direct data script loading -->
  <script src="./case-data.js"></script>
</head>
<body>

  <!-- Top Application Command & Stage Navigation -->
  <header class="app-header">
    <div class="header-brand">
      <div class="logo-mark">W</div>
      <div class="brand-text">
        <span class="brand-title">WAKE</span>
        <span class="brand-sub">Attribution Engine</span>
      </div>
    </div>

    <!-- Stage Navigation Tabs -->
    <nav class="nav-tabs" id="stage-nav">
      <a href="#/intro" class="nav-tab active" data-stage="intro" id="nav-intro">01 Introduction</a>
      <a href="#/input" class="nav-tab" data-stage="input" id="nav-input">02 Parameters</a>
      <a href="#/report" class="nav-tab" data-stage="report" id="nav-report">03 Case Report</a>
      <a href="#/reconstruction" class="nav-tab" data-stage="reconstruction" id="nav-reconstruction">04 3D Workspace</a>
    </nav>

    <div class="header-status">
      <div class="status-pill" style="color: {status_badge_color};">
        <span class="status-dot"></span>
        <span>{status_badge_text}</span>
      </div>
      <a href="#/reconstruction" class="btn-primary btn-compact">
        <span>Launch 3D</span>
        <span>⤢</span>
      </a>
    </div>
  </header>

  <!-- ========================================================
       STAGE 01: INTRODUCTION NARRATIVE & SEMANTIC PIPELINE
       ======================================================== -->
  <section id="stage-intro" class="stage-section">
    <div class="intro-hero">
      <div class="constellation-strip">
        <span style="color: var(--geospatial-cyan); font-weight: 800;">●</span>
        <span>Sentinel-1 Copernicus Constellation &bull; Hydrodynamic Drift Engine &bull; Reproducible Forensic Proof</span>
      </div>

      <h1 class="hero-title">
        When an oil spill appears at sea, the real question is not only where it is — <span class="highlight">but where it came from.</span>
      </h1>

      <p class="hero-subtitle">
        WAKE is a maritime forensic intelligence system detecting, analysing, and attributing offshore discharges by fusing Sentinel-1 SAR imagery, multi-temporal AIS telemetry, and hydrodynamic backwards-drift modelling.
      </p>

      <div class="hero-cta-dock">
        <a href="#/report" class="btn-primary">
          <span>ENTER CASE</span>
          <span>→</span>
        </a>
        <a href="#pipeline-workflow" class="btn-secondary" onclick="document.getElementById('pipeline-workflow').scrollIntoView({{behavior: 'smooth'}});">
          <span>HOW IT WORKS</span>
          <span>↓</span>
        </a>
      </div>
    </div>

    <!-- 6 Semantic Pipeline Processing Stages -->
    <div class="pipeline-section" id="pipeline-workflow">
      <div class="pipeline-header">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--geospatial-cyan); text-transform: uppercase; font-family: var(--font-family-mono);">
            Evidentiary Architecture
          </span>
          <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--on-surface); margin-top: 4px;">
            Attribution Pipeline Workflow
          </h2>
        </div>
        <span class="mono" style="font-size: 11px; color: var(--outline);">6 Interlocking Processing Nodes</span>
      </div>

      <div class="pipeline-grid">
        <!-- Node 1: SAR Detection (Observed + Anomaly) -->
        <div class="pipeline-node node-observed">
          <div class="node-graphic">
            <svg width="180" height="48" viewBox="0 0 180 48" fill="none">
              <!-- Sentinel radar sweep -->
              <circle cx="90" cy="24" r="20" stroke="rgba(16, 185, 129, 0.3)" stroke-width="1" stroke-dasharray="3 3"/>
              <circle cx="90" cy="24" r="10" stroke="var(--verified-emerald)" stroke-width="1.5"/>
              <!-- Damping Anomaly -->
              <path d="M 40 28 Q 70 14 110 24 T 150 20" stroke="var(--anomaly-rose)" stroke-width="3" stroke-linecap="round"/>
              <circle cx="90" cy="24" r="3" fill="var(--verified-emerald)"/>
            </svg>
          </div>
          <span class="node-phase-tag">Phase 01 // Observed</span>
          <h3 class="node-title">SAR Satellite Detection</h3>
          <p class="node-desc">Copernicus Sentinel-1 C-band synthetic aperture radar (SAR) scans capture surface capillary damping and backscatter suppression.</p>
          <div class="node-footer">
            <span style="color: var(--verified-emerald);">VV + VH Dual-Pol</span>
            <span style="color: var(--outline);">Sensor: C-SAR</span>
          </div>
        </div>

        <!-- Node 2: Segmentation (Derived) -->
        <div class="pipeline-node node-derived">
          <div class="node-graphic">
            <svg width="180" height="48" viewBox="0 0 180 48" fill="none">
              <!-- Polygon Boundary -->
              <path d="M 30 26 Q 60 12 100 18 T 160 28 Q 120 40 70 36 Z" fill="rgba(244, 63, 94, 0.15)" stroke="var(--anomaly-rose)" stroke-width="1.2"/>
              <!-- Medial Axis Centerline -->
              <path d="M 38 25 Q 70 18 105 22 T 152 28" stroke="var(--geospatial-cyan)" stroke-width="2" stroke-dasharray="4 2"/>
            </svg>
          </div>
          <span class="node-phase-tag">Phase 02 // Derived</span>
          <h3 class="node-title">Neural Segmentation</h3>
          <p class="node-desc">Isolates true petroleum damping from biogenic lookalikes; extracts skeleton medial axes, geometry, and spread footprint.</p>
          <div class="node-footer">
            <span style="color: var(--geospatial-cyan);">Medial Axis Voronoi</span>
            <span style="color: var(--outline);">Damping: >8 dB</span>
          </div>
        </div>

        <!-- Node 3: Lagrangian Drift (Derived) -->
        <div class="pipeline-node node-derived">
          <div class="node-graphic">
            <svg width="180" height="48" viewBox="0 0 180 48" fill="none">
              <!-- Current & Wind Advection Vectors -->
              <path d="M 150 20 L 110 24 M 110 24 L 70 22 M 70 22 L 30 26" stroke="var(--geospatial-cyan)" stroke-width="2" stroke-linecap="round"/>
              <polygon points="26,26 34,22 34,30" fill="var(--geospatial-cyan)"/>
              <!-- Uncertainty Origin Cone -->
              <ellipse cx="32" cy="26" rx="14" ry="8" fill="rgba(244, 63, 94, 0.2)" stroke="var(--anomaly-rose)" stroke-width="1"/>
            </svg>
          </div>
          <span class="node-phase-tag">Phase 03 // Derived</span>
          <h3 class="node-title">Reverse Lagrangian Drift</h3>
          <p class="node-desc">Backward advection rewinds physical slick drift using ECMWF hydrodynamic currents and GFS surface windage back to discharge epoch.</p>
          <div class="node-footer">
            <span style="color: var(--anomaly-rose);">OpenDrift / OpenOil</span>
            <span style="color: var(--outline);">T-48h Advection</span>
          </div>
        </div>

        <!-- Node 4: AIS Ingestion (Observed + Derived) -->
        <div class="pipeline-node node-observed">
          <div class="node-graphic">
            <svg width="180" height="48" viewBox="0 0 180 48" fill="none">
              <!-- Spline Trajectory with Genuine Pings -->
              <path d="M 20 38 Q 60 16 110 28 T 165 14" stroke="var(--geospatial-cyan)" stroke-width="1.5" stroke-dasharray="3 3"/>
              <!-- Observed Genuine Points -->
              <circle cx="20" cy="38" r="3.5" fill="var(--verified-emerald)"/>
              <circle cx="55" cy="23" r="3.5" fill="var(--verified-emerald)"/>
              <circle cx="110" cy="28" r="3.5" fill="var(--verified-emerald)"/>
              <circle cx="165" cy="14" r="3.5" fill="var(--verified-emerald)"/>
            </svg>
          </div>
          <span class="node-phase-tag">Phase 04 // Observed & Derived</span>
          <h3 class="node-title">AIS Ingestion & Kinematics</h3>
          <p class="node-desc">Ingests high-density vessel broadcasts; filters spatial corridors and constructs hermite spline kinematics across telemetry gaps.</p>
          <div class="node-footer">
            <span style="color: var(--verified-emerald);">Solid: Genuine</span>
            <span style="color: var(--geospatial-cyan);">Dashed: Spline</span>
          </div>
        </div>

        <!-- Node 5: Evidence Channels (Derived) -->
        <div class="pipeline-node node-derived">
          <div class="node-graphic">
            <svg width="180" height="48" viewBox="0 0 180 48" fill="none">
              <!-- Closest Point of Approach Line -->
              <line x1="40" y1="14" x2="140" y2="34" stroke="var(--geospatial-cyan)" stroke-width="2"/>
              <!-- CPA Distance Vector -->
              <line x1="90" y1="24" x2="90" y2="38" stroke="var(--primary-violet-core)" stroke-width="2" stroke-dasharray="2 2"/>
              <circle cx="90" cy="38" r="4" fill="var(--anomaly-rose)"/>
              <circle cx="90" cy="24" r="3.5" fill="var(--geospatial-cyan)"/>
            </svg>
          </div>
          <span class="node-phase-tag">Phase 05 // Derived</span>
          <h3 class="node-title">Multi-Channel Evidence</h3>
          <p class="node-desc">Computes discrete Fréchet curve similarity, DCPA distance, TCPA time offset, and Longépé-style forward-fit plume simulation.</p>
          <div class="node-footer">
            <span style="color: var(--geospatial-cyan);">DCPA + Fréchet + FF</span>
            <span style="color: var(--outline);">Provenanced</span>
          </div>
        </div>

        <!-- Node 6: Consensus Ranking (Inference) -->
        <div class="pipeline-node node-inference">
          <div class="node-graphic">
            <svg width="180" height="48" viewBox="0 0 180 48" fill="none">
              <!-- Borda Consensus Bars -->
              <rect x="35" y="10" width="110" height="7" rx="3" fill="var(--primary-violet-core)"/>
              <rect x="35" y="21" width="65" height="7" rx="3" fill="rgba(124, 58, 237, 0.4)"/>
              <rect x="35" y="32" width="30" height="7" rx="3" fill="rgba(124, 58, 237, 0.2)"/>
              <!-- Crown / Rank #1 -->
              <circle cx="155" cy="13.5" r="4" fill="var(--primary)"/>
            </svg>
          </div>
          <span class="node-phase-tag">Phase 06 // Inference</span>
          <h3 class="node-title">Consensus Ranking</h3>
          <p class="node-desc">Fuses multi-channel metrics via Borda Count, TOPSIS, and calibrated Bayesian LLR with completeness discounts and ambiguity detection.</p>
          <div class="node-footer">
            <span style="color: var(--primary);">Borda Consensus</span>
            <span style="color: var(--outline);">Calibrated Vector</span>
          </div>
        </div>
      </div>
    </div>
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
