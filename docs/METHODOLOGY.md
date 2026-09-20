# WAKE Attribution System: Mathematical and Algorithmic Methodology

## 1. Overview
The WAKE system provides a rigorous, decision-support framework for attributing maritime oil slicks observed via Synthetic Aperture Radar (SAR) and optical satellites to suspect commercial vessels using Automated Identification System (AIS) telemetry and oceanographic drift physics.

```
       [ Satellite SAR Slick ]
                  │
                  ▼
       [ Lagrangian Backtracking ] ────► [ Probabilistic Origin Region ]
                  │
                  ▼
       [ AIS Spatiotemporal Query ] ───► [ Candidate Vessels ]
                  │
                  ▼
       [ Evidence Extraction Channels ]
         ├── DCPA / TCPA Proximity
         ├── Discrete Fréchet Distance (Gated)
         ├── Forward-Fit Advection (Chamfer & Particle In-Slick)
         ├── AIS Track Provenance & Coverage
         └── SAR Dark Vessel Cross-Check
                  │
                  ▼
       [ Multi-Criteria / Probabilistic Ranking ]
         ├── Borda Count (Default Consensus)
         ├── TOPSIS (Ideal Solution Geometric Distance)
         └── Calibrated LLR (Explicit Dark Hypothesis & Abstention)
```

---

## 2. Oceanographic Drift Modeling & Backtracking

### 2.1 Forward Advection-Diffusion Equation
The transport of oil slick center of mass $\mathbf{x}(t)$ under surface current velocity $\mathbf{u}_c$ and 10-meter surface wind velocity $\mathbf{u}_{10}$ is governed by:
$$\frac{d\mathbf{x}}{dt} = \mathbf{u}_c(\mathbf{x}, t) + \alpha \mathbf{u}_{10}(\mathbf{x}, t) + \mathbf{u}'$$
where:
- $\alpha \approx 0.03$ is the wind leeway factor (typically 3–3.5% of 10m wind speed with 0°–15° Coriolis deflection).
- $\mathbf{u}'$ represents turbulent diffusion parameterized by horizontal diffusivity $K_h$:
  $$\mathbf{u}' = \sqrt{\frac{2 K_h}{\Delta t}} \cdot \mathcal{N}(0, \mathbf{I})$$

### 2.2 Time-Reversed Lagrangian Backtracking
To identify the candidate spill origin area $\Omega_{origin}$ at spill time $t_{spill} = t_{obs} - \Delta t_{drift}$, trajectories are integrated backward in time:
$$\mathbf{x}(t - \Delta t) = \mathbf{x}(t) - \int_{t-\Delta t}^t \left[ \mathbf{u}_c(\mathbf{x}, \tau) + \alpha \mathbf{u}_{10}(\mathbf{x}, \tau) \right] d\tau + \sqrt{2 K_h \Delta t} \cdot \mathbf{\xi}$$

WAKE supports both:
1. **OpenDrift Lagrangian Ensemble**: High-fidelity numerical integration with NOAA/Copernicus HYCOM hydrodynamic models and GFS wind fields.
2. **Analytic Advection-Diffusion Model**: Fully deterministic, seedable, offline model for validation benchmarks and CI environments.

---

## 3. Candidate Filtering & Track Reconstruction

1. **Spatiotemporal Windowing**: Candidates within radius $R = R_{origin} + v_{max} \cdot \Delta t_{search}$ are extracted from AIS feeds (NOAA MarineCadastre / AISHub).
2. **Kinematic Track Reconstruction**: Missing AIS packets are reconstructed using cubic spline / linear interpolation with speed ($SOG$) and course ($COG$) bounds. Track provenance is tracked per point ($n_{obs}$, $n_{interp}$, $n_{gap}$).

---

## 4. Multi-Channel Evidence Extraction

### 4.1 Proximity Channels (DCPA & TCPA)
- **DCPA (Distance at Closest Point of Approach)**:
  $$\text{DCPA}_i = \min_{t \in [t_0, t_{obs}]} \|\mathbf{x}_{vessel, i}(t) - \mathbf{x}_{origin}(t)\|$$
- **TCPA (Time of Closest Point of Approach)**:
  $$\text{TCPA}_i = \arg\min_{t} \|\mathbf{x}_{vessel, i}(t) - \mathbf{x}_{origin}(t)\| - t_{origin}$$

