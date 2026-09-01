# WAKE: AI-Assisted Satellite & AIS Maritime Oil-Spill Vessel Attribution System

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: 32 Passed](https://img.shields.io/badge/tests-32%20passed%20(100%25)-brightgreen.svg)]()
[![Three.js](https://img.shields.io/badge/3D%20Engine-Three.js%20r128-black.svg)](https://threejs.org/)

An AI-assisted, research-driven maritime forensics and vessel attribution workstation correlating satellite Synthetic Aperture Radar (SAR) oil slicks with AIS vessel trajectories, hydrodynamic drift models, and multi-criteria mathematical consensus.

---

## 🌊 Overview

Illegal oily waste discharges from commercial vessels ("magic pipe" dumps) pose a major global environmental threat. While satellite SAR constellations (e.g., ESA Sentinel-1) can detect oil slicks across global waters, finding the responsible vessel is challenging due to:
1. **The "Age of Slick" Gap:** Ocean currents and wind drift disperse oil slicks kilometers away from the original release point over 6–24 hours.
2. **Opaque Attribution:** Simple Euclidean distance fails when ships make evasive maneuvers or cross the drift corridor at different times.
3. **Data Integrity:** Blurring the line between ground-truth observed AIS broadcasts and model-interpolated positions risks inadmissible evidence.

**WAKE** solves this with an auditable 5-stage pipeline combining **Reverse Lagrangian Hydrodynamic Backtracking**, **Kinematic/Geometric Curve Parity (Discrete Fréchet Distance)**, **Borda Count Consensus Ranking**, and an interactive **3D WebGL Investigation Workstation**.

---

## 🚀 Key Features

* **Multi-Regime Classification:** Distinguishes between *Contemporaneous* (<1h time delta) and *Delayed/Aged* (>1h) spill scenarios.
* **Hydrodynamic Reverse Drift Modeling:** Simulates Lagrangian particle advection backward in time forced by HYCOM/CMEMS ocean currents and GFS surface wind fields.
* **Multi-Metric Mathematical Consensus:**
  * **DCPA (Distance at Closest Point of Approach):** Exact metric proximity.
  * **TCPA (Time to Closest Point of Approach):** Relative lead/lag offset against inferred release epoch.
  * **Discrete Fréchet Distance:** Evaluates geometric curve shape parity between the vessel's track and the skeletonized slick centerline.
  * **AIS Continuity Index:** Evaluates observation completeness and flags intentional AIS dropouts.
  * **Borda Count Rank Aggregation:** Combines multiple criteria without arbitrary weighting bias.
* **Forensic Evidence Integrity:** Explicit visual and structural distinction between *Observed* raw broadcasts, *Interpolated* segments, and *Inferred* hydrodynamic drift particles.
* **Interactive 3D/2D Forensic Workstation (`reconstruction_3d_v3.html`):**
  * Multi-row forensic timeline (Spill event, SAR passes, Vessel kinematics, AIS gaps).
  * AI Copilot with real-time **Contradiction Detection** and **"What Changed?"** reasoning.
  * Interactive **Evidence Graph** & **Scenario Lab** for what-if uncertainty sensitivity testing.
  * Universal Command Palette (`Ctrl+K` / `Cmd+K`) and single-click camera evidence dives.
  * Self-contained, auditable JSON case findings export.

---

## 🏗️ Architecture & Pipeline

```
[ SAR Slick GeoJSON ]
          │
          ▼
[ Stage 1: Input Validation & Regime Classification ]
          │
          ▼
[ Stage 2: Hydrodynamic Reverse Drift Modeling (OpenDrift / NOAA GNOME) ]
          │
          ▼
[ Stage 3: Dynamic AIS Stream & Trajectory Reconstruction (DuckDB / GeoParquet) ]
          │
          ▼
[ Stage 4: Multi-Channel Mathematical Scoring & Borda Consensus ]
          │
          ▼
[ Stage 5: Auditable Case Bundle Generation (Reports & 3D WebGL Studio) ]
```

---

## 📦 Project Structure

```
├── config/
│   └── default_config.yaml                  # Pipeline thresholds, hyperparams, & scoring weights
├── src/ais_oil_attribution/
│   ├── cli.py                               # CLI entry point (`ais-oil-investigate`)
│   ├── core/                                # Orchestrator, regime classifier, input validation
│   ├── data/                                # DuckDB GeoParquet reader, Cerulean client, environmental data
│   ├── drift/                               # OpenDrift reverse Lagrangian backtracking
│   ├── processing/                          # AIS cleaning, gap classification, spline reconstruction
│   ├── attribution/                         # DCPA, TCPA, Fréchet geometry, Borda ranking, confidence
│   ├── uncertainty/                         # Error ellipse propagation & sensitivity bounding
│   └── reporting/                           # HTML table report, 2D Console, and 3D WebGL Workstations
├── tests/                                   # Full unit, integration, and benchmark test suite (32 tests)
└── pyproject.toml                           # Package configuration and dependencies
```

---

## 🛠️ Installation & Setup

### Prerequisites
* Python 3.10+
* Git

### Installation
```bash
# Clone the repository
git clone https://github.com/<your-username>/wake-maritime-attribution.git
cd wake-maritime-attribution

# Install dependencies in editable mode
pip install -e .
```

---

## 💻 Usage

### Run an Attribution Investigation via CLI
```bash
ais-oil-investigate \
  --lat 34.016944 \
  --lon -118.663056 \
  --time "2024-08-06 01:50:00" \
  --spread 12.0 \
  --regime delayed \
  --output-dir results/my_investigation
```

### Generated Artifacts in Output Bundle
Each investigation automatically produces a self-contained bundle:
* `input.json` & `attribution.json`: Machine-readable case metadata & scores.
* `attribution_scores.parquet`: Complete candidate ranking table.
* `reconstructed_tracks.parquet`: Interpolated & observed trajectory points.
* `final_report.html`: Formal executive evidence dossier.
* `workstation.html`: 2D GIS forensic console.
* `reconstruction_3d_v3.html`: Interactive 3D WebGL AI Forensics Workstation.

---

## 🧪 Testing

Run the full pytest suite (100% pass rate):
```bash
pytest -v
```

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for details.
