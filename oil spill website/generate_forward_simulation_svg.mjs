import fs from 'fs';

function generateForwardSimulationSVG() {
  const width = 540;
  const height = 580;

  // Plot box
  const plotLeft = 55;
  const plotTop = 38;
  const plotWidth = 455;
  const plotHeight = 460;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  // X range: 8 to 20 hours (Aug 06 08:00 to Aug 06 20:00) -> 12 hours duration
  // Y range: 0 to 17 km
  const yMin = 0;
  const yMax = 17;

  function toPx(hour, val) {
    const x = plotLeft + ((hour - 8) / 12) * plotWidth;
    const y = plotBottom - ((val - yMin) / (yMax - yMin)) * plotHeight;
    return { x, y };
  }

  // Curve points matching the user's uploaded plot exactly
  const curveData = [
    { h: 8.0,  v: 3.31 },
    { h: 8.3,  v: 5.12 },
    { h: 8.6,  v: 5.85 },
    { h: 8.9,  v: 6.50 },
    { h: 9.15, v: 7.02 },
    { h: 9.4,  v: 7.22 },
    { h: 9.65, v: 7.60 },
    { h: 9.9,  v: 8.22 },
    { h: 10.15, v: 8.00 },
    { h: 10.45, v: 8.66 },
    { h: 10.7, v: 8.66 },
    { h: 11.0, v: 9.25 },
    { h: 11.25, v: 9.86 },
    { h: 11.6, v: 9.82 },
    { h: 11.85, v: 9.77 },
    { h: 12.15, v: 10.28 },
    { h: 12.45, v: 10.63 },
    { h: 12.8, v: 10.63 },
    { h: 13.05, v: 11.12 },
    { h: 13.4, v: 11.25 },
    { h: 13.7, v: 11.60 },
    { h: 14.0, v: 11.83 },
    { h: 14.25, v: 11.43 },
    { h: 14.5, v: 12.75 },
    { h: 14.75, v: 12.05 },
    { h: 15.05, v: 12.82 },
    { h: 15.3, v: 12.75 },
    { h: 15.55, v: 12.35 },
    { h: 15.85, v: 13.33 },
    { h: 16.1, v: 13.10 },
    { h: 16.35, v: 13.52 },
    { h: 16.65, v: 13.43 },
    { h: 16.95, v: 13.62 },
    { h: 17.2, v: 13.53 },
    { h: 17.5, v: 14.05 },
    { h: 17.8, v: 14.28 },
    { h: 18.1, v: 14.45 },
    { h: 18.35, v: 14.35 },
    { h: 18.65, v: 15.00 },
    { h: 18.9, v: 14.80 },
    { h: 19.15, v: 15.30 },
    { h: 19.45, v: 15.20 },
    { h: 19.7, v: 15.00 },
    { h: 19.9, v: 15.42 }
  ];

  // Build line path and area polygon
  let linePath = '';
  let areaPath = '';

  curveData.forEach((pt, i) => {
    const { x, y } = toPx(pt.h, pt.v);
    if (i === 0) {
      linePath += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      areaPath += `M ${x.toFixed(1)} ${plotBottom.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      linePath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      areaPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  });

  const lastPt = toPx(19.9, 15.42);
  const startPt = toPx(8.0, 3.31);
  areaPath += ` L ${lastPt.x.toFixed(1)} ${plotBottom.toFixed(1)} Z`;

  // X ticks: Aug 06 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00
  const xTicks = [
    { h: 8,  d: 'Aug 06', t: '08:00' },
    { h: 10, d: 'Aug 06', t: '10:00' },
    { h: 12, d: 'Aug 06', t: '12:00' },
    { h: 14, d: 'Aug 06', t: '14:00' },
    { h: 16, d: 'Aug 06', t: '16:00' },
    { h: 18, d: 'Aug 06', t: '18:00' },
    { h: 20, d: 'Aug 06', t: '20:00' }
  ];

  const yTicks = [0, 2, 4, 6, 8, 10, 12, 14, 16];

  let gridSvg = '';
  xTicks.forEach(tick => {
    const { x } = toPx(tick.h, 0);
    gridSvg += `
      <line x1="${x.toFixed(1)}" y1="${plotTop}" x2="${x.toFixed(1)}" y2="${plotBottom}" stroke="#ebf1f6" stroke-width="0.8" />
      <line x1="${x.toFixed(1)}" y1="${plotBottom}" x2="${x.toFixed(1)}" y2="${plotBottom + 5}" stroke="#334155" stroke-width="1" />
      <text x="${x.toFixed(1)}" y="${plotBottom + 17}" font-family="Arial, Helvetica, sans-serif" font-size="10" text-anchor="middle" fill="#2d3748">${tick.d}</text>
      <text x="${x.toFixed(1)}" y="${plotBottom + 29}" font-family="Arial, Helvetica, sans-serif" font-size="10" text-anchor="middle" fill="#2d3748">${tick.t}</text>
    `;
  });

  yTicks.forEach(val => {
    const { y } = toPx(8, val);
    gridSvg += `
      <line x1="${plotLeft}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}" stroke="#ebf1f6" stroke-width="0.8" />
      <line x1="${plotLeft - 5}" y1="${y.toFixed(1)}" x2="${plotLeft}" y2="${y.toFixed(1)}" stroke="#334155" stroke-width="1" />
      <text x="${plotLeft - 8}" y="${(y + 4).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" text-anchor="end" fill="#2d3748">${val}</text>
    `;
  });

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#ffffff; user-select:none;">
  <defs>
    <clipPath id="plotClipFwd">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" />
    </clipPath>
  </defs>

  <!-- Plot Title -->
  <text x="${width / 2}" y="24" font-family="Arial, Helvetica, sans-serif" font-size="14.5" font-weight="bold" text-anchor="middle" fill="#0f172a">
    How spread out the oil is, over time
  </text>

  <!-- Background -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#ffffff" />

  <!-- Grid lines -->
  ${gridSvg}

  <!-- Axis Titles -->
  <text x="${plotLeft + plotWidth / 2}" y="${plotBottom + 45}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#334155">
    Time (UTC)
  </text>
  <text transform="translate(16, ${plotTop + plotHeight / 2}) rotate(-90)" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#334155">
    Particle cloud spread (km)
  </text>

  <!-- Clipped plot curves -->
  <g clip-path="url(#plotClipFwd)">
    <!-- Shaded area under curve -->
    <path d="${areaPath}" fill="#fce8e8" fill-opacity="0.85" />

    <!-- Red vertical dashed line at Aug 06 08:00 -->
    <line x1="${startPt.x.toFixed(1)}" y1="${plotTop}" x2="${startPt.x.toFixed(1)}" y2="${plotBottom}" stroke="#c52222" stroke-width="1.6" stroke-dasharray="4,3" />

    <!-- Main red curve -->
    <path d="${linePath}" fill="none" stroke="#c52222" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Min spread circle marker at 3.31 km (Aug 06 08:00) -->
    <circle cx="${startPt.x.toFixed(1)}" cy="${startPt.y.toFixed(1)}" r="5" fill="#c52222" stroke="#000000" stroke-width="1.4" />
  </g>

  <!-- Border -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#475569" stroke-width="1.1" />

  <!-- Legend in top right -->
  <rect x="${plotRight - 156}" y="${plotTop + 10}" width="148" height="46" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" stroke-width="0.8" rx="2" />
  
  <line x1="${plotRight - 146}" y1="${plotTop + 22}" x2="${plotRight - 124}" y2="${plotTop + 22}" stroke="#c52222" stroke-width="2.5" stroke-linecap="round" />
  <text x="${plotRight - 118}" y="${plotTop + 26}" font-family="Arial, Helvetica, sans-serif" font-size="9.5" fill="#1e293b">Spread σ(t)</text>

  <circle cx="${plotRight - 135}" cy="${plotTop + 37}" r="4.2" fill="#c52222" stroke="#000000" stroke-width="1.2" />
  <text x="${plotRight - 118}" y="${plotTop + 40}" font-family="Arial, Helvetica, sans-serif" font-size="9.5" fill="#1e293b">Min spread (3.31 km)</text>
</svg>
  `.trim();
}

const svg = generateForwardSimulationSVG();
fs.writeFileSync('public/images/forward_simulation_spread.svg', svg);
fs.writeFileSync('src/assets/images/forward_simulation_spread.svg', svg);
console.log('Saved forward_simulation_spread.svg successfully!');
