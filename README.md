# WAKE: AI-Assisted Satellite & AIS Maritime Oil-Spill Vessel Attribution System

[![Python 3.10+](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests: 45 Passed](https://img.shields.io/badge/tests-45%20passed%20(100%25)-brightgreen.svg)]()
[![CI: Passing](https://img.shields.io/badge/CI-GitHub%20Actions-brightgreen.svg)]()
[![Three.js](https://img.shields.io/badge/3D%20Engine-Three.js%20r128-black.svg)](https://threejs.org/)

An AI-assisted, research-driven maritime forensics and vessel attribution workstation correlating satellite Synthetic Aperture Radar (SAR) oil slicks with AIS vessel trajectories, hydrodynamic drift models, and multi-criteria mathematical consensus.

**Repository:** [https://github.com/harxh1t/ais_oil_attribution.git](https://github.com/harxh1t/ais_oil_attribution.git)

---

## 🌊 Overview

Illegal oily waste discharges from commercial vessels ("magic pipe" dumps) pose a major global environmental threat. While satellite SAR constellations (e.g., ESA Sentinel-1) can detect oil slicks across global waters, identifying the responsible vessel is challenging due to:
1. **The "Age of Slick" Gap:** Ocean currents and surface winds transport and disperse slicks kilometers away from the release origin over 6–24 hours.
2. **Opaque Multi-Ship Traffic:** Simple Euclidean proximity fails when ships make evasive maneuvers, travel in separation schemes, or cross the drift corridor at different times.
3. **Data Integrity & Dark Ships:** Blurring observed AIS broadcasts with interpolated points risks inadmissible evidence, and non-transmitting (dark) vessels must be explicitly accounted for.

**WAKE** solves this with a modular, 5-stage pipeline combining **Reverse Lagrangian Hydrodynamic Backtracking**, **Forward-Fit Advection Matching**, **Gated Discrete Fréchet Kinematic Parity**, **Multi-Method Decision Ranking (Borda, TOPSIS, LLR)**, and an interactive **3D WebGL Investigation Workstation**.

---

## 🚀 Key Upgrades & Features

* **Pluggable Drift Architectures (`src/ais_oil_attribution/drift/`):**
  * `OpenDriftModel`: High-fidelity numerical Lagrangian backtracking forced by HYCOM ocean currents and GFS surface wind fields.
  * `AnalyticDriftModel`: Deterministic, seedable advection-diffusion drift engine for reproducible testing and offline CI benchmarks.
* **Forward-Fit Advection Evidence (`Longépé et al.`):**
  * Forward-advects virtual oil releases from candidate trajectories to the satellite observation epoch.
  * Measures bidirectional Chamfer distance ($d_{\text{chamfer}}$) and particle-in-slick fraction.
* **Gated Discrete Fréchet Distance:**
  * Evaluates trajectory vs. skeletonized slick centerline shape alignment.
  * Automatically gated ($N \ge 3$) to prevent metric corruption on non-elongated/amorphous slicks.
* **Multi-Hypothesis Ranking Algorithms:**
  * **Borda Count (Default):** Robust consensus rank aggregation across all active channels.
  * **TOPSIS:** Multi-criteria decision analysis computing geometric proximity to ideal best and worst solutions.
  * **Calibrated Log-Likelihood Ratio (LLR):** Evaluates vessel candidate hypotheses against an explicit **Dark / Unobserved Vessel Hypothesis ($H_0$)** with calibrated case-level abstention.
* **SAR Dark Vessel Detection Cross-Check:** Flags unassociated radar targets lacking AIS transponder signals.
* **Forensic Track Provenance:** Explicit point-level labels (`n_observed`, `n_interp`, `n_gap`) maintaining chain of custody.
* **Interactive 3D WebGL Studio (`reconstruction_3d_v3.html`):** Multi-row forensic timeline, AI Copilot with contradiction detection, and Scenario Lab.

---

## 🏗️ System Architecture

```
[ Satellite SAR Slick & Detection GeoJSON ]
                      │
                      ▼
[ Stage 1: Input Validation & Regime Classification ]
                      │
                      ▼
[ Stage 2: Hydrodynamic Reverse Drift Modeling (OpenDrift / Analytic) ]
                      │
                      ▼
[ Stage 3: AIS Stream Ingestion & Kinematic Reconstruction (DuckDB / GeoParquet) ]
                      │
                      ▼
[ Stage 4: Multi-Channel Evidence Extraction ]
  ├── DCPA (Distance at Closest Approach)
  ├── TCPA (Time at Closest Approach)
  ├── Discrete Fréchet Distance (Elongation-Gated)
  ├── Forward-Fit Chamfer & Particle-in-Slick
  ├── AIS Track Coverage & Gap Provenance
  └── SAR Dark Vessel Cross-Check
                      │
                      ▼
[ Stage 5: Multi-Method Candidate Ranking ]
  ├── Borda Count Consensus (Default)
  ├── TOPSIS Multi-Criteria
  └── Calibrated LLR & Case-Level Abstention
                      │
                      ▼
[ Stage 6: Auditable Case Bundle Generation ]
  ├── attribution.json & attribution_scores.parquet
  ├── final_report.html & workstation.html
  └── reconstruction_3d_v3.html (3D Forensic Studio)
```

---

## 📊 Empirical Validation Benchmark Results

WAKE includes a rigorous, offline validation benchmark (`ais-oil-benchmark`) evaluating ranking accuracy, calibration, and trajectory reconstruction on synthetic cases with intentional physics mismatch, background decoys, and negative controls (zero discharge).

### 1. Multi-Method Ranking Performance ($N=25$ cases, Seed 42)

| Method | Top-1 Accuracy (95% CI) | Top-3 Accuracy (95% CI) | MRR | NDCG@3 | NDCG@5 | Negative Control Abstention |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **BORDA (Default)** | **0.47** [0.20, 0.73] | **0.67** [0.40, 0.87] | **0.611** | **0.575** | **0.659** | 0.0% (Forced rank) |
| **TOPSIS** | 0.13 [0.00, 0.33] | 0.47 [0.26, 0.73] | 0.364 | 0.326 | 0.406 | 0.0% (Forced rank) |
| **CALIBRATED LLR** | 0.07 [0.00, 0.20] | 0.40 [0.20, 0.67] | 0.297 | 0.260 | 0.314 | **100.0%** (0 false attributions) |

> **Takeaway:** Borda Count provides the strongest candidate retrieval ranking under noisy drift conditions. Calibrated LLR excels at conservative decision-support by abstaining on 100% of negative control cases where no observed AIS vessel caused the spill.

### 2. Probabilistic Calibration & Redundancy Diagnostics
* **LLR Brier Score:** `0.0544` (held-out test set)
* **Expected Calibration Error (ECE):** `0.0417`
* **Evidence Channel Collinearity (VIF):**
  * $\text{DCPA}: 1.36$
  * $\text{TCPA}: 1.24$
  * $\text{Coverage Completeness}: 1.02$
  * $\text{Forward-Fit Score}: 1.58$
  * *(All VIF $\ll 5.0$, confirming non-redundant, independent evidence channels)*

### 3. Masked AIS Trajectory Reconstruction Benchmark
Kinematic interpolation accuracy evaluated under artificial signal dropouts:

| Gap Duration | Position RMSE (m) | P95 Position Error (m) | Max Error (m) |
|:---:|:---:|:---:|:---:|
| **1 min** | 318.3 m | 521.1 m | 548.4 m |
| **5 min** | 173.4 m | 445.4 m | 539.2 m |
| **15 min** | 107.1 m | 339.7 m | 553.1 m |
| **30 min** | 76.8 m | 0.0 m | 546.6 m |
| **60 min** | 56.7 m | 1.4 m | 506.5 m |

---

## 🛠️ Installation & Setup

### Prerequisites
* Python 3.10, 3.11, or 3.12
* Git

### Installation
```bash
# Clone the repository
git clone https://github.com/harxh1t/ais_oil_attribution.git
cd ais_oil_attribution

# Install dependencies in editable mode (including dev & test tools)
pip install -e ".[dev]"
```

---

## 💻 Usage

### 1. Run an Attribution Investigation

**PowerShell (Windows):**
```powershell
ais-oil-investigate `
  --lat 34.016944 `
  --lon -118.663056 `
  --time "2024-08-06 01:50:00" `
  --spread 12.0 `
  --regime delayed `
  --ranking-method borda `
  --enable-forward-fit `
  --output-dir results/malibu_case
```

**Bash (Linux / macOS):**
```bash
ais-oil-investigate \
  --lat 34.016944 \
  --lon -118.663056 \
  --time "2024-08-06 01:50:00" \
  --spread 12.0 \
  --regime delayed \
  --ranking-method borda \
  --enable-forward-fit \
  --output-dir results/malibu_case
```

### 2. Run the Offline Validation Benchmark
```bash
# Run quick CI sanity benchmark
ais-oil-benchmark --quick --output-dir results/benchmark_quick

# Run full rigorous 25-case benchmark
ais-oil-benchmark --cases 25 --output-dir results/benchmark
```

### 3. Generated Artifacts in Investigation Bundle
Each investigation outputs a structured forensic bundle:
* `attribution.json`: Machine-readable case findings, candidate ranks, and confidence metrics.
* `attribution_scores.parquet`: Parquet table with complete multi-channel scores.
* `reconstructed_tracks.parquet`: Reconstructed vessel coordinates with point provenance labels.
* `final_report.html`: Formal executive evidence dossier.
* `workstation.html`: 2D GIS forensic console.
* `reconstruction_3d_v3.html`: Interactive 3D WebGL AI Forensics Workstation.

---

## 🧪 Testing

Execute the comprehensive test suite across all 45 unit, benchmark, and regression tests:
```bash
pytest -v
```

---

## ⚠️ Limitations & Decision-Support Disclaimer

1. **Decision Support Only:** WAKE is designed as an investigative decision-support and screening tool. Its outputs constitute probabilistic physical hypotheses and do not replace formal maritime law enforcement boardings, chemical fingerprinting, or judicial proceedings.
2. **AIS Coverage:** Vessel attribution depends on AIS broadcast availability. Non-transmitting vessels or deliberate transponder shutdowns may require SAR radar ship detection cross-checking or dark vessel estimation.
3. **Hydrodynamic Resolution:** Oceanographic drift accuracy is bounded by the spatial and temporal resolution of underlying meteorological and ocean current models (e.g., HYCOM, GFS).

---

## ⚖️ License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