### 4.2 Discrete Fréchet Distance & Elongation Gating
The Discrete Fréchet distance $\delta_{dF}(P, Q)$ measures structural alignment between slick spatial geometry $P$ and vessel candidate sub-track $Q$:
$$\delta_{dF}(P, Q) = \min_{\alpha, \beta} \max_{k \in [1, m]} d(P_{\alpha(k)}, Q_{\beta(k)})$$
- **Fréchet Gating Rule**: Fréchet distance is only computed when the slick is an elongated streak ($N_{points} \ge 3$ along the principal axis). For amorphous/circular slicks, the metric is marked `not_applicable` (`None`), preventing rank corruption.

### 4.3 Forward-Fit Advection Fit (Longépé et al. Model)
For each candidate vessel trajectory, a forward simulated oil release is advected from $t_{vessel\_pass}$ to $t_{sar\_obs}$. Evidence is quantified via:
1. **Chamfer Distance ($d_{chamfer}$)**:
   $$d_{chamfer}(S_{obs}, S_{fwd}) = \frac{1}{|S_{obs}|}\sum_{x \in S_{obs}} \min_{y \in S_{fwd}} \|x - y\| + \frac{1}{|S_{fwd}|}\sum_{y \in S_{fwd}} \min_{x \in S_{obs}} \|x - y\|$$
2. **Particle-in-Slick Fraction**: Percentage of forward-advected particles falling inside the detected SAR slick polygon.

### 4.4 SAR Dark Vessel Detection Cross-Check
When SAR ship detection products are available, radar targets without corresponding AIS transponder positions are isolated to flag possible non-transmitting (dark) vessels within the spill origin domain.

---

## 5. Multi-Hypothesis Ranking Algorithms

### 5.1 Borda Count (Consensus Rank Aggregation - Default)
Candidates are ranked independently across each active evidence channel $k \in K$. The Borda score for candidate $i$ with $N$ total candidates is:
$$B_i = \sum_{k=1}^K \left( N - \text{rank}_k(i) \right)$$
Ties are broken by DCPA proximity and AIS data quality.

### 5.2 TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
Multi-criteria decision analysis mapping candidates to an $m \times n$ decision matrix:
1. **Vector Normalization**: $r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^m x_{kj}^2}}$
2. **Weighted Matrix**: $v_{ij} = w_j \cdot r_{ij}$
3. **Ideal Best ($A^+$) and Worst ($A^-$) Solutions**:
   $$A_j^+ = \min_i v_{ij} \text{ (for cost metrics like DCPA)}, \quad A_j^- = \max_i v_{ij}$$
4. **Relative Closeness**:
   $$C_i = \frac{S_i^-}{S_i^+ + S_i^-}, \quad S_i^\pm = \sqrt{\sum_j (v_{ij} - A_j^\pm)^2}$$

### 5.3 Calibrated Log-Likelihood Ratio (LLR) & Dark Hypothesis
Log-likelihood ratio formulation evaluating candidate hypotheses $H_i: \text{Vessel } i \text{ is source}$ against the background / unobserved dark vessel hypothesis $H_0$:
$$\log \frac{P(H_i | E)}{P(H_0 | E)} = \log \frac{P(H_i)}{P(H_0)} + \sum_{c} \log \frac{P(E_c | H_i)}{P(E_c | H_0)}$$
- Proximity evidence likelihoods use calibrated exponential decay functions.
- **Case-Level Abstention**: If $\max_i P(H_i | E) < 0.50$ (spill likely from an unobserved or dark vessel), the system abstains from attributing a specific vessel and flags `spill_source_unattributed_or_dark`.

---

## 6. Validation Benchmark Methodology

The validation suite evaluates attribution accuracy using synthetic and historical test distributions:
- **Ground-Truth Isolation**: Candidate ground truth identities are isolated strictly inside `SyntheticCase.ground_truth` and never exposed to the ranking pipeline (`pipeline_input`).
- **Physics Mismatch**: Benchmarks inject intentional discrepancies between true simulation physics (turbulent diffusion, leeway variance) and attribution models.
- **Evaluation Metrics**:
  - **Top-1 / Top-3 Accuracy**: Exact match rate of rank 1 and top 3 candidates.
  - **Mean Reciprocal Rank (MRR)**: $\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$.
  - **NDCG@3 / NDCG@5**: Normalized Discounted Cumulative Gain.
  - **Brier Score & ECE**: Probabilistic calibration metrics.
  - **Bootstrap 95% Confidence Intervals**: 1,000 resamples for statistical significance.
