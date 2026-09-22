/* WAKE Forensic Case Experience - Core Client Runtime */
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
