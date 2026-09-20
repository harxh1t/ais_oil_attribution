# WAKE Attribution Validation & Ranking Upgrade: Technical Change Report

**Branch:** `review/validation-benchmark`  
**Date:** September 2026  
**Scope:** Architecture overhaul, pluggable drift models, forward-fit evidence channel, TOPSIS & LLR ranking algorithms, offline validation benchmark suite, and full test suite expansion.

---

## 1. Summary of Major Changes

| Subsystem | Previous Implementation | Upgraded Implementation |
|---|---|---|
| **Drift Modeling** | Hardcoded OpenDrift dependency only | Abstract `DriftModel` base class with factory pattern (`get_drift_model`). Deterministic `AnalyticDriftModel` added for offline CI/testing and synthetic generation. |
| **Slick / Satellite Ingestion** | Implicit slick points | Formal `SlickProvider` abstraction with `GeoJSONSlickProvider`. Optional SAR ship detection provider (`SARShipDetectionProvider`) with dark vessel cross-checking. |
| **Evidence Channels** | DCPA, TCPA, Fréchet Distance, Track Coverage | Added Longépé-style **Forward-Fit Advection Score** (Chamfer distance & particle-in-slick fraction) with track provenance (`n_observed`, `n_interp`, `n_gap`). |
| **Fréchet Distance Gating** | Computed unconditionally | Gated on slick elongation ($N \ge 3$ along principal axis). Marked `None` / `not_applicable` for amorphous/circular slicks to avoid rank distortions. |
| **Ranking Algorithms** | Borda Count only | Multi-hypothesis support: **Borda Count** (default consensus), **TOPSIS** (multi-criteria ideal-solution geometry), and **Calibrated LLR** (explicit dark-vessel hypothesis and calibrated case-level abstention). |
| **Validation Benchmark** | None (ad-hoc test cases) | Rigorous offline validation suite (`ais-oil-benchmark`) with synthetic case generator, ground-truth isolation, masked AIS gap reconstruction benchmark, bootstrap 95% CIs, and channel redundancy diagnostics. |
| **Test Suite** | 32 tests | 45 comprehensive unit, benchmark, and regression tests (100% pass rate). |
| **CI / Automation** | No CI workflow | Multi-version GitHub Actions CI (`.github/workflows/ci.yml`) testing Python 3.10, 3.11, 3.12 with quick validation sanity checks. |

---

## 2. File-by-File Changes

### New Modules Created
1. `src/ais_oil_attribution/drift/base.py`: Defines `DriftModel` abstract base class and `OriginEstimate` dataclass.
2. `src/ais_oil_attribution/drift/analytic.py`: Deterministic Lagrangian advection-diffusion drift model with wind leeway and seedable RNG.
3. `src/ais_oil_attribution/drift/factory.py`: Factory function `get_drift_model(backend, **kwargs)`.
4. `src/ais_oil_attribution/data/satellite/slick_provider.py`: `SlickProvider` protocol and `GeoJSONSlickProvider`.
5. `src/ais_oil_attribution/data/satellite/ship_detections.py`: SAR radar ship detections cross-referenced with AIS to flag candidate dark vessels.
6. `src/ais_oil_attribution/attribution/forward_fit.py`: Longépé forward-fit trajectory simulation, bidirectional Chamfer distance, particle-in-slick ratio, and track provenance tracking.
7. `src/ais_oil_attribution/attribution/topsis.py`: Vector-normalized TOPSIS ranker with Euclidean positive/negative separation.
8. `src/ais_oil_attribution/attribution/llr.py`: Calibrated Log-Likelihood Ratio evidence model with dark-vessel hypothesis and case-level abstention.
9. `src/ais_oil_attribution/benchmark/`:
   - `synthetic_generator.py`: Generates synthetic ground-truth test cases with intentional physics mismatch, decoys, and negative controls.
   - `metrics.py`: Computes Top-1, Top-3, MRR, NDCG@3, NDCG@5, Brier score, ECE, bootstrap 95% CIs, and rank correlation.
   - `redundancy.py`: Pearson/Spearman channel correlation matrices and Variance Inflation Factor (VIF) diagnostics.
   - `sensitivity.py`: Robustness analysis against spatial/temporal perturbations and ensemble sizes.
   - `ais_validation.py`: Masked trajectory reconstruction benchmark across 1m, 5m, 15m, 30m, 60m, 120m gaps.
   - `runner.py`: Benchmark execution orchestrator.
   - `cli.py`: Registered CLI endpoint `ais-oil-benchmark`.
10. `tests/unit/`:
    - `test_analytic_drift.py`
    - `test_forward_fit.py`
    - `test_topsis.py`
    - `test_llr.py`
    - `test_truth_leakage.py`
    - `test_ship_detections.py`
    - `test_benchmark_metrics.py`
11. `.github/workflows/ci.yml`: GitHub Actions continuous integration workflow.
12. `LICENSE`: MIT License.
13. `docs/METHODOLOGY.md`: Full mathematical and algorithmic specification.

### Modified Files
1. `src/ais_oil_attribution/drift/opendrift_backtrack.py`: Refactored `OpenDriftModel` to inherit from `DriftModel`.
2. `src/ais_oil_attribution/attribution/ranking.py`: Added `rank_candidates(df, method='borda'|'topsis'|'llr')` with Fréchet gating and abstention handling.
3. `src/ais_oil_attribution/pipeline/orchestrator.py`: Integrated pluggable drift backend, forward-fit evidence extraction, SAR ship detections, and alternative ranking algorithms.
4. `src/ais_oil_attribution/cli.py`: Added CLI arguments `--ranking-method`, `--enable-forward-fit`, `--ship-detections`, and `--drift-backend`.
5. `src/ais_oil_attribution/reporting/bundle_writer.py`: Exported forward-fit scores, LLR posteriors, abstention metadata, and evidence channels.
6. `src/ais_oil_attribution/reporting/html_report.py`: Handled nullable Fréchet distances, forward-fit evidence, and abstention warnings.
7. `src/ais_oil_attribution/reporting/workstation_dashboard.py`: Displayed evidence channels and abstention indicators.
8. `src/ais_oil_attribution/reporting/reconstruction_3d_v3_dashboard.py`: Safe handling of missing metrics and forward-fit visualization support.
9. `pyproject.toml`: Added `ais-oil-benchmark` CLI entry point.
10. `README.md`: Comprehensive documentation update with empirical benchmark results.

---

## 3. Backward Compatibility & Safety Guarantees

1. **Default Method Unchanged**: The default ranking algorithm remains `borda_count`. TOPSIS and LLR are strictly opt-in via `--ranking-method topsis` or `--ranking-method llr`.
2. **Investigation Outputs Preserved**: All existing files (`attribution.json`, `attribution_scores.parquet`, `workstation.html`, `reconstruction_3d_v3.html`, `final_report.html`) maintain schema compatibility.
3. **Legacy Folder Isolated**: The `legacy/` and `legacy_baseline/` directories were completely untouched.
4. **Local Git Safety**: All branch creation and commits are strictly local. No `git push`, remote modification, or PR actions were performed.
