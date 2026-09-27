import fs from 'fs';
import path from 'path';

function generateMethodComparisonSVG() {
  const width = 1200;
  const height = 440;

  // Panel 1: Distance to CALIFORNIA
  const p1Left = 55;
  const p1Top = 45;
  const p1Width = 515;
  const p1Height = 330;
  const p1Right = p1Left + p1Width;
  const p1Bottom = p1Top + p1Height;

  // Panel 2: Spatial convergence spread
  const p2Left = 640;
  const p2Top = 45;
  const p2Width = 515;
  const p2Height = 330;
  const p2Right = p2Left + p2Width;
  const p2Bottom = p2Top + p2Height;

  // Panel 1 Data: Time from 00:00 to 08:00 (8 hours)
  // Distance from CALIFORNIA (km)
  const distPoints = [
    { t: 0, d: 16.85 },
    { t: 0.5, d: 16.35 },
    { t: 0.8, d: 15.65 },
    { t: 1.2, d: 15.35 },
    { t: 1.6, d: 14.75 },
    { t: 2.0, d: 14.15 },
    { t: 2.4, d: 13.65 },
    { t: 2.8, d: 13.20 },
    { t: 3.2, d: 12.65 },
    { t: 3.6, d: 12.25 },
    { t: 4.0, d: 11.75 },
    { t: 4.3, d: 11.40 },
    { t: 4.8, d: 10.80 },
    { t: 5.3, d: 10.25 },
    { t: 5.8, d: 9.70 },
    { t: 6.3, d: 9.10 },
    { t: 6.8, d: 8.55 },
    { t: 7.3, d: 7.95 },
    { t: 7.8, d: 7.45 },
    { t: 8.3, d: 6.95 },
    { t: 8.8, d: 6.45 },
    { t: 9.3, d: 5.95 },
    { t: 9.8, d: 5.40 },
    { t: 10.3, d: 5.05 },
    { t: 10.8, d: 4.55 },
    { t: 11.4, d: 4.10 },
    { t: 12.0, d: 3.65 },
    { t: 12.6, d: 3.25 },
    { t: 13.2, d: 2.80 },
    { t: 13.8, d: 2.35 },
    { t: 14.2, d: 1.89 }
  ];

  // Map Panel 1 Coordinates (t from 0 to 14.2 representing 00:00 to 08:00, d from 1.5 to 17.5)
  function toP1Px(tVal, dVal) {
    const x = p1Left + (tVal / 14.2) * p1Width;
    const y = p1Bottom - ((dVal - 1.5) / (17.5 - 1.5)) * p1Height;
    return { x, y };
  }

  // Construct Panel 1 path
  let p1Path = '';
  distPoints.forEach((pt, idx) => {
    const { x, y } = toP1Px(pt.t, pt.d);
    p1Path += (idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`);
  });

  // Panel 1 Ticks & Grid
  const p1XTicks = [
    { label: ['Aug 06', '00:00'], t: 0 },
    { label: ['Aug 06', '01:00'], t: 14.2 * (1/8) },
    { label: ['Aug 06', '02:00'], t: 14.2 * (2/8) },
    { label: ['Aug 06', '03:00'], t: 14.2 * (3/8) },
    { label: ['Aug 06', '04:00'], t: 14.2 * (4/8) },
    { label: ['Aug 06', '05:00'], t: 14.2 * (5/8) },
    { label: ['Aug 06', '06:00'], t: 14.2 * (6/8) },
    { label: ['Aug 06', '07:00'], t: 14.2 * (7/8) },
    { label: ['Aug 06', '08:00'], t: 14.2 }
  ];

  const p1YTicks = [2, 4, 6, 8, 10, 12, 14, 16];

  let p1Grid = '';
  p1XTicks.forEach(tick => {
    const { x } = toP1Px(tick.t, 1.5);
    p1Grid += `
      <line x1="${x.toFixed(1)}" y1="${p1Top}" x2="${x.toFixed(1)}" y2="${p1Bottom}" stroke="#e2e8f0" stroke-width="0.8" />
      <line x1="${x.toFixed(1)}" y1="${p1Bottom}" x2="${x.toFixed(1)}" y2="${p1Bottom + 5}" stroke="#2d3748" stroke-width="1" />
      <text x="${x.toFixed(1)}" y="${p1Bottom + 18}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" text-anchor="middle" fill="#2d3748">${tick.label[0]}</text>
      <text x="${x.toFixed(1)}" y="${p1Bottom + 30}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" text-anchor="middle" fill="#2d3748">${tick.label[1]}</text>
    `;
  });

  p1YTicks.forEach(val => {
    const { y } = toP1Px(0, val);
    p1Grid += `
      <line x1="${p1Left}" y1="${y.toFixed(1)}" x2="${p1Right}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.8" />
      <line x1="${p1Left - 5}" y1="${y.toFixed(1)}" x2="${p1Left}" y2="${y.toFixed(1)}" stroke="#2d3748" stroke-width="1" />
      <text x="${p1Left - 8}" y="${(y + 4).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="end" fill="#2d3748">${val}</text>
    `;
  });

  // Panel 2 Data: Simulation Timestep from 0 to 32, spread from 1.6 to 5.8
  const spreadPoints = [
    { s: 0, v: 1.73 },
    { s: 1, v: 1.82 },
    { s: 2, v: 1.98 },
    { s: 3, v: 2.08 },
    { s: 4, v: 2.22 },
    { s: 5, v: 2.33 },
    { s: 6, v: 2.47 },
    { s: 7, v: 2.67 },
    { s: 8, v: 2.66 },
    { s: 9, v: 2.87 },
    { s: 10, v: 2.93 },
    { s: 11, v: 3.12 },
    { s: 12, v: 3.28 },
    { s: 13, v: 3.40 },
    { s: 14, v: 3.51 },
    { s: 15, v: 3.55 },
    { s: 16, v: 3.70 },
    { s: 17, v: 3.90 },
    { s: 18, v: 4.08 },
    { s: 19, v: 4.16 },
    { s: 20, v: 4.24 },
    { s: 21, v: 4.34 },
    { s: 22, v: 4.51 },
    { s: 23, v: 4.62 },
    { s: 24, v: 4.79 },
    { s: 25, v: 4.86 },
    { s: 26, v: 5.03 },
    { s: 27, v: 5.20 }
  ];

  function toP2Px(step, val) {
    const x = p2Left + (step / 32) * p2Width;
    const y = p2Bottom - ((val - 1.6) / (5.8 - 1.6)) * p2Height;
    return { x, y };
  }

  let p2Path = '';
  spreadPoints.forEach((pt, idx) => {
    const { x, y } = toP2Px(pt.s, pt.v);
    p2Path += (idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`);
  });

  // Panel 2 Ticks & Grid
  const p2XTicks = [0, 5, 10, 15, 20, 25, 30];
  const p2YTicks = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5];

  let p2Grid = '';
  p2XTicks.forEach(step => {
    const { x } = toP2Px(step, 1.6);
    p2Grid += `
      <line x1="${x.toFixed(1)}" y1="${p2Top}" x2="${x.toFixed(1)}" y2="${p2Bottom}" stroke="#e2e8f0" stroke-width="0.8" />
      <line x1="${x.toFixed(1)}" y1="${p2Bottom}" x2="${x.toFixed(1)}" y2="${p2Bottom + 5}" stroke="#2d3748" stroke-width="1" />
      <text x="${x.toFixed(1)}" y="${p2Bottom + 18}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#2d3748">${step}</text>
    `;
  });

  p2YTicks.forEach(val => {
    const { y } = toP2Px(0, val);
    p2Grid += `
      <line x1="${p2Left}" y1="${y.toFixed(1)}" x2="${p2Right}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.8" />
      <line x1="${p2Left - 5}" y1="${y.toFixed(1)}" x2="${p2Left}" y2="${y.toFixed(1)}" stroke="#2d3748" stroke-width="1" />
      <text x="${p2Left - 8}" y="${(y + 4).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="end" fill="#2d3748">${val.toFixed(1)}</text>
    `;
  });

  const step3Px = toP2Px(3, 2.08);
  const step0Px = toP2Px(0, 1.6);
  const step3XPx = toP2Px(3, 1.6);
  const warmUpWidth = step3XPx.x - step0Px.x;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#ffffff; user-select:none;">
  <defs>
    <clipPath id="panel1Clip">
      <rect x="${p1Left}" y="${p1Top}" width="${p1Width}" height="${p1Height}" />
    </clipPath>
    <clipPath id="panel2Clip">
      <rect x="${p2Left}" y="${p2Top}" width="${p2Width}" height="${p2Height}" />
    </clipPath>
  </defs>

  <!-- ==================== PANEL 1: Method 1 ==================== -->
  <!-- Title -->
  <text x="${p1Left + p1Width / 2}" y="28" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#111827">
    Method 1: Distance to CALIFORNIA
  </text>

  <!-- Background -->
  <rect x="${p1Left}" y="${p1Top}" width="${p1Width}" height="${p1Height}" fill="#ffffff" />
  
  <!-- Grid -->
  ${p1Grid}

  <!-- Axis Titles -->
  <text x="${p1Left + p1Width / 2}" y="${p1Bottom + 45}" font-family="Arial, Helvetica, sans-serif" font-size="11.5" text-anchor="middle" fill="#2d3748">
    Time (backward run)
  </text>
  <text transform="translate(18, ${p1Top + p1Height / 2}) rotate(-90)" font-family="Arial, Helvetica, sans-serif" font-size="11.5" text-anchor="middle" fill="#2d3748">
    Distance from CALIFORNIA (km)
  </text>

  <!-- Plot lines -->
  <g clip-path="url(#panel1Clip)">
    <!-- Blue distance line -->
    <path d="${p1Path}" fill="none" stroke="#1f77b4" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Green dashed line at closest pick (t = 14.2) -->
    <line x1="${(p1Left + p1Width - 2).toFixed(1)}" y1="${p1Top}" x2="${(p1Left + p1Width - 2).toFixed(1)}" y2="${p1Bottom}" stroke="#2ca02c" stroke-width="1.8" stroke-dasharray="5,3" />
  </g>

  <!-- Panel 1 Border -->
  <rect x="${p1Left}" y="${p1Top}" width="${p1Width}" height="${p1Height}" fill="none" stroke="#64748b" stroke-width="1.2" />

  <!-- Panel 1 Legend (top right) -->
  <rect x="${p1Right - 188}" y="${p1Top + 8}" width="180" height="46" fill="#ffffff" fill-opacity="0.92" stroke="#cbd5e1" stroke-width="0.8" rx="3" />
  <line x1="${p1Right - 176}" y1="${p1Top + 22}" x2="${p1Right - 152}" y2="${p1Top + 22}" stroke="#1f77b4" stroke-width="2.5" />
  <text x="${p1Right - 146}" y="${p1Top + 26}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#1e293b">Distance to CALIFORNIA</text>
  <line x1="${p1Right - 176}" y1="${p1Top + 38}" x2="${p1Right - 152}" y2="${p1Top + 38}" stroke="#2ca02c" stroke-width="1.8" stroke-dasharray="4,2.5" />
  <text x="${p1Right - 146}" y="${p1Top + 42}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#1e293b">Closest pick (1.89 km)</text>


  <!-- ==================== PANEL 2: Method 2 ==================== -->
  <!-- Title -->
  <text x="${p2Left + p2Width / 2}" y="28" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#111827">
    Method 2: Spatial convergence spread
  </text>

  <!-- Background -->
  <rect x="${p2Left}" y="${p2Top}" width="${p2Width}" height="${p2Height}" fill="#ffffff" />

  <!-- Shaded warm-up excluded region -->
  <rect x="${step0Px.x.toFixed(1)}" y="${p2Top}" width="${warmUpWidth.toFixed(1)}" height="${p2Height}" fill="#e2e8f0" fill-opacity="0.65" />

  <!-- Grid -->
  ${p2Grid}

  <!-- Axis Titles -->
  <text x="${p2Left + p2Width / 2}" y="${p2Bottom + 35}" font-family="Arial, Helvetica, sans-serif" font-size="11.5" text-anchor="middle" fill="#2d3748">
    Simulation Timestep (reverse advection)
  </text>
  <text transform="translate(${p2Left - 44}, ${p2Top + p2Height / 2}) rotate(-90)" font-family="Arial, Helvetica, sans-serif" font-size="11.5" text-anchor="middle" fill="#2d3748">
    Cloud spread σ(t) (km)
  </text>

  <!-- Plot lines -->
  <g clip-path="url(#panel2Clip)">
    <!-- Red dashed vertical line at step 3 -->
    <line x1="${step3Px.x.toFixed(1)}" y1="${p2Top}" x2="${step3Px.x.toFixed(1)}" y2="${p2Bottom}" stroke="#a81c1c" stroke-width="1.8" stroke-dasharray="5,3" />

    <!-- Red particle spread line -->
    <path d="${p2Path}" fill="none" stroke="#cb2b2b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Step 3 pick marker (circle with dark outline) -->
    <circle cx="${step3Px.x.toFixed(1)}" cy="${step3Px.y.toFixed(1)}" r="5.2" fill="#cb2b2b" stroke="#000000" stroke-width="1.5" />
  </g>

  <!-- Panel 2 Border -->
  <rect x="${p2Left}" y="${p2Top}" width="${p2Width}" height="${p2Height}" fill="none" stroke="#64748b" stroke-width="1.2" />

  <!-- Panel 2 Legend (top right) -->
  <rect x="${p2Right - 200}" y="${p2Top + 8}" width="192" height="62" fill="#ffffff" fill-opacity="0.92" stroke="#cbd5e1" stroke-width="0.8" rx="3" />
  
  <line x1="${p2Right - 188}" y1="${p2Top + 20}" x2="${p2Right - 164}" y2="${p2Top + 20}" stroke="#cb2b2b" stroke-width="2.5" />
  <text x="${p2Right - 158}" y="${p2Top + 24}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#1e293b">Particle spread σ(t)</text>

  <rect x="${p2Right - 188}" y="${p2Top + 30}" width="24" height="12" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="0.8" />
  <text x="${p2Right - 158}" y="${p2Top + 40}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#1e293b">Warm-up excluded (3 steps)</text>

  <line x1="${p2Right - 188}" y1="${p2Top + 54}" x2="${p2Right - 164}" y2="${p2Top + 54}" stroke="#a81c1c" stroke-width="1.8" stroke-dasharray="4,2.5" />
  <text x="${p2Right - 158}" y="${p2Top + 58}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#1e293b">Method 2 pick (Step 3)</text>
</svg>
  `.trim();
}

const svgContent = generateMethodComparisonSVG();
fs.writeFileSync('public/images/method_comparison_plot.svg', svgContent);
fs.writeFileSync('src/assets/images/method_comparison_plot.svg', svgContent);
console.log('Generated method_comparison_plot.svg successfully!');
